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

export const CARD_WIDTH = 340;
export const SHEET_HEIGHT = 236;

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
  incoming: { kind: FleetKind; count: number }[];
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
            className="flex flex-col gap-2.5 md:gap-3"
          >
            <header className="flex items-start gap-3">
              <span className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-[radial-gradient(closest-side,rgb(111_179_230/0.45),transparent)] md:size-16">
                <Image src={ISLAND_IMAGE[island.resource]} alt="" width={64} height={64} unoptimized className="size-12 md:size-16" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 id="island-card-title" className="font-display text-lg leading-tight font-bold text-ink md:text-xl">
                  {island.name}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft md:mt-1">
                  <ResIcon kind={island.resource} size={18} />
                  Isla de {RESOURCE_INFO[island.resource].label.toLowerCase()}
                </p>
                {(isCurrent || island.mine) && (
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    {isCurrent && <span className="rounded-full bg-sea-900 px-2 py-0.5 text-xs font-extrabold text-gold">Estás acá</span>}
                    {island.mine && <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-extrabold text-ink">Tenés ciudades</span>}
                  </p>
                )}
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

            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 rounded-xl bg-parchment-2/60 px-3 py-2 text-sm ring-1 ring-parchment-3/70 md:gap-y-2.5 md:py-2.5">
              <dt className="text-ink-soft">Lugares</dt>
              <dd className="flex items-center gap-2">
                <span className="flex gap-1" aria-hidden>
                  {Array.from({ length: ISLAND_PLOTS }, (_, k) => (
                    <span key={k} className={clsx("size-2.5 rounded-full ring-1", k < island.cityCount ? "bg-bronze ring-bronze-dark" : "bg-marble ring-parchment-3")} />
                  ))}
                </span>
                <span className="tabular font-bold text-ink">
                  {island.cityCount} de {ISLAND_PLOTS}
                </span>
              </dd>

              <dt className="text-ink-soft">{isCurrent ? "Viaje" : `Desde ${originName}`}</dt>
              <dd className="tabular font-bold text-ink">{isCurrent ? "Ya estás en esta isla" : fmtDuration(seconds * 1000)}</dd>

              {myCities.length > 0 && (
                <>
                  <dt className="text-ink-soft">{myCities.length === 1 ? "Tu ciudad" : "Tus ciudades"}</dt>
                  <dd className="truncate font-bold text-ink">{myCities.map((c) => c.name).join(", ")}</dd>
                </>
              )}

              {incoming.length > 0 && (
                <>
                  <dt className="text-ink-soft">En camino</dt>
                  <dd className="flex flex-wrap gap-x-3 gap-y-1 font-bold text-ink">
                    {incoming.map((f) => (
                      <span key={f.kind} className="inline-flex items-center gap-1.5">
                        <span aria-hidden className="size-2.5 rounded-full ring-1 ring-ink/30" style={{ background: FLEET_COLOR[f.kind] }} />
                        {f.count} {f.kind === "attack" ? (f.count === 1 ? "ataque" : "ataques") : f.kind === "transport" ? (f.count === 1 ? "transporte" : "transportes") : f.count === 1 ? "colonia" : "colonias"}
                      </span>
                    ))}
                  </dd>
                </>
              )}
            </dl>

            <Link href={`/isla/${island.id}`} data-card-primary className={buttonClass("primary", desktop ? "lg" : "md", "w-full")}>
              Navegar a {island.name}
            </Link>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
