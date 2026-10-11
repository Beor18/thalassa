import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { TrackClicks, TrackView } from "@/components/growth/track";
import { LegalLinks } from "@/components/growth/legal-links";
import { buildingName, resourceLabel } from "@/game/names";
import { getI18n } from "@/i18n/server";
import { openGraphBase } from "@/lib/seo";
import { getPublicCity, type PublicCity } from "@/server/growth/public-city";

export async function generateMetadata({ params }: PageProps<"/[lang]/polis/[id]">): Promise<Metadata> {
  const [{ id }, { lang, t }] = await Promise.all([params, getI18n()]);
  const city = await getPublicCity(id);
  if (!city) return { title: t({ en: "Polis not found", es: "Polis no encontrada" }), robots: { index: false } };
  const title = t({ en: `${city.name}, ${city.ownerName}'s polis`, es: `${city.name}, polis de ${city.ownerName}` });
  const description = t({
    en: `${city.name} is growing on ${city.islandName}, an island in the Aegean. Found yours next door in Thalassa, a browser strategy game.`,
    es: `${city.name} crece en ${city.islandName}, una isla del Egeo. Fundá la tuya al lado en Thalassa, estrategia por navegador.`,
  });
  return {
    title,
    description,
    alternates: { canonical: `/polis/${city.id}` },
    openGraph: { ...openGraphBase(lang), title, description, url: `/polis/${city.id}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** A shared polis: what a friend built, then one button to found yours next to it. */
export default function PolisPage({ params }: PageProps<"/[lang]/polis/[id]">) {
  return (
    <main className="relative isolate flex flex-1 flex-col">
      <Image src="/assets/scene-city.webp" alt="" fill preload sizes="100vw" className="-z-20 object-cover object-center opacity-60" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-sea-950/85 via-sea-950/70 to-sea-950" />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pt-3 sm:px-6 sm:pt-5">
        <Link
          href="/"
          className="-mx-2 inline-flex min-h-11 items-center rounded-lg px-2 font-display text-lg font-black tracking-[0.22em] text-gold [text-shadow:0_1px_0_var(--color-bronze-deep),0_2px_10px_rgb(6_26_48/0.9)]"
        >
          THALASSA
        </Link>
        <LanguageSwitch tone="dark" />
      </header>
      <Suspense fallback={<PolisSkeleton />}>
        <PolisContent params={params} />
      </Suspense>
      <footer className="mx-auto mt-auto w-full max-w-5xl px-4 pb-6 sm:px-6">
        <LegalLinks />
      </footer>
      <TrackClicks />
    </main>
  );
}

async function PolisContent({ params }: Pick<PageProps<"/[lang]/polis/[id]">, "params">) {
  const [{ id }, { lang, t }] = await Promise.all([params, getI18n()]);
  const city = await getPublicCity(id);
  if (!city) notFound();
  const resource = resourceLabel(city.resource, lang).toLowerCase();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-6 pb-10 sm:gap-6 sm:px-6 sm:pt-12">
      <TrackView event="polis_view" />
      <section className="flex animate-rise flex-col gap-2">
        <p className="font-display text-sm font-bold tracking-[0.3em] text-gold">
          {city.isCapital ? t({ en: "AEGEAN CAPITAL", es: "CAPITAL DEL EGEO" }) : t({ en: "AEGEAN COLONY", es: "COLONIA DEL EGEO" })}
        </p>
        <h1 className="font-display text-4xl leading-tight font-black text-marble [text-shadow:0_2px_12px_rgb(6_26_48/0.9)] sm:text-6xl">
          {city.name}
        </h1>
        <p className="text-lg text-foam sm:text-xl">
          {lang === "en" ? (
            <>
              <b>{city.ownerName}</b>&apos;s polis on {city.islandName}, a {resource} island.
            </>
          ) : (
            <>
              Polis de <b>{city.ownerName}</b> en {city.islandName}, isla de {resource}.
            </>
          )}
        </p>
        <Stats city={city} />
      </section>

      {city.topBuildings.length > 0 && (
        <section aria-labelledby="polis-buildings" className="flex flex-col gap-2.5">
          <h2 id="polis-buildings" className="font-display text-sm font-bold tracking-[0.3em] text-gold">
            {t({ en: "ALREADY BUILT", es: "LO QUE YA LEVANTÓ" })}
          </h2>
          <ul className="grid grid-cols-4 gap-2 sm:gap-3">
            {city.topBuildings.map((b, i) => (
              <li key={`${b.type}-${i}`} className="panel flex flex-col items-center gap-0.5 px-1 pt-2 pb-2 text-center sm:p-3">
                <span className="relative">
                  <Image src={`/assets/b-${b.type}.webp`} alt="" width={96} height={96} loading="eager" className="sprite size-14 sm:size-24" />
                  <span className="tabular absolute -right-1 bottom-0 grid size-6 place-items-center rounded-full bg-sea-900 text-xs font-bold text-foam ring-2 ring-parchment sm:size-7 sm:text-sm">
                    <span className="sr-only">{t({ en: "Level ", es: "Nivel " })}</span>
                    {b.level}
                  </span>
                </span>
                <span className="w-full truncate text-[13px] leading-tight font-bold text-ink sm:font-display sm:text-base">{buildingName(b.type, lang)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="polis-cta" className="panel-dark flex flex-col items-start gap-3 p-5 sm:p-6">
        <h2 id="polis-cta" className="font-display text-2xl leading-tight font-bold text-foam">
          {t({ en: "There's room on the next island.", es: "Hay lugar en la isla de al lado." })}
        </h2>
        <p className="text-[15px] text-foam/90">{t({ en: "Free, in your browser. No email, no password.", es: "Gratis, en el navegador. Sin mail ni contraseña." })}</p>
        <a href={`/r/${city.ownerCode}`} data-track="polis_cta_click" className={buttonClass("primary", "lg", "h-14 min-w-60 px-8 text-lg")}>
          {t({ en: "Found your polis", es: "Fundá tu polis" })}
        </a>
      </section>
    </div>
  );
}

async function Stats({ city }: { city: PublicCity }) {
  const { t, fmt, fmtDate } = await getI18n();
  const items = [
    { label: t({ en: "Points", es: "Puntos" }), value: fmt(city.score) },
    { label: t({ en: "Buildings", es: "Edificios" }), value: fmt(city.buildingCount) },
    { label: t({ en: "Founded", es: "Fundada" }), value: fmtDate(city.foundedAt, { month: "short", year: "numeric" }) },
  ];
  return (
    <dl className="mt-1 flex flex-wrap gap-2">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl bg-sea-950/70 px-3 py-1.5 ring-1 ring-sea-300/25 backdrop-blur">
          <dt className="text-[11px] font-bold tracking-wider text-sea-300 uppercase">{it.label}</dt>
          <dd className="font-display text-lg font-bold text-foam tabular-nums lining-nums">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PolisSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-6 sm:px-6 sm:pt-12" aria-busy>
      <div className="h-4 w-40 animate-pulse rounded bg-gold/30" />
      <div className="h-12 w-2/3 animate-pulse rounded-lg bg-foam/15" />
      <div className="h-5 w-1/2 animate-pulse rounded bg-foam/10" />
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-foam/10 sm:h-36" />
        ))}
      </div>
    </div>
  );
}
