import type { ReactNode } from "react";
import Image from "next/image";
import clsx from "clsx";
import { UNITS, UNIT_TYPES, type UnitBag, type UnitType } from "@/game/data";
import { SHIP_IMAGE } from "@/game/layout";
import { fmt } from "@/lib/format";

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

const PLURAL: Record<UnitType, string> = {
  spearman: "Lanceros",
  slinger: "Honderos",
  swordsman: "Espadachines",
  hoplite: "Hoplitas",
  archer: "Arqueros",
  catapult: "Catapultas",
};

/** "1 Lancero", "30 Lanceros" */
export const unitName = (unit: UnitType, n: number) => (n === 1 ? UNITS[unit].name : PLURAL[unit]);

export const unitEntries = (units: UnitBag) =>
  UNIT_TYPES.filter((t) => (units[t] ?? 0) > 0).map((t) => [t, units[t] ?? 0] as const);

/** Unit portraits with counts. Renders `empty` when there are no units. */
export function UnitStrip({
  units,
  size = 40,
  empty = null,
  tone = "light",
  className,
}: {
  units: UnitBag;
  size?: number;
  empty?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const list = unitEntries(units);
  if (!list.length) return <>{empty}</>;
  return (
    <ul className={clsx("flex flex-wrap gap-2", className)}>
      {list.map(([t, n]) => (
        <li
          key={t}
          className={clsx(
            "flex items-center gap-1.5 rounded-xl py-1 pr-2.5 pl-1",
            tone === "light" ? "bg-parchment-2/70 ring-1 ring-parchment-3" : "bg-sea-950/40 ring-1 ring-sea-300/20",
          )}
          title={`${fmt(n)} ${unitName(t, n)}`}
        >
          <UnitPortrait unit={t} size={size} className="bg-transparent" />
          <span className="flex flex-col leading-tight">
            <span className="tabular text-base font-extrabold">{fmt(n)}</span>
            <span className={clsx("text-xs", tone === "light" ? "text-ink-soft" : "text-foam/75")}>{unitName(t, n)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
