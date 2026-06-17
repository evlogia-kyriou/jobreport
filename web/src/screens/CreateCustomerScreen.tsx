import { PageLayout } from '@/components/shared/PageLayout'
import { useCreateCustomer } from '@/hooks/useCustomers'
import type {
    CustomerSource,
    CustomerStage,
    CustomerType,
    PhoneLabel,
} from '@/types/app'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

// ── Phone row type ────────────────────────────────────────────────────────────

interface PhoneRow {
    phone: string
    label: PhoneLabel
    is_primary: boolean
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function CreateCustomerScreen() {
    const navigate = useNavigate()
    const createCustomer = useCreateCustomer()

    // ── Form state ────────────────────────────────────────────────────────────

    const [type, setType] = useState<CustomerType>('company')
    const [name, setName] = useState('')
    const [picName, setPicName] = useState('')
    const [stage, setStage] = useState<CustomerStage>('active')
    const [source, setSource] = useState<CustomerSource>('existing')
    const [notes, setNotes] = useState('')

    const [phones, setPhones] = useState<PhoneRow[]>([
        { phone: '', label: 'utama', is_primary: true }
    ])

    const [error, setError] = useState<string | null>(null)

    // ── Phone management ──────────────────────────────────────────────────────

    function addPhone() {
        setPhones(prev => [
            ...prev,
            { phone: '', label: 'lainnya', is_primary: false }
        ])
    }

    function removePhone(index: number) {
        setPhones(prev => {
            const next = prev.filter((_, i) => i !== index)
            // Ensure one primary always exists
            if (!next.some(p => p.is_primary) && next.length > 0) {
                next[0].is_primary = true
            }
            return next
        })
    }

    function updatePhone(index: number, field: keyof PhoneRow, value: string | boolean) {
        setPhones(prev => prev.map((p, i) => {
            if (i !== index) {
                // If setting primary, unset others
                if (field === 'is_primary' && value === true) {
                    return { ...p, is_primary: false }
                }
                return p
            }
            return { ...p, [field]: value }
        }))
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        const validPhones = phones.filter(p => p.phone.trim())
        if (validPhones.length === 0) {
            setError('Minimal satu nomor telepon diperlukan.')
            return
        }

        try {
            const customer = await createCustomer.mutateAsync({
                type,
                name: name.trim(),
                pic_name: type === 'person' ? name.trim() : picName.trim(),
                stage,
                source,
                notes: notes.trim() || undefined,
            })

            // Insert phones separately
            // Note: createCustomer hook handles customer row only
            // Phones inserted via supabase directly here
            const { supabase } = await import('@/lib/supabase')
            if (validPhones.length > 0) {
                await supabase.from('customer_phones').insert(
                    validPhones.map(p => ({
                        customer_id: customer.id,
                        phone: p.phone.trim(),
                        label: p.label,
                        is_primary: p.is_primary,
                    }))
                )
            }

            navigate({
                to: '/customers/$customerId',
                params: { customerId: customer.id }
            })

        } catch (err: any) {
            setError(err.message ?? 'Gagal membuat pelanggan.')
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <PageLayout
            title="Tambah Pelanggan"
            subtitle="Isi informasi pelanggan baru"
            action={
                <Link
                    to="/customers"
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
                >
                    Batalkan
                </Link>
            }
        >
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-3 gap-6">

                    {/* Left — main form */}
                    <div className="col-span-2 space-y-6">

                        {/* Type selector */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h2 className="font-semibold text-slate-800 mb-4">
                                Tipe Pelanggan
                            </h2>
                            <div className="grid grid-cols-2 gap-3">
                                {([
                                    {
                                        value: 'company',
                                        label: 'Perusahaan',
                                        desc: 'CV, PT, atau organisasi',
                                        icon: '🏢',
                                    },
                                    {
                                        value: 'person',
                                        label: 'Perorangan',
                                        desc: 'Individu atau rumah tangga',
                                        icon: '👤',
                                    },
                                ] as { value: CustomerType; label: string; desc: string; icon: string }[])
                                    .map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => {
                                                setType(t.value)
                                                if (t.value === 'person') setPicName('')
                                            }}
                                            className={`px-4 py-4 rounded-xl border-2
                                                      text-left transition-colors ${type === t.value
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">{t.icon}</div>
                                            <p className={`font-medium text-sm ${type === t.value
                                                    ? 'text-blue-700'
                                                    : 'text-slate-700'
                                                }`}>
                                                {t.label}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {t.desc}
                                            </p>
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

                                {/* Name */}
                                <Field
                                    label={type === 'company'
                                        ? 'Nama Perusahaan *'
                                        : 'Nama Lengkap *'
                                    }
                                >
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder={type === 'company'
                                            ? 'PT Maju Jaya Abadi'
                                            : 'Budi Santoso'
                                        }
                                        required
                                        className={inputClass}
                                    />
                                </Field>

                                {/* PIC — only for company */}
                                {type === 'company' && (
                                    <Field label="Nama PIC *">
                                        <input
                                            type="text"
                                            value={picName}
                                            onChange={e => setPicName(e.target.value)}
                                            placeholder="Ahmad Wijaya"
                                            required
                                            className={inputClass}
                                        />
                                        <p className="text-xs text-slate-400 mt-1">
                                            Person In Charge — yang dihubungi di lapangan
                                        </p>
                                    </Field>
                                )}

                                {/* Stage + Source */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Stage *">
                                        <select
                                            value={stage}
                                            onChange={e => setStage(e.target.value as CustomerStage)}
                                            className={selectClass}
                                        >
                                            <option value="prospect">Prospek</option>
                                            <option value="active">Aktif</option>
                                            <option value="dormant">Tidak Aktif</option>
                                        </select>
                                    </Field>

                                    <Field label="Sumber *">
                                        <select
                                            value={source}
                                            onChange={e => setSource(e.target.value as CustomerSource)}
                                            className={selectClass}
                                        >
                                            <option value="existing">Existing</option>
                                            <option value="referral">Referral</option>
                                            <option value="canvassing">Canvassing</option>
                                            <option value="social_media">Social Media</option>
                                            <option value="walk_in">Walk-in</option>
                                        </select>
                                    </Field>
                                </div>

                                {/* Notes */}
                                <Field label="Catatan">
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Catatan umum tentang pelanggan ini..."
                                        rows={3}
                                        className={`${inputClass} resize-none`}
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* Phone numbers */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-slate-800">
                                    Nomor Telepon
                                </h2>
                                <button
                                    type="button"
                                    onClick={addPhone}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    + Tambah Nomor
                                </button>
                            </div>

                            <div className="space-y-3">
                                {phones.map((phone, index) => (
                                    <div
                                        key={index}
                                        className="grid grid-cols-12 gap-3 items-center"
                                    >
                                        {/* Phone number */}
                                        <div className="col-span-5">
                                            <input
                                                type="tel"
                                                value={phone.phone}
                                                onChange={e =>
                                                    updatePhone(index, 'phone', e.target.value)
                                                }
                                                placeholder="0812-3456-7890"
                                                className={inputClass}
                                            />
                                        </div>

                                        {/* Label */}
                                        <div className="col-span-3">
                                            <select
                                                value={phone.label}
                                                onChange={e =>
                                                    updatePhone(index, 'label', e.target.value)
                                                }
                                                className={selectClass}
                                            >
                                                <option value="utama">Utama</option>
                                                <option value="kantor">Kantor</option>
                                                <option value="whatsapp">WhatsApp</option>
                                                <option value="lainnya">Lainnya</option>
                                            </select>
                                        </div>

                                        {/* Primary toggle */}
                                        <div className="col-span-3 flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="primary_phone"
                                                checked={phone.is_primary}
                                                onChange={() =>
                                                    updatePhone(index, 'is_primary', true)
                                                }
                                                className="accent-blue-600"
                                            />
                                            <span className="text-xs text-slate-500">
                                                Utama
                                            </span>
                                        </div>

                                        {/* Remove */}
                                        <div className="col-span-1 flex justify-end">
                                            {phones.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removePhone(index)}
                                                    className="text-red-400 hover:text-red-600 text-lg leading-none"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right — summary + submit */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-slate-200
                                        p-5 sticky top-6">
                            <h2 className="font-semibold text-slate-800 mb-4">
                                Ringkasan
                            </h2>

                            <div className="space-y-3 mb-6">
                                <SummaryRow
                                    label="Tipe"
                                    value={type === 'company'
                                        ? 'Perusahaan'
                                        : 'Perorangan'
                                    }
                                />
                                <SummaryRow
                                    label="Nama"
                                    value={name || '—'}
                                />
                                {type === 'company' && (
                                    <SummaryRow
                                        label="PIC"
                                        value={picName || '—'}
                                    />
                                )}
                                <SummaryRow
                                    label="Stage"
                                    value={stageLabel(stage)}
                                />
                                <SummaryRow
                                    label="Sumber"
                                    value={sourceLabel(source)}
                                />
                                <SummaryRow
                                    label="Telepon"
                                    value={`${phones.filter(p => p.phone).length} nomor`}
                                />
                            </div>

                            {/* Next step hint */}
                            <div className="bg-blue-50 border border-blue-100
                                            rounded-lg p-3 mb-4">
                                <p className="text-xs text-blue-700">
                                    Setelah menyimpan, tambahkan lokasi untuk
                                    pelanggan ini sebelum membuat proyek.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200
                                                rounded-lg px-3 py-2 mb-4">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={createCustomer.isPending}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                {createCustomer.isPending
                                    ? 'Menyimpan...'
                                    : 'Simpan Pelanggan'
                                }
                            </button>

                            <p className="text-xs text-slate-400 text-center mt-3">
                                Lokasi ditambahkan di langkah berikutnya
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </PageLayout>
    )
}

// ── Sub components ────────────────────────────────────────────────────────────

function Field({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
                {label}
            </label>
            {children}
        </div>
    )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between py-1.5 border-b border-slate-100 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-800 text-right
                             max-w-32 truncate capitalize">
                {value}
            </span>
        </div>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputClass = `
    w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
`.trim()

const selectClass = `
    w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
`.trim()

// ── Helpers ───────────────────────────────────────────────────────────────────

function stageLabel(stage: CustomerStage): string {
    return {
        prospect: 'Prospek',
        active: 'Aktif',
        suggested_dormant: 'Perlu Ditinjau',
        dormant: 'Tidak Aktif',
        churned: 'Berhenti',
    }[stage] ?? stage
}

function sourceLabel(source: CustomerSource): string {
    return {
        existing: 'Existing',
        referral: 'Referral',
        canvassing: 'Canvassing',
        social_media: 'Social Media',
        walk_in: 'Walk-in',
    }[source] ?? source
}