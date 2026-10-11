import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { AmbrosiaShop } from "@/components/tesoro/ambrosia-shop";
import { Merchant } from "@/components/tesoro/merchant";
import { SECTION_NARROW } from "@/components/tesoro/section-ui";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { stagger } from "@/components/motion/reveal";
import { getI18n } from "@/i18n/server";
import { findCitizenPda, programAddress } from "@/lib/solana/program";
import { getGame } from "@/server/game-context";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t({ en: "Nectar", es: "Néctar" }) };
}

export default function TesoroPage() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [game, { t }] = await Promise.all([getGame(), getI18n()]);
  const { snapshot, city } = game;
  const player = snapshot.player;
  const citizenPda = programAddress() ? await findCitizenPda(player.wallet) : null;

  return (
    <GameShell game={game}>
      <div className={SECTION_NARROW}>
        <section
          aria-labelledby="nectar-title"
          className="panel-dark rise-in relative flex items-center gap-3 overflow-hidden px-3 py-2.5 sm:gap-4 sm:px-4"
        >
          <span aria-hidden className="pointer-events-none absolute -top-16 -left-10 size-56 rounded-full bg-ambrosia/25 blur-3xl" />
          <AmbrosiaVessel />
          <div className="relative min-w-0 flex-1 leading-none">
            <h1 id="nectar-title" className="font-display text-xs font-bold tracking-[0.25em] text-sea-300 uppercase">
              {t({ en: "Your Nectar", es: "Tu néctar" })}
            </h1>
            <p className="mt-1 font-display text-4xl font-black">
              <AnimatedNumber value={player.ambrosia} float className="text-shimmer-ambrosia" />
            </p>
          </div>
          <p className="relative hidden max-w-xs text-right text-sm leading-snug text-foam/80 sm:block">
            {t({ en: "Finish builds instantly or call the merchant.", es: "Terminá obras al instante o llamá al mercader." })}
          </p>
        </section>

        <div className="rise-in grid items-start gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" style={stagger(1, 90, 3, 60)}>
          {citizenPda ? (
            <AmbrosiaShop sessionWallet={player.wallet} citizenPda={citizenPda} />
          ) : (
            <section aria-labelledby="shop-closed-title" className="panel flex flex-col gap-2 p-4">
              <h2 id="shop-closed-title" className="font-display text-xl font-bold">
                {t({ en: "Buy Nectar", es: "Comprar néctar" })}
              </h2>
              <p className="rounded-xl border border-bronze/40 bg-parchment-2 px-3 py-2 text-[15px]">
                {t({ en: "The shop isn't open yet. The merchant is still trading.", es: "La tienda todavía no abrió. El mercader sigue atendiendo." })}
              </p>
            </section>
          )}
          <Merchant cityId={city.id} cityName={city.name} ambrosia={player.ambrosia} res={city.res} storage={city.rates.storage} />
        </div>
      </div>
    </GameShell>
  );
}

const MOTES = [
  { left: "22%", delay: "0s", size: 10 },
  { left: "62%", delay: "-1.1s", size: 8 },
  { left: "44%", delay: "-2.3s", size: 12 },
  { left: "76%", delay: "-3.2s", size: 7 },
];

/** The nectar vessel: a soft violet glow breathing behind it and sparks rising from the rim. */
function AmbrosiaVessel() {
  return (
    <span aria-hidden className="relative grid size-16 shrink-0 place-items-center">
      <span className="absolute inset-1 rounded-full bg-[radial-gradient(circle,rgb(215_184_255/0.65),rgb(155_93_229/0.25)_55%,transparent_72%)] motion-safe:animate-[vessel-glow_3.6s_var(--ease-in-out-sine)_infinite]" />
      <Image src="/assets/r-ambrosia.webp" alt="" width={64} height={64} loading="eager" className="sprite relative size-14 animate-float" />
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
