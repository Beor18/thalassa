"use client";

import { useState } from "react";
import clsx from "clsx";
import { BALANCE, RESOURCES, RESOURCE_INFO, type Resource } from "@/game/data";
import { ActionButton } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { fmt } from "@/lib/format";
import { merchantAction } from "@/server/actions";

/** Trade ambrosia for a full cargo of one resource, delivered to the city in focus. */
export function Merchant({
  cityId,
  cityName,
  ambrosia,
  res,
  storage,
}: {
  cityId: string;
  cityName: string;
  ambrosia: number;
  res: Record<Resource, number>;
  storage: number;
}) {
  const [resource, setResource] = useState<Resource>("wood");
  const price = BALANCE.merchantAmbrosia;
  const amount = BALANCE.merchantAmount;
  const canPay = ambrosia >= price;
  const full = res[resource] >= storage - 0.5;

  return (
    <section aria-labelledby="merchant-title" className="panel flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h2 id="merchant-title" className="font-display text-xl font-bold">
          El mercader
        </h2>
        <p className="text-[15px] text-ink-soft">
          Por {price} de néctar te deja {fmt(amount)} del recurso que elijas en {cityName}.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-display text-base font-bold">¿Qué te traigo?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {RESOURCES.map((r) => {
            const isFull = res[r] >= storage - 0.5;
            return (
              <label key={r} className="group relative cursor-pointer">
                <input
                  type="radio"
                  name="merchant-resource"
                  value={r}
                  checked={resource === r}
                  onChange={() => setResource(r)}
                  className="peer sr-only"
                />
                <span
                  className={clsx(
                    "flex min-h-14 items-center gap-2 rounded-xl border-2 px-2.5 py-2 transition-[border-color,background-color,box-shadow,transform] duration-150 group-active:scale-[0.98]",
                    "border-parchment-3 bg-marble/50 group-hover:border-bronze/60",
                    "peer-checked:border-bronze peer-checked:bg-marble peer-checked:shadow-[0_0_0_3px_rgb(168_113_42/0.2)]",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
                  )}
                >
                  <ResIcon kind={r} size={28} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110" />
                  <span className="min-w-0 leading-tight">
                    <span className="block font-bold">{RESOURCE_INFO[r].label}</span>
                    <span className={clsx("block text-xs tabular", isFull ? "font-bold text-terracotta" : "text-ink-soft")}>
                      {isFull ? "Depósito lleno" : `${fmt(res[r])} / ${fmt(storage)}`}
                    </span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <ActionButton
          action={() => merchantAction({ cityId, resource })}
          variant="ambrosia"
          size="lg"
          disabled={!canPay || full}
          pendingLabel="El mercader está cargando…"
          celebrate
          className="w-full sm:w-auto sm:self-start"
        >
          Traer {fmt(amount)} de {RESOURCE_INFO[resource].label.toLowerCase()}
        </ActionButton>
        <p className="inline-flex flex-wrap items-center gap-1 text-sm text-ink-soft">
          Cuesta <ResIcon kind="ambrosia" size={16} /> <b className="tabular text-ink">{price}</b>. Tenés{" "}
          <b className="tabular text-ink">{fmt(ambrosia)}</b>.
          {!canPay && <span className="font-bold text-danger"> Te falta néctar.</span>}
          {canPay && full && <span className="font-bold text-danger"> Ese depósito ya está lleno.</span>}
        </p>
      </div>
    </section>
  );
}
