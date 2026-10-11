"use client";

import Image from "next/image";
import clsx from "clsx";
import { useI18n } from "@/i18n/client";

/** Bronze compass rose that swings as if it were finding north. Used while a section loads. */
export function CompassLoader({ size = 56, label, className }: { size?: number; label?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <span role="status" className={clsx("inline-flex flex-col items-center gap-2", className)}>
      <span className="relative grid place-items-center" style={{ width: size, height: size }}>
        <span aria-hidden className="absolute inset-[12%] rounded-full bg-gold/25 blur-md" />
        <Image
          src="/assets/fx/compass-rose.webp"
          alt=""
          width={size}
          height={size}
          // Often the biggest thing on a loading screen: load it right away.
          loading="eager"
          className="relative drop-shadow-[0_4px_6px_rgb(6_26_48/0.45)] motion-safe:animate-[compass-seek_2.8s_var(--ease-in-out-sine)_infinite]"
        />
      </span>
      <span className="sr-only">{label ?? t({ en: "Loading", es: "Cargando" })}</span>
    </span>
  );
}
