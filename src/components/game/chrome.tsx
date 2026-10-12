"use client";

import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";
import Link from "next/link";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import type { AdvisorHint } from "@/game/engine";
import { useI18n, usePagePathname } from "@/i18n/client";
import type { Text } from "@/i18n/config";
import { buttonClass } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { useAnchoredPopover } from "@/components/ui/popover";
import { markShellMount } from "@/components/motion/late-mount";
import { isNewAdvisor, markAdvisorSeen, readChrome, rememberChrome, subscribeNever, type ChromeData } from "./chrome-cache";
import { IconChevron, IconLanguage, IconLeave, IconUser, OwlIcon } from "./icons";
import { CitySwitcher, GameNav, NavPlaceholder, TabBar, TabBarPlaceholder } from "./nav";
import { ResourceBar, ResourceBarPlaceholder } from "./resource-bar";

/** Stays still during section changes (see ::view-transition-group(game-header) in globals.css). */
const ANCHOR = { viewTransitionName: "game-header" } as const;

/*
  Layout, from the top:
  - desktop (1024px+): brand, sections and account on one line; then the resource bar, opened by
    the city in focus, with the advisor at its right when there is room.
  - phones and tablets: brand, city and account; the resources in two even rows; the advisor in
    one line; the sections in a bar at the bottom of the screen.
*/
const ROW = "flex h-11 items-center gap-2 lg:gap-3 xl:gap-5";
const BRAND =
  "font-display text-base font-black tracking-[0.12em] text-gold [text-shadow:0_1px_0_var(--color-bronze-deep),0_2px_10px_rgb(6_26_48/0.7)] sm:text-lg sm:tracking-[0.16em] xl:text-xl xl:tracking-[0.18em]";

/**
 * Brand, sections, account, live resources and advisor. `fromCache` renders the last header while
 * the next section loads: same pixels, no entrance animations, nothing recorded.
 */
