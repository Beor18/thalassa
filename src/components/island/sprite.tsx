"use client";

import { useCallback, useState, type ReactNode } from "react";
import Image from "next/image";
import clsx from "clsx";

/**
 * Painted sprite with a controlled fallback. Some feature sprites are still being produced,
 * so a missing file renders a clean token instead of a broken image.
 */
export function Sprite({
  src,
  alt = "",
  className,
  fallback,
  eager,
  sizes = "96px",
}: {
  src: string;
  alt?: string;
  className?: string;
  fallback: ReactNode;
  /** load right away: the sprite is part of the first screen */
  eager?: boolean;
  sizes?: string;
}) {
  const [broken, setBroken] = useState(false);
  // The image may fail before hydration attaches onError: check once the element is mounted.
  const check = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0) setBroken(true);
  }, []);

  if (broken) return <>{fallback}</>;
  return (
    <Image
      ref={check}
      src={src}
      alt={alt}
      width={384}
      height={384}
      unoptimized
      sizes={sizes}
      loading={eager ? "eager" : undefined}
      draggable={false}
      onError={() => setBroken(true)}
      className={clsx("sprite pointer-events-none h-auto w-full select-none", className)}
    />
  );
}

/** Round parchment token used as the sprite fallback. */
export function Token({ children, tone = "parchment", className }: { children: ReactNode; tone?: "parchment" | "gold" | "danger"; className?: string }) {
  return (
    <span
      className={clsx(
        "sprite grid aspect-square w-[62%] place-items-center rounded-full border-2 shadow-lg",
        tone === "parchment" && "border-bronze bg-parchment text-bronze-dark",
        tone === "gold" && "border-bronze-dark bg-gold text-ink",
        tone === "danger" && "border-[#7d1a14] bg-terracotta text-marble",
        className,
      )}
    >
      {children}
    </span>
  );
}
