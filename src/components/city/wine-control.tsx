"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { fmt, fmt1, fmtDuration } from "@/lib/format";
import { setWineAction } from "@/server/actions";

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

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-sm font-bold">
          <span>Vino servido</span>
          <span className="text-xs font-normal text-ink-soft">Hoy: nivel {current}</span>
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

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-marble/55 px-3 py-2 ring-1 ring-parchment-3/80">
          <dt className="text-xs font-bold text-ink-soft">Consumo</dt>
          <dd className="inline-flex items-center gap-1 text-xl font-extrabold tabular">
            <ResIcon kind="wine" size={18} />
            {use > 0.05 ? `−${fmt1(use)}` : "0"}/h
          </dd>
        </div>
        <div className="rounded-lg bg-marble/55 px-3 py-2 ring-1 ring-parchment-3/80">
          <dt className="text-xs font-bold text-ink-soft">Satisfacción</dt>
          <dd className="text-xl font-extrabold text-success tabular">+{fmt(happinessPerLevel * level)}</dd>
        </div>
      </dl>

      {level > 0 && stock < 1 && net < 0 ? (
        <p className="text-sm font-bold text-danger">
          No te queda vino. Sin vino la taberna no suma satisfacción.
        </p>
      ) : level > 0 && hoursLeft < 24 ? (
        <p className="text-sm font-bold text-danger">
          Tu vino ({fmt(stock)}) alcanza para {fmtDuration(hoursLeft * 3_600_000)}. Después la gente se pone triste.
        </p>
      ) : level > 0 && Number.isFinite(hoursLeft) ? (
        <p className="text-sm text-ink-soft">Tu vino alcanza para más de un día.</p>
      ) : level > 0 ? (
        <p className="text-sm text-ink-soft">La isla produce más vino del que servís.</p>
      ) : null}

      <ActionButton className="w-full" disabled={!changed} pendingLabel="Sirviendo…" action={() => setWineAction({ cityId, level })}>
        {label}
      </ActionButton>
    </div>
  );
}
