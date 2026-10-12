import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { LaurelIcon } from "@/components/game/icons";
import { stagger } from "@/components/motion/reveal";
import { HowItWorks, SECTION_NARROW } from "@/components/tesoro/section-ui";
import type { Locale } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { getGame } from "@/server/game-context";
import { getRanking, type RankingRow } from "@/server/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t({ en: "Rankings", es: "Ranking" }) };
}

const TOP = 100;
const MEDAL = ["bg-gold text-ink", "bg-[#cfd6dd] text-ink", "bg-[#c98a4b] text-ink"] as const;

export default function RankingPage() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <Content />
    </Suspense>
  );
}

/** "1st", "2nd", "23rd" in English; "1º" in Spanish. */
function ordinal(n: number, lang: Locale) {
  if (lang === "es") return `${n}º`;
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

async function Content() {
  const [game, ranking, { t, lang, fmt }] = await Promise.all([getGame(), getRanking(), getI18n()]);
  const points = (n: number) =>
    Math.floor(n) === 1 ? t({ en: "1 point", es: "1 punto" }) : t({ en: `${fmt(n)} points`, es: `${fmt(n)} puntos` });
  const me = game.snapshot.player.id;
  const myIndex = ranking.findIndex((r) => r.playerId === me);
  const mine = myIndex >= 0 ? ranking[myIndex] : null;
  const shown = ranking.slice(0, TOP).map((row, i) => ({ row, position: i + 1 }));
  if (myIndex >= TOP) shown.push({ row: ranking[myIndex], position: myIndex + 1 });

  // The race that matters: how far the next place is (or how far ahead the leader is).
  const ahead = myIndex > 0 ? ranking[myIndex - 1] : null;
  const behind = myIndex === 0 ? (ranking[1] ?? null) : null;
  const race = !mine
    ? null
    : ahead
      ? ahead.score - mine.score < 1
        ? t({ en: `Tied with ${ahead.name}`, es: `Empatás con ${ahead.name}` })
        : t({
            en: `${points(Math.ceil(ahead.score - mine.score))} to reach ${ordinal(myIndex, lang)}`,
            es: `Te faltan ${points(Math.ceil(ahead.score - mine.score))} para el ${ordinal(myIndex, lang)}`,
          })
      : behind
        ? t({
            en: `${points(Math.floor(mine.score - behind.score))} ahead of ${behind.name}`,
            es: `Le sacás ${points(Math.floor(mine.score - behind.score))} a ${behind.name}`,
          })
        : t({ en: "You're the only archon in the Aegean", es: "Sos el único arconte del Egeo" });

  return (
    <GameShell game={game}>
      <div className={SECTION_NARROW}>
        <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section aria-labelledby="ranking-title" className="panel-dark rise-in relative flex flex-col gap-3 overflow-hidden p-3 sm:p-4">
            <span aria-hidden className="pointer-events-none absolute -top-16 -left-12 size-52 rounded-full bg-gold/15 blur-3xl" />
            <h1 id="ranking-title" className="relative font-display text-xs font-bold tracking-[0.25em] text-sea-300 uppercase">
              {t({ en: "Aegean rankings", es: "Ranking del Egeo" })}
            </h1>
            {mine ? (
              <div className="relative flex items-center gap-3">
                <span
                  className={clsx(
                    "relative grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-b font-display text-2xl font-black shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_6px_14px_-6px_rgb(0_0_0/0.7)]",
                    myIndex < 3 ? ["from-gold-light to-gold", "from-[#eef2f5] to-[#aeb8c2]", "from-[#e3a66a] to-[#a8652d]"][myIndex] : "from-parchment to-parchment-3",
                    "text-ink",
                    myIndex === 0 && "shine",
                  )}
                >
                  {ordinal(myIndex + 1, lang)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-xl leading-tight font-bold text-gold">{mine.name}</p>
                  <p className="text-sm text-foam/80 tabular">
                    <b className="text-foam">{points(mine.score)}</b> ·{" "}
                    {ranking.length === 1
                      ? t({ en: "of 1 archon", es: "de 1 arconte" })
                      : t({ en: `of ${fmt(ranking.length)} archons`, es: `de ${fmt(ranking.length)} arcontes` })}
                  </p>
                  {race && <p className="mt-0.5 text-sm font-bold text-sea-300">{race}</p>}
                </div>
              </div>
            ) : (
              <p className="relative text-foam/85">{t({ en: "You're not on the board yet.", es: "Todavía no figurás en el ranking." })}</p>
            )}
            <Link
              href="/perfil"
              className="relative mt-auto inline-flex min-h-10 items-center gap-1.5 self-start rounded-lg text-sm font-bold text-sea-300 hover:text-foam"
            >
              <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.5 2.5l3 3L6 13H3v-3z" />
              </svg>
              {t({ en: "Change name", es: "Cambiar nombre" })}
            </Link>
          </section>

          {ranking.length > 0 && <Podium rows={ranking.slice(0, 3)} me={me} lang={lang} />}
        </div>

        <section aria-labelledby="ranking-table-title" className="panel rise-in overflow-hidden" style={stagger(2, 80, 4, 120)}>
          <h2 id="ranking-table-title" className="sr-only">
            {t({ en: "Standings", es: "Tabla de posiciones" })}
          </h2>
          {shown.length === 0 ? (
            <p className="p-5 text-ink-soft">{t({ en: "No archons in the Aegean yet.", es: "Todavía no hay arcontes en el Egeo." })}</p>
          ) : (
            <table className="w-full border-collapse text-left text-[15px]">
              <thead className="border-b border-parchment-3 bg-parchment-2/70 font-display text-xs tracking-wider text-ink-soft uppercase">
                <tr>
                  <th scope="col" className="w-14 py-2 pl-3 sm:pl-4">
                    <span className="sr-only">{t({ en: "Rank", es: "Posición" })}</span>
                    <span aria-hidden>#</span>
                  </th>
                  <th scope="col" className="py-2 pr-2">
                    {t({ en: "Archon", es: "Arconte" })}
                  </th>
                  <th scope="col" className="hidden py-2 pr-3 text-right md:table-cell">
                    {t({ en: "Cities", es: "Ciudades" })}
                  </th>
                  <th scope="col" className="hidden py-2 pr-3 text-right md:table-cell">
                    {t({ en: "Buildings", es: "Edificios" })}
                  </th>
                  <th scope="col" className="hidden py-2 pr-3 text-right md:table-cell">
                    {t({ en: "Military", es: "Militar" })}
                  </th>
                  <th scope="col" className="hidden py-2 pr-3 text-right md:table-cell">
                    {t({ en: "Science", es: "Ciencia" })}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right sm:pr-4">
                    {t({ en: "Points", es: "Puntos" })}
                  </th>
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

        <HowItWorks className="rise-in bg-parchment/90 sm:self-start" title={t({ en: "How are points counted?", es: "¿Cómo se calculan los puntos?" })}>
          <ul className="flex flex-col gap-1">
            <li>
              <b className="text-ink">{t({ en: "Buildings:", es: "Edificios:" })}</b>{" "}
              {t({ en: "10 per level built, plus 1 per citizen.", es: "10 por cada nivel construido, más 1 por habitante." })}
            </li>
            <li>
              <b className="text-ink">{t({ en: "Military:", es: "Militar:" })}</b>{" "}
              {t({ en: "a quarter of the power of your troops at home.", es: "un cuarto del poder de tus tropas en casa." })}
            </li>
            <li>
              <b className="text-ink">{t({ en: "Science:", es: "Ciencia:" })}</b>{" "}
              {t({ en: "40 per research.", es: "40 por cada investigación." })}
            </li>
          </ul>
        </HowItWorks>
      </div>
    </GameShell>
  );
}

async function Row({ row, position, mine, gapBefore, index }: { row: RankingRow; position: number; mine: boolean; gapBefore: boolean; index: number }) {
  const { t, fmt } = await getI18n();
  return (
    <tr
      id={mine ? "ranking-me" : undefined}
      aria-current={mine ? "true" : undefined}
      className={clsx(
        "rise-in border-b border-parchment-3/70 transition-colors last:border-b-0 hover:bg-parchment-2/60",
        mine ? "bg-gold/25 shadow-[inset_4px_0_0_var(--color-bronze)]" : "odd:bg-marble/30",
        gapBefore && "border-t-4 border-t-parchment-3",
      )}
      style={stagger(index, 35, 12, 320)}
    >
      <td className="py-2 pl-3 align-middle sm:pl-4">
        <span
          className={clsx(
            "inline-grid min-w-8 place-items-center rounded-full px-1.5 py-0.5 text-sm font-bold tabular",
            position <= 3 ? MEDAL[position - 1] : "text-ink-soft",
          )}
        >
          {position}
        </span>
      </td>
      <td className="py-2 pr-2 align-middle">
        <span className="font-bold break-words">{row.name}</span>
        {mine && <span className="ml-1.5 rounded-full bg-bronze px-1.5 py-0.5 text-xs font-bold text-marble">{t({ en: "you", es: "vos" })}</span>}
        <span className={clsx("text-xs text-ink-soft tabular md:hidden", mine ? "block" : "hidden")}>
          {row.cities === 1 ? t({ en: "1 city", es: "1 ciudad" }) : t({ en: `${fmt(row.cities)} cities`, es: `${fmt(row.cities)} ciudades` })} ·{" "}
          {t({
            en: `${fmt(row.buildings)} bldg. · ${fmt(row.military)} mil. · ${fmt(row.research)} sci.`,
            es: `${fmt(row.buildings)} edif. · ${fmt(row.military)} mil. · ${fmt(row.research)} cien.`,
          })}
        </span>
      </td>
      <td className="hidden py-2 pr-3 text-right align-middle tabular md:table-cell">{fmt(row.cities)}</td>
      <td className="hidden py-2 pr-3 text-right align-middle tabular md:table-cell">{fmt(row.buildings)}</td>
      <td className="hidden py-2 pr-3 text-right align-middle tabular md:table-cell">{fmt(row.military)}</td>
      <td className="hidden py-2 pr-3 text-right align-middle tabular md:table-cell">{fmt(row.research)}</td>
      <td className="py-2 pr-3 text-right align-middle font-display font-bold tabular sm:pr-4">{fmt(row.score)}</td>
    </tr>
  );
}

const PODIUM = [
  { place: 2, height: "h-12 sm:h-16", medal: "from-[#eef2f5] to-[#aeb8c2] text-ink", order: "order-1" },
  { place: 1, height: "h-20 sm:h-24", medal: "from-gold-light to-gold text-ink", order: "order-2" },
  { place: 3, height: "h-8 sm:h-10", medal: "from-[#e3a66a] to-[#a8652d] text-ink", order: "order-3" },
] as const;

/** The three best arcontes on marble pedestals; the champion gets the laurel. */
async function Podium({ rows, me, lang }: { rows: RankingRow[]; me: string; lang: Locale }) {
  const { t, fmt } = await getI18n();
  return (
    // Phones skip the podium: the table right below already crowns the top three.
    <section
      aria-label={t({ en: "Podium", es: "Podio" })}
      className="panel-dark rise-in relative hidden flex-col justify-end overflow-hidden px-3 pt-5 sm:flex sm:px-6"
      style={stagger(1, 80, 4, 60)}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-2/3 rounded-full bg-gold/15 blur-3xl" />
      <ol className="relative mx-auto grid w-full max-w-xl grid-cols-3 items-end gap-2 sm:gap-4">
        {PODIUM.map(({ place, height, medal, order }, i) => {
          const row = rows[place - 1];
          if (!row) return <li key={place} aria-hidden className={order} />;
          const mine = row.playerId === me;
          return (
            <li key={place} className={clsx("flex min-w-0 flex-col items-center", order)}>
              <div className="pop-in flex w-full min-w-0 flex-col items-center gap-0.5 pb-1.5 text-center" style={stagger(i, 160, 3, 500)}>
                <span className="relative grid place-items-center">
                  {place === 1 && <LaurelIcon className="absolute -top-3 w-16 text-gold drop-shadow-[0_2px_6px_rgb(227_179_65/0.5)] sm:w-20" />}
                  <span
                    className={clsx(
                      "relative grid size-10 place-items-center rounded-full bg-gradient-to-b font-display text-base font-black shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_4px_10px_-4px_rgb(0_0_0/0.6)] sm:size-11",
                      medal,
                      place === 1 && "shine",
                    )}
                  >
                    <span aria-hidden>{place}</span>
                    <span className="sr-only">{t({ en: `${ordinal(place, lang)} place`, es: `${place}º puesto` })}</span>
                  </span>
                </span>
                <span
                  title={row.name}
                  className={clsx("mt-1 line-clamp-2 w-full font-display text-xs leading-tight font-bold break-words sm:text-sm", mine ? "text-gold" : "text-foam")}
                >
                  {row.name}
                </span>
                <span className="text-xs font-bold text-foam/75 tabular">{fmt(row.score)}</span>
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
