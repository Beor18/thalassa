import clsx from "clsx";
import type { ReactNode } from "react";

/** Titled block inside the plot panel. */
export function Block({
  title,
  children,
  className,
  tone = "plain",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  tone?: "plain" | "inset";
}) {
  return (
    <section
      className={clsx(
        "flex flex-col gap-3",
        tone === "inset" && "rounded-xl border border-parchment-3 bg-parchment-2/60 p-3.5",
        className,
      )}
    >
      {title && <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>}
      {children}
    </section>
  );
}

/** Label + big number. */
export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "good" | "bad" | "gold";
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg bg-marble/55 px-3 py-2 ring-1 ring-parchment-3/80">
      <dt className="text-xs font-bold text-ink-soft">{label}</dt>
      <dd
        className={clsx(
          "tabular text-xl leading-tight font-extrabold",
          tone === "good" && "text-success",
          tone === "bad" && "text-danger",
          tone === "gold" && "text-bronze-dark",
          !tone && "text-ink",
        )}
      >
        {value}
      </dd>
      {hint && <dd className="text-xs text-ink-soft">{hint}</dd>}
    </div>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={clsx("grid grid-cols-2 gap-2", className)}>{children}</dl>;
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
export function Duration({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft tabular">
      <svg aria-hidden viewBox="0 0 16 16" className="size-4 fill-none stroke-current" strokeWidth={1.6}>
        <path d="M4 1.5h8M4 14.5h8M4.5 1.5c0 3.5 3.5 4.5 3.5 6.5s-3.5 3-3.5 6.5M11.5 1.5c0 3.5-3.5 4.5-3.5 6.5s3.5 3 3.5 6.5" />
      </svg>
      <span className="sr-only">Tiempo: </span>
      {children}
    </span>
  );
}
