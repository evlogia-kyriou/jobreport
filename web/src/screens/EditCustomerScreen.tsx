import { PageLayout } from "@/components/shared/PageLayout";
import { useCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { supabase } from "@/lib/supabase";
import type {
  CustomerSource,
  CustomerStage,
  CustomerType,
  PhoneLabel,
} from "@/types/app";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";

// ── Phone row type ─────────────────────────────────────────────────────────────

interface PhoneRow {
  id?: string; // existing phone DB id (undefined = new)
  phone: string;
  label: PhoneLabel;
  is_primary: boolean;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function EditCustomerScreen() {
  const { customerId } = useParams({ strict: false }) as { customerId: string };
  const navigate = useNavigate();
  const updateCustomer = useUpdateCustomer();

  const { data: customer, isLoading } = useCustomer(customerId);

  // ── Form state ─────────────────────────────────────────────────────────────

  const [type, setType] = useState<CustomerType>("company");
  const [name, setName] = useState("");
  const [picName, setPicName] = useState("");
  const [stage, setStage] = useState<CustomerStage>("active");
  const [source, setSource] = useState<CustomerSource>("existing");
  const [notes, setNotes] = useState("");
  const [phones, setPhones] = useState<PhoneRow[]>([
    { phone: "", label: "utama", is_primary: true },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  // ── Seed form when customer loads ──────────────────────────────────────────

  useEffect(() => {
    if (!customer || seeded) return;

    setType(customer.type as CustomerType);
    setName(customer.name ?? "");
    setPicName(customer.pic_name ?? "");
    setStage(customer.stage as CustomerStage);
    setSource((customer.source as CustomerSource) ?? "existing");
    setNotes(customer.notes ?? "");

    // Load phones
    supabase
      .from("customer_phones")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_primary", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPhones(
            data.map((p) => ({
              id: p.id,
              phone: p.phone,
              label: p.label as PhoneLabel,
              is_primary: p.is_primary,
            })),
          );
        }
      });

    setSeeded(true);
  }, [customer, seeded, customerId]);

  // ── Phone management ───────────────────────────────────────────────────────

  function addPhone() {
    setPhones((prev) => [
      ...prev,
      { phone: "", label: "lainnya", is_primary: false },
    ]);
  }

  function removePhone(index: number) {
    setPhones((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (!next.some((p) => p.is_primary) && next.length > 0) {
        next[0].is_primary = true;
      }
      return next;
    });
  }

  function updatePhone(
    index: number,
    field: keyof PhoneRow,
    value: string | boolean,
  ) {
    setPhones((prev) =>
      prev.map((p, i) => {
        if (i !== index) {
          if (field === "is_primary" && value === true) {
            return { ...p, is_primary: false };
          }
          return p;
        }
        return { ...p, [field]: value };
      }),
    );
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validPhones = phones.filter((p) => p.phone.trim());
    if (validPhones.length === 0) {
      setError("Minimal satu nomor telepon diperlukan.");
      return;
    }

    try {
      // 1. Update customer record
      await updateCustomer.mutateAsync({
        customerId: customerId!,
        payload: {
          type,
          name: name.trim(),
          pic_name: type === "person" ? name.trim() : picName.trim(),
          stage,
          source,
          notes: notes.trim() || undefined,
        },
      });

      // 2. Replace all phones: delete then re-insert
      await supabase
        .from("customer_phones")
        .delete()
        .eq("customer_id", customerId);

      await supabase.from("customer_phones").insert(
        validPhones.map((p) => ({
          customer_id: customerId,
          phone: p.phone.trim(),
          label: p.label,
          is_primary: p.is_primary,
        })),
      );

      navigate({
        to: "/customers/$customerId",
        params: { customerId: customerId! },
      });
    } catch (err: any) {
      setError(err.message ?? "Gagal menyimpan perubahan.");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading || !seeded) {
    return (
      <PageLayout title="Edit Pelanggan">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-slate-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </PageLayout>
    );
  }

  if (!customer) {
    return (
      <PageLayout title="Edit Pelanggan">
        <p className="text-red-500 text-sm">Pelanggan tidak ditemukan.</p>
      </PageLayout>
    );
  }

  const isSaving = updateCustomer.isPending;

  return (
    <PageLayout
      title="Edit Pelanggan"
      subtitle={customer.name}
      action={
        <Link
          to="/customers/$customerId"
          params={{ customerId: customerId! }}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
        >
          Batalkan
        </Link>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-6">
          {/* ── Left — main form ── */}
          <div className="col-span-2 space-y-6">
            {/* Type selector */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">
                Tipe Pelanggan
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    {
                      value: "company",
                      label: "Perusahaan",
                      desc: "CV, PT, atau organisasi",
                      icon: "🏢",
                    },
                    {
                      value: "person",
                      label: "Perorangan",
                      desc: "Individu atau rumah tangga",
                      icon: "👤",
                    },
                  ] as {
                    value: CustomerType;
                    label: string;
                    desc: string;
                    icon: string;
                  }[]
                ).map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setType(t.value);
                      if (t.value === "person") setPicName("");
                    }}
                    className={`px-4 py-4 rounded-xl border-2 text-left transition-colors ${
                      type === t.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-2xl mb-1">{t.icon}</div>
                    <p
                      className={`font-medium text-sm ${type === t.value ? "text-blue-700" : "text-slate-700"}`}
                    >
                      {t.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic info */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">
                Informasi Dasar
              </h2>
              <div className="space-y-4">
                <Field
                  label={
                    type === "company" ? "Nama Perusahaan *" : "Nama Lengkap *"
                  }
                >
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      type === "company" ? "PT Maju Jaya" : "Budi Santoso"
                    }
                    required
                    className={inputClass}
                  />
                </Field>

                {type === "company" && (
                  <Field label="Nama PIC *">
                    <input
                      type="text"
                      value={picName}
                      onChange={(e) => setPicName(e.target.value)}
                      placeholder="Nama penanggungjawab / kontak utama"
                      required
                      className={inputClass}
                    />
                  </Field>
                )}

                <Field label="Stage *">
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as CustomerStage)}
                    className={inputClass}
                  >
                    <option value="prospect">Prospek</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </Field>

                <Field label="Sumber">
                  <select
                    value={source}
                    onChange={(e) =>
                      setSource(e.target.value as CustomerSource)
                    }
                    className={inputClass}
                  >
                    <option value="existing">Pelanggan Lama</option>
                    <option value="referral">Referral</option>
                    <option value="cold_outreach">Cold Outreach</option>
                    <option value="website">Website</option>
                    <option value="social_media">Media Sosial</option>
                    <option value="other">Lainnya</option>
                  </select>
                </Field>

                <Field label="Catatan">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Informasi tambahan tentang pelanggan..."
                    className={`${inputClass} resize-none`}
                  />
                </Field>
              </div>
            </div>

            {/* Phones */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">Nomor Telepon</h2>
                <button
                  type="button"
                  onClick={addPhone}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Tambah Nomor
                </button>
              </div>

              <div className="space-y-3">
                {phones.map((phone, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="col-span-5">
                      <input
                        type="tel"
                        value={phone.phone}
                        onChange={(e) =>
                          updatePhone(i, "phone", e.target.value)
                        }
                        placeholder="08xx-xxxx-xxxx"
                        className={inputClass}
                      />
                    </div>
                    <select
                      value={phone.label}
                      onChange={(e) => updatePhone(i, "label", e.target.value)}
                      className={`${inputClass} w-32`}
                    >
                      <option value="utama">Utama</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="kantor">Kantor</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                    <label className="flex items-center gap-1.5 pt-2 shrink-0">
                      <input
                        type="radio"
                        name="primary_phone"
                        checked={phone.is_primary}
                        onChange={() => updatePhone(i, "is_primary", true)}
                        className="accent-blue-600"
                      />
                      <span className="text-xs text-slate-500">Utama</span>
                    </label>
                    {phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhone(i)}
                        className="pt-2 text-slate-400 hover:text-red-500 shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right — summary ── */}
          <div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-6">
              <h2 className="font-semibold text-slate-800 mb-4">Ringkasan</h2>

              <div className="space-y-3 mb-6">
                <SummaryRow
                  label="Tipe"
                  value={type === "company" ? "Perusahaan" : "Perorangan"}
                />
                <SummaryRow label="Nama" value={name || "—"} />
                {type === "company" && (
                  <SummaryRow label="PIC" value={picName || "—"} />
                )}
                <SummaryRow
                  label="Stage"
                  value={STAGE_LABELS[stage] ?? stage}
                />
                <SummaryRow
                  label="Telepon"
                  value={phones.filter((p) => p.phone).length + " nomor"}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isSaving ||
                  !name.trim() ||
                  (type === "company" && !picName.trim())
                }
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}

// ── Sub components ─────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-100 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right max-w-36 truncate">
        {value}
      </span>
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospek",
  active: "Aktif",
  inactive: "Tidak Aktif",
};

const inputClass = `
    w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
    disabled:bg-slate-50 disabled:text-slate-400
`.trim();
