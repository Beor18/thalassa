import { Suspense } from "react";
import type { Metadata } from "next";
import clsx from "clsx";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { RenameForm } from "@/components/ranking/rename-form";
import { fmt } from "@/lib/format";
import { getGame } from "@/server/game-context";
import { getRanking, type RankingRow } from "@/server/queries";

export const metadata: Metadata = { title: "Ranking" };

const TOP = 100;
const MEDAL = ["bg-gold text-ink", "bg-[#cfd6dd] text-ink", "bg-[#c98a4b] text-ink"] as const;

export default function RankingPage() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [game, ranking] = await Promise.all([getGame(), getRanking()]);
  const me = game.snapshot.player.id;
  const myIndex = ranking.findIndex((r) => r.playerId === me);
  const shown = ranking.slice(0, TOP).map((row, i) => ({ row, position: i + 1 }));
  if (myIndex >= TOP) shown.push({ row: ranking[myIndex], position: myIndex + 1 });

  return (
    <GameShell game={game}>
      <section className="panel-dark flex flex-col gap-1 p-4 sm:p-5">
        <h1 className="font-display text-2xl font-bold text-foam sm:text-3xl">Ranking del Egeo</h1>
        <p className="text-[15px] text-foam/85">
          {myIndex >= 0 ? (
            <>
              Vas <b className="tabular-nums lining-nums text-gold">{myIndex + 1}º</b> de {fmt(ranking.length)} arcontes.
            </>
          ) : (
            <>Todavía no figurás en el ranking.</>
          )}{" "}
          Los puntos suman edificios, una parte del poder militar e investigación.
        </p>
      </section>

      <section aria-label="Tu nombre" className="panel p-4 sm:p-5">
        <RenameForm currentName={game.snapshot.player.name} />
      </section>

      <section aria-labelledby="ranking-table-title" className="panel overflow-hidden">
        <h2 id="ranking-table-title" className="sr-only">
          Tabla de posiciones
        </h2>
        {shown.length === 0 ? (
          <p className="p-5 text-ink-soft">Todavía no hay arcontes en el Egeo.</p>
        ) : (
          <table className="w-full border-collapse text-left text-[15px]">
            <thead className="border-b border-parchment-3 bg-parchment-2/70 font-display text-xs tracking-wider text-ink-soft uppercase">
              <tr>
                <th scope="col" className="w-14 py-2.5 pl-3 sm:pl-4">
                  <span className="sr-only">Posición</span>
                  <span aria-hidden>#</span>
                </th>
                <th scope="col" className="py-2.5 pr-2">Arconte</th>
                <th scope="col" className="hidden py-2.5 pr-3 text-right md:table-cell">Ciudades</th>
                <th scope="col" className="hidden py-2.5 pr-3 text-right md:table-cell">Edificios</th>
                <th scope="col" className="hidden py-2.5 pr-3 text-right md:table-cell">Poder militar</th>
                <th scope="col" className="hidden py-2.5 pr-3 text-right md:table-cell">Investigación</th>
                <th scope="col" className="py-2.5 pr-3 text-right sm:pr-4">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ row, position }, i) => (
                <Row
                  key={row.playerId}
                  row={row}
                  position={position}
                  mine={row.playerId === me}
                  gapBefore={i > 0 && position !== shown[i - 1].position + 1}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </GameShell>
  );
}

function Row({ row, position, mine, gapBefore }: { row: RankingRow; position: number; mine: boolean; gapBefore: boolean }) {
  return (
    <tr
      aria-current={mine ? "true" : undefined}
      className={clsx(
        "border-b border-parchment-3/70 last:border-b-0",
        mine ? "bg-gold/25 shadow-[inset_4px_0_0_var(--color-bronze)]" : "odd:bg-marble/30",
        gapBefore && "border-t-4 border-t-parchment-3",
      )}
    >
      <td className="py-2.5 pl-3 align-top sm:pl-4">
        <span
          className={clsx(
            "inline-grid min-w-8 place-items-center rounded-full px-1.5 py-0.5 text-sm font-bold tabular-nums lining-nums",
            position <= 3 ? MEDAL[position - 1] : "text-ink-soft",
          )}
        >
          {position}
        </span>
      </td>
      <td className="py-2.5 pr-2 align-top">
        <span className="font-bold break-words">{row.name}</span>
        {mine && <span className="ml-1.5 rounded-full bg-bronze px-1.5 py-0.5 text-xs font-bold text-marble">vos</span>}
        <span className="block text-xs text-ink-soft tabular-nums lining-nums md:hidden">
          {row.cities} {row.cities === 1 ? "ciudad" : "ciudades"} · {fmt(row.buildings)} edif. · {fmt(row.military)} mil. ·{" "}
          {fmt(row.research)} inv.
        </span>
      </td>
      <td className="hidden py-2.5 pr-3 text-right align-top tabular-nums lining-nums md:table-cell">{fmt(row.cities)}</td>
      <td className="hidden py-2.5 pr-3 text-right align-top tabular-nums lining-nums md:table-cell">{fmt(row.buildings)}</td>
      <td className="hidden py-2.5 pr-3 text-right align-top tabular-nums lining-nums md:table-cell">{fmt(row.military)}</td>
      <td className="hidden py-2.5 pr-3 text-right align-top tabular-nums lining-nums md:table-cell">{fmt(row.research)}</td>
      <td className="py-2.5 pr-3 text-right align-top font-display font-bold tabular-nums lining-nums sm:pr-4">{fmt(row.score)}</td>
    </tr>
  );
}
