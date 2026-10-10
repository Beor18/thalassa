import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { TECHS, TECH_BRANCHES, TECH_IDS, type TechBranch, type TechDef } from "@/game/data";
import { buildingLevel } from "@/game/engine";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { stagger } from "@/components/motion/reveal";
import { LivePoints } from "@/components/research/live-points";
import { ResearchedStamp } from "@/components/research/stamp";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClass } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import { ResIcon } from "@/components/ui/res";
import { fmt, fmt1 } from "@/lib/format";
import { researchAction } from "@/server/actions";
import { getGame } from "@/server/game-context";

export const metadata: Metadata = { title: "Investigación" };

const BRANCH_ART: Record<TechBranch, string> = {
  economy: "/assets/r-gold.webp",
  science: "/assets/r-research.webp",
  military: "/assets/u-hoplite.webp",
  seafaring: "/assets/u-ship.webp",
};

const INDENT = ["", "ml-3", "ml-6", "ml-9"] as const;

/** Techs of a branch in prerequisite order (each one right after the one it needs), with depth. */
function branchTree(branch: TechBranch): { tech: TechDef; depth: number }[] {
  const techs = TECH_IDS.map((id) => TECHS[id]).filter((t) => t.branch === branch);
  const out: { tech: TechDef; depth: number }[] = [];
  const visit = (tech: TechDef, depth: number) => {
    out.push({ tech, depth });
    techs
      .filter((t) => t.requires === tech.id)
      .sort((a, b) => a.cost - b.cost)
      .forEach((child) => visit(child, depth + 1));
  };
  techs
    .filter((t) => !t.requires || TECHS[t.requires].branch !== branch)
    .sort((a, b) => a.cost - b.cost)
    .forEach((root) => visit(root, 0));
  return out;
}

