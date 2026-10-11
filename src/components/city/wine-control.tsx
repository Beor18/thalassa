"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { useI18n } from "@/i18n/client";
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
  const { t, fmt, fmt1, fmtDuration } = useI18n();
  const [level, setLevel] = useState(Math.min(current, max));
  const use = wineByLevel[level] ?? 0;
  const net = production - use;
  const hoursLeft = net < 0 ? stock / -net : Infinity;
  const changed = level !== current;
  // Nothing picked yet (or the level already served): a neutral label on the disabled button.
  const label = !changed
    ? t({ en: "Choose how much wine to serve", es: "Elegí cuánto vino servir" })
    : level === 0
      ? t({ en: "Stop serving wine", es: "Dejar de servir vino" })
      : t({ en: `Serve wine at level ${level}`, es: `Servir vino nivel ${level}` });
  const outOfWine = t({ en: "You're out of wine: the tavern adds no satisfaction.", es: "No te queda vino: la taberna no suma satisfacción." });
  const dry = level > 0 && stock < 1 && net < 0;
  const short = level > 0 && hoursLeft < 24;

  return (
    <div className="flex flex-col gap-2.5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 w-full">
          <SectionTitle aside={t({ en: `now: level ${current}`, es: `hoy: nivel ${current}` })}>{t({ en: "Wine served", es: "Vino servido" })}</SectionTitle>
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
              <span className="sr-only">{l === 0 ? t({ en: "No wine", es: "No servir vino" }) : t({ en: `Level ${l}`, es: `Nivel ${l}` })}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <StatGrid cols={level > 0 ? 3 : 2}>
        <Stat icon={<ResIcon kind="wine" size={20} />} label={t({ en: "Wine use", es: "Consumo" })} value={use > 0.05 ? `−${fmt1(use)}/h` : "0/h"} />
        <Stat
          icon={<FaceIcon size={20} />}
          label={t({ en: "Satisfaction", es: "Satisfacción" })}
          value={`+${fmt(happinessPerLevel * level)}`}
          tone={level > 0 ? "good" : undefined}
          tip={t({ en: `Each level served adds +${happinessPerLevel}`, es: `Cada nivel servido suma +${happinessPerLevel}` })}
          align={level > 0 ? "center" : "end"}
        />
        {level > 0 && (
          <Stat
            icon={<ResIcon kind="wine" size={20} />}
            label={t({ en: "Lasts", es: "Te alcanza" })}
            value={
              dry
                ? "0 h"
                : !Number.isFinite(hoursLeft)
                  ? t({ en: "forever", es: "siempre" })
                  : hoursLeft >= 24
                    ? t({ en: "1+ day", es: "+1 día" })
                    : hoursLeft >= 1
                      ? `${Math.floor(hoursLeft)} h`
                      : `${Math.max(1, Math.round(hoursLeft * 60))} min`
            }
            tone={dry || short ? "bad" : undefined}
            tip={
              dry
                ? outOfWine
                : Number.isFinite(hoursLeft)
                  ? t({
                      en: `Your ${fmt(stock)} wine lasts ${fmtDuration(hoursLeft * 3_600_000)}. Then your people get unhappy.`,
                      es: `Tus ${fmt(stock)} de vino alcanzan para ${fmtDuration(hoursLeft * 3_600_000)}. Después la gente se pone triste.`,
                    })
                  : t({ en: "The island makes more wine than you serve.", es: "La isla produce más vino del que servís." })
            }
            align="end"
          />
        )}
      </StatGrid>
      {dry && <p className="text-sm font-bold text-danger">{outOfWine}</p>}

      <ActionButton
        className="w-full"
        disabled={!changed}
        pendingLabel={t({ en: "Serving…", es: "Sirviendo…" })}
        action={() => setWineAction({ cityId, level })}
      >
        {label}
      </ActionButton>
    </div>
  );
}
