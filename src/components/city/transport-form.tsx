"use client";

import { useState } from "react";
import { RESOURCES, RESOURCE_INFO, emptyBag, type Resource, type ResourceBag } from "@/game/data";
import { ActionButton } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { fmt } from "@/lib/format";
import { transportAction } from "@/server/actions";
import { AmountInput } from "./amount-input";

export interface Destination {
  id: string;
  name: string;
  label: string;
  mine: boolean;
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
  const own = destinations.filter((d) => d.mine);
  const others = destinations.filter((d) => !d.mine);
  // Default to one of your own cities; never pre-pick a stranger's.
  const [target, setTarget] = useState(own[0]?.id ?? "");
  const [cargo, setCargo] = useState<ResourceBag>(emptyBag);

  const total = RESOURCES.reduce((s, r) => s + cargo[r], 0);
  const needed = Math.ceil(total / shipCapacity);
  const room = ships * shipCapacity - total;
  const targetName = destinations.find((d) => d.id === target)?.name;
  const reason =
    ships === 0
      ? "No tenés barcos en el puerto. Comprá uno para mandar recursos."
      : needed > ships
        ? `Esa carga necesita ${needed} barcos y tenés ${ships}.`
        : !target
          ? "Elegí a qué ciudad mandar."
          : null;

  if (destinations.length === 0) {
    return <p className="text-sm text-ink-soft">Todavía no hay otras ciudades para comerciar.</p>;
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="transport-target" className="text-sm font-bold">
          Destino
        </label>
        <select
          id="transport-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-10 w-full rounded-lg border border-parchment-3 bg-marble px-2.5 text-[15px] text-ink focus-visible:border-bronze"
        >
          {target === "" && (
            <option value="" disabled>
              Elegí una ciudad
            </option>
          )}
          {own.length > 0 && (
            <optgroup label="Tus ciudades">
              {own.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label="Otras ciudades">
              {others.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold">Carga</legend>
        {RESOURCES.map((r: Resource) => {
          const have = Math.floor(stock[r]);
          const max = Math.max(0, Math.min(have, cargo[r] + room));
          const id = `cargo-${r}`;
          return (
            <div key={r} className="grid grid-cols-[minmax(0,1fr)_minmax(0,11rem)] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden className="contents">
                  <ResIcon kind={r} size={22} />
                </span>
                <span className="min-w-0">
                  <label htmlFor={id} className="block text-sm leading-tight font-bold">
                    {RESOURCE_INFO[r].label}
                  </label>
                  <span id={`${id}-have`} className="block text-xs text-ink-soft tabular">
                    Tenés {fmt(have)}
                  </span>
                </span>
              </div>
              <AmountInput
                id={id}
                value={cargo[r]}
                max={max}
                describedBy={`${id}-have`}
                blankZero
                onChange={(n) => setCargo((c) => ({ ...c, [r]: n }))}
                maxLabel={`Cargar todo lo posible de ${RESOURCE_INFO[r].label.toLowerCase()}`}
              />
            </div>
          );
        })}
      </fieldset>

      <p className="flex flex-wrap justify-between gap-x-3 text-sm text-ink-soft tabular" aria-live="polite">
        <span>
          Carga: <strong className="text-ink">{fmt(total)}</strong>
        </span>
        <span>
          Barcos: <strong className={needed > ships ? "text-danger" : "text-ink"}>{fmt(needed)}</strong> de {fmt(ships)} · {fmt(shipCapacity)} por barco
        </span>
      </p>

      <ActionButton
        className="w-full"
        pendingLabel="Zarpando…"
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
          ? `Enviar ${needed} ${needed === 1 ? "barco" : "barcos"} a ${targetName}`
          : "Enviar recursos"}
      </ActionButton>
      {reason && <p className="-mt-1 text-sm font-bold text-bronze-dark">{reason}</p>}
    </form>
  );
}
