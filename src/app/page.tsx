import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { PlayActions } from "@/components/landing/play-actions";
import { shortAddress } from "@/lib/format";
import { optionalSession } from "@/server/auth";

export const metadata: Metadata = {
  title: { absolute: "Thalassa · Tu polis en el Egeo" },
};

const BEATS = [
  {
    numeral: "I",
    title: "Fundá",
    text: "Arrancás con una aldea y cuarenta ciudadanos. Cada obra tarda lo suyo: volvés más tarde y la encontrás terminada.",
    image: "/assets/b-town_hall.webp",
    alt: "Ayuntamiento de mármol con techo de tejas",
  },
  {
    numeral: "II",
    title: "Comerciá entre islas",
    text: "Tu isla da vino y la del vecino, mármol. Los barcos van y vienen con lo que te falta.",
    image: "/assets/u-ship.webp",
    alt: "Trirreme con la vela desplegada",
  },
  {
    numeral: "III",
    title: "Conquistá",
    text: "Hoplitas, arqueros y catapultas. Primero los bárbaros de tu isla, después quien se anime.",
    image: "/assets/u-hoplite.webp",
    alt: "Hoplita con escudo y lanza",
  },
] as const;

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <Image
          src="/assets/hero.webp"
          alt="Trirremes entrando al puerto de una polis blanca al atardecer"
          fill
          preload
          sizes="100vw"
          className="-z-20 object-cover object-[62%_center] sm:object-center"
        />
        {/* Shade so the copy stays readable over the painting */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-sea-950 via-sea-950/55 to-sea-950/10" />
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-sea-950/70 to-transparent" />
        <div aria-hidden className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-sea-950/85 via-sea-950/35 to-transparent md:block" />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6">
          <span className="font-display text-lg font-black tracking-[0.22em] text-gold drop-shadow">THALASSA</span>
          <span className="rounded-full bg-sea-950/70 px-2.5 py-1 text-xs font-bold text-sea-300 ring-1 ring-sea-300/30 backdrop-blur">
            Red de prueba de Solana
          </span>
        </header>

        <div className="mx-auto mt-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-24 pb-10 sm:px-6 sm:pb-16 md:pb-20">
          <p
            aria-hidden
            className="font-display text-5xl font-black tracking-[0.12em] text-gold [text-shadow:0_2px_0_#7a4f18,0_8px_24px_rgb(6_26_48/0.8)] sm:text-7xl"
          >
            THALASSA
          </p>
          <div className="flex max-w-xl flex-col gap-3">
            <h1 className="font-display text-[28px] leading-tight font-bold text-marble [text-shadow:0_2px_12px_rgb(6_26_48/0.9)] sm:text-4xl">
              Volvé a las tardes de estrategia en el navegador.
            </h1>
            <p className="text-lg text-foam [text-shadow:0_1px_8px_rgb(6_26_48/0.9)] sm:text-xl">
              Fundá tu polis en una isla del Egeo y hacela crecer mientras hacés otra cosa.
            </p>
          </div>
          <Suspense fallback={<ActionsSkeleton />}>
            <HeroActions />
          </Suspense>
        </div>
      </section>

      {/* Fade from the hero's dark sea into the tiled sea */}
      <div className="bg-[linear-gradient(to_bottom,var(--color-sea-950),transparent_16rem)]">
      <section aria-labelledby="beats-title" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 id="beats-title" className="font-display text-sm font-bold tracking-[0.3em] text-gold">
          ASÍ SE JUEGA
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {BEATS.map((beat) => (
            <li key={beat.numeral} className="panel flex items-center gap-4 p-4 md:flex-col md:items-start md:p-5">
              <Image src={beat.image} alt={beat.alt} width={112} height={112} className="sprite size-20 shrink-0 md:size-28" />
              <div>
                <h3 className="font-display text-xl font-bold text-ink">
                  <span className="mr-2 text-sm text-bronze">{beat.numeral}</span>
                  {beat.title}
                </h3>
                <p className="mt-1 text-[15px] leading-snug text-ink-soft">{beat.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <aside className="panel-dark mt-8 flex items-start gap-4 p-4 sm:p-5">
          <Image src="/assets/r-ambrosia.webp" alt="" width={48} height={48} className="sprite size-12 shrink-0" />
          <div>
            <h2 className="font-display text-base font-bold text-gold">Hecho sobre Solana devnet</h2>
            <p className="mt-1 max-w-3xl text-[15px] leading-snug text-foam/90">
              Tu cuenta vive en la red de prueba de Solana, donde nada cuesta plata real. La ambrosía, el néctar de los
              dioses, se compra con SOL de prueba y sirve para terminar obras al instante o llamar al mercader.
            </p>
          </div>
        </aside>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-sm font-bold text-foam [text-shadow:0_1px_6px_rgb(6_26_48/0.9)] sm:px-6">
        Thalassa · un homenaje a la estrategia clásica por navegador.
      </footer>
      </div>
    </main>
  );
}

/** Reads the session at request time: returning players get a direct way back to their polis. */
async function HeroActions() {
  const session = await optionalSession();
  if (!session) return <PlayActions />;
  return (
    <div className="flex flex-col items-start gap-3">
      <Link href="/ciudad" className={buttonClass("primary", "lg", "h-14 min-w-60 px-8 text-lg")}>
        Volver a mi polis
      </Link>
      <p className="text-sm text-foam/85">
        Entraste como <span className="tabular font-bold text-foam">{shortAddress(session.wallet)}</span>.{" "}
        <Link href="/salir" prefetch={false} className="font-bold underline underline-offset-4 hover:text-gold">
          Salir
        </Link>
      </p>
    </div>
  );
}

function ActionsSkeleton() {
  return (
    <div className="flex flex-col items-start gap-3" aria-hidden>
      <div className="h-14 w-60 animate-pulse rounded-lg bg-bronze/60" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded bg-foam/20" />
      <div className="h-6 w-44 animate-pulse rounded bg-foam/15" />
    </div>
  );
}
