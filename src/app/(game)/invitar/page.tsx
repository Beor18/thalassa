import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { InviteLink } from "@/components/growth/invite-link";
import { stagger } from "@/components/motion/reveal";
import { HowItWorks, SECTION_NARROW } from "@/components/tesoro/section-ui";
import { ResIcon } from "@/components/ui/res";
import { SITE_URL } from "@/lib/site";
import { requirePlayerId } from "@/server/auth";
import { getGame } from "@/server/game-context";
import { referralCode } from "@/server/growth/referral-code";
import {
  REFERRAL_MAX_PER_DAY,
  REFERRAL_REWARD,
  REFERRAL_TOWN_HALL,
  getInviteesSettled,
  type InviteeView,
} from "@/server/growth/referrals";

export const metadata: Metadata = { title: "Invitar" };

export default function InvitePage() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  // Settle first so the néctar (ambrosia) in the header already includes any reward paid right now.
  const invitees = await getInviteesSettled(await requirePlayerId());
  const game = await getGame();
  const { snapshot, city } = game;
  const rewarded = invitees.filter((i) => i.rewarded).length;

  return (
    <GameShell game={game}>
      <div className={SECTION_NARROW}>
        <section aria-labelledby="invite-title" className="panel-dark rise-in relative flex flex-col gap-3 overflow-hidden p-3 sm:p-4">
          <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-ambrosia/20 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <Image src="/assets/u-ship.webp" alt="" width={64} height={64} loading="eager" className="sprite size-14 shrink-0 motion-safe:animate-float" />
            <div className="min-w-0">
              <h1 id="invite-title" className="font-display text-xl leading-tight font-bold text-foam sm:text-2xl">
                Invitá y ganan los dos
              </h1>
              <p className="mt-0.5 inline-flex flex-wrap items-center gap-x-1.5 text-[15px] text-foam/85">
                <span className="inline-flex items-center gap-1 font-bold text-ambrosia-soft">
                  <ResIcon kind="ambrosia" size={18} />+{REFERRAL_REWARD} de néctar
                </span>
                cada uno cuando llega a Intendencia {REFERRAL_TOWN_HALL}.
              </p>
            </div>
          </div>
          <div className="relative">
            <InviteLink path={`/r/${referralCode(snapshot.player.id)}`} fallbackOrigin={SITE_URL} tone="dark" />
          </div>
        </section>

        <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <section aria-labelledby="invitees-title" className="panel rise-in flex flex-col gap-2 p-3 sm:p-4" style={stagger(1, 80, 3, 40)}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="invitees-title" className="font-display text-lg font-bold">
                Tus invitados
              </h2>
              {invitees.length > 0 && (
                <span className="text-sm font-bold text-ink-soft tabular-nums" title={`${rewarded} de ${invitees.length} ya cobraron el premio`}>
                  {rewarded}/{invitees.length} con premio
                </span>
              )}
            </div>
            {invitees.length === 0 ? (
              <p className="rounded-xl border border-dashed border-parchment-3 px-3 py-3 text-sm text-ink-soft">
                Todavía nadie. El primero que funde su polis con tu link aparece acá.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {invitees.map((invitee) => (
                  <InviteeRow key={invitee.id} invitee={invitee} />
                ))}
              </ul>
            )}
          </section>

          <div className="rise-in flex flex-col gap-3" style={stagger(2, 80, 3, 40)}>
            <HowItWorks className="bg-parchment/90">
              <p>
                Vale para cuentas nuevas que entran con tu link en los próximos 30 días. El premio llega cuando tu invitado sube
                su Intendencia a nivel {REFERRAL_TOWN_HALL}.
              </p>
              <p>
                Hasta {REFERRAL_MAX_PER_DAY} premios por día. Si te pasás, el resto se acredita al día siguiente.
              </p>
            </HowItWorks>
            <Link
              href={`/polis/${city.id}`}
              className="panel-glass inline-flex min-h-11 items-center justify-between gap-2 px-3 text-sm font-bold text-foam hover:text-gold"
            >
              Mostrá {city.name} con su página pública
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </GameShell>
  );
}

function InviteeRow({ invitee }: { invitee: InviteeView }) {
  const level = Math.min(invitee.townHall, REFERRAL_TOWN_HALL);
  return (
    <li className="flex items-center gap-3 rounded-xl border border-parchment-3 bg-marble/60 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{invitee.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <div
            role="progressbar"
            aria-label={`Intendencia de ${invitee.name}`}
            aria-valuemin={0}
            aria-valuemax={REFERRAL_TOWN_HALL}
            aria-valuenow={level}
            className="h-2 flex-1 overflow-hidden rounded-full bg-parchment-3/60"
          >
            <div
              className={clsx("h-full rounded-full", invitee.rewarded ? "bg-success" : "bg-bronze")}
              style={{ width: `${(level / REFERRAL_TOWN_HALL) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-bold text-ink-soft tabular-nums" title="Nivel de Intendencia">
            {invitee.townHall}/{REFERRAL_TOWN_HALL}
          </span>
        </div>
      </div>
      <span
        className={clsx(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
          invitee.rewarded ? "bg-success text-marble" : "bg-parchment-2 text-ink-soft",
        )}
      >
        {invitee.rewarded ? (
          <>
            <ResIcon kind="ambrosia" size={14} />+{REFERRAL_REWARD}
          </>
        ) : (
          "En camino"
        )}
      </span>
    </li>
  );
}
