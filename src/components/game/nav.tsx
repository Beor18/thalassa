"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useReducedMotion } from "motion/react";
import { useI18n, usePagePathname } from "@/i18n/client";
import type { Text } from "@/i18n/config";
import { useAnchoredPopover } from "@/components/ui/popover";
import {
  IconCheck,
  IconChevron,
  IconCity,
  IconInvite,
  IconIsland,
  IconMore,
  IconNectar,
  IconReports,
  IconResearch,
  IconSwords,
  IconTrophy,
  IconWorld,
  type HudIcon,
} from "./icons";

const CITY_COOKIE = "thalassa_city";

/** Remembers the city in focus (cookie read by the server) so other sections open on it. */
function rememberCityCookie(id: string) {
  document.cookie = `${CITY_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
}

/*
  Sections in reading order (it also sets the slide direction between them).
  tier 1: always in sight. tier 2: in the "More" sheet on phones. tier 3: also in "More" on small desktops.
*/
export const NAV_LABELS: {
  label: Text;
  short: Text;
  match: string;
  icon: HudIcon;
  tier: 1 | 2 | 3;
}[] = [
  { label: { en: "City", es: "Ciudad" }, short: { en: "City", es: "Ciudad" }, match: "/ciudad", icon: IconCity, tier: 1 },
  { label: { en: "Island", es: "Isla" }, short: { en: "Island", es: "Isla" }, match: "/isla", icon: IconIsland, tier: 1 },
  { label: { en: "World", es: "Mundo" }, short: { en: "World", es: "Mundo" }, match: "/mundo", icon: IconWorld, tier: 1 },
  {
    label: { en: "Research", es: "Investigación" },
    short: { en: "Research", es: "Investigar" },
    match: "/investigacion",
    icon: IconResearch,
    tier: 1,
  },
  {
    label: { en: "Fleet & troops", es: "Flota y tropas" },
    short: { en: "Troops", es: "Tropas" },
    match: "/militar",
    icon: IconSwords,
    tier: 1,
  },
  { label: { en: "Reports", es: "Informes" }, short: { en: "Reports", es: "Informes" }, match: "/informes", icon: IconReports, tier: 2 },
  { label: { en: "Rankings", es: "Ranking" }, short: { en: "Rankings", es: "Ranking" }, match: "/ranking", icon: IconTrophy, tier: 3 },
  { label: { en: "Nectar", es: "Néctar" }, short: { en: "Nectar", es: "Néctar" }, match: "/tesoro", icon: IconNectar, tier: 3 },
  { label: { en: "Invite", es: "Invitar" }, short: { en: "Invite", es: "Invitar" }, match: "/invitar", icon: IconInvite, tier: 3 },
];

const MORE: Text = { en: "More", es: "Más" };
const MORE_SECTIONS: Text = { en: "More sections", es: "Más secciones" };
const SECTIONS: Text = { en: "Sections", es: "Secciones" };

const hrefFor = (match: string, cityId: string, islandId: number) =>
  match === "/ciudad" ? `/ciudad/${cityId}` : match === "/isla" ? `/isla/${islandId}` : match;

const indexOf = (pathname: string) => NAV_LABELS.findIndex((item) => pathname.startsWith(item.match));

/** Slide direction for a link from the current section to `match` (content moves toward the tab). */
export function sectionTransition(pathname: string, match: string): string[] | undefined {
  const from = indexOf(pathname);
  const to = NAV_LABELS.findIndex((item) => item.match === match);
  if (from < 0 || to < 0 || from === to) return undefined;
  return [to > from ? "nav-forward" : "nav-back"];
}

type Variant = "top" | "bar";

/** Which items fold into "More", and the classes that swap them with it, per nav. */
const FOLD: Record<Variant, { from: number; inline: string; more: string }> = {
  // Desktop: Rankings, Nectar and Invite fold below 1280px.
  top: { from: 3, inline: "hidden xl:inline-flex", more: "xl:hidden" },
  // Phones and tablets: Reports and the rest fold below 768px.
  bar: { from: 2, inline: "hidden md:flex", more: "md:hidden" },
};

/*
  Where the pill was last drawn, per nav, in nav content coordinates. Each section renders its own
  nav (and the loading screen another one), so the pill slides from here instead of relying on a
  shared layout that does not survive the swap.
*/
const lastPill: Record<Variant, { x: number; w: number } | null> = {
  top: null,
  bar: null,
};
/**
 * Unread count last shown, so the badge pops when it changes and not on every section. Unknown
 * on the first screen of a visit: what was already waiting (like the welcome report) sits still.
 */
let lastBadge: number | null = null;

const PILL =
  "nav-pill absolute origin-left bg-gradient-to-b from-marble to-parchment shadow-[0_1px_0_rgb(255_255_255/0.8)_inset,0_4px_12px_-4px_rgb(2_10_20/0.6)]";

/*
  While a section you picked is on its way, <html data-nav-pending> makes the lit pill shimmer and
  dims the page you are leaving (globals.css), so a slow load never looks like a dead click.
*/
let pendingTimer: ReturnType<typeof setTimeout> | undefined;
function markNavPending() {
  document.documentElement.setAttribute("data-nav-pending", "");
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(clearNavPending, 10_000);
}
function clearNavPending() {
  clearTimeout(pendingTimer);
  document.documentElement.removeAttribute("data-nav-pending");
}

/** State shared by both navs: active and optimistic section, pill slide, badge pop. */
function useSectionNav(variant: Variant, unreadReports: number) {
  const pathname = usePagePathname();
  const navRef = useRef<HTMLElement>(null);
  const pills = useRef(new Set<HTMLElement>());
  const reduce = useReducedMotion();
  const activeIndex = indexOf(pathname);
  // The pill moves on click (optimistic), before the next section arrives.
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const pillIndex = pendingIndex ?? activeIndex;
  useLayoutEffect(() => () => setPendingIndex(null), []);
  // A nav rendered for the new URL (the section or its loading screen) ends the wait.
  useEffect(() => clearNavPending(), [pathname]);
  const [badgeIsNew] = useState(() => lastBadge !== null && unreadReports > lastBadge);
  const [mountedBadge] = useState(unreadReports);
  useEffect(() => {
    lastBadge = unreadReports;
  }, [unreadReports]);

  // Slide the pill from the tab you were on (FLIP: measure, invert, play).
  useLayoutEffect(() => {
    // Only the pill this breakpoint shows (the other copy sits in a hidden tab).
    const pill = [...pills.current].find((p) => p.offsetWidth > 0);
    if (!navRef.current || !pill || pillIndex < 0) return;
    // Sections kept alive in the background re-run effects with their old URL: ignore them.
    if (pendingIndex === null && !window.location.pathname.startsWith(NAV_LABELS[pillIndex].match)) return;
    // Layout boxes (not getBoundingClientRect) so a pill still sliding is measured where it lands.
    const tab = pill.parentElement as HTMLElement;
    const now = { x: tab.offsetLeft, w: tab.offsetWidth };
    const prev = lastPill[variant];
    lastPill[variant] = now;
    if (!prev || reduce || (Math.abs(prev.x - now.x) < 1 && Math.abs(prev.w - now.w) < 1)) return;
    // No cleanup on purpose: Strict Mode re-runs this effect right away and must not stop the slide.
    pill.animate(
      [
        {
          transform: `translateX(${prev.x - now.x}px) scaleX(${prev.w / now.w})`,
        },
        { transform: "none" },
      ],
      {
        duration: 420,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    );
  }, [pillIndex, pendingIndex, reduce, variant]);

  const pillRef = (el: HTMLSpanElement | null) => {
    if (!el) return;
    pills.current.add(el);
    return () => {
      pills.current.delete(el);
    };
  };

  const linkProps = (i: number, cityId: string, islandId: number) => {
    const active = i === activeIndex;
    return {
      href: hrefFor(NAV_LABELS[i].match, cityId, islandId),
      "aria-current": active ? ("page" as const) : undefined,
      transitionTypes: activeIndex < 0 || active ? undefined : [i > activeIndex ? "nav-forward" : "nav-back"],
      onClick: (e: MouseEvent) => {
        if (!active && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
          setPendingIndex(i);
          markNavPending();
        }
      },
    };
  };

  const popBadge = (badge: number) => badgeIsNew || badge > mountedBadge;

  return { navRef, activeIndex, pillIndex, pillRef, linkProps, popBadge };
}

function Badge({ count, pop, className }: { count: number; pop: boolean; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      key={count}
      className={clsx(
        pop && "pop-in",
        "rounded-full bg-terracotta px-1.5 py-0.5 text-xs leading-none font-bold text-marble tabular shadow-[0_0_0_2px_rgb(196_85_45/0.25)]",
        className,
      )}
    >
      {count}
      <span className="sr-only">
        {" "}
        {count === 1 ? t({ en: "new report", es: "informe nuevo" }) : t({ en: "new reports", es: "informes nuevos" })}
      </span>
    </span>
  );
}

interface NavProps {
  cityId: string;
  islandId: number;
  unreadReports: number;
}

const TOP_ITEM = "relative h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[15px] font-bold xl:px-3";
const TOP_IDLE = "text-foam/85 transition-colors duration-200 hover:bg-foam/10 hover:text-foam active:bg-foam/15";

/**
 * Desktop section tabs. The parchment pill slides to the section you pick (it moves on click,
 * before the section finishes loading), and the content slides toward the tab you chose.
 */
export function GameNav({ cityId, islandId, unreadReports, className }: NavProps & { className?: string }) {
  const { navRef, pillIndex, pillRef, linkProps, popBadge } = useSectionNav("top", unreadReports);
  const { t } = useI18n();
  const fold = FOLD.top;
  const folded = NAV_LABELS.map((_, i) => i).filter((i) => NAV_LABELS[i].tier >= fold.from);

  return (
    <nav ref={navRef} aria-label={t(SECTIONS)} className={clsx("relative min-w-0 items-center gap-0.5", className)}>
      {NAV_LABELS.map((item, i) => {
        const lit = i === pillIndex;
        const Icon = item.icon;
        const badge = item.match === "/informes" ? unreadReports : 0;
        return (
          <Link
            key={item.match}
            {...linkProps(i, cityId, islandId)}
            className={clsx(TOP_ITEM, item.tier >= fold.from ? fold.inline : "inline-flex", lit ? "text-ink" : TOP_IDLE)}
          >
            {lit && <span ref={pillRef} aria-hidden className={clsx(PILL, "inset-0 rounded-lg")} />}
            <Icon className="relative hidden size-[18px] opacity-80 2xl:block" />
            <span className="relative">{t(item.label)}</span>
            {badge > 0 && <Badge count={badge} pop={popBadge(badge)} className="relative" />}
          </Link>
        );
      })}
      <MoreMenu
        variant="top"
        items={folded}
        pillIndex={pillIndex}
        pillRef={pillRef}
        linkProps={(i) => linkProps(i, cityId, islandId)}
        unread={0}
      />
    </nav>
  );
}

/**
 * Phones and tablets: the sections live in a bar at the bottom, in reach of the thumb.
 * Same pill, same slide; the less used sections fold into "More" on phones.
 */
export function TabBar({ cityId, islandId, unreadReports, anchored = true }: NavProps & { anchored?: boolean }) {
  const { navRef, pillIndex, pillRef, linkProps, popBadge } = useSectionNav("bar", unreadReports);
  const { t } = useI18n();
  const fold = FOLD.bar;
  const folded = NAV_LABELS.map((_, i) => i).filter((i) => NAV_LABELS[i].tier >= fold.from);

  return (
    <TabBarFrame anchored={anchored}>
      <nav ref={navRef} aria-label={t(SECTIONS)} className="relative mx-auto flex h-full max-w-3xl items-stretch">
        {NAV_LABELS.map((item, i) => {
          const lit = i === pillIndex;
          const badge = item.match === "/informes" ? unreadReports : 0;
          return (
            <Link
              key={item.match}
              {...linkProps(i, cityId, islandId)}
              className={clsx(BAR_ITEM, item.tier >= fold.from ? fold.inline : "flex", lit ? "text-ink" : BAR_IDLE)}
            >
              <BarFace icon={item.icon} label={t(item.short)} lit={lit} pillRef={pillRef} />
              {badge > 0 && <Badge count={badge} pop={popBadge(badge)} className={BAR_BADGE} />}
            </Link>
          );
        })}
        <MoreMenu
          variant="bar"
          items={folded}
          pillIndex={pillIndex}
          pillRef={pillRef}
          linkProps={(i) => linkProps(i, cityId, islandId)}
          unread={unreadReports}
          badge={unreadReports > 0 ? <Badge count={unreadReports} pop={popBadge(unreadReports)} className={BAR_BADGE} /> : null}
        />
      </nav>
    </TabBarFrame>
  );
}

const BAR_ITEM = "relative min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-[11px] leading-none font-bold";
const BAR_IDLE = "text-foam/80 transition-colors active:text-foam";
const BAR_BADGE = "absolute top-1 left-[calc(50%+4px)] text-[11px]";
/*
  Stays still between sections, like the header (see ::view-transition-group(game-tabbar)).
  z-65: over the painted scenes (up to z-60), under the plot sheets, and it steps aside while any
  modal sheet is open (see .game-tabbar in globals.css).
*/
const TABBAR_ANCHOR: CSSProperties = { viewTransitionName: "game-tabbar" };

function TabBarFrame({
  children,
  placeholder = false,
  anchored = true,
}: {
  children: ReactNode;
  placeholder?: boolean;
  anchored?: boolean;
}) {
  return (
    <div
      style={anchored ? TABBAR_ANCHOR : undefined}
      aria-hidden={placeholder || undefined}
      className="game-tabbar fixed inset-x-0 bottom-0 z-[65] border-t border-sea-300/25 bg-gradient-to-b from-sea-800/95 to-sea-950/[0.97] pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-14px_rgb(2_10_20/0.85)] backdrop-blur-md lg:hidden"
    >
      <div className="h-14 px-1">{children}</div>
    </div>
  );
}

function BarFace({
  icon: Icon,
  label,
  lit,
  pillRef,
}: {
  icon: HudIcon;
  label: string;
  lit: boolean;
  pillRef?: (el: HTMLSpanElement | null) => void;
}) {
  return (
    <>
      {lit && <span ref={pillRef} aria-hidden className={clsx(PILL, "inset-x-0.5 inset-y-1 rounded-xl")} />}
      <Icon className="relative size-[22px]" />
      <span className="relative max-w-full truncate">{label}</span>
    </>
  );
}

/** "More": the folded sections. A list under the tab on desktop, tiles over the bar on phones. */
function MoreMenu({
  variant,
  items,
  pillIndex,
  pillRef,
  linkProps,
  unread,
  badge,
}: {
  variant: Variant;
  items: number[];
  pillIndex: number;
  pillRef: (el: HTMLSpanElement | null) => void;
  linkProps: (i: number) => ReturnType<ReturnType<typeof useSectionNav>["linkProps"]>;
  unread: number;
  badge?: ReactNode;
}) {
  const bar = variant === "bar";
  const { t } = useI18n();
  const pop = useAnchoredPopover<HTMLButtonElement>({
    side: bar ? "above" : "below",
    align: bar ? "end" : "start",
    gap: bar ? 10 : 6,
  });
  // While a folded section is open, the button wears its name, so you always see where you are.
  const current = items.includes(pillIndex) ? NAV_LABELS[pillIndex] : null;
  const lit = current != null;
  const label = t(current ? (bar ? current.short : current.label) : MORE);

  return (
    <div className={clsx(FOLD[variant].more, bar ? "flex flex-1" : "contents")}>
      <button
        type="button"
        {...pop.triggerProps}
        aria-label={current ? `${t(current.label)}. ${t(MORE_SECTIONS)}` : t(MORE_SECTIONS)}
        className={clsx(
          bar ? clsx(BAR_ITEM, "flex") : clsx(TOP_ITEM, "inline-flex"),
          lit ? "text-ink" : bar ? BAR_IDLE : TOP_IDLE,
          pop.open && !lit && "bg-foam/10 text-foam",
        )}
      >
        {bar ? (
          <BarFace icon={current?.icon ?? IconMore} label={label} lit={lit} pillRef={pillRef} />
        ) : (
          <>
            {lit && <span ref={pillRef} aria-hidden className={clsx(PILL, "inset-0 rounded-lg")} />}
            <span className="relative">{label}</span>
            <IconChevron className={clsx("relative size-4 opacity-70 transition-transform duration-200", pop.open && "rotate-180")} />
          </>
        )}
        {badge}
      </button>
      <div {...pop.popoverProps} className="hud-pop">
        {bar ? (
          <ul aria-label={t(MORE_SECTIONS)} className="panel grid w-[min(20rem,calc(100vw-1rem))] grid-cols-2 gap-1.5 p-2">
            {items.map((i) => {
              const item = NAV_LABELS[i];
              const here = i === pillIndex;
              const count = item.match === "/informes" ? unread : 0;
              return (
                <li key={item.match}>
                  <Link
                    {...linkProps(i)}
                    onClick={(e) => {
                      linkProps(i).onClick(e);
                      pop.hide();
                    }}
                    className={clsx(
                      "relative flex min-h-14 items-center gap-2.5 rounded-xl px-3 font-bold text-ink transition-colors",
                      here ? "bg-parchment-3/70" : "bg-parchment-2/60 active:bg-parchment-3/60",
                    )}
                  >
                    <item.icon className="size-6 text-bronze-dark" />
                    <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
                    {count > 0 && <Badge count={count} pop={false} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul aria-label={t(MORE_SECTIONS)} className="panel flex w-52 flex-col gap-0.5 p-1.5">
            {items.map((i) => {
              const item = NAV_LABELS[i];
              const here = i === pillIndex;
              return (
                <li key={item.match}>
                  <Link
                    {...linkProps(i)}
                    onClick={(e) => {
                      linkProps(i).onClick(e);
                      pop.hide();
                    }}
                    className={clsx(
                      "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 font-bold text-ink transition-colors",
                      here ? "bg-parchment-2" : "hover:bg-parchment-2/70 focus-visible:bg-parchment-2/70",
                    )}
                  >
                    <item.icon className="size-5 text-bronze-dark" />
                    <span className="flex-1">{t(item.label)}</span>
                    {here && <IconCheck className="size-4 text-bronze-dark" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Same tabs, not interactive, for the very first load before the header data arrives. */
export function NavPlaceholder({ className }: { className?: string }) {
  const { t } = useI18n();
  const fold = FOLD.top;
  return (
    <div aria-hidden className={clsx("items-center gap-0.5", className)}>
      {NAV_LABELS.map((item) => (
        <span key={item.match} className={clsx(TOP_ITEM, "text-foam/50", item.tier >= fold.from ? fold.inline : "inline-flex")}>
          <item.icon className="hidden size-[18px] 2xl:block" />
          {t(item.label)}
        </span>
      ))}
      <span className={clsx(TOP_ITEM, "inline-flex text-foam/50", fold.more)}>
        {t(MORE)}
        <IconChevron className="size-4" />
      </span>
    </div>
  );
}

/** Tab bar placeholder for the first load on phones and tablets. */
export function TabBarPlaceholder({ anchored = true }: { anchored?: boolean }) {
  const { t } = useI18n();
  const fold = FOLD.bar;
  return (
    <TabBarFrame placeholder anchored={anchored}>
      <div className="mx-auto flex h-full max-w-3xl items-stretch">
        {NAV_LABELS.map((item) => (
          <span key={item.match} className={clsx(BAR_ITEM, "text-foam/50", item.tier >= fold.from ? fold.inline : "flex")}>
            <BarFace icon={item.icon} label={t(item.short)} lit={false} />
          </span>
        ))}
        <span className={clsx(BAR_ITEM, "flex text-foam/50", fold.more)}>
          <BarFace icon={IconMore} label={t(MORE)} lit={false} />
        </span>
      </div>
    </TabBarFrame>
  );
}

type CityOption = { id: string; name: string; islandName: string };

/**
 * City in focus. With several cities it opens a small list to switch between them.
 * `bar`: the segment that opens the resource bar on desktop; `row`: the header button on phones.
 */
export function CitySwitcher({ cities, currentId, variant = "row" }: { cities: CityOption[]; currentId: string; variant?: "row" | "bar" }) {
  const router = useRouter();
  const pathname = usePagePathname();
  const { t } = useI18n();
  const pop = useAnchoredPopover<HTMLButtonElement>({
    align: "start",
    gap: variant === "bar" ? 8 : 6,
  });
  const current = cities.find((c) => c.id === currentId) ?? cities[0];
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!pop.open) return;
    const list = listRef.current;
    (list?.querySelector<HTMLElement>("[data-option][aria-current=true]") ?? list?.querySelector<HTMLElement>("[data-option]"))?.focus();
  }, [pop.open]);

  const nameClass =
    variant === "bar" ? "font-display text-[15px] font-bold text-foam" : "font-display text-base font-bold text-foam sm:text-lg";

  if (cities.length < 2) {
    return (
      <span
        className={clsx("min-w-0 truncate drop-shadow", nameClass, variant === "bar" && "max-w-44 px-2.5")}
        title={t({ en: `${current?.name}, on ${current?.islandName}`, es: `${current?.name}, en ${current?.islandName}` })}
      >
        {current?.name}
      </span>
    );
  }

  const choose = (id: string) => {
    pop.hide();
    pop.focusTrigger();
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
    } else if (e.key === "Tab") {
      pop.hide();
    }
  };

  return (
    <div className="min-w-0">
      <button
        type="button"
        {...pop.triggerProps}
        aria-label={t({ en: `Current city: ${current?.name}. Switch city`, es: `Ciudad actual: ${current?.name}. Cambiar de ciudad` })}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !pop.open) {
            e.preventDefault();
            pop.show(true);
          }
        }}
        className={clsx(
          "group inline-flex max-w-full items-center gap-1.5 transition-colors",
          nameClass,
          variant === "bar"
            ? clsx("h-9 rounded-[10px] px-2.5 sm:max-w-56", pop.open ? "bg-foam/15" : "hover:bg-foam/10")
            : clsx(
                "min-h-10 max-w-[46vw] rounded-lg border px-2.5 py-1 sm:max-w-xs",
                pop.open ? "border-gold/60 bg-sea-800" : "border-sea-500/40 bg-sea-900/60 hover:border-sea-300/60 hover:bg-sea-800/80",
              ),
        )}
      >
        <span className="truncate">{current?.name}</span>
        <IconChevron className={clsx("size-4 text-sea-300 transition-transform duration-200", pop.open && "rotate-180")} />
      </button>
      <div {...pop.popoverProps} className="hud-pop">
        <ul
          ref={listRef}
          aria-label={t({ en: "Your cities", es: "Tus ciudades" })}
          onKeyDown={onListKey}
          className="panel flex w-72 max-w-[calc(100vw-1rem)] flex-col gap-0.5 p-1.5"
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
                    <span className="block truncate text-sm text-ink-soft">
                      {t({ en: `On ${c.islandName}`, es: `En ${c.islandName}` })}
                    </span>
                  </span>
                  {selected && <IconCheck className="size-4 text-bronze-dark" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
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
