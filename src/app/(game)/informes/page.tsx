import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getGame } from "@/server/game-context";
import { getReports } from "@/server/queries";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { buttonClass } from "@/components/ui/button";
import { IconScroll } from "@/components/island/icons";
import { MarkReportsRead, UnreadSummary } from "@/components/reports/client";
import { ReportCard, type ReportRow } from "@/components/reports/report-card";

export const metadata: Metadata = { title: "Informes" };

export default function Page() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}

async function ReportsContent() {
  const game = await getGame();
  const { snapshot, city } = game;
  const reports = (await getReports(snapshot.player.id)) as ReportRow[];
  const latestUnread = reports.find((r) => !r.read)?.id ?? null;
  const unread = reports.filter((r) => !r.read).length;

  return (
    <GameShell game={game}>
      <MarkReportsRead latestUnreadId={latestUnread} />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <div className="rise-in flex flex-col gap-0.5">
          <h1 className="font-display text-2xl font-bold text-foam drop-shadow sm:text-3xl">Informes</h1>
          <UnreadSummary unread={unread} total={reports.length} />
        </div>

        {reports.length === 0 ? (
          <div className="panel rise-in flex flex-col items-center gap-3 p-8 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-parchment-2 text-bronze-dark ring-1 ring-parchment-3 motion-safe:animate-float">
              <IconScroll size={26} />
            </span>
            <div>
              <p className="font-display text-xl font-bold">Todavía no hay informes</p>
              <p className="text-ink-soft">Cuando tus barcos lleguen a destino o alguien te ataque, te contamos acá qué pasó.</p>
            </div>
            <Link href={`/isla/${city.islandId}?panel=camp`} className={buttonClass("primary", "md")}>
              Ver el campamento bárbaro
            </Link>
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {reports.map((r, i) => (
              <li key={r.id}>
                <ReportCard report={r} now={snapshot.now} index={i} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </GameShell>
  );
}
