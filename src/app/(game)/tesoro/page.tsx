import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { AmbrosiaShop } from "@/components/tesoro/ambrosia-shop";
import { Merchant } from "@/components/tesoro/merchant";
import { fmt } from "@/lib/format";
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
      <section className="panel-dark flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <Image src="/assets/r-ambrosia.webp" alt="" width={72} height={72} className="sprite size-16 shrink-0 animate-float sm:size-[72px]" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-sm font-bold tracking-[0.25em] text-sea-300">TU AMBROSÍA</h1>
          <p className="font-display text-4xl font-black text-[#d7b8ff] tabular-nums lining-nums">{fmt(player.ambrosia)}</p>
          <p className="mt-1 max-w-2xl text-[15px] text-foam/90">
            La ambrosía se compra con SOL de prueba en la red de prueba de Solana (devnet). Sirve para terminar obras al
            instante y para llamar al mercader.
          </p>
        </div>
      </section>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
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
