import { PageLayout } from "@/components/shared/PageLayout";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Threshold {
  key: string;
  value: string;
  unit: string;
  description: string;
}
interface Setting {
  key: string;
  value: string;
  description: string;
}
interface Brand {
  id: string;
  name: string;
}
interface TipeBangunanGroup {
  id: string;
  label: string;
  sort_order: number;
}
interface TipeBangunan {
  id: string;
  group_id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}
interface KategoriFungsi {
  id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}
interface RoomName {
  id: string;
  kategori_id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const fetchThresholds = async () =>
  (await supabase.from("ref_thresholds").select("*").order("key"))
    .data as Threshold[];
const fetchSettings = async () =>
  (await supabase.from("system_settings").select("*").order("key"))
    .data as Setting[];
const fetchBrands = async () =>
  (await supabase.from("ac_brands").select("id, name").order("name"))
    .data as Brand[];
const fetchTipeGroups = async () =>
  (
    await supabase
      .from("ref_tipe_bangunan_groups")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
  ).data as TipeBangunanGroup[];
const fetchTipeBangunan = async () =>
  (
    await supabase
      .from("ref_tipe_bangunan")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
  ).data as TipeBangunan[];
const fetchKategori = async () =>
  (
    await supabase
      .from("ref_kategori_fungsi")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
  ).data as KategoriFungsi[];
const fetchRoomNames = async () =>
  (
    await supabase
      .from("ref_room_names")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
  ).data as RoomName[];

// ── Screen ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "sop", label: "Pengukuran & SOP" },
  { id: "brands", label: "Merek AC" },
  { id: "bangunan", label: "Tipe Bangunan" },
  { id: "fungsi", label: "Kategori Fungsi" },
  { id: "rooms", label: "Nama Ruangan" },
];

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState("sop");

  return (
    <PageLayout title="Pengaturan" subtitle="Kelola konfigurasi sistem MILBA">
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "sop" && <SopTab />}
      {activeTab === "brands" && <BrandsTab />}
      {activeTab === "bangunan" && <BangunanTab />}
      {activeTab === "fungsi" && <FungsiTab />}
      {activeTab === "rooms" && <RoomsTab />}
    </PageLayout>
  );
}

// ── SOP Tab ───────────────────────────────────────────────────────────────────

