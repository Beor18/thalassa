"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import type { ResourceBag, UnitType } from "@/game/data";
import { ActionButton } from "@/components/ui/action-button";
import { CostList, ResIcon } from "@/components/ui/res";
import { fmt, fmtDuration, fmtSigned } from "@/lib/format";
import { trainAction } from "@/server/actions";
import { AmountInput } from "./amount-input";
import { Duration, jumpLink } from "./bits";
import { IconChevron, IconLock, IconShield, IconSword } from "./icons";
import { missingText, unitCount, unitPlural } from "./lib";

export interface UnitOption {
  unit: UnitType;
  name: string;
  image: string;
  attack: number;
  defense: number;
  /** gold per hour per unit, game speed included */
  upkeep: number;
  cost: Partial<ResourceBag>;
  /** seconds per unit with techs, barracks and speed applied */
  secondsPerUnit: number;
  /** soldiers of this kind in the city */
  home: number;
  /** why it can't be trained yet, or null */
  lock: string | null;
  /** where to go to unlock it */
  unlock: { href: string; label: string } | null;
}

/**
 * Barracks: unit tiles (name, count at home, lock when not available) and one form for the
 * picked unit. One button, always saying what it trains.
 */
export function TrainingPicker({
  cityId,
  units,
  freeCitizens,
  res,
  goldPerHour,
  taxPerCitizen,
}: {
  cityId: string;
  units: UnitOption[];
  freeCitizens: number;
  res: ResourceBag;
  /** the player's net gold per hour right now, every city included */
  goldPerHour: number;
  /** tax a free citizen pays per hour (every recruit stops paying it), game speed included */
  taxPerCitizen: number;
}) {
  const [picked, setPicked] = useState<UnitType>(() => (units.find((u) => !u.lock) ?? units[0]).unit);
  const u = units.find((x) => x.unit === picked) ?? units[0];

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Tropa" className="grid grid-cols-3 gap-1.5">
        {units.map((o) => (
          <label key={o.unit} className="relative cursor-pointer">
            <input
              type="radio"
              name={`unit-${cityId}`}
              value={o.unit}
              checked={o.unit === picked}
              onChange={() => setPicked(o.unit)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={clsx(
                "flex min-h-11 items-center gap-1 rounded-lg bg-marble/70 py-1 pr-1 pl-0.5 ring-1 ring-parchment-3 transition-[background-color,box-shadow] duration-100",
                "hover:bg-parchment-2 peer-checked:bg-gold/25 peer-checked:ring-2 peer-checked:ring-bronze peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
              )}
            >
              <Image
                src={o.image}
                alt=""
                width={80}
                height={80}
                sizes="32px"
                className={clsx("size-8 shrink-0 object-contain", o.lock ? "opacity-55 grayscale-[70%]" : "sprite")}
              />
              <span className="flex min-w-0 flex-col">
                <span className={clsx("truncate text-[11.5px] leading-tight font-bold", o.lock ? "text-ink-soft" : "text-ink")}>{o.name}</span>
                <span className="inline-flex items-center gap-0.5 text-[11px] leading-tight font-bold text-ink-soft tabular">
                  {o.lock ? <IconLock size={11} strokeWidth={2.6} className="text-bronze-dark" /> : o.home > 0 ? `×${fmt(o.home)}` : "×0"}
                </span>
              </span>
            </span>
            <span className="sr-only">
              {o.name}
              {o.home > 0 ? `, ${unitCount(o.unit, o.home)} en la ciudad` : ""}
              {o.lock ? ", bloqueado" : ""}
            </span>
          </label>
        ))}
      </div>

      <UnitDetail key={u.unit} cityId={cityId} u={u} freeCitizens={freeCitizens} res={res} goldPerHour={goldPerHour} taxPerCitizen={taxPerCitizen} />
    </div>
  );
}

