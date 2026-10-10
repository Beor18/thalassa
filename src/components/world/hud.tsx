"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { RESOURCE_INFO } from "@/game/data";
import { fmtDuration } from "@/lib/format";
import type { MapIsland } from "./island-marker";
import { FLEET_COLOR } from "./fleets";

const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** Glass chip used by every HUD control. */
const glass =
  "border border-foam/15 bg-sea-950/70 text-foam shadow-[0_8px_24px_-8px_rgb(4_18_38/0.8)] backdrop-blur-md";

export function IslandSearch({
  islands,
  travel,
  currentIslandId,
  onPick,
}: {
  islands: MapIsland[];
  travel: Record<number, number>;
  currentIslandId: number;
  onPick: (id: number, via: "pointer" | "keyboard") => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = norm(query);
    return islands
      .filter((i) => !q || norm(i.name).includes(q))
      .sort((a, b) => {
        const rank = (i: MapIsland) => (i.id === currentIslandId ? 0 : i.mine ? 1 : 2);
        return rank(a) - rank(b) || (travel[a.id] ?? 0) - (travel[b.id] ?? 0) || a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [islands, query, travel, currentIslandId]);

  const pick = (i: MapIsland | undefined, via: "pointer" | "keyboard") => {
    if (!i) return;
    onPick(i.id, via);
    setOpen(false);
    setQuery("");
  };

  const listId = `${id}-list`;
  const optId = (k: number) => `${id}-opt-${k}`;
  const showList = open && results.length > 0;

  return (
    <div data-hud className="relative w-full sm:w-72">
      <label htmlFor={`${id}-input`} className="sr-only">
        Ir a isla
      </label>
      <div className={clsx("flex h-11 items-center gap-2 rounded-xl pr-1 pl-3 focus-within:ring-2 focus-within:ring-gold", glass)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="shrink-0 text-foam/70">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4 4" />
        </svg>
        <input
          id={`${id}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? optId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Ir a isla…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(results[active], "keyboard");
            } else if (e.key === "Escape") {
              if (open || query) {
                e.stopPropagation();
                setOpen(false);
                setQuery("");
              }
            }
          }}
          // The wrapper draws the focus ring (inline style beats the global :focus-visible outline).
          style={{ outline: "none" }}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foam placeholder:text-foam/60 [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Islas"
          className={clsx("absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-y-auto overscroll-contain rounded-xl p-1", glass)}
        >
          {results.map((i, k) => (
            <li
              key={i.id}
              id={optId(k)}
              role="option"
              aria-selected={k === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(i, "pointer");
              }}
              onMouseEnter={() => setActive(k)}
              className={clsx("flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5", k === active && "bg-foam/12")}
            >
              <span aria-hidden className="size-6 shrink-0 bg-contain bg-no-repeat" style={{ backgroundImage: `url(${RESOURCE_INFO[i.resource].icon})` }} />
              <span className="min-w-0 flex-1 truncate font-bold">{i.name}</span>
              <span className="tabular shrink-0 text-sm text-foam/75">
                {i.id === currentIslandId ? "Estás acá" : fmtDuration((travel[i.id] ?? 0) * 1000)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && (
        <p className={clsx("absolute inset-x-0 top-full z-40 mt-2 rounded-xl px-3 py-2.5 text-sm", glass)}>Ninguna isla se llama así.</p>
      )}
    </div>
  );
}

function ControlButton({ label, onClick, children, wide }: { label: string; onClick: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={wide ? undefined : label}
      title={label}
      className={clsx(
        "grid h-11 min-w-11 place-items-center rounded-xl transition hover:bg-sea-700/90 active:scale-95",
        wide && "flex gap-2 px-3 font-bold",
        glass,
      )}
    >
      {children}
    </button>
  );
}

export function MapControls({ onZoomIn, onZoomOut, onHome }: { onZoomIn: () => void; onZoomOut: () => void; onHome: () => void }) {
  return (
    <div data-hud className="flex flex-col items-end gap-2">
      <div className="flex flex-col gap-2">
        <ControlButton label="Acercar" onClick={onZoomIn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </ControlButton>
        <ControlButton label="Alejar" onClick={onZoomOut}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
            <path d="M5 12h14" />
          </svg>
        </ControlButton>
      </div>
      <ControlButton label="Centrar en mi isla" onClick={onHome} wide>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="text-gold">
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
        </svg>
        <span className="hidden text-sm sm:inline">Mi isla</span>
        <span className="sr-only sm:hidden">Centrar en mi isla</span>
      </ControlButton>
    </div>
  );
}

export function Legend({ fleets, originName }: { fleets: number; originName: string }) {
  const [open, setOpen] = useState(false);
  const items = (
    <ul className="flex flex-col gap-1.5 text-[13px]">
      <li className="flex items-center gap-2">
        <span aria-hidden className="relative grid size-5 place-items-center">
          <span className="absolute inset-0 rounded-full border-2 border-gold/90" />
          <span className="size-1.5 rounded-full bg-gold" />
        </span>
        Isla de {originName}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="h-3.5 w-5 rounded-[3px] bg-gradient-to-b from-[#fbe7a6] to-[#c9952f] ring-1 ring-bronze-dark" />
        Tenés ciudades
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="flex w-5 justify-center gap-0.5">
          {(["transport", "attack", "colonize"] as const).map((k) => (
            <span key={k} className="h-3 w-1 rounded-full" style={{ background: FLEET_COLOR[k] }} />
          ))}
        </span>
        {fleets === 0 ? "Sin flotas en el mar" : fleets === 1 ? "1 flota en el mar" : `${fleets} flotas en el mar`}
      </li>
      <li className="flex items-center gap-3 pl-0.5 text-foam/75">
        {(
          [
            ["transport", "Transporte"],
            ["attack", "Ataque"],
            ["colonize", "Colonia"],
          ] as const
        ).map(([k, l]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span aria-hidden className="size-2 rounded-full" style={{ background: FLEET_COLOR[k] }} />
            {l}
          </span>
        ))}
      </li>
    </ul>
  );

  return (
    <div data-hud>
      <div className={clsx("hidden rounded-xl px-3 py-2.5 md:block", glass)}>{items}</div>
      <div className="md:hidden">
        {open && <div className={clsx("mb-2 rounded-xl px-3 py-2.5", glass)}>{items}</div>}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={clsx("flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold", glass)}
        >
          {open ? "Ocultar referencias" : "Referencias"}
        </button>
      </div>
    </div>
  );
}
