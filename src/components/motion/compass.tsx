import Image from "next/image";
import clsx from "clsx";

/** Bronze compass rose that swings as if it were finding north. Used while a section loads. */
export function CompassLoader({ size = 56, label = "Cargando", className }: { size?: number; label?: string; className?: string }) {
  return (
    <span role="status" className={clsx("inline-flex flex-col items-center gap-2", className)}>
      <span className="relative grid place-items-center" style={{ width: size, height: size }}>
        <span aria-hidden className="absolute inset-[12%] rounded-full bg-gold/25 blur-md" />
        <Image
          src="/assets/fx/compass-rose.webp"
          alt=""
          width={size}
          height={size}
          className="relative drop-shadow-[0_4px_6px_rgb(6_26_48/0.45)] motion-safe:animate-[compass-seek_2.8s_var(--ease-in-out-sine)_infinite]"
        />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
