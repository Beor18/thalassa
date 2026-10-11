"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { Button, buttonClass } from "@/components/ui/button";

export default function GameError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error("[thalassa]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="panel rise-in w-full px-6 py-8">
        {/* The compass has lost north: it swings, looking for the wind */}
        <Image
          src="/assets/fx/compass-rose.webp"
          alt=""
          width={72}
          height={72}
          loading="eager"
          className="mx-auto mb-3 size-16 opacity-90 drop-shadow-[0_4px_6px_rgb(43_33_24/0.35)] motion-safe:animate-[compass-seek_3.2s_var(--ease-in-out-sine)_infinite]"
        />
        <h1 className="font-display text-2xl font-bold">{t({ en: "The wind died", es: "Se cortó el viento" })}</h1>
        <p className="mt-2 text-ink-soft">
          {t({
            en: "We couldn't load this part of the Aegean. Your polis is safe.",
            es: "No pudimos cargar esta parte del Egeo. Tu polis está a salvo.",
          })}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => retry()}>{t({ en: "Try again", es: "Probar de nuevo" })}</Button>
          <Link href="/ciudad" className={buttonClass("secondary")}>
            {t({ en: "Back to my polis", es: "Volver a mi polis" })}
          </Link>
        </div>
      </div>
    </div>
  );
}
