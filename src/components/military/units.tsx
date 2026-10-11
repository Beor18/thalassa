import type { ReactNode } from "react";
import Image from "next/image";
import clsx from "clsx";
import { UNITS, UNIT_TYPES, type UnitBag, type UnitType } from "@/game/data";
import { SHIP_IMAGE } from "@/game/layout";
import { unitName } from "@/game/names";
import type { Locale } from "@/i18n/config";
import { getFormat } from "@/i18n/format";

export function UnitPortrait({ unit, size = 40, className }: { unit: UnitType; size?: number; className?: string }) {
  return (
    <Image
      src={UNITS[unit].image}
      alt=""
      width={size}
      height={size}
      className={clsx("sprite shrink-0 rounded-lg bg-parchment-2/60", className)}
    />
  );
}

export function ShipPortrait({ size = 40, className }: { size?: number; className?: string }) {
  return <Image src={SHIP_IMAGE} alt="" width={size} height={size} className={clsx("sprite shrink-0", className)} />;
}


export const unitEntries = (units: UnitBag) =>
  UNIT_TYPES.filter((t) => (units[t] ?? 0) > 0).map((t) => [t, units[t] ?? 0] as const);

/**
 * Unit portraits with counts. Renders `empty` when there are no units.
 * `compact`: portrait and number only (the name stays in the tooltip and for screen readers).
 * Takes `lang` (not a hook), so it renders the same on the server and in client components.
 */
export function UnitStrip({
  units,
  lang,
  size = 40,
  empty = null,
  tone = "light",
  compact = false,
  className,
}: {
  units: UnitBag;
  lang: Locale;
  size?: number;
  empty?: ReactNode;
  tone?: "light" | "dark";
  compact?: boolean;
  className?: string;
}) {
  const { fmt } = getFormat(lang);
  const list = unitEntries(units);
  if (!list.length) return <>{empty}</>;
  return (
    <ul className={clsx("flex flex-wrap", compact ? "gap-1.5" : "gap-2", className)}>
      {list.map(([t, n]) => (
        <li
          key={t}
          className={clsx(
            "flex items-center rounded-xl",
            compact ? "gap-1 py-0.5 pr-2 pl-0.5" : "gap-1.5 py-1 pr-2.5 pl-1",
            tone === "light" ? "bg-parchment-2/70 ring-1 ring-parchment-3" : "bg-sea-950/40 ring-1 ring-sea-300/20",
          )}
          title={`${fmt(n)} ${unitName(t, lang, n)}`}
        >
          <UnitPortrait unit={t} size={size} className="bg-transparent" />
          {compact ? (
            <span className="tabular text-[15px] font-extrabold">
              {fmt(n)}
              <span className="sr-only"> {unitName(t, lang, n)}</span>
            </span>
          ) : (
            <span className="flex flex-col leading-tight">
              <span className="tabular text-base font-extrabold">{fmt(n)}</span>
              <span className={clsx("text-xs", tone === "light" ? "text-ink-soft" : "text-foam/75")}>{unitName(t, lang, n)}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
