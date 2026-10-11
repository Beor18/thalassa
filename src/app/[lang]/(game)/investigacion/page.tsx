import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { CITY_SLOTS, TECHS, TECH_BRANCHES, TECH_IDS, type TechBranch, type TechDef } from "@/game/data";
import { buildingLevel } from "@/game/engine";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { LaurelIcon } from "@/components/game/icons";
import { IconLock } from "@/components/island/icons";
import { stagger } from "@/components/motion/reveal";
import { BranchTabs, type BranchTab } from "@/components/research/branch-tabs";
import { LivePoints, TechProgress } from "@/components/research/live-points";
import { ResearchedStamp } from "@/components/research/stamp";
import { HeroStat, HowItWorks, SECTION_WIDE } from "@/components/tesoro/section-ui";
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
  const freeLand = CITY_SLOTS.find((sl) => sl.kind === "land" && !city.buildings.some((b) => b.slot === sl.slot))?.slot ?? 1;
  const branches = Object.keys(TECH_BRANCHES) as TechBranch[];

  // The one research to point at: the cheapest you can afford now, else the closest one.
  const open = TECH_IDS.map((id) => TECHS[id])
    .filter((t) => !researched.has(t.id) && (!t.requires || researched.has(t.requires)))
    .sort((a, b) => a.cost - b.cost);
  const ready = open.find((t) => t.cost <= p.research + 1e-6) ?? null;
  const next = ready ?? open[0] ?? null;

  const hint = !academyCity
    ? { title: "Sin Academia", body: "Sin Academia no hay puntos.", cta: "Construir Academia", href: `/ciudad/${city.id}?slot=${freeLand}` }
    : scientists === 0
      ? {
          title: "Academia vacía",
          body: "Sin científicos no suman puntos.",
          cta: "Asignar científicos",
          href: `/ciudad/${academyCity.id}${academySlot !== undefined ? `?slot=${academySlot}` : ""}`,
        }
      : null;

  const tabs: BranchTab[] = branches.map((branch) => {
    const tree = branchTree(branch);
    return {
      id: branch,
      label: TECH_BRANCHES[branch],
      icon: BRANCH_ART[branch],
      done: tree.filter(({ tech }) => researched.has(tech.id)).length,
      total: tree.length,
      ready: tree.some(({ tech }) => !researched.has(tech.id) && tech.cost <= p.research + 1e-6 && (!tech.requires || researched.has(tech.requires))),
    };
  });

  return (
    <GameShell game={game}>
      <div className={SECTION_WIDE}>
        <section
          aria-labelledby="research-title"
          className="panel-dark rise-in relative flex flex-col gap-3 overflow-hidden p-3 sm:p-4 lg:flex-row lg:items-center lg:gap-5"
        >
          <span aria-hidden className="pointer-events-none absolute -top-20 -left-10 size-56 rounded-full bg-sea-300/15 blur-3xl" />
          <div className="relative flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-3">
              <span className="relative grid shrink-0 place-items-center">
                <span aria-hidden className="absolute inset-1 rounded-full bg-sea-300/25 blur-xl motion-safe:animate-[float_4s_ease-in-out_infinite]" />
                <Image src="/assets/r-research.webp" alt="" width={56} height={56} loading="eager" className="sprite relative size-12 sm:size-14" />
              </span>
              <div className="leading-none">
                <h1 id="research-title" className="font-display text-xs font-bold tracking-[0.25em] text-sea-300 uppercase">
                  Investigación
                </h1>
                <p className="mt-1 font-display text-3xl font-black text-foam sm:text-4xl">
                  <LivePoints value={p.research} perHour={perHour} serverNow={snapshot.now} unitClassName="text-sm font-bold text-foam/70" />
                </p>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:gap-2">
              <HeroStat
                iconOnPhone={false}
                icon={<ResIcon kind="research" size={22} />}
                value={
                  <>
                    +{fmt1(perHour)}
                    <span className="font-body text-xs font-bold">/h</span>
                  </>
                }
                label="Por hora"
                hint="Puntos por hora, sumando todas tus Academias"
                tone={perHour > 0 ? "good" : "default"}
              />
              <HeroStat
                iconOnPhone={false}
                icon={<Image src="/assets/r-citizens.webp" alt="" width={24} height={24} className="size-6" />}
                value={fmt(scientists)}
                label="Científicos"
              />
              <HeroStat
                iconOnPhone={false}
                icon={<LaurelIcon className="w-7 text-gold" />} value={`${researched.size}/${TECH_IDS.length}`} label="Hechas" hint="Investigaciones terminadas" />
            </div>
          </div>

          <NextResearch
            ready={ready}
            next={next}
            hint={hint}
            points={p.research}
            perHour={perHour}
            now={snapshot.now}
          />
        </section>

        <BranchTabs tabs={tabs} initial={next?.branch ?? "economy"}>
          {branches.map((branch, b) => {
            const tree = branchTree(branch);
            const done = tabs[b].done;
            return (
              <section
                key={branch}
                aria-labelledby={`branch-${branch}`}
                className="panel rise-in flex flex-col gap-2 p-3"
                style={stagger(b, 70, 4, 80)}
              >
                <header className="flex items-center gap-2.5">
                  <Image src={BRANCH_ART[branch]} alt="" width={36} height={36} className="sprite size-9 shrink-0" />
                  <h2 id={`branch-${branch}`} className="flex-1 font-display text-lg font-bold">
                    {TECH_BRANCHES[branch]}
                  </h2>
                  <span className="text-sm font-bold text-ink-soft tabular" title={`${done} de ${tree.length} investigadas`}>
                    {done}/{tree.length}
                  </span>
                </header>
                {/* Progress of the branch */}
                <span aria-hidden className="mb-1 block h-1 overflow-hidden rounded-full bg-ink/10">
                  <span
                    className="draw-x block h-full rounded-full bg-gradient-to-r from-olive to-gold"
                    style={{ width: `${(done / Math.max(1, tree.length)) * 100}%`, ...stagger(b, 70, 4, 400) }}
                  />
                </span>
                <ol className="flex flex-col gap-1.5">
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
                              className={clsx("draw-y absolute -top-1.5 bottom-1/2 left-0 w-0.5 rounded-full", isDone ? "bg-olive/60" : "bg-parchment-3")}
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
                            suggested={tech.id === ready?.id}
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
        </BranchTabs>

        <HowItWorks className="rise-in self-start bg-parchment/90 lg:min-w-96" title="¿Cómo funciona la investigación?">
          <p>Los científicos de tu Academia suman puntos cada hora. Los puntos son de todo tu imperio y se gastan al investigar.</p>
          <p>Cada rama se abre de arriba hacia abajo: para investigar algo, primero necesitás la investigación de la que cuelga.</p>
        </HowItWorks>
      </div>
    </GameShell>
  );
}

/** The hero's call to action: research now, fix what blocks research, or see when the next one arrives. */
function NextResearch({
  ready,
  next,
  hint,
  points,
  perHour,
  now,
}: {
  ready: TechDef | null;
  next: TechDef | null;
  hint: { title: string; body: string; cta: string; href: string } | null;
  points: number;
  perHour: number;
  now: number;
}) {
  const card =
    "relative flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-parchment p-2.5 pl-3 text-ink shadow-[0_8px_20px_-10px_rgb(0_0_0/0.6)] ring-1 lg:w-[28rem] lg:shrink-0";
  const eyebrow = "text-[11px] font-extrabold tracking-wider uppercase";

  if (ready) {
    return (
      <div className={clsx(card, "pop-in ring-gold/70")} style={stagger(0, 0, 0, 200)}>
        <div className="min-w-[10rem] flex-1">
          <p className={clsx(eyebrow, "text-bronze-dark")}>Lista para investigar</p>
          <p className="truncate font-display text-lg leading-tight font-bold">{ready.name}</p>
          <p className="line-clamp-2 text-sm leading-snug text-ink-soft" title={ready.effect}>
            {ready.effect}
          </p>
        </div>
        <ActionButton
          action={researchAction.bind(null, { tech: ready.id })}
          size="md"
          className="shrink-0 max-sm:w-full"
          pendingLabel="Investigando…"
          celebrate
        >
          <ResIcon kind="research" size={18} />
          Investigar
        </ActionButton>
      </div>
    );
  }
  if (hint) {
    return (
      <div className={clsx(card, "ring-gold/40")}>
        <Image src="/assets/b-academy.webp" alt="" width={44} height={44} className="sprite size-11 shrink-0 motion-safe:animate-float" />
        <div className="min-w-[9rem] flex-1">
          <p className={clsx(eyebrow, "text-terracotta")}>{hint.title}</p>
          <p className="text-sm leading-snug text-ink-soft">{hint.body}</p>
        </div>
        <Link href={hint.href} className={buttonClass("primary", "md", "shrink-0 max-sm:w-full")}>
          {hint.cta}
        </Link>
      </div>
    );
  }
  if (next) {
    return (
      <div className={clsx(card, "ring-parchment-3")}>
        <ResIcon kind="research" size={36} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={clsx(eyebrow, "text-ink-soft")}>Próxima</p>
          <p className="truncate font-display text-lg leading-tight font-bold">{next.name}</p>
        </div>
        {perHour > 0 ? (
          <p className="shrink-0 text-right leading-tight">
            <span className="block text-[11px] font-bold text-ink-soft uppercase">Lista en</span>
            <strong className="font-display text-lg">
              <Countdown endsAt={now + ((next.cost - points) / perHour) * 3_600_000} serverNow={now} doneLabel="un momento" />
            </strong>
          </p>
        ) : (
          <p className="shrink-0 text-sm font-bold text-terracotta tabular">
            Faltan {fmt(Math.ceil(next.cost - points))} {Math.ceil(next.cost - points) === 1 ? "punto" : "puntos"}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className={clsx(card, "ring-gold/70")}>
      <LaurelIcon className="w-12 shrink-0 text-gold" />
      <p className="font-display text-lg font-bold">Investigaste todo</p>
    </div>
  );
}

function TechCard({
  tech,
  suggested,
  researched,
  unlocked,
  points,
  perHour,
  now,
}: {
  tech: TechDef;
  /** The research the hero already offers: no second button for it here. */
  suggested: boolean;
  researched: boolean;
  unlocked: boolean;
  points: number;
  perHour: number;
  now: number;
}) {
  const affordable = tech.cost <= points + 1e-6;
  const status = researched ? "done" : !unlocked ? "locked" : affordable ? "ready" : "short";
  const requires = tech.requires ? TECHS[tech.requires].name : null;

  return (
    <article
      title={status === "locked" && requires ? `Requiere ${requires}` : undefined}
      className={clsx(
        "relative flex flex-col gap-1 rounded-xl border px-3 py-2 transition-[box-shadow,transform,border-color] duration-200",
        status === "done" && "border-olive/35 bg-olive/10",
        status === "ready" &&
          "border-bronze bg-marble shadow-[0_0_0_3px_rgb(227_179_65/0.25),0_8px_20px_-12px_rgb(122_79_24/0.6)] hover:-translate-y-0.5 hover:shadow-[0_0_0_3px_rgb(227_179_65/0.4),0_12px_24px_-12px_rgb(122_79_24/0.7)]",
        status === "short" && "border-parchment-3 bg-marble/60",
        status === "locked" && "border-dashed border-parchment-3 bg-transparent",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className={clsx("min-w-0 font-display text-[15px] leading-tight font-bold", status === "locked" ? "text-ink-soft" : "text-ink")}>
          {tech.name}
        </h3>
        {status === "done" ? (
          <ResearchedStamp className="-my-1" />
        ) : (
          <span
            className={clsx("inline-flex shrink-0 items-center gap-1 text-sm font-bold tabular", status === "ready" ? "text-bronze-dark" : "text-ink-soft")}
            title="Costo en puntos de investigación"
          >
            {status === "locked" ? <IconLock size={14} /> : <ResIcon kind="research" size={16} />}
            {fmt(tech.cost)}
          </span>
        )}
      </div>
      <p className={clsx("text-sm leading-snug", status === "done" || status === "locked" ? "text-ink-soft" : "text-ink")}>{tech.effect}</p>
      {status === "locked" && requires && <span className="sr-only">Bloqueada: requiere {requires}.</span>}
      {status === "ready" && suggested && (
        <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-extrabold tracking-wide text-bronze-dark uppercase">
          <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
          </svg>
          Investigala arriba
        </p>
      )}
      {status === "ready" && !suggested && (
        <ActionButton
          action={researchAction.bind(null, { tech: tech.id })}
          variant="secondary"
          size="sm"
          className="mt-1 h-10 w-full"
          pendingLabel="Investigando…"
          celebrate
        >
          Investigar
        </ActionButton>
      )}
      {status === "short" && <TechProgress cost={tech.cost} points={points} perHour={perHour} serverNow={now} />}
    </article>
  );
}
