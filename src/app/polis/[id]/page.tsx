import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { TrackClicks, TrackView } from "@/components/growth/track";
import { LegalLinks } from "@/components/growth/legal-links";
import { fmt } from "@/lib/format";
import { RESOURCE_LABEL, getPublicCity, type PublicCity } from "@/server/growth/public-city";

export async function generateMetadata({ params }: PageProps<"/polis/[id]">): Promise<Metadata> {
  const { id } = await params;
  const city = await getPublicCity(id);
  if (!city) return { title: "Polis no encontrada", robots: { index: false } };
  const title = `${city.name}, polis de ${city.ownerName}`;
  const description = `${city.name} crece en ${city.islandName}, una isla del Egeo. Fundá la tuya al lado en Thalassa, estrategia por navegador.`;
  return {
    title,
    description,
    alternates: { canonical: `/polis/${city.id}` },
    openGraph: { title, description, type: "website", url: `/polis/${city.id}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function PolisPage({ params }: PageProps<"/polis/[id]">) {
  return (
    <main className="relative isolate flex flex-1 flex-col">
      <Image
        src="/assets/scene-city.webp"
        alt=""
        fill
        sizes="100vw"
        className="-z-20 object-cover object-center opacity-60"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-sea-950/90 via-sea-950/70 to-sea-950" />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6">
        <Link href="/" className="font-display text-lg font-black tracking-[0.22em] text-gold drop-shadow">
          THALASSA
        </Link>
        <span className="rounded-full bg-sea-950/70 px-2.5 py-1 text-xs font-bold text-sea-300 ring-1 ring-sea-300/30 backdrop-blur">
          Red de prueba de Solana
        </span>
      </header>
      <Suspense fallback={<PolisSkeleton />}>
        <PolisContent params={params} />
      </Suspense>
      <footer className="mx-auto mt-auto w-full max-w-5xl px-4 pb-8 sm:px-6">
        <LegalLinks />
      </footer>
      <TrackClicks />
    </main>
  );
}

async function PolisContent({ params }: Pick<PageProps<"/polis/[id]">, "params">) {
  const { id } = await params;
  const city = await getPublicCity(id);
  if (!city) notFound();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-12 pb-12 sm:px-6 sm:pt-16">
      <TrackView event="polis_view" />
      <section className="flex flex-col gap-2">
        <p className="font-display text-sm font-bold tracking-[0.3em] text-gold">{city.isCapital ? "CAPITAL" : "COLONIA"} DEL EGEO</p>
        <h1 className="font-display text-4xl leading-tight font-black text-marble [text-shadow:0_2px_12px_rgb(6_26_48/0.9)] sm:text-6xl">
          {city.name}
        </h1>
        <p className="text-lg text-foam sm:text-xl">
          Polis de <b>{city.ownerName}</b> en {city.islandName}, isla de {RESOURCE_LABEL[city.resource]}.
        </p>
        <Stats city={city} />
      </section>

      {city.topBuildings.length > 0 && (
        <section aria-labelledby="polis-buildings" className="flex flex-col gap-3">
          <h2 id="polis-buildings" className="font-display text-sm font-bold tracking-[0.3em] text-gold">
            LO QUE YA LEVANTÓ
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {city.topBuildings.map((b) => (
              <li key={`${b.type}-${b.level}`} className="panel flex flex-col items-center gap-1 p-3 text-center">
                <Image src={`/assets/b-${b.type}.webp`} alt="" width={96} height={96} className="sprite size-20 sm:size-24" />
                <span className="font-display font-bold">{b.name}</span>
                <span className="text-sm text-ink-soft tabular-nums">Nivel {b.level}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel-dark flex flex-col items-start gap-3 p-5 sm:p-6">
        <h2 className="font-display text-2xl font-bold text-foam">Hay lugar en la isla de al lado.</h2>
        <p className="max-w-xl text-[15px] text-foam/90">
          Se juega en el navegador, sin instalar nada y sin plata real: todo pasa en la red de prueba.
        </p>
        <a
          href={`/r/${city.ownerCode}`}
          data-track="polis_cta_click"
          className={buttonClass("primary", "lg", "h-14 min-w-60 px-8 text-lg")}
        >
          Fundá tu polis
        </a>
      </section>
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" });

function Stats({ city }: { city: PublicCity }) {
  const items = [
    { label: "Puntos", value: fmt(city.score) },
    { label: "Edificios", value: fmt(city.buildingCount) },
    { label: "Fundada", value: dateFmt.format(new Date(city.foundedAt)) },
  ];
  return (
    <dl className="mt-2 flex flex-wrap gap-2">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl bg-sea-950/70 px-3 py-2 ring-1 ring-sea-300/25 backdrop-blur">
          <dt className="text-xs font-bold tracking-wider text-sea-300 uppercase">{it.label}</dt>
          <dd className="font-display text-lg font-bold text-foam tabular-nums lining-nums">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PolisSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-12 sm:px-6 sm:pt-16" aria-busy>
      <div className="h-4 w-40 animate-pulse rounded bg-gold/30" />
      <div className="h-12 w-2/3 animate-pulse rounded-lg bg-foam/15" />
      <div className="h-5 w-1/2 animate-pulse rounded bg-foam/10" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-foam/10" />
        ))}
      </div>
    </div>
  );
}
