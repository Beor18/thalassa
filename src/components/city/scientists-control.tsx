"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { useI18n } from "@/i18n/client";
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
  const { t, fmt, fmt1 } = useI18n();
  const [n, setN] = useState(Math.min(current, max));
  const changed = n !== current;
  const label =
    changed && n === 0
      ? t({ en: "Send the scientists home", es: "Mandar a casa a los científicos" })
      : t({
          en: `Assign ${fmt(n)} ${n === 1 ? "scientist" : "scientists"}`,
          es: `Asignar ${fmt(n)} ${n === 1 ? "científico" : "científicos"}`,
        });
  const title = t({ en: "Scientists", es: "Científicos" });

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1.5">
        <SectionTitle
          aside={t({
            en: `${fmt(current)} of ${fmt(seats)} desks filled · ${fmt(freeCitizens)} idle`,
            es: `hoy ${fmt(current)} · ${fmt(seats)} pupitres · ${fmt(freeCitizens)} libres`,
          })}
        >
          {title}
        </SectionTitle>
        <label htmlFor="scientists" className="sr-only">
          {title}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={max}
            step={1}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            aria-label={t({ en: "Scientists (slider)", es: "Científicos (control deslizante)" })}
            disabled={max === 0}
            className="h-10 min-w-0 flex-1 cursor-pointer accent-bronze disabled:cursor-not-allowed"
          />
          <AmountInput
            id="scientists"
            value={n}
            max={max}
            onChange={setN}
            className="w-32 shrink-0"
            maxLabel={t({ en: "Assign the most scientists you can", es: "Asignar el máximo de científicos" })}
          />
        </div>
      </div>

      <StatGrid>
        <Stat
          icon={<ResIcon kind="research" size={20} />}
          label={t({ en: "Research", es: "Investigación" })}
          value={`+${fmt1(n * researchPer)}/h`}
          tip={t({ en: `Each scientist adds ${fmt1(researchPer)} per hour`, es: `Cada científico suma ${fmt1(researchPer)} por hora` })}
        />
        <Stat
          icon={<ResIcon kind="gold" size={20} />}
          label={t({ en: "Wages", es: "Sueldos" })}
          value={`−${fmt1(n * goldPer)}/h`}
          tip={t({ en: `Each scientist is paid ${fmt1(goldPer)} gold per hour`, es: `Cada científico cobra ${fmt1(goldPer)} de oro por hora` })}
          align="end"
        />
      </StatGrid>

      <ActionButton
        className="w-full"
        disabled={!changed}
        pendingLabel={t({ en: "Assigning…", es: "Asignando…" })}
        action={() => setWorkersAction({ cityId, scientists: n })}
      >
        {label}
      </ActionButton>
      {max === 0 && (
        <p className="-mt-1 text-sm font-bold text-bronze-dark">
          {t({ en: "No idle citizens to seat in the academy.", es: "No hay ciudadanos libres para sentar en la academia." })}
        </p>
      )}
    </div>
  );
}
