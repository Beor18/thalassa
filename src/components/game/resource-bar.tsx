"use client";

import type { KeyboardEvent, ReactNode } from "react";
import Link from "next/link";

import clsx from "clsx";
import { RESOURCES, type Resource } from "@/game/data";
import { resourceLabel } from "@/game/names";
import { useI18n, usePagePathname } from "@/i18n/client";
import type { Text } from "@/i18n/config";
import { ResIcon, type ResKey } from "@/components/ui/res";
import { useAnchoredPopover } from "@/components/ui/popover";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { useServerClock } from "@/lib/use-server-clock";
import { IconShield } from "./icons";
import { sectionTransition } from "./nav";

export interface ResourceBarProps {
  serverNow: number;
  res: Record<Resource, number>;
  /** per hour */
  rates: { wood: number; luxury: number; luxuryResource: Exclude<Resource, "wood">; wineUse: number };
  storage: number;
  gold: number;
  goldPerHour: number;
  research: number;
  researchPerHour: number;
  ambrosia: number;
  population: number;
  housing: number;
  freeCitizens: number;
  /** Amount of each resource raiders can't take. */
  safe?: number;
  /** Gold per hour, before and after costs (troops, scientists). */
  goldIncome?: number;
  goldUpkeep?: number;
  /** Citizens per hour. */
  growth?: number;
}

/**
 * Two groups (raw materials, then gold, citizens, research and nectar). Phones stack them in two
 * even rows so every number is in sight; from 768px they share one slim row.
 */
export const BAR_LAYOUT = "flex flex-wrap items-center gap-x-1 gap-y-0.5 px-2 py-1 md:flex-nowrap md:px-1.5 lg:h-11 lg:py-0";
export const BAR_GROUP = "flex w-full items-center justify-between md:w-auto md:justify-start md:gap-0.5 xl:gap-1";

type Line = [label: string, value: ReactNode, tone?: "good" | "bad" | "gold"];

/** Card labels used more than once. */
const L = {
  storage: { en: "Storage", es: "Depósito" },
  perHour: { en: "Per hour", es: "Por hora" },
  status: { en: "Status", es: "Estado" },
  full: { en: "Full", es: "Lleno" },
  runsOut: { en: "Runs out in", es: "Se acaba en" },
} satisfies Record<string, Text>;

/**
 * Live HUD. Interpolates production between server snapshots so numbers move in real time; when a
 * new snapshot arrives after an action, the numbers count to the new value with a "+N" float.
 * Details (capacity, rates, what is safe from raids) open on hover or tap: one resource at a time
 * on desktop, all of them at once from the bar on phones and tablets.
 */
