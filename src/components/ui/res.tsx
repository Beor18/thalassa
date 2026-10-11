"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import clsx from "clsx";
import { RESOURCE_INFO } from "@/game/data";
import { resourceLabel } from "@/game/names";
import { useI18n } from "@/i18n/client";

export type ResKey = keyof typeof RESOURCE_INFO;

/*
  Client components so the names and numbers follow the player's language (from the provider in
  the root layout); Server Components render them as before, every prop is plain data.
*/

export function ResIcon({ kind, size = 20, className }: { kind: ResKey; size?: number; className?: string }) {
  const { lang } = useI18n();
  const label = resourceLabel(kind, lang);
  return (
    <Image
      src={RESOURCE_INFO[kind].icon}
      alt={label}
      title={label}
      width={size}
      height={size}
      className={clsx("inline-block shrink-0", className)}
    />
  );
}

/** Icon + amount. Marks the amount red when `missing` is true. */
export function ResAmount({
  kind,
  amount,
  missing,
  size = 18,
  className,
  style,
}: {
  kind: ResKey;
  amount: number;
  missing?: boolean;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { fmt } = useI18n();
  return (
    <span className={clsx("inline-flex items-center gap-1 tabular font-bold", missing && "text-danger", className)} style={style}>
      <ResIcon kind={kind} size={size} />
      {fmt(amount)}
    </span>
  );
}

/**
 * Renders a cost bag, highlighting what the city can't afford.
 * `pop` makes each amount pop in one after another (loot, deliveries); `popDelay` offsets the first.
 */
export function CostList({
  cost,
  have,
  className,
  pop = false,
  popDelay = 0,
}: {
  cost: Partial<Record<ResKey, number>>;
  have?: Partial<Record<ResKey, number>>;
  className?: string;
  pop?: boolean;
  popDelay?: number;
}) {
  const { t } = useI18n();
  const entries = Object.entries(cost).filter(([, v]) => (v ?? 0) > 0) as [ResKey, number][];
  if (!entries.length) return <span className="text-ink-soft">{t({ en: "Free", es: "Gratis" })}</span>;
  return (
    <span className={clsx("inline-flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {entries.map(([k, v], i) => (
        <ResAmount
          key={k}
          kind={k}
          amount={v}
          missing={have ? (have[k] ?? 0) + 1e-6 < v : false}
          className={pop ? "pop-in" : undefined}
          style={pop ? ({ "--d": `${popDelay + i * 90}ms` } as CSSProperties) : undefined}
        />
      ))}
    </span>
  );
}
