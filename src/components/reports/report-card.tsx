import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { RESOURCES, UNITS, UNIT_TYPES, type Resource, type UnitBag } from "@/game/data";
import { SHIP_IMAGE } from "@/game/layout";
import { buttonClass } from "@/components/ui/button";
import { ResIcon } from "@/components/ui/res";
import { fmt } from "@/lib/format";
import { IconScroll, IconSwords, IconTemple } from "@/components/island/icons";
import { UnitPortrait } from "@/components/military/units";
import { LaurelIcon } from "@/components/game/icons";
import { NewTag } from "./client";

export interface ReportRow {
  id: string;
  kind: "battle" | "transport" | "colony" | "system";
  title: string;
  body: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

// Shapes written by src/server/missions.ts and src/server/world.ts
interface Side {
  name: string;
  city?: string;
  units: UnitBag;
  losses: UnitBag;
  wall?: number;
  effectiveWall?: number;
}
interface BattleBody {
  role?: "attacker" | "defender";
  target?: { kind: "city" | "barbarians"; name: string; islandName: string; level?: number; playerName?: string };
  empty?: boolean;
  attacker?: Side;
  defender?: Side;
  attackPower?: number;
  defensePower?: number;
  attackerWins?: boolean;
  loot?: Partial<Record<Resource, number>>;
}
interface Place {
  name: string;
  playerName: string;
  islandName: string;
}
interface TransportBody {
  from?: Place;
  to?: Place;
  cargo?: Partial<Record<Resource, number>>;
}
interface ColonyBody {
  islandName?: string;
  cityName?: string;
  cityId?: string;
  ok?: boolean;
}

const sum = (bag: UnitBag | undefined) => UNIT_TYPES.reduce((s, t) => s + (bag?.[t] ?? 0), 0);
const cleanBag = (bag: Partial<Record<Resource, number>> | undefined) => {
  const out: Partial<Record<Resource, number>> = {};
  for (const r of RESOURCES) {
    const n = Math.floor(bag?.[r] ?? 0);
    if (n > 0) out[r] = n;
  }
  return out;
};

function relTime(at: Date, now: number) {
  const s = Math.max(0, Math.round((now - at.getTime()) / 1000));
  if (s < 60) return "recién";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

const absolute = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

function When({ at, now, className }: { at: Date; now: number; className?: string }) {
  return (
    <time dateTime={at.toISOString()} title={absolute.format(at)} className={clsx("tabular shrink-0 text-xs whitespace-nowrap text-ink-soft", className)}>
      {relTime(at, now)}
    </time>
  );
}

/** Resources with a sign: "+420 madera" for loot that came in, "−120 vino" for what was taken. */
function Haul({ bag, sign, index }: { bag: Partial<Record<Resource, number>>; sign: "+" | "−"; index: number }) {
  const entries = Object.entries(bag) as [Resource, number][];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
      {entries.map(([r, n], i) => (
        <span
          key={r}
          className={clsx("pop-in inline-flex items-center gap-1 text-sm font-bold tabular", sign === "+" ? "text-success" : "text-danger")}
          style={{ "--d": `${Math.min(index, 6) * 70 + 300 + i * 80}ms` } as CSSProperties}
        >
          {sign}
          {fmt(n)}
          <ResIcon kind={r} size={18} />
        </span>
      ))}
    </span>
  );
}

/** `index` is the card's place in the list: the first ones animate in, one after another. */
export function ReportCard({ report, now, index = 0 }: { report: ReportRow; now: number; index?: number }) {
  if (report.kind === "battle") return <BattleReport report={report} now={now} index={index} />;
  return <SimpleReport report={report} now={now} index={index} />;
}

const delayOf = (index: number, extra = 0) => ({ "--d": `${Math.min(index, 6) * 70 + extra}ms` }) as CSSProperties;

type Tone = "win" | "loss" | "calm" | "info";
const BADGE: Record<Tone, string> = {
  win: "bg-gradient-to-b from-gold-light to-gold text-bronze-deep ring-bronze/60",
  loss: "bg-gradient-to-b from-[#c8372d] to-[#7d1a14] text-marble ring-[#5e130e]/60",
  calm: "bg-gradient-to-b from-sea-500 to-sea-700 text-foam ring-sea-900/50",
  info: "bg-parchment-2 text-bronze-dark ring-parchment-3",
};
const STRIPE: Record<Tone, string> = {
  win: "before:bg-gradient-to-b before:from-gold before:to-bronze",
  loss: "before:bg-danger",
  calm: "before:bg-sea-500",
  info: "before:bg-parchment-3",
};

/** Row layout shared by every report: badge, title with a one-line outcome, extras and time. */
function Row({
  tone,
  badge,
  title,
  unread,
  line,
  extra,
  at,
  now,
  chevron,
  index,
}: {
  tone: Tone;
  badge: ReactNode;
  title: string;
  unread: boolean;
  line: ReactNode;
  extra?: ReactNode;
  at: Date;
  now: number;
  chevron?: boolean;
  index: number;
}) {
  return (
    <div
      className={clsx(
        "relative flex items-center gap-3 py-2.5 pr-3 pl-4 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full sm:pr-4",
        STRIPE[tone],
      )}
    >
      <span
        className={clsx("pop-in grid size-10 shrink-0 place-items-center rounded-full shadow-[0_2px_6px_-2px_rgb(0_0_0/0.4)] ring-1", BADGE[tone], tone === "win" && unread && "shine")}
        style={delayOf(index, 120)}
      >
        {badge}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 flex-1 leading-tight font-bold sm:truncate">{title}</h3>
          <When at={at} now={now} className="sm:hidden" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
          <NewTag unread={unread} />
          {line}
        </div>
        {extra && <div className="sm:hidden">{extra}</div>}
      </div>
      {extra && <div className="hidden shrink-0 sm:block">{extra}</div>}
      <When at={at} now={now} className="hidden sm:block" />
      {chevron && (
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="size-4 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Battle
// ---------------------------------------------------------------------------

function BattleReport({ report, now, index }: { report: ReportRow; now: number; index: number }) {
  const b = report.body as BattleBody;
  const role = b.role ?? "attacker";
  const target = b.target;
  const unread = !report.read;
  const where =
    target?.kind === "barbarians"
      ? `Bárbaros de ${target.islandName}${target.level ? ` (nivel ${target.level})` : ""}`
      : target
        ? `${target.name}, ${target.islandName}`
        : "";

  if (b.empty || !b.attacker || !b.defender) {
    return (
      <article className="panel rise-in overflow-hidden" style={delayOf(index)}>
        <Row
          tone="calm"
          badge={<IconSwords size={18} />}
          title={report.title}
          unread={unread}
          index={index}
          at={report.createdAt} now={now}
          line={
            <>
              <strong className="text-sea-700">Sin combate</strong>
              <span>No había nadie. Volvieron sin pelear.</span>
            </>
          }
        />
      </article>
    );
  }

  const attacker = b.attacker;
  const defender = b.defender;
  const won = role === "attacker" ? Boolean(b.attackerWins) : !b.attackerWins;
  const loot = cleanBag(b.loot);
  const hasLoot = Object.keys(loot).length > 0;
  const mine = role === "attacker" ? attacker : defender;
  const myLosses = sum(mine.losses);
  const types = UNIT_TYPES.filter((t) => (attacker.units[t] ?? 0) > 0 || (defender.units[t] ?? 0) > 0);
  const wall = defender.wall ?? 0;
  const effective = defender.effectiveWall ?? wall;

  return (
    <details className="group panel rise-in overflow-hidden" style={delayOf(index)}>
      <summary className="cursor-pointer list-none rounded-[14px] transition-colors hover:bg-marble/50 [&::-webkit-details-marker]:hidden">
        <Row
          tone={won ? "win" : "loss"}
          badge={won ? <LaurelIcon className="w-7" /> : <IconSwords size={18} />}
          title={report.title}
          unread={unread}
          index={index}
          at={report.createdAt} now={now}
          chevron
          line={
            <>
              <strong className={won ? "text-bronze-dark" : "text-danger"}>
                {won ? (role === "attacker" ? "Victoria" : "Resististe") : role === "attacker" ? "Derrota" : "Te saquearon"}
              </strong>
              {where && <span className="truncate">{where}</span>}
              <span className={clsx("tabular", myLosses > 0 && "font-bold text-danger")}>
                {myLosses > 0 ? `−${fmt(myLosses)} ${myLosses === 1 ? "baja" : "bajas"}` : "Sin bajas"}
              </span>
            </>
          }
          extra={hasLoot ? <Haul bag={loot} sign={role === "attacker" ? "+" : "−"} index={index} /> : undefined}
        />
      </summary>

      <div className="rise-in flex flex-col gap-3 border-t border-parchment-3 px-4 pt-3 pb-4">
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[18rem] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">
              Tropas y bajas de cada lado. {attacker.name} atacó, {defender.name} defendió.
            </caption>
            <thead>
              <tr className="text-left">
                <th scope="col" className="border-b border-parchment-3 pr-2 pb-1.5 font-bold text-ink-soft">
                  Tropa
                </th>
                <th scope="col" className="border-b border-parchment-3 px-2 pb-1.5 text-right">
                  <span className="block truncate font-bold">{attacker.name}</span>
                  <span className="block text-xs font-normal text-ink-soft">ataca{attacker.city ? ` desde ${attacker.city}` : ""}</span>
                </th>
                <th scope="col" className="border-b border-parchment-3 pb-1.5 pl-2 text-right">
                  <span className="block truncate font-bold">{defender.name}</span>
                  <span className="block text-xs font-normal text-ink-soft">defiende</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {types.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-2 text-ink-soft">
                    No hubo tropas en el campo.
                  </td>
                </tr>
              )}
              {types.map((t) => (
                <tr key={t}>
                  <th scope="row" className="border-b border-parchment-3/70 py-1 pr-2 text-left font-normal">
                    <span className="flex items-center gap-2">
                      <UnitPortrait unit={t} size={26} className="bg-transparent" />
                      <span className="font-bold">{UNITS[t].name}</span>
                    </span>
                  </th>
                  <Cell sent={attacker.units[t]} lost={attacker.losses[t]} />
                  <Cell sent={defender.units[t]} lost={defender.losses[t]} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="border-b border-parchment-3/70 py-1.5 pr-2 text-left font-bold">
                  Muralla
                </th>
                <td className="border-b border-parchment-3/70 px-2 py-1.5 text-right text-ink-soft">
                  <span aria-hidden>·</span>
                  <span className="sr-only">No aplica</span>
                </td>
                <td className="tabular border-b border-parchment-3/70 py-1.5 pl-2 text-right">
                  {wall === 0 ? "Sin muralla" : effective < wall ? `Nivel ${wall} → ${effective}` : `Nivel ${wall}`}
                </td>
              </tr>
              <tr>
                <th scope="row" className="py-1.5 pr-2 text-left font-bold">
                  Poder
                </th>
                <td className={clsx("tabular px-2 py-1.5 text-right", b.attackerWins ? "font-extrabold" : "text-ink-soft")}>
                  {fmt(b.attackPower ?? 0)}
                </td>
                <td className={clsx("tabular py-1.5 pl-2 text-right", !b.attackerWins ? "font-extrabold" : "text-ink-soft")}>
                  {fmt(b.defensePower ?? 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!hasLoot && (
          <p className="text-sm text-ink-soft">{role === "attacker" ? "Esta vez no hubo botín." : "No se llevaron nada."}</p>
        )}
      </div>
    </details>
  );
}

function Cell({ sent, lost }: { sent?: number; lost?: number }) {
  if (!sent) {
    return (
      <td className="border-b border-parchment-3/70 px-2 py-1 text-right text-ink-soft">
        <span aria-hidden>·</span>
        <span className="sr-only">Ninguna</span>
      </td>
    );
  }
  return (
    <td className="tabular border-b border-parchment-3/70 px-2 py-1 text-right whitespace-nowrap">
      <span className="font-bold">{fmt(sent)}</span>
      {lost ? <span className="ml-1.5 text-danger">−{fmt(lost)}</span> : null}
    </td>
  );
}

// ---------------------------------------------------------------------------
// Transport, colony, system
// ---------------------------------------------------------------------------

function SimpleReport({ report, now, index }: { report: ReportRow; now: number; index: number }) {
  const unread = !report.read;
  let tone: Tone = "info";
  let badge: ReactNode;
  let line: ReactNode = null;
  let extra: ReactNode;

  if (report.kind === "transport") {
    const t = report.body as TransportBody;
    const cargo = cleanBag(t.cargo);
    badge = <Image src={SHIP_IMAGE} alt="" width={34} height={34} className="sprite size-8" />;
    line = t.from && t.to ? <span className="truncate">{`${t.from.name} → ${t.to.name} (${t.to.playerName})`}</span> : null;
    extra = Object.keys(cargo).length > 0 ? <Haul bag={cargo} sign="+" index={index} /> : undefined;
  } else if (report.kind === "colony") {
    const c = report.body as ColonyBody;
    tone = c.ok ? "win" : "info";
    badge = <IconTemple size={20} />;
    line = c.ok ? (
      <span>Nueva ciudad en {c.islandName}.</span>
    ) : (
      <span>Alguien llegó antes a {c.islandName}. Te devolvimos todo.</span>
    );
    extra =
      c.ok && c.cityId ? (
        <Link href={`/ciudad/${c.cityId}`} className={buttonClass("secondary", "sm", "h-10")}>
          Ir a {c.cityName}
        </Link>
      ) : undefined;
  } else {
    const text = typeof report.body.text === "string" ? report.body.text : "";
    badge = <IconScroll size={20} />;
    line = text ? <span className="line-clamp-2">{text}</span> : null;
  }

  return (
    <article className="panel rise-in overflow-hidden" style={delayOf(index)}>
      <Row tone={tone} badge={badge} title={report.title} unread={unread} index={index} at={report.createdAt} now={now} line={line} extra={extra} />
    </article>
  );
}
