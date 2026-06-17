import { PageLayout } from "@/components/shared/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { AppSetting } from "@/types/app";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchSettings(): Promise<AppSetting[]> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .order("key");
  if (error) throw error;
  return (data ?? []) as AppSetting[];
}

// ── Setting row ───────────────────────────────────────────────────────────────

function SettingRow({
  setting,
  onSave,
  isSaving,
}: {
  setting: AppSetting;
  onSave: (key: string, value: string) => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState(setting.value);
  const isDirty = value !== setting.value;

  function handleSave() {
    onSave(setting.key, value);
  }

  function handleCancel() {
    setValue(setting.value);
  }

  return (
    <div className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-slate-100 items-center hover:bg-slate-50 transition-colors">
      {/* Label + key */}
      <div className="col-span-4">
        <p className="text-sm font-medium text-slate-800">{setting.label}</p>
        <p className="text-xs font-mono text-slate-400 mt-0.5">{setting.key}</p>
      </div>

      {/* Value input */}
      <div className="col-span-4">
        {setting.type === "boolean" ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="true">Ya (true)</option>
            <option value="false">Tidak (false)</option>
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type={setting.type === "int" ? "number" : "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400">
              {unitLabel(setting.key)}
            </span>
          </div>
        )}
      </div>

      {/* Type badge */}
      <div className="col-span-2">
        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
          {setting.type}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center gap-2">
        {isDirty && (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              {isSaving ? "..." : "Simpan"}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs px-2 py-1.5 text-slate-500 hover:text-slate-700"
            >
              Batal
            </button>
          </>
        )}
        {!isDirty && <span className="text-xs text-slate-300">—</span>}
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function SettingsScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["app-settings"],
    queryFn: fetchSettings,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("app_settings")
        .update({
          value,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onSettled: () => {
      setSavingKey(null);
    },
  });

  function handleSave(key: string, value: string) {
    setSavingKey(key);
    updateMutation.mutate({ key, value });
  }

  const groups = groupSettings(settings ?? []);

  return (
    <PageLayout title="Pengaturan" subtitle="Konfigurasi sistem JobReport">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-600">
            Gagal memuat pengaturan. Coba refresh.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-6">
          {groups.map((group) => (
            <div
              key={group.label}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-800">{group.label}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {group.description}
                </p>
              </div>

              <div className="grid grid-cols-12 gap-4 px-5 py-2 border-b border-slate-100 bg-slate-50">
                <div className="col-span-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Pengaturan
                </div>
                <div className="col-span-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Nilai
                </div>
                <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Tipe
                </div>
                <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Aksi
                </div>
              </div>

              {group.settings.map((setting) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  onSave={handleSave}
                  isSaving={savingKey === setting.key}
                />
              ))}
            </div>
          ))}

          {/* System info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">
              Informasi Sistem
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Versi Aplikasi" value="JobReport v1.0" />
              <InfoRow label="Admin" value={user?.name ?? "—"} />
              <InfoRow label="Email" value={user?.email ?? "—"} />
              <InfoRow label="Role" value={user?.role ?? "—"} />
              <InfoRow label="Database" value="Supabase (Singapore)" />
              <InfoRow label="Total Tabel" value="24 tabel" />
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <h2 className="font-semibold text-red-700 mb-1">Zona Berbahaya</h2>
            <p className="text-xs text-slate-400 mb-4">
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                disabled
                className="px-4 py-2 border border-red-200 text-red-500 text-sm font-medium rounded-lg opacity-40 cursor-not-allowed"
              >
                Reset Semua Data
              </button>
              <p className="text-xs text-slate-400 self-center">
                Hubungi developer untuk tindakan ini.
              </p>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

// ── Sub components ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface SettingGroup {
  label: string;
  description: string;
  settings: AppSetting[];
}

function groupSettings(settings: AppSetting[]): SettingGroup[] {
  const customerGroup = settings.filter((s) =>
    ["dormant_threshold_days", "due_soon_days"].includes(s.key),
  );
  const acGroup = settings.filter((s) =>
    ["cleaning_interval_days"].includes(s.key),
  );
  const sessionGroup = settings.filter((s) =>
    ["session_idle_minutes", "max_pin_attempts"].includes(s.key),
  );
  const otherGroup = settings.filter(
    (s) =>
      ![...customerGroup, ...acGroup, ...sessionGroup]
        .map((x) => x.key)
        .includes(s.key),
  );

  const groups: SettingGroup[] = [];

  if (customerGroup.length > 0)
    groups.push({
      label: "Pelanggan",
      description: "Pengaturan terkait manajemen pelanggan",
      settings: customerGroup,
    });
  if (acGroup.length > 0)
    groups.push({
      label: "Unit AC",
      description: "Interval perawatan dan notifikasi unit AC",
      settings: acGroup,
    });
  if (sessionGroup.length > 0)
    groups.push({
      label: "Keamanan & Sesi",
      description: "Pengaturan login dan keamanan aplikasi teknisi",
      settings: sessionGroup,
    });
  if (otherGroup.length > 0)
    groups.push({
      label: "Lainnya",
      description: "Pengaturan sistem lainnya",
      settings: otherGroup,
    });

  return groups;
}

function unitLabel(key: string): string {
  return (
    (
      {
        dormant_threshold_days: "hari",
        cleaning_interval_days: "hari",
        due_soon_days: "hari",
        session_idle_minutes: "menit",
        max_pin_attempts: "kali",
      } as Record<string, string>
    )[key] ?? ""
  );
}