export function ResourceBar({ lead, className, ...props }: ResourceBarProps & { lead?: ReactNode; className?: string }) {
  const now = useServerClock(props.serverNow);
  const elapsedH = (now - props.serverNow) / 3_600_000;
  const key = props.serverNow;
  const pathname = usePagePathname();
  const { t, fmt, fmtDuration, fmtSigned } = useI18n();
  const overview = useAnchoredPopover<HTMLButtonElement>({ gap: 6, fullBelow: 640 });

  const perHour = (r: Resource) => {
    let v = 0;
    if (r === "wood") v += props.rates.wood;
    if (r === props.rates.luxuryResource) v += props.rates.luxury;
    if (r === "wine") v -= props.rates.wineUse;
    return v;
  };
  const live = (r: Resource) => Math.max(0, Math.min(props.storage, props.res[r] + perHour(r) * elapsedH));
  // Ignore the drift of live production; only real jumps (costs, deliveries, loot) float.
  const minDelta = (rate: number) => 2 + Math.abs(rate) / 1200;

  const gold = Math.max(0, props.gold + props.goldPerHour * elapsedH);
  const research = props.research + props.researchPerHour * elapsedH;

  const raw = RESOURCES.map((r) => {
    const value = live(r);
    const rate = perHour(r);
    const full = value >= props.storage - 0.5;
    const lines: Line[] = [[t(L.storage), `${fmt(value)} / ${fmt(props.storage)}`, full ? "gold" : undefined]];
    if (rate) lines.push([t(L.perHour), fmtSigned(rate), rate > 0 ? "good" : "bad"]);
    if (full) lines.push([t(L.status), t(rate > 0 ? { en: "Full, output lost", es: "Lleno, se pierde producción" } : L.full), "gold"]);
    else if (rate > 0) lines.push([t({ en: "Full in", es: "Lleno en" }), fmtDuration(((props.storage - value) / rate) * 3_600_000)]);
    else if (rate < 0 && value > 0) lines.push([t(L.runsOut), fmtDuration((value / -rate) * 3_600_000), "bad"]);
    if (props.safe) lines.push([t({ en: "Safe", es: "A salvo" }), fmt(Math.min(props.safe, props.storage))]);
    return { r, value, rate, full, fill: props.storage > 0 ? value / props.storage : 0, lines };
  });

  const goldLines: Line[] = [[t(L.perHour), fmtSigned(props.goldPerHour), props.goldPerHour >= 0 ? "good" : "bad"]];
  if (props.goldIncome !== undefined) goldLines.push([t({ en: "Taxes", es: "Impuestos" }), fmtSigned(props.goldIncome), "good"]);
  if (props.goldUpkeep) goldLines.push([t({ en: "Wages", es: "Gastos" }), fmtSigned(-props.goldUpkeep), "bad"]);
  if (props.goldPerHour < 0 && gold > 0) goldLines.push([t(L.runsOut), fmtDuration((gold / -props.goldPerHour) * 3_600_000), "bad"]);

  const citizenLines: Line[] = [
    [t({ en: "Idle", es: "Libres" }), fmt(props.freeCitizens)],
    [
      t({ en: "Population", es: "Población" }),
      `${fmt(props.population)} / ${fmt(props.housing)}`,
      props.population >= props.housing ? "gold" : undefined,
    ],
  ];
  if (props.growth) citizenLines.push([t({ en: "Growth", es: "Crecen" }), `${fmtSigned(props.growth)}/h`, props.growth > 0 ? "good" : "bad"]);

  const researchLines: Line[] = [[t(L.perHour), fmtSigned(props.researchPerHour), props.researchPerHour > 0 ? "good" : undefined]];

  return (
    <div role="toolbar" aria-label={t({ en: "Resources", es: "Recursos" })} onKeyDown={moveBetweenChips} className={clsx("panel-glass relative", BAR_LAYOUT, className)}>
      {lead && (
        <>
          <span className="hidden lg:contents">{lead}</span>
          <Divider className="hidden lg:block" />
        </>
      )}
      <div className={BAR_GROUP}>
        {raw.map(({ r, value, rate, full, fill, lines }) => (
          <Chip key={r} kind={r} full={full} fill={fill} lines={lines} first={r === RESOURCES[0]}>
            <AnimatedNumber value={value} animateKey={key} minDelta={minDelta(rate)} float className={full ? "text-gold" : "text-foam"} />
            <span className="sr-only">
              {t({ en: ` of ${fmt(props.storage)}`, es: ` de ${fmt(props.storage)}` })}
              {full ? t({ en: ", storage full", es: ", depósito lleno" }) : ""}
            </span>
          </Chip>
        ))}
      </div>
      <Divider className="hidden md:block" />
      <div className={BAR_GROUP}>
        <Chip kind="gold" lines={goldLines}>
          <AnimatedNumber value={gold} animateKey={key} minDelta={minDelta(props.goldPerHour)} float className="text-gold" />
        </Chip>
        <Chip kind="citizens" lines={citizenLines} fill={props.housing > 0 ? props.population / props.housing : undefined}>
          <AnimatedNumber value={props.freeCitizens} animateKey={key} float className="text-foam" />
          <span className="font-normal text-foam/55">
            <span className="hidden 2xl:inline">
              {" "}
              / <span className="tabular">{fmt(props.population)}</span>
            </span>
            <span className="sr-only 2xl:hidden">{t({ en: ` free of ${fmt(props.population)}`, es: ` libres de ${fmt(props.population)}` })}</span>
          </span>
        </Chip>
        <Chip kind="research" lines={researchLines}>
          <AnimatedNumber value={research} animateKey={key} minDelta={minDelta(props.researchPerHour)} float className="text-foam" />
        </Chip>
        <Chip
          kind="ambrosia"
          lines={[]}
          note={t({ en: "Finishes any build instantly.", es: "Termina cualquier obra al instante." })}
          href="/tesoro"
          transitionTypes={sectionTransition(pathname, "/tesoro")}
        >
          <AnimatedNumber value={props.ambrosia} animateKey={key} float className="text-shimmer-ambrosia" />
        </Chip>
      </div>

      {/* Phones and tablets: the whole bar is one big target that opens every detail at once. */}
      <button
        type="button"
        {...overview.triggerProps}
        aria-label={t({ en: "See your resources in detail", es: "Ver el detalle de tus recursos" })}
        className="absolute inset-0 z-10 rounded-[inherit] lg:hidden"
      />
      <div {...overview.popoverProps} className="hud-pop">
        {overview.open && (
          <div className="hud-tip w-[22rem] max-w-full p-1.5">
            <table className="w-full border-separate border-spacing-y-0.5 text-sm">
              <caption className="sr-only">{t({ en: "Your resources", es: "Tus recursos" })}</caption>
              <tbody>
                {raw.map(({ r, value, rate, full }) => (
                  <OverviewRow
                    key={r}
                    kind={r}
                    value={
                      <>
                        <span className={full ? "text-gold" : undefined}>{fmt(value)}</span>
                        <span className="font-normal text-foam/55"> / {fmt(props.storage)}</span>
                      </>
                    }
                    rate={full && rate > 0 ? <span className="text-gold">{t(L.full)}</span> : rate ? <Rate value={rate} /> : null}
                  />
                ))}
                <tr aria-hidden>
                  <td colSpan={4} className="px-1 py-1">
                    <span className="block h-px bg-foam/15" />
                  </td>
                </tr>
                <OverviewRow kind="gold" value={<span className="text-gold">{fmt(gold)}</span>} rate={<Rate value={props.goldPerHour} />} />
                <OverviewRow
                  kind="citizens"
                  value={
                    <>
                      {fmt(props.freeCitizens)}
                      <span className="font-normal text-foam/55">
                        {t({ en: ` free of ${fmt(props.population)}`, es: ` libres de ${fmt(props.population)}` })}
                      </span>
                    </>
                  }
                  rate={props.growth ? <Rate value={props.growth} /> : null}
                />
                <OverviewRow
                  kind="research"
                  value={fmt(research)}
                  rate={props.researchPerHour ? <Rate value={props.researchPerHour} /> : null}
                />
                <OverviewRow
                  kind="ambrosia"
                  value={<span className="text-ambrosia-soft">{fmt(props.ambrosia)}</span>}
                  rate={
                    <Link
                      href="/tesoro"
                      transitionTypes={sectionTransition(pathname, "/tesoro")}
                      onClick={overview.hide}
                      className="-my-1 inline-flex h-8 items-center rounded-lg bg-ambrosia/30 px-2.5 text-[13px] font-bold text-ambrosia-soft ring-1 ring-ambrosia-light/40"
                    >
                      {t({ en: "Get more", es: "Conseguir" })}
                    </Link>
                  }
                />
              </tbody>
            </table>
            {props.safe ? (
              <p className="mt-1 flex items-center gap-1.5 rounded-lg bg-foam/5 px-2.5 py-1.5 text-[13px] text-foam/75">
                <IconShield className="size-4 text-sea-300" />
                <span>
                  <b className="text-foam tabular">{fmt(Math.min(props.safe, props.storage))}</b>{" "}
                  {t({ en: "of each resource safe from raids", es: "de cada recurso, a salvo de saqueos" })}
                </span>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** Same shape as the bar, for the very first load before the header data arrives. */
export function ResourceBarPlaceholder({ className }: { className?: string }) {
  const chip = (k: ResKey, bar: boolean) => (
    <span key={k} className={clsx(CHIP, "hover:bg-transparent")}>
      <ResIcon kind={k} size={22} className="size-[18px] opacity-70 md:size-5 lg:size-[22px]" />
      <span className="flex flex-col gap-1">
        <span className="skel-line on-dark h-3.5 w-8 md:w-9" />
        {bar && <span className="skel-line on-dark h-[3px] w-8 md:w-9" />}
      </span>
    </span>
  );
  return (
    <div aria-hidden className={clsx("panel-glass", BAR_LAYOUT, className)}>
      <span className="mx-2.5 hidden h-5 w-24 lg:block">
        <span className="skel-line on-dark block h-full" />
      </span>
      <Divider className="hidden lg:block" />
      <div className={BAR_GROUP}>{RESOURCES.map((r) => chip(r, true))}</div>
      <Divider className="hidden md:block" />
      <div className={BAR_GROUP}>
        {chip("gold", false)}
        {chip("citizens", true)}
        {chip("research", false)}
        {chip("ambrosia", false)}
      </div>
    </div>
  );
}

function Divider({ className }: { className?: string }) {
  return (
    <span aria-hidden className={clsx("mx-1 h-6 w-px shrink-0 bg-gradient-to-b from-transparent via-foam/30 to-transparent", className)} />
  );
}

function Rate({ value }: { value: number }) {
  const { fmtSigned } = useI18n();
  return <span className={clsx("tabular", value > 0 ? "text-sea-300" : "text-danger-soft")}>{fmtSigned(value)}/h</span>;
}

function OverviewRow({ kind, value, rate }: { kind: ResKey; value: ReactNode; rate: ReactNode }) {
  const { lang } = useI18n();
  return (
    <tr>
      <td className="w-7 py-1 pl-1.5">
        <ResIcon kind={kind} size={20} />
      </td>
      <th scope="row" className="py-1 pr-2 text-left font-normal text-foam/75">
        {resourceLabel(kind, lang)}
      </th>
      <td className="py-1 text-right font-bold whitespace-nowrap tabular">{value}</td>
      <td className="w-[5.5rem] py-1 pr-1.5 text-right text-[13px] font-bold whitespace-nowrap">{rate}</td>
    </tr>
  );
}

/** On phones and tablets the bar-wide button above the counters takes every tap (see ResourceBar). */
const CHIP =
  "relative flex h-6 shrink-0 max-lg:pointer-events-none items-center gap-1 rounded-lg px-1 text-[13px] transition-colors md:h-8 md:gap-1.5 md:px-1.5 md:text-sm lg:h-9 hover:bg-foam/10 aria-expanded:bg-foam/15";

/**
 * The bar is one stop for Tab: it enters on the first counter and the arrows move between them
 * (each one shows its card on focus).
 */
function moveBetweenChips(e: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
  const target = e.target as HTMLElement;
  if (!target.hasAttribute("data-chip")) return;
  const chips = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-chip]"));
  const at = chips.indexOf(target);
  const next =
    e.key === "Home" ? 0 : e.key === "End" ? chips.length - 1 : (at + (e.key === "ArrowRight" ? 1 : -1) + chips.length) % chips.length;
  e.preventDefault();
  chips[next]?.focus();
}

/**
 * One counter: icon, number and (for stored goods and citizens) how full it is.
 * Hover, focus or click shows its detail card; `href` turns it into a link (nectar opens the shop).
 */
function Chip({
  kind,
  full,
  fill,
  lines,
  note,
  href,
  transitionTypes,
  first = false,
  children,
}: {
  kind: ResKey;
  full?: boolean;
  fill?: number;
  lines: Line[];
  note?: string;
  href?: string;
  transitionTypes?: string[];
  /** The counter Tab lands on. */
  first?: boolean;
  children: ReactNode;
}) {
  const tip = useAnchoredPopover<HTMLButtonElement & HTMLAnchorElement>({ hover: true, gap: 8 });
  const { t, lang } = useI18n();
  const pct = Math.max(0, Math.min(1, fill ?? 0));
  const label = resourceLabel(kind, lang);
  const face = (
    <>
      <ResIcon kind={kind} size={22} className="size-[18px] md:size-5 lg:size-[22px]" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-bold whitespace-nowrap">{children}</span>
        {fill !== undefined && (
          <span aria-hidden className="mt-0.5 h-[3px] w-full min-w-6 overflow-hidden rounded-full bg-foam/15">
            <span
              className={clsx(
                "block h-full w-full origin-left rounded-full transition-[transform,background-color] duration-700 ease-out",
                full ? "bg-gold" : pct >= 0.85 ? "bg-bronze-light" : "bg-sea-300/90",
              )}
              style={{ transform: `scaleX(${pct})` }}
            />
          </span>
        )}
      </span>
      {href && (
        <span
          aria-hidden
          className="-ml-0.5 hidden size-4 place-items-center self-start rounded-full bg-ambrosia text-[11px] leading-none font-black text-marble lg:grid"
        >
          +
        </span>
      )}
    </>
  );

  return (
    <>
      {href ? (
        <Link
          href={href}
          transitionTypes={transitionTypes}
          {...tip.anchorProps}
          data-chip
          tabIndex={first ? 0 : -1}
          className={clsx(CHIP, full && "at-cap bg-gold/10")}
        >
          <span className="sr-only">{label}: </span>
          {face}
          <span className="sr-only">{t({ en: ". Get more", es: ". Conseguir más" })}</span>
        </Link>
      ) : (
        <button type="button" {...tip.triggerProps} data-chip tabIndex={first ? 0 : -1} className={clsx(CHIP, full && "at-cap bg-gold/10")}>
          <span className="sr-only">{label}: </span>
          {face}
        </button>
      )}
      <div {...tip.popoverProps} className="hud-pop pointer-events-none">
        {tip.open && (
          <div className="hud-tip w-56 px-3 py-2.5">
            <p className="flex items-center gap-2 font-display text-[15px] font-bold text-foam">
              <ResIcon kind={kind} size={20} />
              {label}
            </p>
            {lines.length > 0 && (
              <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
                {lines.map(([k, v, tone]) => (
                  <div key={k} className="contents">
                    <dt className="text-foam/60">{k}</dt>
                    <dd
                      className={clsx(
                        "text-right font-bold tabular",
                        tone === "good"
                          ? "text-sea-300"
                          : tone === "bad"
                            ? "text-danger-soft"
                            : tone === "gold"
                              ? "text-gold"
                              : "text-foam",
                      )}
                    >
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {note && <p className="mt-1 text-[13px] leading-snug text-foam/75">{note}</p>}
          </div>
        )}
      </div>
    </>
  );
}
