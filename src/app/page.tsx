import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Beats } from "@/components/landing/beats";
import { Faq } from "@/components/landing/faq";
import { HeroScene } from "@/components/landing/hero-scene";
import { PlayActions } from "@/components/landing/play-actions";
import "@/components/landing/landing.css";
import { HookSwitch } from "@/components/growth/hook-switch";
import { LegalLinks } from "@/components/growth/legal-links";
import { ReferralNote } from "@/components/growth/referral-note";
import { TrackClicks, TrackView } from "@/components/growth/track";
import { VideoGameJsonLd } from "@/components/growth/video-game-json-ld";
import { shortAddress } from "@/lib/format";
import { SITE_DESCRIPTION } from "@/lib/site";
import { optionalSession } from "@/server/auth";

const PAGE_TITLE = "Thalassa · Tu polis en el Egeo";

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "es_AR", siteName: "Thalassa", title: PAGE_TITLE, description: SITE_DESCRIPTION, url: "/" },
};

const TITLE = "THALASSA";

/*
  Need first, product after (docs/negocio/landing-copy.md). Two hooks under test:
  A speaks to the memory, B to the lack of time. Same product line idea, one action.
*/
const HOOKS = {
  a: {
    headline: "¿Te acordás de dejar la ciudad construyendo y volver después del colegio?",
    diagnosis: "Después llegaron el trabajo, los horarios y los juegos que piden la noche entera.",
    product: "Thalassa es tu polis en el Egeo. La ordenás en diez minutos y sigue creciendo sola.",
  },
  b: {
    headline: "¿Tenés diez minutos?",
    diagnosis: "La estrategia de ahora te pide horas. La de antes te esperaba.",
    product: "Thalassa es estrategia por navegador en el Egeo. Tu polis avanza mientras vivís tu vida.",
  },
} as const;

