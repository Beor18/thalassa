"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import clsx from "clsx";
import { useI18n } from "@/i18n/client";

export interface BranchTab {
  id: string;
  label: string;
  icon: string;
  done: number;
  total: number;
  /** Something in this branch can be researched right now. */
  ready: boolean;
}

/**
 * The four research branches. Phones and small tablets see one branch at a time behind a
 * segmented control (the tree is long); from `md` up every branch is visible side by side.
 */
export function BranchTabs({ tabs, initial, children }: { tabs: BranchTab[]; initial: string; children: ReactNode[] }) {
  const { t } = useI18n();
  const [active, setActive] = useState(initial);
  return (
    <>
      <div role="group" aria-label={t({ en: "Research branches", es: "Ramas de investigación" })} className="panel-glass grid grid-cols-4 gap-1 p-1 md:hidden">
        {tabs.map((tab) => {
          const on = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={on}
              aria-controls={`branch-panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={clsx(
                "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[10px] px-1 py-1.5 text-center transition-colors duration-150",
                on ? "bg-parchment text-ink shadow-[0_2px_0_var(--color-parchment-3)]" : "text-foam/85 hover:bg-foam/10",
              )}
            >
              <Image src={tab.icon} alt="" width={28} height={28} className="sprite size-7" />
              <span className="w-full truncate text-[12px] leading-tight font-bold">{tab.label}</span>
              <span className={clsx("tabular text-[11px] leading-none font-bold", on ? "text-ink-soft" : "text-foam/60")}>
                {tab.done}/{tab.total}
              </span>
              {tab.ready && (
                <>
                  <span aria-hidden className="absolute top-1 right-1.5 size-2.5 rounded-full bg-gold ring-2 ring-sea-900 motion-safe:animate-pulse" />
                  <span className="sr-only">{t({ en: ", one is ready to research", es: ", hay una lista para investigar" })}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
        {children.map((child, i) => (
          <div key={tabs[i]?.id ?? i} id={`branch-panel-${tabs[i]?.id}`} className={clsx(tabs[i]?.id !== active && "max-md:hidden")}>
            {child}
          </div>
        ))}
      </div>
    </>
  );
}
