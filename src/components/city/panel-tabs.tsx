"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

export interface PanelTab {
  id: string;
  label: string;
  /** small number next to the label */
  badge?: ReactNode;
  content: ReactNode;
}

/**
 * Secondary tabs inside a plot panel. Every tab stays mounted (forms keep what the player typed);
 * arrow keys move between tabs, as in any tab list.
 */
export function PanelTabs({ tabs, initial, label }: { tabs: PanelTab[]; initial?: string; label: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, step: number) => {
    const next = (from + step + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-parchment-2/80 p-1 ring-1 ring-parchment-3">
        {tabs.map((t, i) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") move(i, 1);
                else if (e.key === "ArrowLeft") move(i, -1);
                else return;
                e.preventDefault();
              }}
              className={clsx(
                "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-colors duration-100",
                selected ? "bg-marble text-ink shadow-[0_1px_0_rgb(255_255_255/0.7)_inset,0_2px_4px_-2px_rgb(43_33_24/0.35)]" : "text-ink-soft hover:bg-marble/50 hover:text-ink",
              )}
            >
              {t.label}
              {t.badge != null && (
                <span className="rounded-full bg-sea-900 px-1.5 text-[11px] leading-[18px] font-extrabold text-gold tabular">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={t.id !== active}
          className={t.id === active ? "flex flex-col gap-3" : "hidden"}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