function SopTab() {
  const qc = useQueryClient();
  const { data: thresholds = [] } = useQuery({
    queryKey: ["thresholds"],
    queryFn: fetchThresholds,
  });
  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(
    table: "ref_thresholds" | "system_settings",
    key: string,
  ) {
    setSaving(true);
    setError(null);
    const { error: e } = await supabase
      .from(table)
      .update({ value: editVal, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (e) {
      setError("Gagal menyimpan.");
      setSaving(false);
      return;
    }
    qc.invalidateQueries({
      queryKey: [table === "ref_thresholds" ? "thresholds" : "settings"],
    });
    setEditing(null);
    setSaving(false);
  }

  const thresholdRows = [
    {
      key: "suhu_akhir_max",
      label: "Suhu akhir maksimum",
      desc: "Teknisi diblokir jika Suhu Akhir ≥ nilai ini",
      table: "ref_thresholds" as const,
      unit: "°C",
    },
    {
      key: "arus_drop_min_pct",
      label: "Penurunan arus minimum",
      desc: "Peringatan jika penurunan arus < nilai ini",
      table: "ref_thresholds" as const,
      unit: "%",
    },
    {
      key: "cleaning_interval_days",
      label: "Interval pembersihan",
      desc: "Jadwal pembersihan berikutnya dihitung dari nilai ini",
      table: "system_settings" as const,
      unit: "hari",
    },
    {
      key: "due_soon_days",
      label: "Batas waktu peringatan",
      desc: "Tiket ditampilkan sebagai 'akan jatuh tempo'",
      table: "system_settings" as const,
      unit: "hari",
    },
  ];

  const getValue = (key: string) => {
    return (
      thresholds.find((t) => t.key === key)?.value ??
      settings.find((s) => s.key === key)?.value ??
      "—"
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
        <i className="ti ti-alert-triangle text-sm mr-1" aria-hidden="true" />
        Perubahan ambang batas berlaku langsung pada aplikasi teknisi.
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {thresholdRows.map((row) => (
          <div key={row.key}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {row.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{row.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-slate-800">
                  {getValue(row.key)}
                </span>
                <span className="text-xs text-slate-400">{row.unit}</span>
                <button
                  onClick={() => {
                    setEditing(row.key);
                    setEditVal(getValue(row.key));
                    setError(null);
                  }}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
              </div>
            </div>
            {editing === row.key && (
              <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border-b border-blue-100">
                <input
                  type="number"
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  className="w-28 px-3 py-1.5 text-sm border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  step="0.5"
                  min="0"
                  autoFocus
                />
                <span className="text-sm text-slate-500">{row.unit}</span>
                <button
                  onClick={() => save(row.table, row.key)}
                  disabled={saving}
                  className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-white"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Brands Tab ────────────────────────────────────────────────────────────────

function BrandsTab() {
  const qc = useQueryClient();
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: fetchBrands,
  });
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addBrand() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase
      .from("ac_brands")
      .insert({ name: newName.trim() });
    if (e) {
      setError("Gagal menambah merek.");
      setSaving(false);
      return;
    }
    qc.invalidateQueries({ queryKey: ["brands"] });
    setNewName("");
    setAdding(false);
    setSaving(false);
  }

  async function renameBrand() {
    if (!editName.trim() || !editId) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase
      .from("ac_brands")
      .update({ name: editName.trim() })
      .eq("id", editId);
    if (e) {
      setError("Gagal mengubah nama.");
      setSaving(false);
      return;
    }
    qc.invalidateQueries({ queryKey: ["brands"] });
    setEditId(null);
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-800">Merek AC</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {brands.length} merek terdaftar
            </p>
          </div>
          <button
            onClick={() => {
              setAdding(true);
              setNewName("");
            }}
            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            + Tambah merek
          </button>
        </div>

        {adding && (
          <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border-b border-blue-100">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama merek baru..."
              className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addBrand()}
            />
            <button
              onClick={addBrand}
              disabled={saving || !newName.trim()}
              className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "..." : "Simpan"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-white"
            >
              Batal
            </button>
          </div>
        )}

        <div className="divide-y divide-slate-50">
          {brands.map((b) => (
            <div key={b.id}>
              {editId === b.id ? (
                <div className="flex items-center gap-3 px-5 py-3 bg-blue-50">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && renameBrand()}
                  />
                  <button
                    onClick={renameBrand}
                    disabled={saving}
                    className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-white"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-slate-700">{b.name}</span>
                  <button
                    onClick={() => {
                      setEditId(b.id);
                      setEditName(b.name);
                    }}
                    className="text-xs px-3 py-1 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"
                  >
                    Ubah nama
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tipe Bangunan Tab ─────────────────────────────────────────────────────────

function BangunanTab() {
  const qc = useQueryClient();
  const { data: groups = [] } = useQuery({
    queryKey: ["tipe-groups"],
    queryFn: fetchTipeGroups,
  });
  const { data: types = [] } = useQuery({
    queryKey: ["tipe-bangunan"],
    queryFn: fetchTipeBangunan,
  });
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addType(groupId: string) {
    if (!newLabel.trim()) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.from("ref_tipe_bangunan").insert({
      group_id: groupId,
      label: newLabel.trim(),
      sort_order: types.filter((t) => t.group_id === groupId).length + 1,
      is_active: true,
    });
    if (e) {
      setError("Gagal menambah tipe.");
      setSaving(false);
      return;
    }
    qc.invalidateQueries({ queryKey: ["tipe-bangunan"] });
    setNewLabel("");
    setAddingTo(null);
    setSaving(false);
  }

  async function deactivateType(id: string) {
    const { error: e } = await supabase
      .from("ref_tipe_bangunan")
      .update({ is_active: false })
      .eq("id", id);
    if (e) {
      setError("Gagal menghapus.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["tipe-bangunan"] });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
      {groups.map((g) => {
        const groupTypes = types.filter((t) => t.group_id === g.id);
        return (
          <div
            key={g.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <p className="text-sm font-medium text-slate-800">{g.label}</p>
              <button
                onClick={() => {
                  setAddingTo(g.id);
                  setNewLabel("");
                }}
                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100"
              >
                + Tambah
              </button>
            </div>
            {addingTo === g.id && (
              <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border-b border-blue-100">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Nama tipe bangunan..."
                  className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && addType(g.id)}
                />
                <button
                  onClick={() => addType(g.id)}
                  disabled={saving || !newLabel.trim()}
                  className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? "..." : "Simpan"}
                </button>
                <button
                  onClick={() => setAddingTo(null)}
                  className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-white"
                >
                  Batal
                </button>
              </div>
            )}
            <div className="divide-y divide-slate-50">
              {groupTypes.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-400">
                  Belum ada tipe — tambahkan di atas
                </p>
              )}
              {groupTypes.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <span className="text-sm text-slate-700">{t.label}</span>
                  <button
                    onClick={() => deactivateType(t.id)}
                    className="text-xs px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  >
                    <i className="ti ti-trash text-xs" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Kategori Fungsi Tab ───────────────────────────────────────────────────────

function FungsiTab() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["kategori"],
    queryFn: fetchKategori,
  });
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addItem() {
    if (!newLabel.trim()) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.from("ref_kategori_fungsi").insert({
      label: newLabel.trim(),
      sort_order: items.length + 1,
      is_active: true,
    });
    if (e) {
      setError("Gagal menambah kategori.");
      setSaving(false);
      return;
    }
    qc.invalidateQueries({ queryKey: ["kategori"] });
    setNewLabel("");
    setAdding(false);
    setSaving(false);
  }

  async function deactivate(id: string) {
    await supabase
      .from("ref_kategori_fungsi")
      .update({ is_active: false })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["kategori"] });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
        <i className="ti ti-alert-triangle text-sm mr-1" aria-hidden="true" />
        Menonaktifkan kategori tidak menghapus data lokasi yang sudah
        menggunakan kategori ini.
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-800">
              Kategori fungsi
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {items.length} kategori aktif
            </p>
          </div>
          <button
            onClick={() => {
              setAdding(true);
              setNewLabel("");
            }}
            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            + Tambah
          </button>
        </div>
        {adding && (
          <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border-b border-blue-100">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nama kategori baru..."
              className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <button
              onClick={addItem}
              disabled={saving || !newLabel.trim()}
              className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? "..." : "Simpan"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-white"
            >
              Batal
            </button>
          </div>
        )}
        <div className="divide-y divide-slate-50">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-4">
                  {item.sort_order}
                </span>
                <span className="text-sm text-slate-700">{item.label}</span>
              </div>
              <button
                onClick={() => deactivate(item.id)}
                className="text-xs px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
              >
                <i className="ti ti-trash text-xs" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Nama Ruangan Tab ──────────────────────────────────────────────────────────

function RoomsTab() {
  const qc = useQueryClient();
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: fetchRoomNames,
  });
  const { data: kategori = [] } = useQuery({
    queryKey: ["kategori"],
    queryFn: fetchKategori,
  });
  const [selectedKat, setSelectedKat] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeKat = selectedKat ?? kategori[0]?.id ?? null;

  async function addRoom() {
    if (!newLabel.trim() || !activeKat) return;
    setSaving(true);
    setError(null);
    const katRooms = rooms.filter((r) => r.kategori_id === activeKat);
    const { error: e } = await supabase.from("ref_room_names").insert({
      kategori_id: activeKat,
      label: newLabel.trim(),
      sort_order: katRooms.length + 1,
      is_active: true,
    });
    if (e) {
      setError("Gagal menambah ruangan.");
      setSaving(false);
      return;
    }
    qc.invalidateQueries({ queryKey: ["rooms"] });
    setNewLabel("");
    setAdding(false);
    setSaving(false);
  }

  async function deactivateRoom(id: string) {
    await supabase
      .from("ref_room_names")
      .update({ is_active: false })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["rooms"] });
  }

  const filteredRooms = rooms.filter((r) => r.kategori_id === activeKat);

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <p className="text-sm font-medium text-slate-800 mb-3">Kategori</p>
          <div className="flex flex-wrap gap-2">
            {kategori.map((k) => (
              <button
                key={k.id}
                onClick={() => {
                  setSelectedKat(k.id);
                  setAdding(false);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  activeKat === k.id
                    ? "bg-blue-50 text-blue-700 border-blue-300 font-medium"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {k.label}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {rooms.filter((r) => r.kategori_id === k.id).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-400">
            {filteredRooms.length} nama ruangan ·{" "}
            {kategori.find((k) => k.id === activeKat)?.label}
          </p>
          <button
            onClick={() => {
              setAdding(true);
              setNewLabel("");
            }}
            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            + Tambah ruangan
          </button>
        </div>

        {adding && (
          <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border-b border-blue-100">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nama ruangan baru..."
              className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addRoom()}
            />
            <button
              onClick={addRoom}
              disabled={saving || !newLabel.trim()}
              className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? "..." : "Simpan"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-white"
            >
              Batal
            </button>
          </div>
        )}

        <div className="divide-y divide-slate-50">
          {filteredRooms.length === 0 && (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">
              Belum ada nama ruangan untuk kategori ini.
            </p>
          )}
          {filteredRooms.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between px-5 py-2.5"
            >
              <span className="text-sm text-slate-700">{r.label}</span>
              <button
                onClick={() => deactivateRoom(r.id)}
                className="text-xs px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
              >
                <i className="ti ti-trash text-xs" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
