"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import clsx from "clsx";
import { RESOURCE_INFO } from "@/game/data";
import { fmtDuration } from "@/lib/format";
import { useServerClock } from "@/lib/use-server-clock";
import type { MapIsland } from "./island-marker";
import { FLEET_COLOR, FLEET_KIND_LABEL } from "./fleets";
import type { FleetView } from "./types";

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

/** Popover attached to the dock: closes on Escape and on a press outside. */
function usePopover<T extends string>() {
  const [open, setOpen] = useState<T | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(null);
    }
  };
  return { open, setOpen, ref, onKeyDown };
}

function fleetLeg(f: FleetView) {
  const back = f.status === "returning";
  return {
    back,
    endsAt: back ? (f.returnsAt ?? f.arrivesAt) : f.arrivesAt,
    islandId: back ? f.homeIslandId : f.targetIslandId,
    title: back ? `Vuelve a ${f.originName}` : `${FLEET_KIND_LABEL[f.kind]} a ${f.targetLabel}`,
  };
}

/**
 * Bottom-left dock: your fleets at sea (count and next arrival, a tap opens the list) and the
 * map references, both on demand so the sea stays clear.
 */
export function MapDock({
  fleets,
  originName,
  serverNow,
  shipIcon,
  onPick,
}: {
  fleets: FleetView[];
  originName: string;
  serverNow: number;
  shipIcon: string;
  onPick: (islandId: number) => void;
}) {
  const { open, setOpen, ref, onKeyDown } = usePopover<"fleets" | "legend">();
  const now = useServerClock(serverNow, 1000);
  const listId = useId();
  const legendId = useId();
  const legs = fleets.map((f) => ({ f, ...fleetLeg(f) })).sort((a, b) => a.endsAt - b.endsAt);
  const next = legs.find((l) => l.endsAt > now);
  const left = (t: number) => (t > now ? fmtDuration(t - now) : "Llegando");

  return (
    <div data-hud ref={ref} onKeyDown={onKeyDown} className="relative flex items-end gap-2">
      {open === "fleets" && legs.length > 0 && (
        <div className={clsx("absolute bottom-full left-0 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl p-1", glass)}>
          <p className="px-2.5 pt-1.5 pb-1 text-xs font-extrabold tracking-wider text-foam/70 uppercase">Tus flotas</p>
          <ul id={listId} className="flex max-h-64 flex-col overflow-y-auto overscroll-contain">
            {legs.map(({ f, title, endsAt, islandId }) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(islandId);
                    setOpen(null);
                  }}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-1 text-left hover:bg-foam/10 focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full ring-2 ring-foam/30" style={{ background: FLEET_COLOR[f.kind] }} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-sm font-bold">{title}</span>
                    <span className="block text-xs text-foam/70">{f.ships === 1 ? "1 barco" : `${f.ships} barcos`}</span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-bold text-gold" suppressHydrationWarning>
                    {left(endsAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open === "legend" && (
        <div id={legendId} className={clsx("absolute bottom-full left-0 mb-2 w-60 rounded-xl px-3 py-2.5", glass)}>
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
              <span aria-hidden className="tabular w-5 text-center text-[11px] font-bold text-foam/80">2/8</span>
              Lugares ocupados
            </li>
            <li className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-foam/80">
              {(["transport", "attack", "colonize"] as const).map((k) => (
                <span key={k} className="inline-flex items-center gap-1">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: FLEET_COLOR[k] }} />
                  {FLEET_KIND_LABEL[k]}
                </span>
              ))}
            </li>
          </ul>
        </div>
      )}
      {legs.length > 0 && (
        <button
          type="button"
          aria-expanded={open === "fleets"}
          aria-controls={open === "fleets" ? listId : undefined}
          aria-label={`${legs.length === 1 ? "1 flota" : `${legs.length} flotas`} en el mar${next ? `, la próxima llega en ${left(next.endsAt)}` : ""}`}
          onClick={() => setOpen((o) => (o === "fleets" ? null : "fleets"))}
          className={clsx("flex h-11 items-center gap-2 rounded-xl pr-3 pl-2 text-sm font-bold transition hover:bg-sea-700/90", glass)}
        >
          <span aria-hidden className="size-7 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${shipIcon})` }} />
          <span className="tabular">{legs.length}</span>
          {next && (
            <span className="tabular border-l border-foam/20 pl-2 font-semibold text-gold" suppressHydrationWarning>
              {left(next.endsAt)}
            </span>
          )}
        </button>
      )}
      <button
        type="button"
        aria-expanded={open === "legend"}
        aria-controls={open === "legend" ? legendId : undefined}
        aria-label="Referencias del mapa"
        title="Referencias"
        onClick={() => setOpen((o) => (o === "legend" ? null : "legend"))}
        className={clsx("grid size-11 place-items-center rounded-xl text-base font-black transition hover:bg-sea-700/90", glass)}
      >
        <span aria-hidden>?</span>
      </button>
    </div>
  );
}
