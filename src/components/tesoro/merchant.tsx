"use client";

import { useState } from "react";
import Image from "next/image";
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
    <section aria-labelledby="merchant-title" className="panel flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <Image src="/assets/u-ship.webp" alt="" width={44} height={44} className="sprite size-11 shrink-0 motion-safe:animate-float" />
        <div className="min-w-0 flex-1">
          <h2 id="merchant-title" className="font-display text-xl leading-tight font-bold">
            El mercader
          </h2>
          <p className="inline-flex flex-wrap items-center gap-1 text-sm text-ink-soft tabular">
            <ResIcon kind="ambrosia" size={16} />
            <b className="text-ambrosia-dark">{price}</b>
            <span aria-hidden>→</span>
            <span className="sr-only">por</span>
            <b className="text-ink">{fmt(amount)}</b> a {cityName}
          </p>
        </div>
      </div>

      <fieldset className="flex flex-col">
        <legend className="sr-only">¿Qué recurso te trae?</legend>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {RESOURCES.map((r) => {
            const isFull = res[r] >= storage - 0.5;
            return (
              <label key={r} className="group relative cursor-pointer" title={`${RESOURCE_INFO[r].label}: ${fmt(res[r])} de ${fmt(storage)}`}>
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
                    "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 py-1.5 text-center transition-[border-color,background-color,box-shadow,transform] duration-150 group-active:scale-[0.97]",
                    "border-parchment-3 bg-marble/50 group-hover:border-bronze/60",
                    "peer-checked:border-bronze peer-checked:bg-marble peer-checked:shadow-[0_0_0_3px_rgb(168_113_42/0.2)]",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
                  )}
                >
                  <ResIcon kind={r} size={26} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110" />
                  <span className="text-[13px] leading-tight font-bold">{RESOURCE_INFO[r].label}</span>
                  <span className={clsx("text-[11px] leading-none tabular", isFull ? "font-bold text-terracotta" : "text-ink-soft")}>
                    {isFull ? "Lleno" : fmt(res[r])}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <ActionButton
          action={() => merchantAction({ cityId, resource })}
          variant="ambrosia"
          size="lg"
          disabled={!canPay || full}
          pendingLabel="El mercader está cargando…"
          celebrate
          className="w-full sm:w-auto"
        >
          Traer {fmt(amount)} de {RESOURCE_INFO[resource].label.toLowerCase()}
        </ActionButton>
        {(!canPay || full) && (
          <p className="text-sm font-bold text-danger">
            {!canPay ? `Te falta néctar: tenés ${fmt(ambrosia)} de ${price}.` : "Ese depósito ya está lleno."}
          </p>
        )}
      </div>
    </section>
  );
}
