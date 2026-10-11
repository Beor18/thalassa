import type { ReactNode } from "react";
import clsx from "clsx";

/*
  Small pieces shared by the secondary sections (Research, Fleet, Reports, Rankings, Nectar,
  Invite) so their hero bands and "details on demand" look and behave the same.
  Server-safe: no hooks, no client JavaScript (the disclosure is a native <details>). Callers pass
  their copy already translated, so these work from Server and Client Components alike.
*/

/** Page column: wide boards (research tree, forces) or narrow lists and forms. */
export const SECTION_WIDE = "mx-auto flex w-full max-w-[1600px] flex-col gap-3";
export const SECTION_NARROW = "mx-auto flex w-full max-w-5xl flex-col gap-3";

/**
 * A number with its icon in a hero band: "+132/h", "12", "5/16". The label is visible on wider
 * screens, a tooltip and screen-reader text everywhere.
 */
export function HeroStat({
  icon,
  value,
  label,
  hint,
  tone = "default",
  iconOnPhone = true,
  className,
}: {
  icon?: ReactNode;
  value: ReactNode;
  label: string;
  /** Longer tooltip, when the label alone doesn't say enough. */
  hint?: string;
  tone?: "default" | "good" | "bad" | "ambrosia";
  /** false: phones show just the number and label (for three stats in one row). */
  iconOnPhone?: boolean;
  className?: string;
}) {
  return (
    <div
      title={hint ?? label}
      className={clsx(
        "flex min-h-10 min-w-0 items-center gap-2 rounded-xl bg-sea-950/45 py-1 pr-3 pl-1.5 ring-1 ring-sea-300/20",
        !icon && "pl-3",
        icon && !iconOnPhone && "max-sm:pl-3",
        className,
      )}
    >
      {icon && <span className={clsx("grid size-8 shrink-0 place-items-center", !iconOnPhone && "max-sm:hidden")}>{icon}</span>}
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={clsx(
            "tabular truncate font-display text-base font-black sm:text-lg",
            tone === "good" && "text-[#9fe0a0]",
            tone === "bad" && "text-danger-soft",
            tone === "ambrosia" && "text-ambrosia-soft",
            tone === "default" && "text-foam",
          )}
        >
          {value}
        </span>
        <span className="mt-0.5 truncate text-[11px] font-bold tracking-wide text-foam/65 uppercase">{label}</span>
      </span>
    </div>
  );
}

function InfoGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5" />
      <circle cx="10" cy="6.2" r="0.6" fill="currentColor" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="ml-auto size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

/** The one "How does it work?" fold per screen: rules and fine print live here, closed by default. */
export function HowItWorks({
  title,
  tone = "light",
  className,
  children,
}: {
  /** Usually t({ en: "How does it work?", es: "¿Cómo funciona?" }). */
  title: string;
  tone?: "light" | "dark";
  className?: string;
  children: ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <details
      className={clsx(
        "group rounded-xl ring-1",
        dark ? "bg-sea-950/35 text-foam ring-sea-300/20" : "bg-parchment-2/50 text-ink ring-parchment-3",
        className,
      )}
    >
      <summary
        className={clsx(
          "flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-sm font-bold select-none [&::-webkit-details-marker]:hidden",
          dark ? "text-sea-300 hover:text-foam" : "text-bronze-dark hover:text-ink",
        )}
      >
        <InfoGlyph />
        {title}
        <Chevron />
      </summary>
      <div className={clsx("flex flex-col gap-2 px-3 pb-3 text-sm leading-snug", dark ? "text-foam/85" : "text-ink-soft")}>{children}</div>
    </details>
  );
}
