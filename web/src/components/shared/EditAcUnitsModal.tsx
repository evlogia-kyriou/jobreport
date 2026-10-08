import {
  useAddAcUnit,
  useAvailableAcUnits,
  useRemoveAcUnit,
} from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";

const AC_UNIT_REASONS = ["Kesalahan input", "Perubahan unit AC", "Lainnya"];

interface EditAcUnitsModalProps {
  ticketId: string;
  locationId: string;
  onClose: () => void;
}

function fmtUnit(u: any): string {
  const bu = u.building_unit;
  const parts = [bu?.floor, bu?.room, bu?.zone_label].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : u.unit_label || u.ac_code;
}

export function EditAcUnitsModal({
  ticketId,
  locationId,
  onClose,
}: EditAcUnitsModalProps) {
  const { user } = useAuthStore();
  const addAcUnit = useAddAcUnit();
  const removeAcUnit = useRemoveAcUnit();
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: units = [], isLoading } = useAvailableAcUnits(
    ticketId,
    locationId,
  );

  const assigned = units.filter((u: any) => u.isAssigned);
  const available = units.filter((u: any) => !u.isAssigned);

  const isLainnya = reason === "Lainnya";
  const notesEmpty = isLainnya && !notes.trim();
  const canAct = reason !== "" && !notesEmpty;

  async function handleAdd(acUnitId: string) {
    if (!canAct) return;
    setActionError(null);
    try {
      await addAcUnit.mutateAsync({
        ticketId,
        acUnitId,
        editedBy: user?.id ?? "",
        reason,
        notes: notes.trim() || undefined,
      });
    } catch (e: any) {
      setActionError(e.message ?? "Gagal menambahkan unit.");
    }
  }

  async function handleRemove(acUnitId: string) {
    if (!canAct) return;
    setActionError(null);
    try {
      await removeAcUnit.mutateAsync({
        ticketId,
        acUnitId,
        editedBy: user?.id ?? "",
        reason,
        notes: notes.trim() || undefined,
      });
    } catch (e: any) {
      setActionError(e.message ?? "Gagal menghapus unit.");
    }
  }

  const isPending = addAcUnit.isPending || removeAcUnit.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <i
              className="ti ti-air-conditioning text-blue-600"
              style={{ fontSize: 20 }}
              aria-hidden="true"
            />
          </div>
          <p className="text-base font-medium text-slate-800 mb-1">
            Edit unit AC
          </p>
          <p className="text-sm text-slate-500">
            Tambah atau hapus unit AC dari tiket ini.
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {/* Reason — required before any action */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Alasan perubahan <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setActionError(null);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-slate-400"
            >
              <option value="">Pilih alasan terlebih dahulu...</option>
              {AC_UNIT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Catatan{isLainnya && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={
                isLainnya ? "Wajib diisi..." : "Tambahkan keterangan (opsional)"
              }
              className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 bg-white outline-none resize-none ${
                notesEmpty
                  ? "border-red-300"
                  : "border-slate-200 focus:border-slate-400"
              }`}
            />
          </div>

          {actionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          )}

          {/* Reason reminder */}
          {!canAct && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              Pilih alasan terlebih dahulu sebelum menambah atau menghapus unit.
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-sm text-slate-400">
              Memuat unit AC...
            </div>
          ) : (
            <>
              {/* Assigned units */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Unit terdaftar ({assigned.length})
                </p>
                {assigned.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Belum ada unit AC.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {assigned.map((u: any) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {fmtUnit(u)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {u.type} · {u.capacity_pk} · {u.ac_code}
                          </p>
                        </div>
                        {u.isApproved ? (
                          <span className="text-xs text-green-600 font-medium px-2 py-0.5 bg-green-50 rounded-full border border-green-200 flex-shrink-0">
                            Disetujui
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRemove(u.id)}
                            disabled={!canAct || isPending}
                            className="flex-shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Hapus unit ini dari tiket"
                          >
                            <i
                              className="ti ti-trash"
                              style={{ fontSize: 14 }}
                              aria-hidden="true"
                            />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available units */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Tersedia untuk ditambahkan ({available.length})
                </p>
                {available.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Semua unit AC di lokasi ini sudah terdaftar.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {available.map((u: any) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 px-3 py-2.5 bg-white border border-slate-200 rounded-xl"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {fmtUnit(u)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {u.type} · {u.capacity_pk} · {u.ac_code}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAdd(u.id)}
                          disabled={!canAct || isPending}
                          className="flex-shrink-0 p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Tambahkan unit ini ke tiket"
                        >
                          <i
                            className="ti ti-plus"
                            style={{ fontSize: 14 }}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
