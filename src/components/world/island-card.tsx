"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { ISLAND_PLOTS } from "@/game/data";
import { resourceLabel } from "@/game/names";
import type { Text } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { ISLAND_IMAGE } from "@/game/layout";
import { buttonClass } from "@/components/ui/button";
import { ResIcon } from "@/components/ui/res";
import type { MapIsland } from "./island-marker";
import type { FleetKind, MyCity } from "./types";
import { FLEET_COLOR } from "./fleets";

export const CARD_WIDTH = 320;
export const SHEET_HEIGHT = 200;

/** One and many, per kind of fleet heading to the island. */
const INCOMING: Record<FleetKind | "return", [Text, Text]> = {
  attack: [
    { en: "attack on the way", es: "ataque en camino" },
    { en: "attacks on the way", es: "ataques en camino" },
  ],
  transport: [
    { en: "shipment on the way", es: "carga en camino" },
    { en: "shipments on the way", es: "cargas en camino" },
  ],
  colonize: [
    { en: "colony on the way", es: "colonia en camino" },
    { en: "colonies on the way", es: "colonias en camino" },
  ],
  return: [
    { en: "fleet coming back", es: "flota vuelve" },
    { en: "fleets coming back", es: "flotas vuelven" },
  ],
};

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
  const { t, lang, fmt, fmtDuration } = useI18n();
  const hidden = desktop ? { opacity: 0, x: 28, scale: 0.97 } : { opacity: 0, y: "100%" };
  const res = island ? resourceLabel(island.resource, lang) : "";
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
                <ul
                  aria-label={t({ en: "Island details", es: "Datos de la isla" })}
                  className="tabular mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-ink"
                >
                  <li className="inline-flex items-center gap-1" title={t({ en: `${res} island`, es: `Isla de ${res.toLowerCase()}` })}>
                    <ResIcon kind={island.resource} size={18} />
                    {res}
                  </li>
                  <li className="inline-flex items-center gap-1" title={t({ en: "Plots taken", es: "Lugares ocupados" })}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-ink-soft">
                      <path d="M3 9l9-5 9 5H3z" />
                      <path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 21h18" />
                    </svg>
                    <span className="sr-only">{t({ en: "Plots taken:", es: "Lugares ocupados:" })}</span>
                    {island.cityCount}/{ISLAND_PLOTS}
                  </li>
                  <li
                    className="inline-flex items-center gap-1"
                    title={isCurrent ? undefined : t({ en: `Voyage from ${originName}`, es: `Viaje desde ${originName}` })}
                  >
                    {isCurrent ? (
                      <span className="rounded-full bg-sea-900 px-2 py-0.5 text-xs font-extrabold text-gold">
                        {t({ en: "You're here", es: "Estás acá" })}
                      </span>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="text-ink-soft">
                          <circle cx="12" cy="12" r="8.5" />
                          <path d="M12 7.5V12l3 2" />
                        </svg>
                        <span className="sr-only">{t({ en: `Voyage from ${originName}:`, es: `Viaje desde ${originName}:` })}</span>
                        {fmtDuration(seconds * 1000)}
                      </>
                    )}
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t({ en: "Close", es: "Cerrar" })}
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
                  <li
                    className="max-w-full truncate rounded-full bg-gold px-2.5 py-1 text-ink"
                    title={myCities.length === 1 ? t({ en: "Your city", es: "Tu ciudad" }) : t({ en: "Your cities", es: "Tus ciudades" })}
                  >
                    <span className="sr-only">
                      {myCities.length === 1 ? t({ en: "Your city: ", es: "Tu ciudad: " }) : t({ en: "Your cities: ", es: "Tus ciudades: " })}
                    </span>
                    {myCities.map((c) => c.name).join(", ")}
                  </li>
                )}
                {incoming.map((f) => (
                  <li key={f.kind} className="inline-flex items-center gap-1.5 rounded-full bg-sea-900 px-2.5 py-1 text-foam">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: f.kind === "return" ? "#e6f3fb" : FLEET_COLOR[f.kind] }} />
                    {fmt(f.count)} {t(INCOMING[f.kind][f.count === 1 ? 0 : 1])}
                  </li>
                ))}
              </ul>
            )}

            <Link href={`/isla/${island.id}`} data-card-primary className={buttonClass("primary", desktop ? "lg" : "md", "w-full")}>
              {t({ en: `View ${island.name}`, es: `Ver ${island.name}` })}
            </Link>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
