import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
  disabled?: boolean; // grayed out, not selectable
  reason?: string; // shown below the label when disabled
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  function handleSelect(option: Option) {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearch("");
  }

  function handleOpen() {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setSearch("");
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 rounded-lg border text-sm text-left",
          "flex items-center justify-between gap-2",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          "transition-colors",
          disabled
            ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
            : "bg-white border-slate-200 hover:border-slate-300 cursor-pointer",
          isOpen && "border-blue-500 ring-2 ring-blue-500",
        )}
      >
        <span
          className={cn("truncate flex-1", !selectedLabel && "text-slate-400")}
        >
          {selectedLabel || placeholder}
        </span>
        <svg
          className={cn(
            "w-4 h-4 text-slate-400 shrink-0 transition-transform",
            isOpen && "rotate-180",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  disabled={option.disabled}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm",
                    "border-b border-slate-50 last:border-0",
                    option.disabled
                      ? "cursor-not-allowed opacity-60 bg-slate-50"
                      : option.value === value
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "hover:bg-slate-50 transition-colors text-slate-700",
                  )}
                >
                  <span className="block">{option.label}</span>
                  {option.disabled && option.reason && (
                    <span className="block text-xs text-red-400 mt-0.5">
                      {option.reason}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-slate-400">Tidak ditemukan</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
