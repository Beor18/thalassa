"use client";

import { useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { BALANCE, RESOURCES, type Resource } from "@/game/data";
import { resourceLabel } from "@/game/names";
import { ActionButton } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { useI18n } from "@/i18n/client";
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
  const { t, lang, fmt } = useI18n();
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
            {t({ en: "The merchant", es: "El mercader" })}
          </h2>
          <p className="inline-flex flex-wrap items-center gap-1 text-sm text-ink-soft tabular">
            <ResIcon kind="ambrosia" size={16} />
            <b className="text-ambrosia-dark">{fmt(price)}</b>
            <span aria-hidden>→</span>
            <span className="sr-only">{t({ en: "for", es: "por" })}</span>
            <b className="text-ink">{fmt(amount)}</b> {t({ en: `to ${cityName}`, es: `a ${cityName}` })}
          </p>
        </div>
      </div>

      <fieldset className="flex flex-col">
        <legend className="sr-only">{t({ en: "What should he bring?", es: "¿Qué recurso te trae?" })}</legend>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {RESOURCES.map((r) => {
            const isFull = res[r] >= storage - 0.5;
            return (
              <label
                key={r}
                className="group relative cursor-pointer"
                title={t({
                  en: `${resourceLabel(r, lang)}: ${fmt(res[r])} of ${fmt(storage)}`,
                  es: `${resourceLabel(r, lang)}: ${fmt(res[r])} de ${fmt(storage)}`,
                })}
              >
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
                  <span className="text-[13px] leading-tight font-bold">{resourceLabel(r, lang)}</span>
                  <span className={clsx("text-[11px] leading-none tabular", isFull ? "font-bold text-terracotta" : "text-ink-soft")}>
                    {isFull ? t({ en: "Full", es: "Lleno" }) : fmt(res[r])}
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
          pendingLabel={t({ en: "The merchant is loading up…", es: "El mercader está cargando…" })}
          celebrate
          className="w-full sm:w-auto"
        >
          {t({
            en: `Bring ${fmt(amount)} ${resourceLabel(resource, lang).toLowerCase()}`,
            es: `Traer ${fmt(amount)} de ${resourceLabel(resource, lang).toLowerCase()}`,
          })}
        </ActionButton>
        {(!canPay || full) && (
          <p className="text-sm font-bold text-danger">
            {!canPay
              ? t({
                  en: `Not enough Nectar: you have ${fmt(ambrosia)} of ${fmt(price)}.`,
                  es: `Te falta néctar: tenés ${fmt(ambrosia)} de ${fmt(price)}.`,
                })
              : t({ en: "That storage is already full.", es: "Ese depósito ya está lleno." })}
          </p>
        )}
      </div>
    </section>
  );
}
