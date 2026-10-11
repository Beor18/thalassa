import clsx from "clsx";
import type { ReactNode } from "react";
import { IconChevron } from "./icons";

/** Small-caps section label, the same voice the island panels use. */
export function SectionTitle({
  children,
  aside,
  id,
  as: Tag = "h3",
}: {
  children: ReactNode;
  aside?: ReactNode;
  id?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Tag id={id} className="text-xs font-extrabold tracking-wider text-bronze-dark uppercase">
        {children}
      </Tag>
      {aside && <span className="text-xs font-bold text-ink-soft tabular">{aside}</span>}
    </div>
  );
}

/** Section inside the plot panel. */
export function Block({
  title,
  aside,
  children,
  className,
  tone = "plain",
  labelledBy,
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "plain" | "inset";
  labelledBy?: string;
}) {
  return (
    <section
      aria-label={!labelledBy ? title : undefined}
      aria-labelledby={labelledBy}
      className={clsx(
        "flex flex-col gap-2.5",
        tone === "inset" && "rounded-xl border border-parchment-3 bg-parchment-2/60 p-3",
        className,
      )}
    >
      {title && <SectionTitle aside={aside}>{title}</SectionTitle>}
      {children}
    </section>
  );
}

type Tone = "good" | "bad" | "gold";
const toneClass = (tone?: Tone) =>
  clsx(tone === "good" && "text-success", tone === "bad" && "text-danger", tone === "gold" && "text-bronze-dark", !tone && "text-ink");

/**
 * Compact stat tile: icon, big number, short label under it. `tip` adds details on demand:
 * a bubble on hover, focus or tap, and the same text read inline by screen readers.
 */
export function Stat({
  icon,
  label,
  value,
  tone,
  tip,
  align = "start",
  wide = false,
  children,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  tone?: Tone;
  tip?: ReactNode;
  /** where the bubble lines up so it never leaves the panel */
  align?: "start" | "center" | "end";
  wide?: boolean;
  /** extra content under the number (a meter) */
  children?: ReactNode;
}) {
  return (
    <li
      tabIndex={tip ? 0 : undefined}
      className={clsx(
        "group/tip relative flex min-w-0 items-center gap-2 rounded-lg bg-marble/55 px-2.5 py-1.5 ring-1 ring-parchment-3/80 outline-offset-2",
        tip && "cursor-help",
        wide && "col-span-full",
      )}
    >
      {icon && (
        <span aria-hidden className="grid size-6 shrink-0 place-items-center">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col-reverse">
        <span className="truncate text-[11px] leading-tight font-bold text-ink-soft">
          {label}
          {tip && <span className="sr-only">. {tip}</span>}
        </span>
        <span data-value className={clsx("truncate text-[17px] leading-tight font-extrabold tabular", toneClass(tone))}>
          {value}
        </span>
      </span>
      {children}
      {tip && <TipBubble align={align}>{tip}</TipBubble>}
    </li>
  );
}

export function StatGrid({ children, cols = 2, className }: { children: ReactNode; cols?: 2 | 3; className?: string }) {
  // Three across gets tight on phones: slightly smaller numbers and padding there.
  return (
    <ul
      className={clsx(
        "grid gap-1.5",
        cols === 3 ? "grid-cols-3 max-sm:[&>li]:gap-1.5 max-sm:[&>li]:px-2 max-sm:[&_[data-value]]:text-base" : "grid-cols-2",
        className,
      )}
    >
      {children}
    </ul>
  );
}

/** Visual bubble for a `group/tip` parent. Hidden from assistive tech: the parent reads the text inline. */
export function TipBubble({ children, align = "start" }: { children: ReactNode; align?: "start" | "center" | "end" }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "pointer-events-none absolute bottom-full z-30 mb-1.5 w-max max-w-[15rem] rounded-lg bg-sea-950/95 px-2.5 py-1.5 text-xs leading-snug font-bold text-foam shadow-lg",
        "translate-y-1 opacity-0 transition-[opacity,translate] duration-150 ease-out",
        "group-hover/tip:translate-y-0 group-hover/tip:opacity-100 group-focus/tip:translate-y-0 group-focus/tip:opacity-100",
        align === "start" && "left-0",
        align === "end" && "right-0",
        align === "center" && "left-1/2 -translate-x-1/2",
      )}
    >
      {children}
    </span>
  );
}

/** Thin fill bar (housing, storage). */
export function Meter({ value, max, danger = false, className }: { value: number; max: number; danger?: boolean; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <span aria-hidden className={clsx("block h-1.5 overflow-hidden rounded-full bg-ink/15", className)}>
      <span
        className={clsx("block h-full rounded-full", danger ? "bg-danger" : "bg-gradient-to-r from-bronze to-gold")}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

/** Short explanation of why an action is not available: a lock (needs something first) or missing materials. */
export function Reason({
  children,
  className,
  tone = "lock",
}: {
  children: ReactNode;
  className?: string;
  tone?: "lock" | "missing";
}) {
  return (
    <p className={clsx("text-sm font-bold", tone === "missing" ? "text-danger" : "text-bronze-dark", className)}>{children}</p>
  );
}

export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx("text-sm text-ink-soft", className)}>{children}</p>;
}

/** "⌛ 14 min" style duration label. */
export function Duration({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 text-sm font-bold whitespace-nowrap text-ink-soft tabular", className)}>
      <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 fill-none stroke-current" strokeWidth={1.6}>
        <path d="M4 1.5h8M4 14.5h8M4.5 1.5c0 3.5 3.5 4.5 3.5 6.5s-3.5 3-3.5 6.5M11.5 1.5c0 3.5-3.5 4.5-3.5 6.5s3.5 3 3.5 6.5" />
      </svg>
      <span className="sr-only">Tiempo: </span>
      {children}
    </span>
  );
}

/** Rarely used controls, folded under a small link-like summary. */
export function Disclosure({ summary, icon, children, className }: { summary: ReactNode; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details className={clsx("group/d", className)}>
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-lg text-sm font-bold text-bronze-dark select-none hover:text-bronze-deep [&::-webkit-details-marker]:hidden">
        {icon}
        {summary}
        <IconChevron size={14} className="transition-transform duration-150 group-open/d:rotate-90" />
      </summary>
      <div className="pt-1 pb-1">{children}</div>
    </details>
  );
}

/** Text link with an arrow, for "go there" jumps inside a panel. */
export const jumpLink =
  "inline-flex min-h-10 items-center gap-1 self-start text-sm font-bold text-bronze-dark underline-offset-4 hover:underline";
