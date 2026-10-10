import { Suspense } from "react";
import type { Metadata } from "next";
import clsx from "clsx";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { LaurelIcon } from "@/components/game/icons";
import { stagger } from "@/components/motion/reveal";
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
      <section className="panel-dark rise-in flex flex-col gap-1 p-4 sm:p-5">
        <h1 className="font-display text-2xl font-bold text-foam sm:text-3xl">Ranking del Egeo</h1>
        <p className="text-[15px] text-foam/85">
          {myIndex >= 0 ? (
            <>
              Vas <b className="text-gold tabular">{myIndex + 1}º</b> de {fmt(ranking.length)}{" "}
              {ranking.length === 1 ? "arconte" : "arcontes"}.
            </>
          ) : (
            <>Todavía no figurás en el ranking.</>
          )}{" "}
          Los puntos suman edificios, una parte del poder militar e investigación.
        </p>
      </section>

      {ranking.length > 0 && <Podium rows={ranking.slice(0, 3)} me={me} />}

      <section aria-label="Tu nombre" className="panel rise-in p-4 sm:p-5" style={stagger(1, 80, 4, 120)}>
        <RenameForm currentName={game.snapshot.player.name} />
      </section>

      <section aria-labelledby="ranking-table-title" className="panel rise-in overflow-hidden" style={stagger(2, 80, 4, 120)}>
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
                  index={i}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </GameShell>
  );
}

function Row({ row, position, mine, gapBefore, index }: { row: RankingRow; position: number; mine: boolean; gapBefore: boolean; index: number }) {
  return (
    <tr
      aria-current={mine ? "true" : undefined}
      className={clsx(
        "rise-in border-b border-parchment-3/70 transition-colors last:border-b-0 hover:bg-parchment-2/60",
        mine ? "bg-gold/25 shadow-[inset_4px_0_0_var(--color-bronze)]" : "odd:bg-marble/30",
        gapBefore && "border-t-4 border-t-parchment-3",
      )}
      style={stagger(index, 35, 12, 320)}
    >
      <td className="py-2.5 pl-3 align-top sm:pl-4">
        <span
          className={clsx(
            "inline-grid min-w-8 place-items-center rounded-full px-1.5 py-0.5 text-sm font-bold tabular",
            position <= 3 ? MEDAL[position - 1] : "text-ink-soft",
          )}
        >
          {position}
        </span>
      </td>
      <td className="py-2.5 pr-2 align-top">
        <span className="font-bold break-words">{row.name}</span>
        {mine && <span className="ml-1.5 rounded-full bg-bronze px-1.5 py-0.5 text-xs font-bold text-marble">vos</span>}
        <span className="block text-xs text-ink-soft tabular md:hidden">
          {row.cities} {row.cities === 1 ? "ciudad" : "ciudades"} · {fmt(row.buildings)} edif. · {fmt(row.military)} mil. ·{" "}
          {fmt(row.research)} inv.
        </span>
      </td>
      <td className="hidden py-2.5 pr-3 text-right align-top tabular md:table-cell">{fmt(row.cities)}</td>
      <td className="hidden py-2.5 pr-3 text-right align-top tabular md:table-cell">{fmt(row.buildings)}</td>
      <td className="hidden py-2.5 pr-3 text-right align-top tabular md:table-cell">{fmt(row.military)}</td>
      <td className="hidden py-2.5 pr-3 text-right align-top tabular md:table-cell">{fmt(row.research)}</td>
      <td className="py-2.5 pr-3 text-right align-top font-display font-bold tabular sm:pr-4">{fmt(row.score)}</td>
    </tr>
  );
}

const PODIUM = [
  { place: 2, height: "h-20 sm:h-24", medal: "from-[#eef2f5] to-[#aeb8c2] text-ink", order: "order-1" },
  { place: 1, height: "h-28 sm:h-32", medal: "from-gold-light to-gold text-ink", order: "order-2" },
  { place: 3, height: "h-14 sm:h-16", medal: "from-[#e3a66a] to-[#a8652d] text-ink", order: "order-3" },
] as const;

/** The three best arcontes on marble pedestals; the champion gets the laurel. */
function Podium({ rows, me }: { rows: RankingRow[]; me: string }) {
  return (
    <section aria-label="Podio" className="panel-dark relative overflow-hidden px-3 pt-4 sm:px-6">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-2/3 rounded-full bg-gold/15 blur-3xl" />
      <ol className="relative mx-auto grid max-w-2xl grid-cols-3 items-end gap-2 sm:gap-4">
        {PODIUM.map(({ place, height, medal, order }, i) => {
          const row = rows[place - 1];
          if (!row) return <li key={place} aria-hidden className={order} />;
          const mine = row.playerId === me;
          return (
            <li key={place} className={clsx("flex min-w-0 flex-col items-center", order)}>
              <div className="pop-in flex min-w-0 flex-col items-center gap-1 pb-2 text-center" style={stagger(i, 160, 3, 500)}>
                <span className="relative grid place-items-center">
                  {place === 1 && <LaurelIcon className="absolute -top-3 w-20 text-gold drop-shadow-[0_2px_6px_rgb(227_179_65/0.5)] sm:w-24" />}
                  <span
                    className={clsx(
                      "relative grid size-11 place-items-center rounded-full bg-gradient-to-b font-display text-lg font-black shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_4px_10px_-4px_rgb(0_0_0/0.6)] sm:size-12",
                      medal,
                      place === 1 && "shine",
                    )}
                  >
                    {place}
                    <span className="sr-only">º puesto</span>
                  </span>
                </span>
                <span className={clsx("mt-1 w-full truncate font-display text-sm font-bold sm:text-base", mine ? "text-gold" : "text-foam")}>
                  {row.name}
                </span>
                <span className="text-xs font-bold text-foam/75 tabular sm:text-sm">{fmt(row.score)} puntos</span>
              </div>
              <div
                aria-hidden
                className={clsx(
                  "grow-up w-full rounded-t-lg border border-b-0 border-parchment-3/80 bg-gradient-to-b from-marble via-parchment to-parchment-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.8)]",
                  height,
                )}
                style={stagger(i, 120, 3, 200)}
              >
                <span className="mx-auto mt-2 block h-1 w-2/3 rounded-full bg-parchment-3/70" />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
