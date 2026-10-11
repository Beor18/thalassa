"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { fmt, fmt1 } from "@/lib/format";
import { setWorkersAction } from "@/server/actions";
import { AmountInput } from "./amount-input";
import { SectionTitle, Stat, StatGrid } from "./bits";

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
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1.5">
        <SectionTitle aside={`hoy ${fmt(current)} · ${fmt(seats)} pupitres · ${fmt(freeCitizens)} libres`}>Científicos</SectionTitle>
        <label htmlFor="scientists" className="sr-only">
          Científicos
        </label>
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

      <StatGrid>
        <Stat
          icon={<ResIcon kind="research" size={20} />}
          label="Investigación"
          value={`+${fmt1(n * researchPer)}/h`}
          tip={`Cada científico suma ${fmt1(researchPer)} por hora`}
        />
        <Stat
          icon={<ResIcon kind="gold" size={20} />}
          label="Sueldos"
          value={`−${fmt1(n * goldPer)}/h`}
          tip={`Cada científico cobra ${fmt1(goldPer)} de oro por hora`}
          align="end"
        />
      </StatGrid>

      <ActionButton className="w-full" disabled={!changed} pendingLabel="Asignando…" action={() => setWorkersAction({ cityId, scientists: n })}>
        {label}
      </ActionButton>
      {max === 0 && <p className="-mt-1 text-sm font-bold text-bronze-dark">No hay ciudadanos libres para sentar en la academia.</p>}
    </div>
  );
}
