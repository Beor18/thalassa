import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { getGame } from "@/server/game-context";
import { getReports } from "@/server/queries";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { buttonClass } from "@/components/ui/button";
import { IconScroll } from "@/components/island/icons";
import { MarkReportsRead, ReportList, UnreadSummary } from "@/components/reports/client";
import { ReportCard, type ReportRow } from "@/components/reports/report-card";
import { SECTION_NARROW } from "@/components/tesoro/section-ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t({ en: "Reports", es: "Informes" }) };
}

export default function Page() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}

async function ReportsContent() {
  const [game, { t, lang }] = await Promise.all([getGame(), getI18n()]);
  const { snapshot, city } = game;
  const reports = (await getReports(snapshot.player.id)) as ReportRow[];
  const latestUnread = reports.find((r) => !r.read)?.id ?? null;
  const unread = reports.filter((r) => !r.read).length;

  return (
    <GameShell game={game}>
      <MarkReportsRead latestUnreadId={latestUnread} />
      <div className={SECTION_NARROW}>
        <header className="panel-dark rise-in flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-parchment text-bronze-dark ring-1 ring-gold/50">
            <IconScroll size={20} />
          </span>
          <h1 className="flex-1 font-display text-xl font-bold text-foam sm:text-2xl">{t({ en: "Reports", es: "Informes" })}</h1>
          <UnreadSummary unread={unread} total={reports.length} />
        </header>

        {reports.length === 0 ? (
          <div className="panel rise-in flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-left">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-parchment-2 text-bronze-dark ring-1 ring-parchment-3 motion-safe:animate-float">
              <IconScroll size={24} />
            </span>
            <div className="flex-1">
              <p className="font-display text-lg font-bold">{t({ en: "No reports yet", es: "Sin informes todavía" })}</p>
              <p className="text-sm text-ink-soft">
                {t({ en: "Battles, shipments and colonies show up here.", es: "Batallas, envíos y colonias aparecen acá." })}
              </p>
            </div>
            <Link href={`/isla/${city.islandId}?panel=camp`} className={buttonClass("primary", "md")}>
              {t({ en: "Go to the barbarian camp", es: "Ir al campamento bárbaro" })}
            </Link>
          </div>
        ) : (
          <ReportList
            items={reports.map((r, i) => ({ id: r.id, unread: !r.read, node: <ReportCard report={r} now={snapshot.now} index={i} lang={lang} /> }))}
          />
        )}
      </div>
    </GameShell>
  );
}
