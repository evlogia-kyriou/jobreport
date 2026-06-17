import { PageLayout } from "@/components/shared/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import {
    useDeactivateTechnician,
    useNextTechnicianId,
    useTechnicians,
} from "@/hooks/useTechnicians";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

// ── Main screen ───────────────────────────────────────────────────────────────

export function TechnicianListScreen() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: technicians, isLoading } = useTechnicians();
  const deactivateMutation = useDeactivateTechnician();

  const filtered = technicians?.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.technician_id.includes(search),
  );

  return (
    <PageLayout
      title="Teknisi"
      subtitle={`${technicians?.length ?? 0} teknisi terdaftar`}
      action={
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Tambah Teknisi
        </button>
      }
    >
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari nama atau ID teknisi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-200 bg-slate-50">
          <div className="col-span-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            ID
          </div>
          <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Nama
          </div>
          <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Telepon
          </div>
          <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Keahlian
          </div>
          <div className="col-span-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Status
          </div>
          <div className="col-span-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Aksi
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered?.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">
              {search ? "Teknisi tidak ditemukan" : "Belum ada teknisi"}
            </p>
          </div>
        )}

        {/* Rows */}
        {!isLoading &&
          filtered?.map((tech) => (
            <div
              key={tech.id}
              className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-slate-100 items-center hover:bg-slate-50 transition-colors"
            >
              {/* ID */}
              <div className="col-span-1">
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
                  {tech.technician_id}
                </span>
              </div>

              {/* Name + avatar */}
              <div className="col-span-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-blue-600">
                      {tech.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {tech.name}
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="col-span-3">
                <p className="text-sm text-slate-500">{tech.phone || "—"}</p>
              </div>

              {/* Skills */}
              <div className="col-span-3">
                <div className="flex flex-wrap gap-1">
                  {tech.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="col-span-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tech.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tech.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              {/* Action */}
              <div className="col-span-1">
                {tech.is_active && (
                  <button
                    onClick={() => deactivateMutation.mutate(tech.id)}
                    disabled={deactivateMutation.isPending}
                    className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    Nonaktifkan
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Modal */}
      {showForm && (
        <AddTechnicianModal
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </PageLayout>
  );
}

// ── Add Technician Modal ──────────────────────────────────────────────────────

const SKILL_OPTIONS = ["cleaning", "install", "service"];

function AddTechnicianModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: nextId } = useNextTechnicianId();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState<string[]>(["cleaning"]);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const technicianId = nextId ?? "—";
  const email = `teknisi_${technicianId}@milba-tech.com`;

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (skills.length === 0) {
      setError("Pilih minimal satu keahlian.");
      return;
    }
    if (pin.length !== 6) {
      setError("PIN harus tepat 6 digit.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Create auth user
      // Note: supabase.auth.admin requires service role key.
      // For production, use a Supabase Edge Function.
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password: pin,
          email_confirm: true,
        });

      if (authError) throw authError;

      // 2. Insert technician profile
      const { error: profileError } = await supabase
        .from("technicians")
        .insert({
          id: authData.user.id,
          name,
          phone,
          skills,
          is_active: true,
        });

      if (profileError) throw profileError;

      onSuccess();
    } catch (err: any) {
      setError(err.message ?? "Gagal menambahkan teknisi");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">
            Tambah Teknisi
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Auto-assigned ID preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-5">
          <p className="text-xs text-slate-500 mb-0.5">ID Teknisi (otomatis)</p>
          <p className="font-mono font-bold text-slate-800">{technicianId}</p>
          <p className="text-xs text-slate-400 mt-0.5">Login: {email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Nama Lengkap *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Budi Santoso"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Nomor Telepon *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0812-3456-7890"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Skills */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Keahlian *
            </label>
            <div className="flex gap-2">
              {SKILL_OPTIONS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    skills.includes(skill)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* PIN */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              PIN (6 digit) *
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••"
              maxLength={6}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div
              className="bg-red-50 border border-red-200
                                        rounded-lg px-3 py-2"
            >
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isLoading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
