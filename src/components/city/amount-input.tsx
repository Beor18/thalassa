"use client";

import clsx from "clsx";

/** Integer field for amounts: numeric keyboard on phones, clamps to [0, max], optional "Máx" shortcut. */
export function AmountInput({
  id,
  value,
  max,
  onChange,
  blankZero = false,
  showMax = true,
  describedBy,
  className,
  ariaLabel,
  maxLabel,
}: {
  id: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
  blankZero?: boolean;
  showMax?: boolean;
  describedBy?: string;
  className?: string;
  ariaLabel?: string;
  /** accessible name for the "Máx" button when several fields share a form */
  maxLabel?: string;
}) {
  const safeMax = Math.max(0, Math.floor(max));
  return (
    <div className={clsx("flex items-stretch gap-1.5", className)}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        placeholder="0"
        value={blankZero && value === 0 ? "" : String(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
          onChange(digits === "" ? 0 : Math.min(safeMax, Number(digits)));
        }}
        onFocus={(e) => e.currentTarget.select()}
        className="h-10 w-full min-w-0 rounded-lg border border-parchment-3 bg-marble px-3 text-right text-[15px] font-bold text-ink tabular shadow-inner focus-visible:border-bronze"
      />
      {showMax && (
        <button
          type="button"
          aria-label={maxLabel}
          onClick={() => onChange(safeMax)}
          disabled={safeMax === 0 || value === safeMax}
          className="h-10 shrink-0 rounded-lg border border-parchment-3 bg-parchment-2 px-2.5 text-sm font-bold text-ink-soft transition-colors duration-100 hover:bg-parchment-3/70 hover:text-ink disabled:opacity-50"
        >
          Máx
        </button>
      )}
    </div>
  );
}
