"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";

/** "⌛ 14 min" style duration label. A Client Component so server and client panels can share it. */
export function Duration({ children, className }: { children: ReactNode; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={clsx("inline-flex items-center gap-1 text-sm font-bold whitespace-nowrap text-ink-soft tabular", className)}>
      <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 fill-none stroke-current" strokeWidth={1.6}>
        <path d="M4 1.5h8M4 14.5h8M4.5 1.5c0 3.5 3.5 4.5 3.5 6.5s-3.5 3-3.5 6.5M11.5 1.5c0 3.5-3.5 4.5-3.5 6.5s3.5 3 3.5 6.5" />
      </svg>
      <span className="sr-only">{t({ en: "Time: ", es: "Tiempo: " })}</span>
      {children}
    </span>
  );
}
