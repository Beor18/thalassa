import Image from "next/image";
import clsx from "clsx";
import { RESOURCE_INFO } from "@/game/data";
import { fmt } from "@/lib/format";

export type ResKey = keyof typeof RESOURCE_INFO;

export function ResIcon({ kind, size = 20, className }: { kind: ResKey; size?: number; className?: string }) {
  const info = RESOURCE_INFO[kind];
  return <Image src={info.icon} alt={info.label} title={info.label} width={size} height={size} className={clsx("inline-block shrink-0", className)} />;
}

/** Icon + amount. Marks the amount red when `missing` is true. */
export function ResAmount({
  kind,
  amount,
  missing,
  size = 18,
  className,
}: {
  kind: ResKey;
  amount: number;
  missing?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-1 tabular font-bold", missing && "text-danger", className)}>
      <ResIcon kind={kind} size={size} />
      {fmt(amount)}
    </span>
  );
}

/** Renders a cost bag, highlighting what the city can't afford. */
export function CostList({
  cost,
  have,
  className,
}: {
  cost: Partial<Record<ResKey, number>>;
  have?: Partial<Record<ResKey, number>>;
  className?: string;
}) {
  const entries = Object.entries(cost).filter(([, v]) => (v ?? 0) > 0) as [ResKey, number][];
  if (!entries.length) return <span className="text-ink-soft">Gratis</span>;
  return (
    <span className={clsx("inline-flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {entries.map(([k, v]) => (
        <ResAmount key={k} kind={k} amount={v} missing={have ? (have[k] ?? 0) + 1e-6 < v : false} />
      ))}
    </span>
  );
}
