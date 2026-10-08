/**
 * CustomerListSection
 * Replaces the SearchableSelect for customer picking in CreateProjectScreen.
 *
 * Layout: search bar + always-visible scrollable list
 * Sort:   available customers first, blocked at bottom with divider
 * Selection: radio button + blue border
 * Blocked:   grayed + reason + EntityPopover trigger
 */

import { EntityPopover } from "@/components/shared/EntityPopover";
import type { CustomerAvailability } from "@/repositories/projectRepository";
import type { Customer } from "@/types/app";
import { useMemo, useState } from "react";

interface Props {
  customers: Customer[];
  blockMap: Map<string, CustomerAvailability>;
  selectedId: string;
  onChange: (customer: Customer) => void;
}

export function CustomerListSection({
  customers,
  blockMap,
  selectedId,
  onChange,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q
      ? customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.pic_name?.toLowerCase().includes(q),
        )
      : customers;
  }, [customers, search]);

  // Sort: available first (no block data OR all_blocked=false), blocked below
  const sorted = useMemo(() => {
    const available = filtered.filter((c) => !blockMap.get(c.id)?.all_blocked);
    const blocked = filtered.filter(
      (c) => blockMap.get(c.id)?.all_blocked === true,
    );
    return { available, blocked };
  }, [filtered, blockMap]);

  function renderRow(customer: Customer, isBlocked: boolean) {
    const avail = blockMap.get(customer.id);
    const isSelected = customer.id === selectedId;
    const locCount = avail?.location_count ?? "—";
    const acCount = avail?.total_ac_count ?? "—";

    return (
      <div
        key={customer.id}
        onClick={() => !isBlocked && onChange(customer)}
        className={[
          "flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-colors",
          isSelected
            ? "border-blue-500 bg-blue-50"
            : isBlocked
              ? "border-slate-100 bg-slate-50 cursor-not-allowed opacity-65"
              : "border-slate-200 bg-white cursor-pointer hover:border-blue-300 hover:bg-blue-50/40",
        ].join(" ")}
      >
        {/* Radio */}
        <div
          className={[
            "mt-0.5 w-3.5 h-3.5 min-w-[14px] rounded-full border-[1.5px] flex items-center justify-center",
            isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300",
          ].join(" ")}
        >
          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${isBlocked ? "text-slate-400" : "text-slate-800"}`}
          >
            {customer.name}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {customer.pic_name}
            {locCount !== "—" && <> &nbsp;·&nbsp; {locCount} lokasi</>}
            {acCount !== "—" && <> &nbsp;·&nbsp; {acCount} unit AC</>}
          </p>
          {isBlocked && (
            <p className="text-xs text-red-500 mt-1">
              Tidak tersedia ·{" "}
              <EntityPopover
                trigger={
                  <button
                    type="button"
                    className="underline decoration-dotted hover:text-red-600"
                  >
                    Semua lokasi sedang aktif ↗
                  </button>
                }
                config={{ kind: "customer", customerId: customer.id }}
              />
            </p>
          )}
        </div>

        {/* Status badge */}
        {!isBlocked && (
          <span className="text-xs font-medium text-green-600 shrink-0 mt-0.5">
            Tersedia ✓
          </span>
        )}
        {isBlocked && (
          <span className="text-xs font-medium text-red-400 shrink-0 mt-0.5">
            Tidak tersedia
          </span>
        )}
      </div>
    );
  }

  const hasBlocked = sorted.blocked.length > 0;

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari pelanggan..."
        className="w-full px-3 py-2 mb-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />

      {/* List */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
        {/* Available */}
        {sorted.available.map((c) => renderRow(c, false))}

        {/* Divider between available and blocked */}
        {hasBlocked && sorted.available.length > 0 && (
          <div className="h-px bg-slate-100 my-1" />
        )}

        {/* Blocked */}
        {sorted.blocked.map((c) => renderRow(c, true))}

        {sorted.available.length === 0 && sorted.blocked.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">
            Tidak ditemukan
          </p>
        )}
      </div>
    </div>
  );
}