export function GameChrome({
  header,
  advisor,
  fromCache = false,
  anchored = true,
}: ChromeData & { fromCache?: boolean; anchored?: boolean }) {
  const { lang } = useI18n();
  useState(() => {
    if (!fromCache) markShellMount();
    return null;
  });
  useEffect(() => {
    if (!fromCache) rememberChrome({ header, advisor }, lang);
  }, [header, advisor, fromCache, lang]);
  const shownAdvisor = useHeldWhileSheetOpen(advisor);

  // The tab bar sits outside the anchored header: view-transition-name makes the header its own
  // stacking context, which would trap the bar under the page.
  return (
    <>
      <div style={anchored ? ANCHOR : undefined} className="flex flex-col">
        <SkipLink />
        <header className="flex flex-col gap-1.5">
          <div className={ROW}>
            <Link
              href={`/ciudad/${header.cityId}`}
              className={clsx("-ml-1.5 inline-flex min-h-11 shrink-0 items-center rounded-lg px-1.5", BRAND)}
            >
              THALASSA
            </Link>
            <div className="flex min-w-0 lg:hidden">
              <CitySwitcher currentId={header.cityId} cities={header.cities} />
            </div>
            <GameNav cityId={header.cityId} islandId={header.islandId} unreadReports={header.unreadReports} className="hidden lg:flex" />
            <AccountMenu name={header.playerName} speed={header.speed} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <ResourceBar
              {...header.bar}
              lead={<CitySwitcher variant="bar" currentId={header.cityId} cities={header.cities} />}
              className="w-full lg:w-auto"
            />
            {/* The slot opens and closes smoothly (a finished hint must not yank the page up); hints swap inside it. */}
            <AnimatePresence initial={false}>
              {shownAdvisor && (
                <motion.div
                  key="advisor"
                  className="min-w-0 grow basis-80 2xl:ml-auto 2xl:max-w-[46rem]"
                  initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                  animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
                  exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <AnimatePresence initial={false} mode="wait">
                    <Advisor key={shownAdvisor.title.en} advisor={shownAdvisor} quiet={fromCache} />
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
      </div>
      <TabBar cityId={header.cityId} islandId={header.islandId} unreadReports={header.unreadReports} anchored={anchored} />
    </>
  );
}

// Hints come from the server as fresh objects on every snapshot: compare their content.
const sameHint = (a: AdvisorHint | null, b: AdvisorHint | null) =>
  a?.title.en === b?.title.en && a?.href === b?.href && a?.body.en === b?.body.en;

/**
 * A hint that just got done stays put while a modal sheet is open (the page behind it must not
 * jump); its slot closes once the sheet is gone, where the player can see it happen.
 */
function useHeldWhileSheetOpen(advisor: AdvisorHint | null) {
  const [held, setHeld] = useState(advisor);
  // Derived state: a new hint replaces the held one right away.
  if (advisor && !sameHint(advisor, held)) setHeld(advisor);
  useEffect(() => {
    if (advisor || !held) return;
    const release = () => {
      if (document.querySelector('[aria-modal="true"]')) return;
      observer.disconnect();
      setHeld(null);
    };
    const observer = new MutationObserver(release);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-modal"] });
    const frame = requestAnimationFrame(release);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [advisor, held]);
  return advisor ?? held;
}

/** First stop for keyboards: jumps over the header to the section on screen. */
function SkipLink() {
  const { t } = useI18n();
  const jump = (e: MouseEvent<HTMLAnchorElement>) => {
    // Sections kept alive in the background are hidden: pick the main that is on screen.
    const main = Array.from(document.querySelectorAll("main")).find((m) => m.getClientRects().length > 0);
    if (!main) return;
    e.preventDefault();
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: "start" });
  };
  return (
    <a
      href="#"
      onClick={jump}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-lg focus:bg-parchment focus:px-4 focus:py-2.5 focus:font-bold focus:text-ink focus:shadow-lg"
    >
      {t({ en: "Skip to content", es: "Saltar al contenido" })}
    </a>
  );
}

/** Player coin with the game speed; opens the name, what the test network means, the profile, the language and Log out. */
function AccountMenu({ name, speed }: { name: string; speed: number }) {
  const { t, lang } = useI18n();
  const pop = useAnchoredPopover<HTMLButtonElement>({ align: "end", gap: 6 });
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="-mr-1.5 ml-auto shrink-0">
      <button
        type="button"
        {...pop.triggerProps}
        aria-label={t({
          en: `Your account: ${name}. Test network, time ×${speed}`,
          es: `Tu cuenta: ${name}. Red de prueba, tiempo ×${speed}`,
        })}
        className={clsx(
          "flex h-11 items-center gap-1.5 rounded-full pr-1.5 pl-1 text-foam/90 transition-colors hover:bg-foam/10 hover:text-foam",
          pop.open && "bg-foam/10 text-foam",
        )}
      >
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-gradient-to-b from-gold-light via-gold to-bronze font-display text-[15px] font-black text-sea-950 shadow-[0_1px_0_rgb(255_255_255/0.5)_inset,0_2px_6px_-2px_rgb(2_10_20/0.7)] ring-1 ring-bronze-deep/40"
        >
          {initial}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-bold xl:block">{name}</span>
        <span
          aria-hidden
          className="hidden rounded-full bg-sea-800/90 px-1.5 py-0.5 text-[11px] leading-none font-bold whitespace-nowrap text-sea-300 ring-1 ring-sea-500/40 sm:inline"
        >
          <span className="hidden 2xl:inline">{t({ en: "Test network", es: "Red de prueba" })} </span>×{speed}
        </span>
        <IconChevron className={clsx("size-4 text-sea-300 transition-transform duration-200", pop.open && "rotate-180")} />
      </button>
      <div {...pop.popoverProps} className="hud-pop">
        <div className="panel w-64 p-1.5">
          <div className="px-2.5 pt-1.5 pb-2.5">
            <p className="truncate font-display text-[15px] font-bold text-ink">{name}</p>
            <p className="mt-1 text-sm leading-snug text-ink-soft">
              {lang === "en" ? (
                <>
                  Test network: time runs <b className="text-ink">{speed} times</b> faster.
                </>
              ) : (
                <>
                  Red de prueba: el tiempo corre <b className="text-ink">{speed} veces</b> más rápido.
                </>
              )}
            </p>
          </div>
          <Link
            href="/perfil"
            onClick={() => pop.hide()}
            className="flex min-h-11 items-center gap-2.5 rounded-lg border-t border-parchment-3/70 px-2.5 font-bold text-ink transition-colors hover:bg-parchment-2 focus-visible:bg-parchment-2"
          >
            <IconUser className="size-5 text-bronze-dark" />
            {t({ en: "Profile and settings", es: "Perfil y configuración" })}
          </Link>
          <div className="flex min-h-11 items-center gap-2.5 border-t border-parchment-3/70 px-2.5 py-1">
            <IconLanguage className="size-5 text-bronze-dark" />
            <span className="flex-1 font-bold text-ink">{t({ en: "Language", es: "Idioma" })}</span>
            <LanguageSwitch tone="light" />
          </div>
          <Link
            href="/salir"
            prefetch={false}
            className="flex min-h-11 items-center gap-2.5 rounded-lg border-t border-parchment-3/70 px-2.5 font-bold text-ink transition-colors hover:bg-parchment-2 focus-visible:bg-parchment-2"
          >
            <IconLeave className="size-5 text-bronze-dark" />
            {t({ en: "Log out", es: "Salir" })}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** What the advisor button does, read from where it goes (and from where you are). */
function advisorCta(href: string, pathname: string): Text {
  // Already in that section: the button only points at the spot.
  if (href.split("?")[0] === pathname) return { en: "Show me", es: "Mostrar" };
  if (href.startsWith("/isla")) return { en: "Go to island", es: "Ir a la isla" };
  if (href.startsWith("/ciudad")) return { en: "Go to city", es: "Ir a la ciudad" };
  if (href.startsWith("/investigacion")) return { en: "Research", es: "Investigar" };
  if (href.startsWith("/tesoro")) return { en: "See nectar", es: "Ver néctar" };
  return { en: "Go now", es: "Ir ahora" };
}

const WIDE = "(min-width: 1536px)";

/**
 * The owl's next step, in one line: what to do and one button that takes you there. The reason
 * opens in a bubble on hover (it is always in the line on very wide screens and for screen readers).
 * The button is secondary on purpose: the section's own main action keeps the bronze.
 */
function Advisor({ advisor, quiet }: { advisor: AdvisorHint; quiet: boolean }) {
  const pathname = usePagePathname();
  const { t } = useI18n();
  // A hint this tab has not shown yet gets an entrance and a few gentle pulses; a known one sits still.
  const [fresh] = useState(() => !quiet && isNewAdvisor(advisor.title.en));
  useEffect(() => {
    if (!quiet) markAdvisorSeen(advisor.title.en);
  }, [advisor.title.en, quiet]);
  const bubble = useAnchoredPopover<HTMLAnchorElement>({
    hover: true,
    align: "start",
    gap: 8,
  });

  return (
    <motion.div
      initial={fresh ? { opacity: 0, y: -8, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        y: -6,
        transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
      }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    >
      <Link
        {...bubble.anchorProps}
        href={advisor.href as never}
        onPointerEnter={(e) => {
          if (!window.matchMedia(WIDE).matches) bubble.hoverProps.onPointerEnter?.(e);
        }}
        onPointerLeave={bubble.hoverProps.onPointerLeave}
        className="panel group flex h-10 w-full items-center gap-2 py-1 pr-1 pl-1 transition-[filter,transform] duration-150 hover:brightness-[1.03] active:translate-y-px lg:h-11 lg:gap-2.5"
      >
        <span
          aria-hidden
          className={clsx(
            "relative grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-b from-bronze-light to-bronze-dark text-sea-950 shadow-[0_1px_0_rgb(255_255_255/0.4)_inset,0_2px_6px_-2px_rgb(43_33_24/0.6)] ring-1 ring-gold/40",
            fresh && "ring-pulse",
          )}
        >
          <OwlIcon className="size-6" />
        </span>
        <span className="min-w-0 flex-1 truncate">
          <span className="font-display text-sm font-bold sm:text-[15px]">{t(advisor.title)}</span>
          <span className="sr-only 2xl:not-sr-only 2xl:ml-2 2xl:text-sm 2xl:text-ink-soft">{t(advisor.body)}</span>
        </span>
        <span className={buttonClass("secondary", "sm", "shrink-0 px-2.5 text-bronze-dark group-hover:text-ink lg:h-9")}>
          {t(advisorCta(advisor.href, pathname))}
          <svg
            viewBox="0 0 16 16"
            aria-hidden
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </span>
      </Link>
      <div {...bubble.popoverProps} className="hud-pop pointer-events-none">
        {bubble.open && <p className="hud-bubble max-w-72 px-3 py-2 text-sm leading-snug text-ink">{t(advisor.body)}</p>}
      </div>
    </motion.div>
  );
}

/**
 * Header for the loading screen: the last real header when there is one (client navigations),
 * otherwise a placeholder with the same shape (first load).
 */
export function CachedChrome({ anchored = true }: { anchored?: boolean }) {
  const { lang } = useI18n();
  const cached = useSyncExternalStore(subscribeNever, readChrome, () => null);
  if (cached && cached.lang === lang) return <GameChrome header={cached.header} advisor={cached.advisor} fromCache anchored={anchored} />;
  return <ChromePlaceholder anchored={anchored} />;
}

function ChromePlaceholder({ anchored }: { anchored: boolean }) {
  return (
    <>
      <div style={anchored ? ANCHOR : undefined} className="flex flex-col" aria-hidden>
        <div className="flex flex-col gap-1.5">
          <div className={ROW}>
            <span className={clsx("-ml-1.5 px-1.5 opacity-80", BRAND)}>THALASSA</span>
            <span className="skel-line on-dark h-8 w-32 lg:hidden" />
            <NavPlaceholder className="hidden lg:flex" />
            <span className="skel-line on-dark ml-auto h-8 w-16 rounded-full xl:w-56" />
          </div>
          <ResourceBarPlaceholder className="w-full lg:w-auto lg:self-start" />
        </div>
      </div>
      <TabBarPlaceholder anchored={anchored} />
    </>
  );
}
