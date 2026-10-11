"use client";

import { useState } from "react";
import { RESOURCES, emptyBag, type Resource, type ResourceBag } from "@/game/data";
import { resourceLabel } from "@/game/names";
import { ActionButton } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { useI18n } from "@/i18n/client";
import { transportAction } from "@/server/actions";
import { AmountInput } from "./amount-input";
import { IconShip } from "./icons";

export interface Destination {
  id: string;
  name: string;
  label: string;
  mine: boolean;
  /** on the same island as the port (short trips) */
  near?: boolean;
}

export function TransportForm({
  cityId,
  ships,
  shipCapacity,
  stock,
  destinations,
}: {
  cityId: string;
  /** ships docked in this city */
  ships: number;
  shipCapacity: number;
  stock: ResourceBag;
  destinations: Destination[];
}) {
  const { t, lang, fmt } = useI18n();
  const own = destinations.filter((d) => d.mine);
  const near = destinations.filter((d) => !d.mine && d.near);
  const others = destinations.filter((d) => !d.mine && !d.near);
  // Default to one of your own cities; never pre-pick a stranger's.
  const [target, setTarget] = useState(own[0]?.id ?? "");
  const [cargo, setCargo] = useState<ResourceBag>(emptyBag);

  const total = RESOURCES.reduce((s, r) => s + cargo[r], 0);
  const needed = Math.ceil(total / shipCapacity);
  const room = ships * shipCapacity - total;
  const targetName = destinations.find((d) => d.id === target)?.name;
  const reason =
    ships === 0
      ? t({ en: "No ships in port.", es: "No hay barcos en el puerto." })
      : needed > ships
        ? t({ en: `That cargo needs ${fmt(needed)} ships and you have ${fmt(ships)}.`, es: `Esa carga necesita ${fmt(needed)} barcos y tenés ${fmt(ships)}.` })
        : !target
          ? t({ en: "Choose a city to send it to.", es: "Elegí a qué ciudad mandar." })
          : null;

  if (destinations.length === 0) {
    return <p className="text-sm text-ink-soft">{t({ en: "No other cities to trade with yet.", es: "Todavía no hay otras ciudades para comerciar." })}</p>;
  }

  return (
    <form className="flex flex-col gap-2.5" onSubmit={(e) => e.preventDefault()}>
      <div className="flex items-center gap-2">
        <label htmlFor="transport-target" className="shrink-0 text-sm font-bold">
          {t({ en: "Destination", es: "Destino" })}
        </label>
        <select
          id="transport-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-10 w-full min-w-0 flex-1 rounded-lg border border-parchment-3 bg-marble px-2.5 text-[15px] text-ink focus-visible:border-bronze"
        >
          {target === "" && (
            <option value="" disabled>
              {t({ en: "Choose a city", es: "Elegí una ciudad" })}
            </option>
          )}
          {own.length > 0 && (
            <optgroup label={t({ en: "Your cities", es: "Tus ciudades" })}>
              {own.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </optgroup>
          )}
          {near.length > 0 && (
            <optgroup label={t({ en: "On your island", es: "En tu isla" })}>
              {near.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label={t({ en: "Other islands", es: "Otras islas" })}>
              {others.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="sr-only">{t({ en: "Cargo", es: "Carga" })}</legend>
        <div aria-hidden className="grid grid-cols-[22px_minmax(0,1fr)_minmax(0,10.5rem)] gap-2 text-[11px] font-bold text-ink-soft uppercase">
          <span />
          <span>{t({ en: "You have", es: "Tenés" })}</span>
          <span>{t({ en: "Load", es: "Cargar" })}</span>
        </div>
        {RESOURCES.map((r: Resource) => {
          const have = Math.floor(stock[r]);
          const max = Math.max(0, Math.min(have, cargo[r] + room));
          const id = `cargo-${r}`;
          const label = resourceLabel(r, lang);
          return (
            <div key={r} className="grid grid-cols-[22px_minmax(0,1fr)_minmax(0,10.5rem)] items-center gap-2">
              <ResIcon kind={r} size={22} />
              <label htmlFor={id} className="truncate text-sm font-bold text-ink-soft tabular">
                <span className="sr-only">{t({ en: `${label}: you have `, es: `${label}: tenés ` })}</span>
                {fmt(have)}
              </label>
              <AmountInput
                id={id}
                value={cargo[r]}
                max={max}
                blankZero
                onChange={(n) => setCargo((c) => ({ ...c, [r]: n }))}
                maxLabel={t({ en: `Load as much ${label.toLowerCase()} as you can`, es: `Cargar todo lo posible de ${label.toLowerCase()}` })}
              />
            </div>
          );
        })}
      </fieldset>

      <p className="flex flex-wrap items-center justify-between gap-x-3 text-sm text-ink-soft tabular" aria-live="polite">
        <span>
          {t({ en: "Cargo", es: "Carga" })} <strong className="text-ink">{fmt(total)}</strong>
        </span>
        <span className="inline-flex items-center gap-1">
          <IconShip size={16} />
          <strong className={needed > ships ? "text-danger" : "text-ink"}>{fmt(needed)}</strong>{" "}
          {t({ en: `of ${fmt(ships)} ships`, es: `de ${fmt(ships)} barcos` })}
          <span className="sr-only">{t({ en: `, ${fmt(shipCapacity)} cargo per ship`, es: `, ${fmt(shipCapacity)} de carga por barco` })}</span>
        </span>
      </p>

      <ActionButton
        className="w-full"
        pendingLabel={t({ en: "Setting sail…", es: "Zarpando…" })}
        disabled={reason != null || total <= 0}
        action={() =>
          transportAction({
            originCityId: cityId,
            targetCityId: target,
            cargo: Object.fromEntries(RESOURCES.filter((r) => cargo[r] > 0).map((r) => [r, cargo[r]])),
          })
        }
        onDone={(r) => {
          if (r.ok) setCargo(emptyBag());
        }}
      >
        {total > 0 && targetName
          ? t({
              en: `Send ${fmt(needed)} ${needed === 1 ? "ship" : "ships"} to ${targetName}`,
              es: `Enviar ${fmt(needed)} ${needed === 1 ? "barco" : "barcos"} a ${targetName}`,
            })
          : t({ en: "Send goods", es: "Enviar recursos" })}
      </ActionButton>
      {reason && <p className="-mt-1 text-sm font-bold text-bronze-dark">{reason}</p>}
    </form>
  );
}
