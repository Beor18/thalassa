"use client";

import { useState } from "react";
import Image from "next/image";
import type { ResourceBag, UnitType } from "@/game/data";
import { ActionButton } from "@/components/ui/action-button";
import { CostList, ResIcon } from "@/components/ui/res";
import { fmt, fmtDuration, fmtSigned } from "@/lib/format";
import { trainAction } from "@/server/actions";
import { AmountInput } from "./amount-input";
import { Duration } from "./bits";
import { missingText, unitCount, unitPlural } from "./lib";

export interface TrainUnitProps {
  cityId: string;
  unit: UnitType;
  name: string;
  image: string;
  attack: number;
  defense: number;
  /** gold per hour per unit, game speed included */
  upkeep: number;
  /** tax a free citizen pays per hour (every recruit stops paying it), game speed included */
  taxPerCitizen: number;
  /** the player's net gold per hour right now, every city included */
  goldPerHour: number;
  cost: Partial<ResourceBag>;
  /** seconds per unit with techs, barracks and speed applied */
  secondsPerUnit: number;
  freeCitizens: number;
  res: ResourceBag;
}

export function TrainUnitForm(props: TrainUnitProps) {
  const { cityId, unit, cost, res, freeCitizens } = props;
  const affordable = Object.entries(cost).reduce(
    (m, [r, c]) => (c && c > 0 ? Math.min(m, Math.floor(res[r as keyof ResourceBag] / c)) : m),
    1000,
  );
  const max = Math.max(0, Math.min(1000, freeCitizens, affordable));
  const [count, setCount] = useState(() => Math.min(max, 10));
  const n = Math.max(0, Math.min(count, max));
  const total = Object.fromEntries(Object.entries(cost).map(([r, c]) => [r, (c ?? 0) * Math.max(1, n)])) as Partial<ResourceBag>;
  const seconds = Math.max(3, Math.round(props.secondsPerUnit * Math.max(1, n)));
  const reason =
    freeCitizens === 0
      ? "No hay ciudadanos libres para reclutar."
      : missingText(total, res);
  const inputId = `train-${unit}`;
  const goldAfter = props.goldPerHour - Math.max(1, n) * (props.upkeep + props.taxPerCitizen);
  const goesNegative = goldAfter < 0;

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-parchment-3 bg-parchment-2/60 p-3">
      <div className="flex gap-3">
        <Image src={props.image} alt="" width={128} height={128} sizes="64px" className="sprite size-16 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-base leading-tight font-bold">{props.name}</h4>
          <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink-soft">
            <div className="flex gap-1">
              <dt>Ataque</dt>
              <dd className="font-bold text-ink tabular">{props.attack}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Defensa</dt>
              <dd className="font-bold text-ink tabular">{props.defense}</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt>Sueldo</dt>
              <dd className="inline-flex items-center gap-0.5 font-bold text-ink tabular">
                <ResIcon kind="gold" size={14} />
                {fmt(props.upkeep)}/h
              </dd>
            </div>
          </dl>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-soft">
            Cada uno: <CostList cost={cost} className="text-xs" />
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-bold">
          Cantidad
        </label>
        <AmountInput
          id={inputId}
          value={count}
          max={max}
          onChange={setCount}
          describedBy={`${inputId}-hint`}
          maxLabel={`Entrenar el máximo de ${props.name.toLowerCase()}`}
        />
        <div id={`${inputId}-hint`} className="flex flex-col gap-1.5">
          <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
            <CostList cost={total} have={res} />
            <Duration>{fmtDuration(seconds * 1000)}</Duration>
          </p>
          <p
            className={
              goesNegative
                ? "flex flex-wrap items-center gap-x-1.5 rounded-lg bg-danger/10 px-2.5 py-1.5 text-sm font-bold text-danger ring-1 ring-danger/30"
                : "flex flex-wrap items-center gap-x-1.5 text-sm text-ink-soft"
            }
          >
            <ResIcon kind="gold" size={16} />
            <span>
              Tu oro por hora pasa de <span className="tabular">{fmtSigned(Math.round(props.goldPerHour))}/h</span> a{" "}
              <strong className="tabular">{fmtSigned(Math.round(goldAfter))}/h</strong>
              {goesNegative ? ". Vas a perder oro cada hora." : "."}
            </span>
          </p>
        </div>
      </div>

      <ActionButton
        className="w-full"
        disabled={n < 1 || reason != null}
        pendingLabel="Reclutando…"
        action={() => trainAction({ cityId, unit, count: n })}
      >
        {n >= 1 ? `Entrenar ${unitCount(unit, n)}` : `Entrenar ${unitPlural(unit)}`}
      </ActionButton>
      {reason && <p className="-mt-1 text-sm font-bold text-danger">{reason}</p>}
    </li>
  );
}
