import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { InviteLink } from "@/components/growth/invite-link";
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
      <section className="panel-dark flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <Image src="/assets/u-ship.webp" alt="" width={88} height={88} className="sprite size-16 shrink-0 sm:size-[88px]" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-foam sm:text-3xl">El Egeo se juega con vecinos</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-foam/90">
            Cuando tu invitado llega a Intendencia {REFERRAL_TOWN_HALL}, los dos suman{" "}
            <b className="text-[#d7b8ff]">{REFERRAL_REWARD} de néctar</b>.
          </p>
        </div>
      </section>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section aria-labelledby="invite-link-title" className="panel flex flex-col gap-3 p-4 sm:p-5">
          <h2 id="invite-link-title" className="font-display text-xl font-bold">
            Mandale tu link a quien extrañe estas tardes
          </h2>
          <InviteLink path={`/r/${referralCode(snapshot.player.id)}`} fallbackOrigin={SITE_URL} />
          <p className="text-sm text-ink-soft">
            Vale para cuentas nuevas que entran con tu link en los próximos 30 días. Hasta {REFERRAL_MAX_PER_DAY} premios por
            día; si te pasás, el resto se acredita al día siguiente.
          </p>
          <p className="border-t border-parchment-3 pt-3 text-sm text-ink-soft">
            Tu polis también tiene página pública para mostrar.{" "}
            <Link href={`/polis/${city.id}`} className="font-bold text-bronze-dark underline underline-offset-4 hover:text-ink">
              Ver {city.name}
            </Link>
          </p>
        </section>

        <section aria-labelledby="invitees-title" className="panel flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="invitees-title" className="font-display text-xl font-bold">
              Tus invitados
            </h2>
            {invitees.length > 0 && (
              <span className="text-sm font-bold text-ink-soft tabular-nums">
                {rewarded} de {invitees.length} con premio
              </span>
            )}
          </div>
          {invitees.length === 0 ? (
            <p className="rounded-xl border border-parchment-3 bg-marble/60 px-3 py-3 text-[15px] text-ink-soft">
              Todavía no entró nadie con tu link. El primero que funde su polis aparece acá.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {invitees.map((invitee) => (
                <InviteeRow key={invitee.id} invitee={invitee} />
              ))}
            </ul>
          )}
        </section>
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
          <span className="shrink-0 text-xs font-bold text-ink-soft tabular-nums">
            Intendencia {invitee.townHall}/{REFERRAL_TOWN_HALL}
          </span>
        </div>
      </div>
      <span
        className={clsx(
          "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
          invitee.rewarded ? "bg-success text-marble" : "bg-parchment-2 text-ink-soft",
        )}
      >
        {invitee.rewarded ? `+${REFERRAL_REWARD} cobrado` : "En camino"}
      </span>
    </li>
  );
}
