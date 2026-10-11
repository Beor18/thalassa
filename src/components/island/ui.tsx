import Image from "next/image";
import clsx from "clsx";
import type { ReactNode } from "react";
import { RESOURCE_INFO } from "@/game/data";
import { SHIP_IMAGE } from "@/game/layout";
import { IconChevronDown } from "./icons";

/** Decorative resource icon: the chip around it carries the words. */
export function ResGlyph({ kind, size = 18 }: { kind: keyof typeof RESOURCE_INFO; size?: number }) {
  return <Image src={RESOURCE_INFO[kind].icon} alt="" aria-hidden width={size} height={size} className="inline-block shrink-0" />;
}

/** Decorative ship icon (same art as the Port). */
export function ShipGlyph({ size = 20 }: { size?: number }) {
  return <Image src={SHIP_IMAGE} alt="" aria-hidden width={size} height={size} className="inline-block shrink-0" />;
}

/*
  Small building blocks for the island panels: numbers with an icon instead of sentences, and
  details that open on demand. No hooks, so server panels and client forms can both use them.
*/

type Tone = "default" | "good" | "bad" | "muted";

/** Icon + value chip. `label` is read by screen readers and shown (with `hint`) as a tooltip on hover. */
export function Stat({
  icon,
  label,
  hint,
  tone = "default",
  className,
  children,
}: {
  icon?: ReactNode;
  label: string;
  /** extra sentence for the hover tooltip only */
  hint?: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={hint ? `${label}. ${hint}` : label}
      className={clsx(
        "tabular inline-flex h-8 items-center gap-1.5 rounded-lg bg-parchment-2/70 px-2 text-sm font-bold whitespace-nowrap ring-1 ring-parchment-3",
        tone === "good" && "text-success",
        tone === "bad" && "text-danger",
        tone === "muted" && "font-semibold text-ink-soft",
        className,
      )}
    >
      {icon}
      <span className="sr-only">{label}: </span>
      {children}
    </span>
  );
}

export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("flex flex-wrap items-center gap-1.5", className)}>{children}</div>;
}

/** Native disclosure: keyboard and screen readers work without script. */
export function Disclosure({
  summary,
  aside,
  children,
  className,
}: {
  summary: ReactNode;
  /** small text at the right of the summary (a count, what's missing) */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={clsx("group/d rounded-xl bg-parchment-2/50 ring-1 ring-parchment-3", className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-1.5 font-bold select-none hover:bg-parchment-2/70 focus-visible:ring-2 focus-visible:ring-bronze-dark [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{summary}</span>
        {aside && <span className="tabular shrink-0 text-sm font-semibold text-ink-soft">{aside}</span>}
        <IconChevronDown size={18} className="shrink-0 text-bronze-dark transition-transform duration-200 group-open/d:rotate-180" />
      </summary>
      <div className="flex flex-col gap-3 px-3 pt-1 pb-3">{children}</div>
    </details>
  );
}

/** Compact "what to do next" card: a title, at most one short line, and one button. */
export function Callout({
  title,
  icon,
  tone = "light",
  children,
  action,
}: {
  title: ReactNode;
  icon?: ReactNode;
  tone?: "light" | "dark";
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-xl p-3",
        tone === "light" ? "bg-parchment-2/70 ring-1 ring-parchment-3" : "bg-sea-900 text-foam ring-1 ring-sea-500/40",
      )}
    >
      <p className="inline-flex items-center gap-2 leading-snug font-bold">
        {icon}
        {title}
      </p>
      {children && <div className={clsx("text-sm", tone === "light" ? "text-ink-soft" : "text-foam/80")}>{children}</div>}
      {action}
    </div>
  );
}

/** Round level number pinned to a sprite on the painted scene. */
export function LevelMedal({ level, tone = "bronze", className }: { level: number; tone?: "bronze" | "red"; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "tabular absolute grid size-7 place-items-center rounded-full text-sm font-black text-marble shadow ring-2 ring-marble/80",
        tone === "red" ? "bg-gradient-to-b from-[#d4643a] to-terracotta" : "bg-gradient-to-b from-bronze-light to-bronze-dark",
        className,
      )}
    >
      {level}
    </span>
  );
}
