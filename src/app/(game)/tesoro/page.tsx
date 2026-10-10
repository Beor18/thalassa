import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { AmbrosiaShop } from "@/components/tesoro/ambrosia-shop";
import { Merchant } from "@/components/tesoro/merchant";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { stagger } from "@/components/motion/reveal";
import { findCitizenPda, programAddress } from "@/lib/solana/program";
import { getGame } from "@/server/game-context";

export const metadata: Metadata = { title: "Ambrosía" };

export default function TesoroPage() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const game = await getGame();
  const { snapshot, city } = game;
  const player = snapshot.player;
  const citizenPda = programAddress() ? await findCitizenPda(player.wallet) : null;

  return (
    <GameShell game={game}>
      <section className="panel-dark rise-in relative flex flex-col gap-3 overflow-hidden p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <span aria-hidden className="pointer-events-none absolute -top-16 -left-10 size-56 rounded-full bg-ambrosia/25 blur-3xl" />
        <AmbrosiaVessel />
        <div className="relative min-w-0 flex-1">
          <h1 className="font-display text-sm font-bold tracking-[0.25em] text-sea-300">Tu ambrosía</h1>
          <p className="font-display text-4xl font-black">
            <AnimatedNumber value={player.ambrosia} float className="text-shimmer-ambrosia" />
          </p>
          <p className="mt-1 max-w-2xl text-[15px] text-foam/90">
            La ambrosía se compra con SOL de prueba en la red de prueba de Solana. Sirve para terminar obras al
            instante y para llamar al mercader.
          </p>
        </div>
      </section>

      <div className="rise-in grid items-start gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" style={stagger(1, 90, 3, 60)}>
        {citizenPda ? (
          <AmbrosiaShop sessionWallet={player.wallet} citizenPda={citizenPda} />
        ) : (
          <section aria-labelledby="shop-closed-title" className="panel flex flex-col gap-2 p-4 sm:p-5">
            <h2 id="shop-closed-title" className="font-display text-xl font-bold">
              Comprar ambrosía
            </h2>
            <p className="rounded-xl border border-bronze/40 bg-parchment-2 px-3 py-2 text-[15px]">
              La tienda abre en cuanto el programa esté desplegado en la red de prueba. Mientras tanto, el mercader sigue
              atendiendo.
            </p>
          </section>
        )}
        <Merchant cityId={city.id} cityName={city.name} ambrosia={player.ambrosia} res={city.res} storage={city.rates.storage} />
      </div>
    </GameShell>
  );
}

const MOTES = [
  { left: "22%", delay: "0s", size: 12 },
  { left: "62%", delay: "-1.1s", size: 9 },
  { left: "44%", delay: "-2.3s", size: 14 },
  { left: "76%", delay: "-3.2s", size: 8 },
];

/** The nectar vessel: a soft violet glow breathing behind it and sparks rising from the rim. */
function AmbrosiaVessel() {
  return (
    <span aria-hidden className="relative grid size-20 shrink-0 place-items-center sm:size-24">
      <span className="absolute inset-2 rounded-full bg-[radial-gradient(circle,rgb(215_184_255/0.65),rgb(155_93_229/0.25)_55%,transparent_72%)] motion-safe:animate-[vessel-glow_3.6s_var(--ease-in-out-sine)_infinite]" />
      <Image
        src="/assets/r-ambrosia.webp"
        alt=""
        width={96}
        height={96}
        loading="eager"
        className="sprite relative size-16 animate-float sm:size-[76px]"
      />
      {MOTES.map((m, i) => (
        <Image
          key={i}
          src="/assets/fx/sparkle.webp"
          alt=""
          width={16}
          height={16}
          className="absolute top-[28%] opacity-0 motion-safe:animate-[mote-rise_3.4s_ease-out_infinite]"
          style={{ left: m.left, width: m.size, height: m.size, animationDelay: m.delay }}
        />
      ))}
    </span>
  );
}
