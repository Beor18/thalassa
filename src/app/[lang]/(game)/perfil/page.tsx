import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { IconCity, IconInvite, IconKey, IconLanguage, IconLeave, IconResearch, IconTrophy, IconWorld } from "@/components/game/icons";
import { stagger } from "@/components/motion/reveal";
import { AccountDevice } from "@/components/profile/account-device";
import { RenameForm } from "@/components/profile/rename-form";
import { SECTION_NARROW } from "@/components/tesoro/section-ui";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { ResIcon } from "@/components/ui/res";
import { TECH_IDS } from "@/game/data";
import { getI18n } from "@/i18n/server";
import { getGame } from "@/server/game-context";
import { getInvitees } from "@/server/growth/referrals";
import { getPlayerJoinedAt, getRanking } from "@/server/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t({ en: "Profile", es: "Perfil" }) };
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const game = await getGame();
  const { player } = game.snapshot;
  const [ranking, invitees, joinedAt, { t, fmt, fmtDate }] = await Promise.all([
    getRanking(),
    getInvitees(player.id),
    getPlayerJoinedAt(player.id),
    getI18n(),
  ]);
  const position = ranking.findIndex((r) => r.playerId === player.id);
  const mine = position >= 0 ? ranking[position] : null;
  const initial = player.name.trim().charAt(0).toUpperCase() || "?";
  const cities = [...game.snapshot.cities].sort((a, b) => Number(b.isCapital) - Number(a.isCapital));

  return (
    <GameShell game={game}>
      <div className={SECTION_NARROW}>
        <section aria-labelledby="profile-title" className="panel-dark rise-in relative flex flex-col gap-4 overflow-hidden p-3 sm:p-4">
          <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-b from-gold-light via-gold to-bronze font-display text-3xl font-black text-sea-950 shadow-[0_1px_0_rgb(255_255_255/0.5)_inset,0_6px_14px_-6px_rgb(0_0_0/0.7)] ring-1 ring-bronze-deep/40"
            >
              {initial}
            </span>
            <div className="min-w-0">
              <h1 id="profile-title" className="truncate font-display text-2xl leading-tight font-bold text-foam">
                {player.name}
              </h1>
              <p className="text-sm text-foam/80">
                {joinedAt &&
                  t({
                    en: `Archon since ${fmtDate(joinedAt, { day: "numeric", month: "long", year: "numeric" })}`,
                    es: `Arconte desde el ${fmtDate(joinedAt, { day: "numeric", month: "long", year: "numeric" })}`,
                  })}
              </p>
            </div>
          </div>
          <div className="relative max-w-xl">
            <p className="mb-1.5 text-sm font-bold text-sea-300">{t({ en: "Change your name", es: "Cambiá tu nombre" })}</p>
            <RenameForm currentName={player.name} />
          </div>
        </section>

        <section aria-label={t({ en: "Your numbers", es: "Tus números" })} className="rise-in grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" style={stagger(1, 80, 3, 40)}>
          <Stat
            icon={<IconTrophy className="size-5 text-bronze-dark" />}
            label={t({ en: "Rank", es: "Puesto" })}
            value={mine ? `${fmt(position + 1)}/${fmt(ranking.length)}` : "-"}
            href="/ranking"
          />
          <Stat icon={<IconTrophy className="size-5 text-bronze-dark" />} label={t({ en: "Points", es: "Puntos" })} value={fmt(mine?.score ?? 0)} />
          <Stat icon={<IconCity className="size-5 text-bronze-dark" />} label={t({ en: "Cities", es: "Ciudades" })} value={fmt(cities.length)} />
          <Stat
            icon={<IconResearch className="size-5 text-bronze-dark" />}
            label={t({ en: "Research", es: "Investigaciones" })}
            value={`${player.techs.length}/${TECH_IDS.length}`}
            href="/investigacion"
          />
          <Stat icon={<ResIcon kind="ambrosia" size={20} />} label={t({ en: "Nectar", es: "Néctar" })} value={fmt(player.ambrosia)} href="/tesoro" />
          <Stat icon={<IconInvite className="size-5 text-bronze-dark" />} label={t({ en: "Invited", es: "Invitados" })} value={fmt(invitees.length)} href="/invitar" />
        </section>

        <div className="grid items-start gap-3 md:grid-cols-2">
          <section aria-labelledby="cities-title" className="panel rise-in flex flex-col gap-2 p-3 sm:p-4" style={stagger(2, 80, 3, 40)}>
            <h2 id="cities-title" className="font-display text-lg font-bold">
              {t({ en: "Your cities", es: "Tus ciudades" })}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {cities.map((city) => (
                <li key={city.id} className="flex items-center gap-2 rounded-xl border border-parchment-3 bg-marble/60 py-1.5 pr-1.5 pl-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {city.name}
                      {city.isCapital && (
                        <span className="ml-1.5 rounded-full bg-gold/25 px-1.5 py-0.5 align-middle text-[11px] font-bold text-bronze-dark">
                          {t({ en: "Capital", es: "Capital" })}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-ink-soft">{city.island.name}</p>
                  </div>
                  <Link
                    href={`/polis/${city.id}`}
                    className="inline-flex min-h-10 items-center rounded-lg px-2.5 text-sm font-bold text-bronze-dark hover:bg-parchment-2"
                  >
                    {t({ en: "Public page", es: "Página pública" })}
                  </Link>
                  <Link
                    href={`/ciudad/${city.id}`}
                    className="inline-flex min-h-10 items-center rounded-lg bg-parchment-2 px-3 text-sm font-bold text-ink hover:bg-parchment-3"
                  >
                    {t({ en: "Open", es: "Entrar" })}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="settings-title" className="panel rise-in flex flex-col p-3 sm:p-4" style={stagger(3, 80, 3, 40)}>
            <h2 id="settings-title" className="mb-1 font-display text-lg font-bold">
              {t({ en: "Settings", es: "Configuración" })}
            </h2>
            <Row icon={<IconLanguage className="size-5 text-bronze-dark" />} title={t({ en: "Language", es: "Idioma" })}>
              <LanguageSwitch tone="light" />
            </Row>
            <Row icon={<IconKey className="size-5 text-bronze-dark" />} title={t({ en: "Your account", es: "Tu cuenta" })} stacked>
              <AccountDevice />
            </Row>
            <Row icon={<IconWorld className="size-5 text-bronze-dark" />} title={t({ en: "Test network", es: "Red de prueba" })} stacked>
              <p className="text-sm leading-snug text-ink-soft">
                {t({
                  en: `Time runs ${game.snapshot.speed} times faster and Nectar has no real value.`,
                  es: `El tiempo corre ${game.snapshot.speed} veces más rápido y el néctar no tiene valor real.`,
                })}
              </p>
            </Row>
            <Link
              href="/salir"
              prefetch={false}
              className="mt-1 flex min-h-11 items-center gap-2.5 rounded-lg border-t border-parchment-3/70 px-1 pt-1 font-bold text-ink transition-colors hover:text-danger"
            >
              <IconLeave className="size-5 text-bronze-dark" />
              {t({ en: "Log out", es: "Salir" })}
            </Link>
          </section>
        </div>
      </div>
    </GameShell>
  );
}

function Stat({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href?: string }) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-soft uppercase">
        {icon}
        {label}
      </span>
      <span className="font-display text-xl font-bold text-ink tabular-nums">{value}</span>
    </>
  );
  const box = "panel flex flex-col gap-1 px-3 py-2.5";
  return href ? (
    <Link href={href} className={clsx(box, "transition-colors hover:bg-parchment-2")}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

function Row({ icon, title, children, stacked = false }: { icon: ReactNode; title: string; children: ReactNode; stacked?: boolean }) {
  return (
    <div className={clsx("flex gap-2.5 border-t border-parchment-3/70 py-2.5 first-of-type:border-t-0", stacked ? "items-start" : "min-h-11 items-center")}>
      <span className={clsx(stacked && "pt-0.5")}>{icon}</span>
      {stacked ? (
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-bold text-ink">{title}</span>
          {children}
        </div>
      ) : (
        <>
          <span className="flex-1 font-bold text-ink">{title}</span>
          {children}
        </>
      )}
    </div>
  );
}