function UnitDetail({
  cityId,
  u,
  freeCitizens,
  res,
  goldPerHour,
  taxPerCitizen,
}: {
  cityId: string;
  u: UnitOption;
  freeCitizens: number;
  res: ResourceBag;
  goldPerHour: number;
  taxPerCitizen: number;
}) {
  const affordable = Object.entries(u.cost).reduce(
    (m, [r, c]) => (c && c > 0 ? Math.min(m, Math.floor(res[r as keyof ResourceBag] / c)) : m),
    1000,
  );
  const max = Math.max(0, Math.min(1000, freeCitizens, affordable));
  const [count, setCount] = useState(() => Math.min(max, 10));
  const n = Math.max(0, Math.min(count, max));
  const total = Object.fromEntries(Object.entries(u.cost).map(([r, c]) => [r, (c ?? 0) * Math.max(1, n)])) as Partial<ResourceBag>;
  const seconds = Math.max(3, Math.round(u.secondsPerUnit * Math.max(1, n)));
  const reason = freeCitizens === 0 ? "No hay ciudadanos libres para reclutar." : missingText(total, res);
  const inputId = `train-${u.unit}`;
  const goldAfter = goldPerHour - Math.max(1, n) * (u.upkeep + taxPerCitizen);
  const goesNegative = goldAfter < 0;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-parchment-3 bg-parchment-2/60 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 className="font-display text-base leading-tight font-bold">{u.name}</h4>
        <dl className="flex items-center gap-2.5 text-sm font-bold text-ink tabular">
          <div className="inline-flex items-center gap-0.5" title="Ataque">
            <dt>
              <IconSword size={15} className="text-terracotta" />
              <span className="sr-only">Ataque</span>
            </dt>
            <dd>{u.attack}</dd>
          </div>
          <div className="inline-flex items-center gap-0.5" title="Defensa">
            <dt>
              <IconShield size={15} className="text-sea-700" />
              <span className="sr-only">Defensa</span>
            </dt>
            <dd>{u.defense}</dd>
          </div>
          <div className="inline-flex items-center gap-0.5" title="Sueldo por hora">
            <dt>
              <ResIcon kind="gold" size={15} />
              <span className="sr-only">Sueldo</span>
            </dt>
            <dd>{fmt(u.upkeep)}/h</dd>
          </div>
        </dl>
      </div>

      {u.lock ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-bronze-dark">
            <IconLock size={15} />
            {u.lock}
          </p>
          {u.unlock && (
            <Link href={u.unlock.href} scroll={!u.unlock.href.startsWith("/ciudad/")} className={jumpLink}>
              {u.unlock.label}
              <IconChevron size={14} />
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <label htmlFor={inputId} className="sr-only">
              Cantidad de {unitPlural(u.unit)}
            </label>
            <AmountInput
              id={inputId}
              value={count}
              max={max}
              onChange={setCount}
              describedBy={`${inputId}-hint`}
              className="w-40 shrink-0"
              maxLabel={`Entrenar el máximo de ${unitPlural(u.unit)}`}
            />
            <span className="min-w-0 text-xs leading-tight text-ink-soft">
              <span className="font-bold text-ink tabular">{fmt(freeCitizens)}</span> libres
              <br />
              cada uno: <CostList cost={u.cost} className="gap-x-2 text-xs" />
            </span>
          </div>
          <div id={`${inputId}-hint`} className="flex flex-col gap-1.5">
            <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
              <CostList cost={total} have={res} />
              <Duration>{fmtDuration(seconds * 1000)}</Duration>
            </p>
            <p
              className={clsx(
                "flex flex-wrap items-center gap-x-1.5 text-sm tabular",
                goesNegative ? "rounded-lg bg-danger/10 px-2.5 py-1 font-bold text-danger ring-1 ring-danger/30" : "text-ink-soft",
              )}
            >
              <ResIcon kind="gold" size={16} />
              <span className="sr-only">Tu oro por hora pasa de</span>
              <span>{fmtSigned(Math.round(goldPerHour))}/h</span>
              <span aria-hidden>→</span>
              <span className="sr-only">a</span>
              <strong className={goesNegative ? undefined : "text-ink"}>{fmtSigned(Math.round(goldAfter))}/h</strong>
              {goesNegative && <span>· vas a perder oro</span>}
            </p>
          </div>
          <ActionButton
            className="w-full"
            disabled={n < 1 || reason != null}
            pendingLabel="Reclutando…"
            action={() => trainAction({ cityId, unit: u.unit, count: n })}
          >
            {n >= 1 ? `Entrenar ${unitCount(u.unit, n)}` : `Entrenar ${unitPlural(u.unit)}`}
          </ActionButton>
          {reason && <p className="-mt-1 text-sm font-bold text-danger">{reason}</p>}
        </>
      )}
    </div>
  );
}