export default function InvestigacionPage() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const game = await getGame();
  const { snapshot, city } = game;
  const p = snapshot.player;
  const perHour = snapshot.cities.reduce((s, c) => s + c.rates.research, 0);
  const scientists = snapshot.cities.reduce((s, c) => s + c.scientists, 0);
  const academyCity = snapshot.cities.find((c) => buildingLevel(c, "academy") > 0);
  const academySlot = academyCity?.buildings.find((b) => b.type === "academy")?.slot;
  const researched = new Set(p.techs);

  const hint = !academyCity
    ? {
        text: "Todavía no tenés Academia. Construila en tu ciudad y sentá científicos para sumar puntos.",
        href: `/ciudad/${city.id}`,
        cta: "Ir a la ciudad",
      }
    : scientists === 0
      ? {
          text: `Tu Academia en ${academyCity.name} está vacía. Asigná científicos para que sumen puntos.`,
          href: `/ciudad/${academyCity.id}${academySlot !== undefined ? `?slot=${academySlot}` : ""}`,
          cta: "Asignar científicos",
        }
      : null;

  return (
    <GameShell game={game}>
      <section className="panel-dark rise-in flex flex-col gap-4 overflow-hidden p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-4">
          <span className="relative grid shrink-0 place-items-center">
            <span aria-hidden className="absolute inset-1 rounded-full bg-sea-300/25 blur-xl motion-safe:animate-[float_4s_ease-in-out_infinite]" />
            <Image src="/assets/r-research.webp" alt="" width={64} height={64} loading="eager" className="sprite relative size-14 sm:size-16" />
          </span>
          <div>
            <h1 className="font-display text-sm font-bold tracking-[0.25em] text-sea-300">Investigación</h1>
            <p className="font-display text-3xl font-black text-foam sm:text-4xl">
              <LivePoints value={p.research} perHour={perHour} serverNow={snapshot.now} unitClassName="text-base font-bold text-foam/70" />
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
          <dt className="text-foam/70">Por hora</dt>
          <dd className="font-bold text-sea-300 tabular">+{fmt1(perHour)}</dd>
          <dt className="text-foam/70">Científicos</dt>
          <dd className="font-bold text-foam tabular">{fmt(scientists)}</dd>
          <dt className="text-foam/70">Investigadas</dt>
          <dd className="font-bold text-foam tabular">
            {researched.size} de {TECH_IDS.length}
          </dd>
        </dl>
      </section>

      {hint && (
        <div className="panel rise-in flex flex-col gap-3 p-4 sm:flex-row sm:items-center" style={stagger(1, 60)}>
          <Image src="/assets/b-academy.webp" alt="" width={56} height={56} className="sprite size-14 shrink-0 motion-safe:animate-float" />
          <p className="flex-1 text-[15px]">{hint.text}</p>
          <Link
            href={hint.href}
            className={buttonClass("secondary", "md", "shrink-0 self-start sm:self-auto")}
          >
            {hint.cta}
          </Link>
        </div>
      )}

      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(TECH_BRANCHES) as TechBranch[]).map((branch, b) => {
          const tree = branchTree(branch);
          const done = tree.filter(({ tech }) => researched.has(tech.id)).length;
          return (
            <section
              key={branch}
              aria-labelledby={`branch-${branch}`}
              className="panel rise-in flex flex-col gap-2 p-3 sm:p-4"
              style={stagger(b, 70, 4, 80)}
            >
              <header className="flex items-center gap-3 pb-1">
                <Image src={BRANCH_ART[branch]} alt="" width={40} height={40} className="sprite size-10 shrink-0" />
                <h2 id={`branch-${branch}`} className="flex-1 font-display text-lg font-bold">
                  {TECH_BRANCHES[branch]}
                </h2>
                <span className="text-sm font-bold text-ink-soft tabular">
                  {done}/{tree.length}
                </span>
              </header>
              {/* Progress of the branch */}
              <span aria-hidden className="-mt-1 mb-1 block h-1 overflow-hidden rounded-full bg-ink/10">
                <span
                  className="draw-x block h-full rounded-full bg-gradient-to-r from-olive to-gold"
                  style={{ width: `${(done / Math.max(1, tree.length)) * 100}%`, ...stagger(b, 70, 4, 400) }}
                />
              </span>
              <ol className="flex flex-col gap-2">
                {tree.map(({ tech, depth }, i) => {
                  const isDone = researched.has(tech.id);
                  const delay = stagger(i, 55, 7, 160 + b * 70);
                  return (
                    <li key={tech.id} className={clsx("relative", INDENT[Math.min(depth, INDENT.length - 1)], depth > 0 && "pl-3")}>
                      {depth > 0 && (
                        <>
                          {/* Connector from the research it needs, drawn in as the tree appears */}
                          <span
                            aria-hidden
                            className={clsx("draw-y absolute -top-2 bottom-1/2 left-0 w-0.5 rounded-full", isDone ? "bg-olive/60" : "bg-parchment-3")}
                            style={delay}
                          />
                          <span
                            aria-hidden
                            className={clsx("draw-x absolute top-1/2 left-0 h-0.5 w-3 rounded-full", isDone ? "bg-olive/60" : "bg-parchment-3")}
                            style={stagger(i, 55, 7, 420 + b * 70)}
                          />
                        </>
                      )}
                      <div className="rise-in" style={delay}>
                        <TechCard
                          tech={tech}
                          researched={isDone}
                          unlocked={!tech.requires || researched.has(tech.requires)}
                          points={p.research}
                          perHour={perHour}
                          now={snapshot.now}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </GameShell>
  );
}

function TechCard({
  tech,
  researched,
  unlocked,
  points,
  perHour,
  now,
}: {
  tech: TechDef;
  researched: boolean;
  unlocked: boolean;
  points: number;
  perHour: number;
  now: number;
}) {
  const missing = Math.max(0, tech.cost - points);
  const affordable = missing < 1e-6;
  const status = researched ? "done" : !unlocked ? "locked" : affordable ? "ready" : "short";

  return (
    <article
      className={clsx(
        "relative flex flex-col gap-1.5 rounded-xl border p-3 transition-[box-shadow,transform,border-color] duration-200",
        status === "done" && "border-olive/40 bg-olive/10",
        status === "ready" &&
          "border-bronze bg-marble shadow-[0_0_0_3px_rgb(227_179_65/0.25),0_8px_20px_-12px_rgb(122_79_24/0.6)] hover:-translate-y-0.5 hover:shadow-[0_0_0_3px_rgb(227_179_65/0.4),0_12px_24px_-12px_rgb(122_79_24/0.7)]",
        status === "short" && "border-parchment-3 bg-marble/60",
        status === "locked" && "border-dashed border-parchment-3 bg-transparent",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={clsx("font-display text-base font-bold", status === "locked" ? "text-ink-soft" : "text-ink")}>{tech.name}</h3>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-ink-soft tabular" title="Costo en puntos de investigación">
          <ResIcon kind="research" size={16} />
          {fmt(tech.cost)}
        </span>
      </div>
      <p className={clsx("text-[15px] leading-snug", status === "locked" ? "text-ink-soft" : "text-ink")}>{tech.effect}</p>

      {status === "done" && <ResearchedStamp className="self-start" />}
      {status === "locked" && tech.requires && (
        <p className="text-sm font-bold text-ink-soft">Bloqueada: requiere {TECHS[tech.requires].name}</p>
      )}
      {status === "ready" && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <span className="text-sm font-bold text-bronze-dark">Disponible</span>
          <ActionButton action={researchAction.bind(null, { tech: tech.id })} size="sm" className="h-10 px-4" pendingLabel="Investigando…" celebrate>
            Investigar
          </ActionButton>
        </div>
      )}
      {status === "short" && (
        <p className="text-sm text-ink-soft">
          <span className="font-bold text-terracotta">
            {Math.ceil(missing) === 1 ? "Te falta 1 punto" : `Te faltan ${fmt(Math.ceil(missing))} puntos`}
          </span>
          {perHour > 0 && (
            <>
              {" · llegás en "}
              <Countdown endsAt={now + (missing / perHour) * 3_600_000} serverNow={now} doneLabel="un momento" />
            </>
          )}
        </p>
      )}
    </article>
  );
}
