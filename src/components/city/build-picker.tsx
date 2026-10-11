"use client";

import { useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import type { BuildingType, ResourceBag } from "@/game/data";
import { CostList } from "@/components/ui/res";
import { buildingName } from "@/game/names";
import { useI18n } from "@/i18n/client";
import { Duration } from "./duration";
import { BuildButton } from "./build-button";
import { fmtSoon } from "./lib";

export interface BuildOption {
  type: BuildingType;
  name: string;
  description: string;
  image: string;
  cost: ResourceBag;
  seconds: number;
  /** what level 1 gives ("+8 desks") */
  gains: string[];
  /** "You need 120 more wood." */
  missing: string | null;
  /** when production covers what's missing */
  etaMs: number | null;
  /** some amount is bigger than the warehouse */
  tooBig: boolean;
}

/**
 * Empty plot: pick one of the buildings that fit (cost and time at a glance, details on the picked
 * one) and a single button that says what it builds.
 */
export function BuildPicker({
  cityId,
  slot,
  options,
  res,
  busy,
}: {
  cityId: string;
  slot: number;
  options: BuildOption[];
  res: ResourceBag;
  /** another construction is running: nothing can start */
  busy: boolean;
}) {
  const { t, lang, fmtDuration } = useI18n();
  const [picked, setPicked] = useState<BuildingType>(() => (options.find((o) => !o.missing) ?? options[0]).type);
  const o = options.find((x) => x.type === picked) ?? options[0];
  const single = options.length === 1;

  return (
    <div className="flex flex-col gap-2.5">
      <div role="radiogroup" aria-label={t({ en: "What to build", es: "Qué construir" })} className="flex flex-col gap-1.5">
        {options.map((opt) => {
          const on = opt.type === o.type;
          return (
            <label key={opt.type} className="relative block cursor-pointer">
              <input
                type="radio"
                name={`build-${slot}`}
                value={opt.type}
                checked={on}
                onChange={() => setPicked(opt.type)}
                className="peer sr-only"
              />
              <span
                className={clsx(
                  "flex gap-2.5 rounded-xl border p-2 transition-[background-color,border-color,box-shadow] duration-100",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
                  on
                    ? "border-bronze bg-gradient-to-b from-gold/20 to-parchment-2/70 shadow-[0_0_0_1px_var(--color-bronze)]"
                    : "border-parchment-3 bg-parchment-2/40 hover:bg-parchment-2/80",
                )}
              >
                <Image
                  src={opt.image}
                  alt=""
                  width={128}
                  height={128}
                  sizes="56px"
                  className={clsx("sprite size-14 shrink-0 object-contain transition-transform duration-150", on && "motion-safe:scale-105")}
                />
                <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-display truncate text-base leading-tight font-bold">{opt.name}</span>
                    <Duration className="shrink-0 text-xs">{fmtDuration(opt.seconds * 1000)}</Duration>
                  </span>
                  <CostList cost={opt.cost} have={res} className="text-sm" />
                  {(on || single) && (
                    <span className="flex flex-col gap-0.5 pt-0.5">
                      <span className="text-sm leading-snug text-ink-soft">{opt.description}</span>
                      {opt.gains.length > 0 && <span className="text-sm leading-tight font-bold text-success">{opt.gains.join(" · ")}</span>}
                    </span>
                  )}
                </span>
                {!single && (
                  <span
                    aria-hidden
                    className={clsx(
                      "mt-1 grid size-5 shrink-0 place-items-center self-start rounded-full border-2 transition-colors duration-100",
                      on ? "border-bronze-dark bg-bronze-dark" : "border-parchment-3 bg-marble",
                    )}
                  >
                    {on && <span className="size-2 rounded-full bg-marble" />}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {/* The action stays in reach while the list scrolls. */}
      <div className="sticky bottom-0 z-[5] -mx-4 flex flex-col gap-1.5 border-t border-parchment-3/70 bg-parchment/95 px-4 pt-2.5 pb-1 backdrop-blur-sm">
        <BuildButton cityId={cityId} slot={slot} type={o.type} className="w-full" disabled={busy || o.missing != null}>
          {t({ en: `Build ${o.name}`, es: `Construir ${o.name}` })}
        </BuildButton>
        {!busy &&
          (o.tooBig ? (
            <p className="text-sm font-bold text-bronze-dark">
              {t({
                en: `Too big for your storage: upgrade the ${buildingName("warehouse", lang)}.`,
                es: `No entra en tu depósito: ampliá el ${buildingName("warehouse", lang)}.`,
              })}
            </p>
          ) : o.missing ? (
            <p className="text-sm">
              <span className="font-bold text-danger">{o.missing}</span>
              {o.etaMs != null && (
                <span className="text-ink-soft">
                  {t({ en: ` You'll have it in ${fmtSoon(o.etaMs)}.`, es: ` Lo juntás en ${fmtSoon(o.etaMs)}.` })}
                </span>
              )}
            </p>
          ) : null)}
      </div>
    </div>
  );
}
