"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { ISLAND_PLOTS, RESOURCE_INFO } from "@/game/data";
import { ISLAND_IMAGE } from "@/game/layout";
import { buttonClass } from "@/components/ui/button";
import { ResIcon } from "@/components/ui/res";
import { fmtDuration } from "@/lib/format";
import type { MapIsland } from "./island-marker";
import type { FleetKind, MyCity } from "./types";
import { FLEET_COLOR } from "./fleets";

export const CARD_WIDTH = 320;
export const SHEET_HEIGHT = 200;

const INCOMING: Record<FleetKind | "return", [string, string]> = {
  attack: ["ataque en camino", "ataques en camino"],
  transport: ["carga en camino", "cargas en camino"],
  colonize: ["colonia en camino", "colonias en camino"],
  return: ["flota vuelve", "flotas vuelven"],
};
const incomingLabel = (kind: FleetKind | "return", n: number) => `${n} ${INCOMING[kind][n === 1 ? 0 : 1]}`;

export function IslandCard({
  island,
  isCurrent,
  seconds,
  originName,
  myCities,
  incoming,
  desktop,
  reducedMotion,
  onClose,
}: {
  island: MapIsland | null;
  isCurrent: boolean;
  seconds: number;
  originName: string;
  myCities: MyCity[];
  incoming: { kind: FleetKind | "return"; count: number }[];
  desktop: boolean;
  reducedMotion: boolean;
  onClose: () => void;
}) {
  const hidden = desktop ? { opacity: 0, x: 28, scale: 0.97 } : { opacity: 0, y: "100%" };
  const shown = desktop ? { opacity: 1, x: 0, scale: 1 } : { opacity: 1, y: 0 };

  return (
    <AnimatePresence>
      {island && (
        <motion.section
          key="island-card"
          data-hud
          data-card
          aria-labelledby="island-card-title"
          initial={reducedMotion ? false : hidden}
          animate={shown}
          exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { ...hidden, transition: { duration: 0.18, ease: "easeIn" } }}
          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
          className={clsx(
            "panel absolute z-30 flex cursor-auto flex-col gap-3 p-3 shadow-2xl md:p-4",
            desktop ? "top-20 right-4" : "inset-x-0 bottom-0 max-h-[72%] overflow-y-auto overscroll-contain rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
          style={desktop ? { width: CARD_WIDTH } : undefined}
        >
          {!desktop && <span aria-hidden className="mx-auto -mt-1 h-1.5 w-10 shrink-0 rounded-full bg-ink/20" />}
          <motion.div
            key={island.id}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex flex-col gap-3"
          >
            <header className="flex items-start gap-3">
              <span className="relative grid size-14 shrink-0 place-items-center rounded-xl bg-[radial-gradient(closest-side,rgb(111_179_230/0.45),transparent)]">
                <Image src={ISLAND_IMAGE[island.resource]} alt="" width={56} height={56} unoptimized className="size-14" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 id="island-card-title" className="truncate font-display text-xl leading-tight font-bold text-ink">
                  {island.name}
                </h2>
                <ul aria-label="Datos de la isla" className="tabular mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-ink">
                  <li className="inline-flex items-center gap-1" title={`Isla de ${RESOURCE_INFO[island.resource].label.toLowerCase()}`}>
                    <ResIcon kind={island.resource} size={18} />
                    {RESOURCE_INFO[island.resource].label}
                  </li>
                  <li className="inline-flex items-center gap-1" title="Lugares ocupados">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-ink-soft">
                      <path d="M3 9l9-5 9 5H3z" />
                      <path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 21h18" />
                    </svg>
                    <span className="sr-only">Lugares ocupados:</span>
                    {island.cityCount}/{ISLAND_PLOTS}
                  </li>
                  <li className="inline-flex items-center gap-1" title={isCurrent ? undefined : `Viaje desde ${originName}`}>
                    {isCurrent ? (
                      <span className="rounded-full bg-sea-900 px-2 py-0.5 text-xs font-extrabold text-gold">Estás acá</span>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="text-ink-soft">
                          <circle cx="12" cy="12" r="8.5" />
                          <path d="M12 7.5V12l3 2" />
                        </svg>
                        <span className="sr-only">Viaje desde {originName}:</span>
                        {fmtDuration(seconds * 1000)}
                      </>
                    )}
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mt-1 -mr-1 grid size-10 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-ink/10 hover:text-ink"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>

            {(myCities.length > 0 || incoming.length > 0) && (
              <ul className="flex flex-wrap gap-1.5 text-xs font-extrabold">
                {myCities.length > 0 && (
                  <li className="max-w-full truncate rounded-full bg-gold px-2.5 py-1 text-ink" title={myCities.length === 1 ? "Tu ciudad" : "Tus ciudades"}>
                    <span className="sr-only">{myCities.length === 1 ? "Tu ciudad: " : "Tus ciudades: "}</span>
                    {myCities.map((c) => c.name).join(", ")}
                  </li>
                )}
                {incoming.map((f) => (
                  <li key={f.kind} className="inline-flex items-center gap-1.5 rounded-full bg-sea-900 px-2.5 py-1 text-foam">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: f.kind === "return" ? "#e6f3fb" : FLEET_COLOR[f.kind] }} />
                    {incomingLabel(f.kind, f.count)}
                  </li>
                ))}
              </ul>
            )}

            <Link href={`/isla/${island.id}`} data-card-primary className={buttonClass("primary", desktop ? "lg" : "md", "w-full")}>
              Ver {island.name}
            </Link>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
