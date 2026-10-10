"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { fmt, fmt1 } from "@/lib/format";
import { setWorkersAction } from "@/server/actions";
import { AmountInput } from "./amount-input";

export function ScientistsControl({
  cityId,
  current,
  max,
  seats,
  freeCitizens,
  researchPer,
  goldPer,
}: {
  cityId: string;
  current: number;
  /** most scientists the player can seat right now */
  max: number;
  /** academy capacity */
  seats: number;
  freeCitizens: number;
  /** research points per scientist per hour */
  researchPer: number;
  /** gold per scientist per hour */
  goldPer: number;
}) {
  const [n, setN] = useState(Math.min(current, max));
  const changed = n !== current;
  const label =
    changed && n === 0 ? "Mandar a casa a los científicos" : `Asignar ${fmt(n)} ${n === 1 ? "científico" : "científicos"}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="scientists" className="text-sm font-bold">
            Científicos
          </label>
          <span className="text-xs text-ink-soft tabular">
            Hoy trabajan {fmt(current)} · {fmt(seats)} pupitres · {fmt(freeCitizens)} libres
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={max}
            step={1}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            aria-label="Científicos (control deslizante)"
            disabled={max === 0}
            className="h-10 min-w-0 flex-1 cursor-pointer accent-bronze disabled:cursor-not-allowed"
          />
          <AmountInput id="scientists" value={n} max={max} onChange={setN} className="w-32 shrink-0" maxLabel="Asignar el máximo de científicos" />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-marble/55 px-3 py-2 ring-1 ring-parchment-3/80">
          <dt className="text-xs font-bold text-ink-soft">Investigación</dt>
          <dd className="inline-flex items-center gap-1 text-xl font-extrabold tabular">
            <ResIcon kind="research" size={18} />+{fmt1(n * researchPer)}/h
          </dd>
        </div>
        <div className="rounded-lg bg-marble/55 px-3 py-2 ring-1 ring-parchment-3/80">
          <dt className="text-xs font-bold text-ink-soft">Sueldos</dt>
          <dd className="inline-flex items-center gap-1 text-xl font-extrabold tabular">
            <ResIcon kind="gold" size={18} />−{fmt1(n * goldPer)}/h
          </dd>
        </div>
      </dl>

      <ActionButton
        className="w-full"
        disabled={!changed}
        pendingLabel="Asignando…"
        action={() => setWorkersAction({ cityId, scientists: n })}
      >
        {label}
      </ActionButton>
      {max === 0 && (
        <p className="text-sm font-bold text-bronze-dark">No hay ciudadanos libres para sentar en la academia.</p>
      )}
    </div>
  );
}
