import { technicianRepository } from "@/repositories/technicianRepository";
import { useAuthStore } from "@/stores/authStore";
import type { Technician } from "@/types/app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const SKILL_OPTIONS = ["cleaning", "service", "install"] as const;
const REASONS = [
  "Perubahan data",
  "Koreksi kesalahan",
  "Perubahan keahlian",
  "Nonaktifkan teknisi",
  "Lainnya",
];

export function EditTechnicianModal({
  technician,
  onClose,
}: {
  technician: Technician;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [name, setName] = useState(technician.name);
  const [phone, setPhone] = useState(technician.phone ?? "");
  const [skills, setSkills] = useState<string[]>(technician.skills);
  const [active, setActive] = useState(technician.is_active);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      technicianRepository.updateTechnician({
        id: technician.id,
        name: name.trim(),
        phone: phone.trim(),
        skills,
        is_active: active,
        editedBy: user?.id ?? "",
        reason,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians"] });
      onClose();
    },
    onError: (e: any) => setError(e?.message ?? "Gagal menyimpan perubahan."),
  });

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  const canSave =
    name.trim() &&
    skills.length > 0 &&
    reason !== "" &&
    (reason !== "Lainnya" || notes.trim()) &&
    !mutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm mx-4 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-0">
          <p className="text-base font-medium text-slate-800 mb-0.5">
            Edit teknisi
          </p>
          <p className="text-sm text-slate-400 mb-5">
            {technician.name} · {technician.technician_id}
          </p>
        </div>

        <div className="px-6 pb-0 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Nama lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-slate-400"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Nomor telepon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-slate-400"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Keahlian
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

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2 border border-slate-200 rounded-lg px-3">
            <span className="text-sm text-slate-700">Status aktif</span>
            <button
              type="button"
              onClick={() => setActive((a) => !a)}
              className={`relative w-10 h-5 rounded-full transition-colors ${active ? "bg-green-500" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? "left-5.5 translate-x-0" : "left-0.5"}`}
              />
            </button>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Alasan perubahan <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setNotes("");
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-slate-400"
            >
              <option value="">Pilih alasan...</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reason === "Lainnya" && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">
                Keterangan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Wajib diisi..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none resize-none focus:border-slate-400"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 p-6 pt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-40"
          >
            {mutation.isPending ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
