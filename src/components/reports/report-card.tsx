import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { RESOURCES, UNITS, UNIT_TYPES, type Resource, type UnitBag } from "@/game/data";
import { SHIP_IMAGE } from "@/game/layout";
import { buttonClass } from "@/components/ui/button";
import { CostList } from "@/components/ui/res";
import { fmt } from "@/lib/format";
import { IconScroll, IconSwords, IconTemple } from "@/components/island/icons";
import { UnitPortrait } from "@/components/military/units";
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
    <time dateTime={at.toISOString()} title={absolute.format(at)} className={clsx("tabular shrink-0 text-sm", className)}>
      {relTime(at, now)}
    </time>
  );
}

export function ReportCard({ report, now }: { report: ReportRow; now: number }) {
  if (report.kind === "battle") return <BattleReport report={report} now={now} />;
  return <SimpleReport report={report} now={now} />;
}

// ---------------------------------------------------------------------------
// Battle
// ---------------------------------------------------------------------------

function BattleReport({ report, now }: { report: ReportRow; now: number }) {
  const b = report.body as BattleBody;
  const role = b.role ?? "attacker";
  const target = b.target;

  if (b.empty || !b.attacker || !b.defender) {
    return (
      <article className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 bg-sea-700 px-4 py-2 text-foam">
          <span className="font-display text-lg font-bold">Sin combate</span>
          <When at={report.createdAt} now={now} />
        </div>
        <div className="flex flex-col gap-1 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{report.title}</h3>
            <NewTag unread={!report.read} />
          </div>
          <p className="text-sm text-ink-soft">
            Los bárbaros se estaban rearmando y no había nadie. Tus tropas volvieron sin pelear.
          </p>
        </div>
      </article>
    );
  }

  const attacker = b.attacker;
  const defender = b.defender;
  const won = role === "attacker" ? Boolean(b.attackerWins) : !b.attackerWins;
  const loot = cleanBag(b.loot);
  const hasLoot = Object.keys(loot).length > 0;
  const types = UNIT_TYPES.filter((t) => (attacker.units[t] ?? 0) > 0 || (defender.units[t] ?? 0) > 0);
  const wall = defender.wall ?? 0;
  const effective = defender.effectiveWall ?? wall;
  const where =
    target?.kind === "barbarians"
      ? `Campamento bárbaro de ${target.islandName}${target.level ? `, nivel ${target.level}` : ""}`
      : target
        ? `${target.name}, en ${target.islandName}`
        : "";

  return (
    <article className="panel overflow-hidden">
      <div className={clsx("flex items-center justify-between gap-3 px-4 py-2 text-marble", won ? "bg-success" : "bg-danger")}>
        <span className="inline-flex items-center gap-2 font-display text-lg font-bold">
          <IconSwords size={18} />
          {won ? "Victoria" : "Derrota"}
        </span>
        <When at={report.createdAt} now={now} className="text-marble/90" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{report.title}</h3>
            <NewTag unread={!report.read} />
          </div>
          {where && <p className="text-sm text-ink-soft">{where}</p>}
        </div>

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
                  <th scope="row" className="border-b border-parchment-3/70 py-1.5 pr-2 text-left font-normal">
                    <span className="flex items-center gap-2">
                      <UnitPortrait unit={t} size={28} className="bg-transparent" />
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
                  Bajas
                </th>
                <td className="tabular border-b border-parchment-3/70 px-2 py-1.5 text-right font-bold text-danger">
                  {sum(attacker.losses) ? `−${fmt(sum(attacker.losses))}` : "0"}
                </td>
                <td className="tabular border-b border-parchment-3/70 py-1.5 pl-2 text-right font-bold text-danger">
                  {sum(defender.losses) ? `−${fmt(sum(defender.losses))}` : "0"}
                </td>
              </tr>
              <tr>
                <th scope="row" className="border-b border-parchment-3/70 py-1.5 pr-2 text-left font-bold">
                  Muralla
                </th>
                <td className="border-b border-parchment-3/70 px-2 py-1.5 text-right text-ink-soft">
                  <span aria-hidden>·</span>
                  <span className="sr-only">No aplica</span>
                </td>
                <td className="tabular border-b border-parchment-3/70 py-1.5 pl-2 text-right">
                  {wall === 0 ? "Sin muralla" : effective < wall ? `Nivel ${wall}, quedó en ${effective}` : `Nivel ${wall}`}
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

        <div className="flex flex-col gap-1.5 rounded-xl bg-parchment-2/60 p-3 ring-1 ring-parchment-3">
          <p className="text-sm font-bold">{role === "attacker" ? "Botín" : "Lo que se llevaron"}</p>
          {hasLoot ? (
            <CostList cost={loot} />
          ) : (
            <p className="text-sm text-ink-soft">
              {role === "attacker" ? "No trajiste nada esta vez." : "No se llevaron nada."}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function Cell({ sent, lost }: { sent?: number; lost?: number }) {
  if (!sent) {
    return (
      <td className="border-b border-parchment-3/70 px-2 py-1.5 text-right text-ink-soft">
        <span aria-hidden>·</span>
        <span className="sr-only">Ninguna</span>
      </td>
    );
  }
  return (
    <td className="tabular border-b border-parchment-3/70 px-2 py-1.5 text-right whitespace-nowrap">
      <span className="font-bold">{fmt(sent)}</span>
      {lost ? <span className="ml-1.5 text-danger">−{fmt(lost)}</span> : null}
    </td>
  );
}

// ---------------------------------------------------------------------------
// Transport, colony, system
// ---------------------------------------------------------------------------

function SimpleReport({ report, now }: { report: ReportRow; now: number }) {
  let icon: ReactNode;
  let body: ReactNode;

  if (report.kind === "transport") {
    const t = report.body as TransportBody;
    const cargo = cleanBag(t.cargo);
    icon = <Image src={SHIP_IMAGE} alt="" width={40} height={40} className="sprite" />;
    body = (
      <>
        {t.from && t.to && (
          <p className="text-sm text-ink-soft">
            De {t.from.name} ({t.from.playerName}) a {t.to.name} ({t.to.playerName}), en {t.to.islandName}.
          </p>
        )}
        {Object.keys(cargo).length > 0 && <CostList cost={cargo} className="mt-1" />}
      </>
    );
  } else if (report.kind === "colony") {
    const c = report.body as ColonyBody;
    icon = <IconTemple size={22} />;
    body = c.ok ? (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">
          {c.cityName} ya es tuya, en {c.islandName}. Poné gente a talar para que crezca.
        </p>
        {c.cityId && (
          <Link href={`/ciudad/${c.cityId}`} className={buttonClass("primary", "sm")}>
            Ir a {c.cityName}
          </Link>
        )}
      </div>
    ) : (
      <p className="text-sm text-ink-soft">
        Alguien llegó antes a {c.islandName}. Te devolvimos el oro, la madera y los colonos.
      </p>
    );
  } else {
    const text = typeof report.body.text === "string" ? report.body.text : "";
    icon = <IconScroll size={22} />;
    body = text ? <p className="text-sm text-ink-soft">{text}</p> : null;
  }

  return (
    <article className="panel flex gap-3 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-parchment-2 text-bronze-dark ring-1 ring-parchment-3">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="min-w-0 font-bold">{report.title}</h3>
          <NewTag unread={!report.read} />
          <When at={report.createdAt} now={now} className="ml-auto text-ink-soft" />
        </div>
        {body}
      </div>
    </article>
  );
}
