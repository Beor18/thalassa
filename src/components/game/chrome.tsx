"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import type { AdvisorHint } from "@/game/engine";
import { RESOURCES } from "@/game/data";
import { ResIcon } from "@/components/ui/res";
import { markShellMount } from "@/components/motion/late-mount";
import {
  isNewAdvisor,
  markAdvisorSeen,
  readChrome,
  rememberChrome,
  subscribeNever,
  type ChromeData,
  type HeaderData,
} from "./chrome-cache";
import { OwlIcon } from "./icons";
import { CitySwitcher, GameNav, NavPlaceholder } from "./nav";
import { BAR_LAYOUT, ResourceBar } from "./resource-bar";

/** Stays still during section changes (see ::view-transition-group(game-header) in globals.css). */
const ANCHOR = { viewTransitionName: "game-header" } as const;

/**
 * Brand, city switcher, HUD, sections and advisor. `fromCache` renders the last header while the
 * next section loads: same pixels, no entrance animations, nothing recorded.
 */
export function GameChrome({ header, advisor, fromCache = false }: ChromeData & { fromCache?: boolean }) {
  useState(() => {
    if (!fromCache) markShellMount();
    return null;
  });
  useEffect(() => {
    if (!fromCache) rememberChrome({ header, advisor });
  }, [header, advisor, fromCache]);

  return (
    <div style={ANCHOR} className="flex flex-col gap-1.5 sm:gap-3">
      <header className="flex flex-col gap-1.5 sm:gap-2.5">
        <TopRow header={header} />
        <ResourceBar {...header.bar} />
        <GameNav cityId={header.cityId} islandId={header.islandId} unreadReports={header.unreadReports} />
      </header>
      <AnimatePresence initial={false} mode="wait">
        {advisor && <AdvisorCard key={advisor.title} advisor={advisor} quiet={fromCache} />}
      </AnimatePresence>
    </div>
  );
}

function TopRow({ header }: { header: HeaderData }) {
  return (
    <div className="flex items-center justify-between gap-x-2 sm:gap-x-3">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Link
          href={`/ciudad/${header.cityId}`}
          className="-ml-2 inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 font-display text-lg font-black tracking-[0.14em] text-gold [text-shadow:0_1px_0_var(--color-bronze-deep),0_2px_10px_rgb(6_26_48/0.7)] sm:text-xl sm:tracking-[0.18em]"
        >
          THALASSA
        </Link>
        <span aria-hidden className="hidden h-6 w-px bg-foam/25 sm:block" />
        <CitySwitcher currentId={header.cityId} cities={header.cities} />
      </div>
      <div className="-mr-2 flex shrink-0 items-center gap-1 text-sm text-foam/80 sm:gap-2">
        <span className="hidden max-w-40 truncate sm:inline">{header.playerName}</span>
        <span
          title={`Jugás en la red de prueba de Solana y el tiempo corre ${header.speed} veces más rápido.`}
          className="hidden rounded-full bg-sea-800/90 px-2.5 py-1 text-xs font-bold whitespace-nowrap text-sea-300 ring-1 ring-sea-500/40 sm:inline"
        >
          Red de prueba ×{header.speed}
        </span>
        <Link
          href="/salir"
          prefetch={false}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 font-bold text-foam/75 underline-offset-4 transition-colors hover:text-foam hover:underline"
        >
          Salir
        </Link>
      </div>
    </div>
  );
}

/** What the advisor button does, read from where it goes. */
function advisorCta(href: string) {
  if (href.startsWith("/isla")) return "Ir a la isla";
  if (href.startsWith("/ciudad")) return href.includes("slot=") ? "Ver en la ciudad" : "Ir a la ciudad";
  if (href.startsWith("/investigacion")) return "Ir a investigar";
  if (href.startsWith("/tesoro")) return "Ver la ambrosía";
  return "Ir ahora";
}

function AdvisorCard({ advisor, quiet }: { advisor: AdvisorHint; quiet: boolean }) {
  // A hint this tab has not shown yet gets an entrance and a few gentle pulses; a known one sits still.
  const [fresh] = useState(() => !quiet && isNewAdvisor(advisor.title));
  useEffect(() => {
    if (!quiet) markAdvisorSeen(advisor.title);
  }, [advisor.title, quiet]);

  return (
    <motion.div
      initial={fresh ? { opacity: 0, y: -8, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    >
      <Link
        href={advisor.href as never}
        className="panel group flex items-center gap-2.5 px-2 py-1.5 transition-[filter,transform] duration-150 hover:brightness-[1.03] active:translate-y-px sm:gap-3 sm:px-4 sm:py-2.5"
      >
        <span
          aria-hidden
          className={clsx(
            "relative grid size-8 shrink-0 place-items-center rounded-full sm:size-11 bg-gradient-to-b from-bronze-light to-bronze-dark text-sea-950 shadow-[0_1px_0_rgb(255_255_255/0.4)_inset,0_2px_6px_-2px_rgb(43_33_24/0.6)] ring-1 ring-gold/40 sm:ring-2",
            fresh && "ring-pulse",
          )}
        >
          <OwlIcon className="size-6 sm:size-8" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm leading-tight font-bold sm:text-[15px]">{advisor.title}</span>
          {/* Phones keep the advisor to one line; screen readers still get the full hint. */}
          <span className="sr-only sm:not-sr-only sm:mt-0.5 sm:block sm:text-sm sm:leading-snug sm:text-ink-soft">{advisor.body}</span>
        </span>
        <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-bronze-dark/30 bg-gradient-to-b from-marble to-parchment-2 px-2.5 text-[13px] font-bold text-bronze-dark shadow-[0_2px_0_var(--color-parchment-3)] transition-colors group-hover:border-bronze-dark/60 group-hover:text-ink sm:h-10 sm:px-3 sm:text-sm">
          {advisorCta(advisor.href)}
        </span>
      </Link>
    </motion.div>
  );
}

/**
 * Header for the loading screen: the last real header when there is one (client navigations),
 * otherwise a placeholder with the same shape (first load).
 */
export function CachedChrome() {
  const cached = useSyncExternalStore(subscribeNever, readChrome, () => null);
  if (cached) return <GameChrome header={cached.header} advisor={cached.advisor} fromCache />;
  return <ChromePlaceholder />;
}

function ChromePlaceholder() {
  return (
    <div style={ANCHOR} className="flex flex-col gap-1.5 sm:gap-3" aria-hidden>
      <div className="flex flex-col gap-1.5 sm:gap-2.5">
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-black tracking-[0.14em] text-gold/80 [text-shadow:0_1px_0_var(--color-bronze-deep)] sm:text-xl sm:tracking-[0.18em]">
              THALASSA
            </span>
            <span className="hidden h-6 w-px bg-foam/25 sm:block" />
            <span className="skel-line on-dark h-6 w-32" />
          </div>
          <span className="skel-line on-dark h-6 w-16 rounded-full sm:w-36" />
        </div>
        <div className={`panel-glass ${BAR_LAYOUT}`}>
          {[...RESOURCES, "gold", "citizens", "research", "ambrosia"].map((k) => (
            <span key={k} className="flex shrink-0 items-center gap-1.5 px-1 py-0.5">
              <ResIcon kind={k as never} size={22} className="size-[18px] opacity-70 sm:size-[22px]" />
              <span className="flex flex-col gap-1">
                <span className="skel-line on-dark h-3.5 w-9" />
                <span className="skel-line on-dark h-[3px] w-9" />
              </span>
            </span>
          ))}
        </div>
        <NavPlaceholder />
      </div>
    </div>
  );
}
