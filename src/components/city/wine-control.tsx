"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { fmt, fmt1, fmtDuration } from "@/lib/format";
import { setWineAction } from "@/server/actions";
import { SectionTitle, Stat, StatGrid } from "./bits";
import { FaceIcon } from "./icons";

export function WineControl({
  cityId,
  current,
  max,
  wineByLevel,
  happinessPerLevel,
  stock,
  production,
}: {
  cityId: string;
  current: number;
  max: number;
  /** wine per hour burnt at each level, index = level */
  wineByLevel: number[];
  happinessPerLevel: number;
  stock: number;
  /** wine the city produces per hour (0 when the island has another luxury) */
  production: number;
}) {
  const [level, setLevel] = useState(Math.min(current, max));
  const use = wineByLevel[level] ?? 0;
  const net = production - use;
  const hoursLeft = net < 0 ? stock / -net : Infinity;
  const changed = level !== current;
  // Nothing picked yet (or the level already served): a neutral label on the disabled button.
  const label = !changed ? "Elegí cuánto vino servir" : level === 0 ? "Dejar de servir vino" : `Servir vino nivel ${level}`;
  const dry = level > 0 && stock < 1 && net < 0;
  const short = level > 0 && hoursLeft < 24;

  return (
    <div className="flex flex-col gap-2.5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 w-full">
          <SectionTitle aside={`hoy: nivel ${current}`}>Vino servido</SectionTitle>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: max + 1 }, (_, l) => (
            <label key={l} className="relative cursor-pointer">
              <input
                type="radio"
                name="wine-level"
                value={l}
                checked={l === level}
                onChange={() => setLevel(l)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="grid h-10 min-w-10 place-items-center rounded-lg border border-parchment-3 bg-marble/70 px-2 text-[15px] font-extrabold text-ink tabular transition-colors duration-100 hover:bg-parchment-2 peer-checked:border-ink peer-checked:bg-bronze-dark peer-checked:text-marble peer-checked:hover:bg-bronze peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold"
              >
                {l}
              </span>
              <span className="sr-only">{l === 0 ? "No servir vino" : `Nivel ${l}`}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <StatGrid cols={level > 0 ? 3 : 2}>
        <Stat icon={<ResIcon kind="wine" size={20} />} label="Consumo" value={use > 0.05 ? `−${fmt1(use)}/h` : "0/h"} />
        <Stat
          icon={<FaceIcon size={20} />}
          label="Satisfacción"
          value={`+${fmt(happinessPerLevel * level)}`}
          tone={level > 0 ? "good" : undefined}
          tip={`Cada nivel servido suma +${happinessPerLevel}`}
          align={level > 0 ? "center" : "end"}
        />
        {level > 0 && (
          <Stat
            icon={<ResIcon kind="wine" size={20} />}
            label="Te alcanza"
            value={
              dry
                ? "0 h"
                : !Number.isFinite(hoursLeft)
                  ? "siempre"
                  : hoursLeft >= 24
                    ? "+1 día"
                    : hoursLeft >= 1
                      ? `${Math.floor(hoursLeft)} h`
                      : `${Math.max(1, Math.round(hoursLeft * 60))} min`
            }
            tone={dry || short ? "bad" : undefined}
            tip={
              dry
                ? "No te queda vino: la taberna no suma satisfacción."
                : Number.isFinite(hoursLeft)
                  ? `Tus ${fmt(stock)} de vino alcanzan para ${fmtDuration(hoursLeft * 3_600_000)}. Después la gente se pone triste.`
                  : "La isla produce más vino del que servís."
            }
            align="end"
          />
        )}
      </StatGrid>
      {dry && <p className="text-sm font-bold text-danger">No te queda vino: la taberna no suma satisfacción.</p>}

      <ActionButton className="w-full" disabled={!changed} pendingLabel="Sirviendo…" action={() => setWineAction({ cityId, level })}>
        {label}
      </ActionButton>
    </div>
  );
}