function HookCopy({ hook }: { hook: (typeof HOOKS)[keyof typeof HOOKS] }) {
  const words = hook.headline.split(" ");
  // Supporting lines start right after the last headline word lands.
  const after = 520 + words.length * 45 + 250;
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <h1 className="font-display text-[28px] leading-tight font-bold text-marble [text-shadow:0_2px_12px_rgb(6_26_48/0.9)] sm:text-4xl lg:text-[42px]">
        {words.map((word, i) => (
          <span key={i}>
            <span className="ld-word" style={{ "--i": i } as CSSProperties}>
              {word}
            </span>{" "}
          </span>
        ))}
      </h1>
      <p className="ld-fade-up text-lg text-foam/90 [text-shadow:0_1px_8px_rgb(6_26_48/0.9)] sm:text-xl" style={{ "--d": `${after}ms` } as CSSProperties}>
        {hook.diagnosis}
      </p>
      <p
        className="ld-fade-up text-lg font-bold text-marble [text-shadow:0_1px_8px_rgb(6_26_48/0.9)] sm:text-xl"
        style={{ "--d": `${after + 150}ms` } as CSSProperties}
      >
        {hook.product}
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <VideoGameJsonLd />
      <TrackView event="landing_view" withHook />
      <TrackClicks withHook />

      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <HeroScene />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
          <span className="rounded-full bg-sea-950/55 px-3 py-1.5 font-display text-lg font-black tracking-[0.22em] text-gold ring-1 ring-gold/20 backdrop-blur-sm [text-shadow:0_1px_0_var(--color-bronze-deep),0_2px_10px_rgb(6_26_48/0.9)]">
            THALASSA
          </span>
          <span className="rounded-full bg-sea-950/70 px-2.5 py-1 text-xs font-bold text-sea-300 ring-1 ring-sea-300/30 backdrop-blur">
            Red de prueba · sin plata real
          </span>
        </header>

        <div className="mx-auto mt-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-24 pb-14 sm:px-6 sm:pb-20 md:pb-24">
          <p aria-hidden className="ld-title-wrap font-display text-5xl font-black tracking-[0.12em] text-gold sm:text-7xl lg:text-8xl">
            <span className="[text-shadow:0_2px_0_var(--color-bronze-dark),0_8px_28px_rgb(6_26_48/0.85)]">
              {TITLE.split("").map((ch, i) => (
                <span key={i} className="ld-letter" style={{ "--i": i } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
            <span className="ld-title-shine">{TITLE}</span>
          </p>
          <HookSwitch a={<HookCopy hook={HOOKS.a} />} b={<HookCopy hook={HOOKS.b} />} />
          <div className="ld-fade-up" style={{ "--d": "1550ms" } as CSSProperties}>
            <Suspense fallback={<ActionsSkeleton />}>
              <HeroActions where="hero" />
            </Suspense>
          </div>
        </div>

        <a
          href="#como-se-juega"
          className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold text-foam/75 transition-colors hover:text-foam sm:flex"
        >
          Cómo se juega
          <svg viewBox="0 0 16 16" aria-hidden className="ld-scroll-cue size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </a>
      </section>

      {/* From the hero's dark sea into the living tiled sea */}
      <div className="bg-[linear-gradient(to_bottom,var(--color-sea-950),transparent_18rem)]">
        <section id="como-se-juega" aria-labelledby="beats-title" className="mx-auto w-full max-w-6xl scroll-mt-6 px-4 py-14 sm:px-6 sm:py-20">
          <h2 id="beats-title" className="mb-8 font-display text-3xl font-bold text-foam [text-shadow:0_2px_12px_rgb(6_26_48/0.9)] sm:mb-12 sm:text-4xl">
            De aldea a potencia del Egeo
          </h2>
          <Beats />

          <div className="mt-14 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <aside aria-labelledby="cost-title" className="panel-dark flex items-start gap-4 p-4 sm:p-5">
              <Image src="/assets/r-ambrosia.webp" alt="" width={48} height={48} className="sprite size-12 shrink-0 animate-float" />
              <div>
                <h2 id="cost-title" className="font-display text-lg font-bold text-gold">
                  Jugar no cuesta nada.
                </h2>
                <p className="mt-1 max-w-3xl text-[15px] leading-snug text-foam/90">
                  El néctar es opcional: termina obras antes y llama al mercader. Hoy se compra con SOL de prueba (100 de
                  néctar = 0,05 SOL de prueba) y el juego te manda SOL de prueba cada 12 horas. Nada de esto es plata real.
                </p>
              </div>
            </aside>
            <aside aria-labelledby="who-title" className="panel-dark flex items-start gap-4 p-4 sm:p-5">
              <Image src="/assets/r-research.webp" alt="" width={48} height={48} className="sprite size-12 shrink-0" />
              <div>
                <h2 id="who-title" className="font-display text-lg font-bold text-gold">
                  Hecho por un jugador de los de antes.
                </h2>
                <p className="mt-1 text-[15px] leading-snug text-foam/90">
                  Desde Argentina, como proyecto independiente. Sin inversores y sin monedas para especular.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section aria-labelledby="faq-title" className="mx-auto w-full max-w-3xl px-4 pb-14 sm:px-6 sm:pb-20">
          <h2 id="faq-title" className="mb-5 font-display text-3xl font-bold text-foam [text-shadow:0_2px_12px_rgb(6_26_48/0.9)] sm:text-4xl">
            Preguntas frecuentes
          </h2>
          <Faq />
        </section>

        <section aria-labelledby="closing-title" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="panel-dark flex flex-col items-start gap-4 p-6 sm:p-8">
            <h2 id="closing-title" className="font-display text-3xl font-bold text-foam sm:text-4xl">
              Tu isla ya tiene lugar.
            </h2>
            <Suspense fallback={<ActionsSkeleton />}>
              <HeroActions where="final" />
            </Suspense>
          </div>
        </section>

        <footer className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
          <LegalLinks />
        </footer>
      </div>
    </main>
  );
}

/**
 * Reads the session at request time: returning players get a direct way back to their polis.
 * Visitors who came through an invite link see who invited them (hero only).
 */
async function HeroActions({ where }: { where: "hero" | "final" }) {
  const session = await optionalSession();
  if (!session) {
    return (
      <div className="flex flex-col items-start gap-3">
        {where === "hero" && <ReferralNote />}
        <PlayActions where={where} />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="ld-cta-glow relative inline-flex rounded-xl">
        <Link href="/ciudad" className={buttonClass("primary", "lg", "h-14 min-w-60 px-8 text-lg")}>
          Volver a mi polis
        </Link>
      </span>
      <p className="text-sm text-foam/85">
        Entraste como <span className="tabular font-bold text-foam">{shortAddress(session.wallet)}</span>.{" "}
        <Link href="/salir" prefetch={false} className="inline-flex min-h-10 items-center font-bold underline underline-offset-4 hover:text-gold">
          Salir
        </Link>
      </p>
    </div>
  );
}

function ActionsSkeleton() {
  return (
    <div className="flex flex-col items-start gap-3" aria-hidden>
      <div className="skel-line on-dark h-14 w-60 rounded-lg !bg-bronze/50" />
      <div className="skel-line on-dark h-4 w-72 max-w-full" />
      <div className="skel-line on-dark h-6 w-44" />
    </div>
  );
}
