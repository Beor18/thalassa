import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { TECHS, TECH_BRANCHES, TECH_IDS, type TechBranch, type TechDef } from "@/game/data";
import { buildingLevel } from "@/game/engine";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { LivePoints } from "@/components/research/live-points";
import { ActionButton } from "@/components/ui/action-button";
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

const INDENT = ["", "ml-4", "ml-8", "ml-12"] as const;

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
      <section className="panel-dark flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-4">
          <Image src="/assets/r-research.webp" alt="" width={64} height={64} className="sprite size-14 shrink-0 sm:size-16" />
          <div>
            <h1 className="font-display text-sm font-bold tracking-[0.25em] text-sea-300">INVESTIGACIÓN</h1>
            <p className="font-display text-3xl font-black text-foam sm:text-4xl">
              <LivePoints value={p.research} perHour={perHour} serverNow={snapshot.now} />{" "}
              <span className="text-base font-bold text-foam/70">puntos</span>
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
          <dt className="text-foam/70">Por hora</dt>
          <dd className="tabular-nums lining-nums font-bold text-sea-300">+{fmt1(perHour)}</dd>
          <dt className="text-foam/70">Científicos</dt>
          <dd className="tabular-nums lining-nums font-bold text-foam">{fmt(scientists)}</dd>
          <dt className="text-foam/70">Investigadas</dt>
          <dd className="tabular-nums lining-nums font-bold text-foam">
            {researched.size} de {TECH_IDS.length}
          </dd>
        </dl>
      </section>

      {hint && (
        <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Image src="/assets/b-academy.webp" alt="" width={56} height={56} className="sprite size-14 shrink-0" />
          <p className="flex-1 text-[15px]">{hint.text}</p>
          <Link
            href={hint.href}
            className="inline-flex h-10 shrink-0 items-center justify-center self-start rounded-lg border border-parchment-3 bg-parchment-2 px-4 text-[15px] font-bold text-ink transition hover:bg-parchment-3/70 sm:self-auto"
          >
            {hint.cta}
          </Link>
        </div>
      )}

      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(TECH_BRANCHES) as TechBranch[]).map((branch) => {
          const tree = branchTree(branch);
          const done = tree.filter(({ tech }) => researched.has(tech.id)).length;
          return (
            <section key={branch} aria-labelledby={`branch-${branch}`} className="panel flex flex-col gap-2 p-3 sm:p-4">
              <header className="flex items-center gap-3 pb-1">
                <Image src={BRANCH_ART[branch]} alt="" width={40} height={40} className="sprite size-10 shrink-0" />
                <h2 id={`branch-${branch}`} className="flex-1 font-display text-lg font-bold">
                  {TECH_BRANCHES[branch]}
                </h2>
                <span className="tabular-nums lining-nums text-sm font-bold text-ink-soft">
                  {done}/{tree.length}
                </span>
              </header>
              <ol className="flex flex-col gap-2">
                {tree.map(({ tech, depth }) => (
                  <li key={tech.id} className={clsx(INDENT[Math.min(depth, INDENT.length - 1)], depth > 0 && "border-l-2 border-parchment-3 pl-2")}>
                    <TechCard
                      tech={tech}
                      researched={researched.has(tech.id)}
                      unlocked={!tech.requires || researched.has(tech.requires)}
                      points={p.research}
                      perHour={perHour}
                      now={snapshot.now}
                    />
                  </li>
                ))}
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
        "flex flex-col gap-1.5 rounded-xl border p-3 transition",
        status === "done" && "border-olive/40 bg-olive/10",
        status === "ready" && "border-bronze bg-marble shadow-[0_0_0_3px_rgb(227_179_65/0.25)]",
        status === "short" && "border-parchment-3 bg-marble/60",
        status === "locked" && "border-dashed border-parchment-3 bg-transparent",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={clsx("font-display text-base font-bold", status === "locked" ? "text-ink-soft" : "text-ink")}>{tech.name}</h3>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums lining-nums text-ink-soft" title="Costo en puntos de investigación">
          <ResIcon kind="research" size={16} />
          {fmt(tech.cost)}
        </span>
      </div>
      <p className={clsx("text-[15px] leading-snug", status === "locked" ? "text-ink-soft" : "text-ink")}>{tech.effect}</p>

      {status === "done" && (
        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-success">
          <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 8.5 3.2 3L13 4.5" />
          </svg>
          Investigada
        </p>
      )}
      {status === "locked" && tech.requires && (
        <p className="text-sm font-bold text-ink-soft">Bloqueada: requiere {TECHS[tech.requires].name}</p>
      )}
      {status === "ready" && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <span className="text-sm font-bold text-bronze-dark">Disponible</span>
          <ActionButton action={researchAction.bind(null, { tech: tech.id })} size="sm" className="h-10 px-4" pendingLabel="Investigando…">
            Investigar
          </ActionButton>
        </div>
      )}
      {status === "short" && (
        <p className="text-sm text-ink-soft">
          <span className="font-bold text-terracotta">Te faltan {fmt(Math.ceil(missing))} puntos</span>
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
