"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const CITY_COOKIE = "thalassa_city";

/** Remembers the city in focus (cookie read by the server) so other sections open on it. */
function rememberCityCookie(id: string) {
  document.cookie = `${CITY_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
}

export const NAV_LABELS = [
  { label: "Ciudad", match: "/ciudad" },
  { label: "Isla", match: "/isla" },
  { label: "Mundo", match: "/mundo" },
  { label: "Investigación", match: "/investigacion" },
  { label: "Flota y tropas", match: "/militar" },
  { label: "Informes", match: "/informes" },
  { label: "Ranking", match: "/ranking" },
  { label: "Néctar", match: "/tesoro" },
  { label: "Invitar", match: "/invitar" },
] as const;

const hrefFor = (match: string, cityId: string, islandId: number) =>
  match === "/ciudad" ? `/ciudad/${cityId}` : match === "/isla" ? `/isla/${islandId}` : match;

const NAV_CLASS =
  "relative -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 scrollbar-none [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] md:[mask-image:none]";
const ITEM_CLASS = "relative inline-flex h-10 shrink-0 items-center rounded-lg px-3 text-[15px] font-bold";

/*
  Where the pill was last drawn, in nav content coordinates. Each section renders its own nav
  (and the loading screen another one), so the pill slides from here instead of relying on a
  shared layout that does not survive the swap.
*/
let lastPill: { x: number; w: number } | null = null;
/** Unread count last shown, so the badge pops when it changes and not on every section. */
let lastBadge = 0;

/**
 * Section tabs. The parchment pill slides to the section you pick (it moves on click, before the
 * section finishes loading), and the content slides in the same direction as the tab you chose.
 */
export function GameNav({ cityId, islandId, unreadReports }: { cityId: string; islandId: number; unreadReports: number }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const activeIndex = NAV_LABELS.findIndex((item) => pathname.startsWith(item.match));
  // The pill moves on click (optimistic), before the next section arrives.
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const pillIndex = pendingIndex ?? activeIndex;
  useLayoutEffect(() => () => setPendingIndex(null), []);
  const [badgeIsNew] = useState(() => unreadReports !== lastBadge);
  const [mountedBadge] = useState(unreadReports);
  useEffect(() => {
    lastBadge = unreadReports;
  }, [unreadReports]);

  // Slide the pill from the tab you were on (FLIP: measure, invert, play).
  useLayoutEffect(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    // Sections kept alive in the background re-run effects with their old URL: ignore them.
    if (pendingIndex === null && !window.location.pathname.startsWith(NAV_LABELS[pillIndex].match)) return;
    // Layout boxes (not getBoundingClientRect) so a pill still sliding is measured where it lands.
    const tab = pill.parentElement as HTMLElement;
    const now = { x: tab.offsetLeft, w: tab.offsetWidth };
    const prev = lastPill;
    lastPill = now;
    if (!prev || reduce || (Math.abs(prev.x - now.x) < 1 && Math.abs(prev.w - now.w) < 1)) return;
    // No cleanup on purpose: Strict Mode re-runs this effect right away and must not stop the slide.
    pill.animate([{ transform: `translateX(${prev.x - now.x}px) scaleX(${prev.w / now.w})` }, { transform: "none" }], {
      duration: 420,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [pillIndex, pendingIndex, reduce]);

  // Keep the active tab visible when the nav scrolls sideways on small screens.
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>("[aria-current=page]");
    if (!nav || !el || nav.scrollWidth <= nav.clientWidth) return;
    const left = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left) });
  }, [activeIndex]);

  return (
    <nav ref={navRef} aria-label="Secciones" className={NAV_CLASS}>
      {NAV_LABELS.map((item, i) => {
        const active = i === activeIndex;
        const lit = i === pillIndex;
        const badge = item.match === "/informes" ? unreadReports : 0;
        return (
          <Link
            key={item.match}
            href={hrefFor(item.match, cityId, islandId)}
            aria-current={active ? "page" : undefined}
            transitionTypes={activeIndex < 0 || active ? undefined : [i > activeIndex ? "nav-forward" : "nav-back"]}
            onClick={(e) => {
              if (!active && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) setPendingIndex(i);
            }}
            className={clsx(
              ITEM_CLASS,
              "transition-colors duration-200",
              lit ? "text-ink" : "text-foam/85 hover:bg-foam/10 hover:text-foam active:bg-foam/15",
            )}
          >
            {lit && (
              <span
                ref={pillRef}
                aria-hidden
                className="absolute inset-0 origin-left rounded-lg bg-gradient-to-b from-marble to-parchment shadow-[0_1px_0_rgb(255_255_255/0.8)_inset,0_4px_12px_-4px_rgb(2_10_20/0.6)]"
              />
            )}
            <span className="relative">{item.label}</span>
            {badge > 0 && (
              <span
                key={badge}
                className={clsx(
                  (badgeIsNew || badge !== mountedBadge) && "pop-in",
                  "relative ml-1.5 rounded-full bg-terracotta px-1.5 py-0.5 text-xs leading-none text-marble tabular shadow-[0_0_0_2px_rgb(196_85_45/0.25)]",
                )}
              >
                {badge}
                <span className="sr-only"> {badge === 1 ? "informe nuevo" : "informes nuevos"}</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Same tabs, not interactive, for the very first load before the header data arrives. */
export function NavPlaceholder() {
  return (
    <div aria-hidden className={NAV_CLASS}>
      {NAV_LABELS.map((item) => (
        <span key={item.match} className={clsx(ITEM_CLASS, "text-foam/50")}>
          {item.label}
        </span>
      ))}
    </div>
  );
}

type CityOption = { id: string; name: string; islandName: string };

/** City in focus. With several cities it opens a small list to switch between them. */
export function CitySwitcher({ cities, currentId }: { cities: CityOption[]; currentId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const current = cities.find((c) => c.id === currentId) ?? cities[0];

  // Sections stay alive in the background: close the list when this one is hidden.
  useLayoutEffect(() => () => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    const root = rootRef.current;
    (root?.querySelector<HTMLElement>("[data-option][aria-current=true]") ?? root?.querySelector<HTMLElement>("[data-option]"))?.focus();
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (cities.length < 2) {
    return <span className="min-w-0 truncate font-display text-lg font-bold text-foam drop-shadow">{current?.name}</span>;
  }

  const choose = (id: string) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (id === currentId) return;
    rememberCityCookie(id);
    if (pathname.startsWith("/ciudad")) router.push(`/ciudad/${id}`);
    else router.refresh();
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const options = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-option]"));
    const at = options.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (at + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      options[next]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      options[e.key === "Home" ? 0 : options.length - 1]?.focus();
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      setOpen(false);
      if (e.key === "Escape") buttonRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Ciudad actual: ${current?.name}. Cambiar de ciudad`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={clsx(
          "group inline-flex min-h-10 max-w-[58vw] items-center gap-2 rounded-lg border px-2.5 py-1 font-display text-base font-bold text-foam transition-colors sm:max-w-xs",
          open ? "border-gold/60 bg-sea-800" : "border-sea-500/40 bg-sea-900/60 hover:border-sea-300/60 hover:bg-sea-800/80",
        )}
      >
        <span className="truncate">{current?.name}</span>
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className={clsx("size-4 shrink-0 text-sea-300 transition-transform duration-200", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            aria-label="Tus ciudades"
            onKeyDown={onListKey}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 600, damping: 38 }}
            className="panel absolute top-full left-0 z-50 mt-1.5 flex w-72 max-w-[calc(100vw-2rem)] origin-top-left flex-col gap-0.5 p-1.5"
          >
            {cities.map((c) => {
              const selected = c.id === currentId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    data-option
                    aria-current={selected ? true : undefined}
                    onClick={() => choose(c.id)}
                    className={clsx(
                      "flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors",
                      selected ? "bg-parchment-2" : "hover:bg-parchment-2/70 focus-visible:bg-parchment-2/70",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display font-bold text-ink">{c.name}</span>
                      <span className="block truncate text-sm text-ink-soft">En {c.islandName}</span>
                    </span>
                    {selected && (
                      <svg viewBox="0 0 16 16" aria-hidden className="size-4 shrink-0 text-bronze-dark" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3.5 8.5 3 2.8L12.5 5" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Remembers the city in focus so other sections open on it. */
export function RememberCity({ cityId }: { cityId: string }) {
  useEffect(() => {
    rememberCityCookie(cityId);
  }, [cityId]);
  return null;
}
