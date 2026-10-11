import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
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
  A speaks to the memory, B to the lack of time. One line of product, one action.
*/
const HOOKS = {
  a: {
    headline: "¿Te acordás de dejar la ciudad construyendo y volver después del colegio?",
    product: "Volvió, en el Egeo: diez minutos al día y tu polis sigue creciendo sola.",
  },
  b: {
    headline: "¿Tenés diez minutos?",
    product: "Alcanzan para fundar tu polis en el Egeo. Después crece sola mientras vivís tu vida.",
  },
} as const;

/** Headline words rise one by one (see .ld-word); the product line lands right after the last one. */
const WORD_START_MS = 380;
const WORD_STEP_MS = 35;
const CTA_DELAY_MS = 1000;

function HookCopy({ hook }: { hook: (typeof HOOKS)[keyof typeof HOOKS] }) {
  const words = hook.headline.split(" ");
  const after = WORD_START_MS + words.length * WORD_STEP_MS + 120;
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <h1 className="font-display text-[26px] leading-tight font-bold text-marble [text-shadow:0_2px_12px_rgb(6_26_48/0.9)] sm:text-4xl lg:text-[42px]">
        {words.map((word, i) => (
          <span key={i}>
            <span className="ld-word" style={{ "--i": i } as CSSProperties}>
              {word}
            </span>{" "}
          </span>
        ))}
      </h1>
      <p
        className="ld-fade-up max-w-xl text-lg leading-snug font-bold text-foam [text-shadow:0_1px_8px_rgb(6_26_48/0.95)] sm:text-xl"
        style={{ "--d": `${after}ms` } as CSSProperties}
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

      {/* Above the fold: the painting, the hook, one button. */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <HeroScene />

        <div className="mx-auto mt-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-28 pb-10 sm:gap-5 sm:px-6 sm:pb-16 md:pb-20">
          <p
            aria-hidden
            className="ld-title-wrap self-start font-display text-[clamp(2.5rem,13vw,3rem)] leading-none font-black tracking-[0.12em] whitespace-nowrap text-gold sm:text-7xl lg:text-8xl"
          >
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
          <div className="ld-fade-up mt-1" style={{ "--d": `${CTA_DELAY_MS}ms` } as CSSProperties}>
            <Suspense fallback={<ActionsSkeleton />}>
              <HeroActions where="hero" />
            </Suspense>
          </div>
        </div>

        <a
          href="#como-se-juega"
          className="absolute bottom-2 left-1/2 hidden min-h-10 -translate-x-1/2 flex-col items-center justify-center gap-0.5 rounded-lg px-3 text-xs font-bold text-foam/75 transition-colors hover:text-foam sm:flex"
        >
          Cómo se juega
          <svg viewBox="0 0 16 16" aria-hidden className="ld-scroll-cue size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </a>
      </section>

      {/* From the hero's dark sea into the living tiled sea */}
      <div className="bg-[linear-gradient(to_bottom,var(--color-sea-950),transparent_16rem)]">
        <section
          id="como-se-juega"
          aria-labelledby="beats-title"
          className="mx-auto w-full max-w-6xl scroll-mt-6 px-4 pt-10 pb-12 sm:px-6 sm:pt-16 sm:pb-16"
        >
          <h2 id="beats-title" className="mb-5 font-display text-[26px] leading-tight font-bold text-foam [text-shadow:0_2px_12px_rgb(6_26_48/0.9)] sm:mb-8 sm:text-4xl">
            De aldea a potencia del Egeo
          </h2>
          <Beats />
        </section>

        {/* Doubts on demand, and the same single action next to them. */}
        <section
          aria-labelledby="faq-title"
          className="mx-auto grid w-full max-w-6xl items-start gap-6 px-4 pb-12 sm:px-6 sm:pb-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-8"
        >
          <div>
            <h2 id="faq-title" className="mb-4 font-display text-[26px] leading-tight font-bold text-foam [text-shadow:0_2px_12px_rgb(6_26_48/0.9)] sm:text-4xl">
              Preguntas frecuentes
            </h2>
            <Faq />
          </div>
          <div aria-labelledby="closing-title" role="region" className="panel-dark flex flex-col items-start gap-4 p-5 sm:p-7 lg:sticky lg:top-6 lg:mt-14">
            <h2 id="closing-title" className="font-display text-[26px] leading-tight font-bold text-foam sm:text-3xl">
              Tu isla ya tiene lugar.
            </h2>
            <Suspense fallback={<ActionsSkeleton />}>
              <HeroActions where="final" />
            </Suspense>
          </div>
        </section>

        <footer className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6">
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
    <div className="flex flex-col items-start gap-2">
      <span className="ld-cta-glow relative inline-flex rounded-xl">
        <Link href="/ciudad" className={buttonClass("primary", "lg", "h-14 min-w-60 px-8 text-lg")}>
          Volver a mi polis
        </Link>
      </span>
      <p className="text-sm text-foam/85">
        ¿Otra cuenta?{" "}
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
      <div className="skel-line on-dark h-4 w-56 max-w-full" />
      <div className="skel-line on-dark h-6 w-44" />
    </div>
  );
}
