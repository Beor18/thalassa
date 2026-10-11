import Link from "next/link";
import clsx from "clsx";
import { BUILDINGS, type ResourceBag } from "@/game/data";
import { ambrosiaToFinish, buildingCost, buildingSeconds, type BuildingState } from "@/game/engine";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClass } from "@/components/ui/button";
import { Countdown, TimeProgress } from "@/components/ui/countdown";
import { CostList, ResIcon } from "@/components/ui/res";
import { fmt, fmtDuration } from "@/lib/format";
import { cancelBuildAction, finishNowAction } from "@/server/actions";
import type { Game } from "@/server/game-context";
import { Duration, Reason } from "./bits";
import { affordability, levelGain } from "./effects";
import { BuildButton } from "./build-button";
import { IconChevron, IconHammer, IconUp } from "./icons";
import { asPlayer, fmtSoon, slotHref } from "./lib";

/** Construction running on this plot: time left, finish with nectar (the premium currency), cancel. */
export function ConstructionBlock({ game }: { game: Game }) {
  const { snapshot, city } = game;
  const work = city.construction;
  if (!work) return null;
  const price = ambrosiaToFinish(snapshot.now, work.endsAt);
  const ambrosia = snapshot.player.ambrosia;
  const isNew = work.targetLevel === 1;

  return (
    <section
      aria-label={isNew ? "Obra en curso" : `Mejorando a nivel ${work.targetLevel}`}
      className="flex flex-col gap-2.5 rounded-xl border border-gold/60 bg-gradient-to-b from-gold/20 to-parchment-2/60 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-bronze-dark uppercase">
          <IconHammer size={14} className="origin-bottom-left motion-safe:animate-[fx-hammer_1.4s_ease-in-out_infinite]" />
          {isNew ? "Construyendo" : `Mejorando a nivel ${work.targetLevel}`}
        </span>
        <span className="text-lg leading-none font-extrabold text-ink">
          <Countdown endsAt={work.endsAt} serverNow={snapshot.now} doneLabel="Terminando…" />
        </span>
      </div>
      <TimeProgress startedAt={work.startedAt} endsAt={work.endsAt} serverNow={snapshot.now} />
      {ambrosia >= price ? (
        <ActionButton
          variant="ambrosia"
          className="w-full"
          pendingLabel="Terminando…"
          action={finishNowAction.bind(null, { cityId: city.id, what: "construction" })}
        >
          Terminar ya por {fmt(price)} de néctar
        </ActionButton>
      ) : (
        <NectarHint price={price} msLeft={work.endsAt - snapshot.now} />
      )}
      <div className="flex items-center justify-between gap-2 border-t border-parchment-3/70 pt-1.5">
        <span className="text-xs text-ink-soft">Si cancelás, recuperás todo.</span>
        <ActionButton
          variant="ghost"
          className="-mr-2"
          pendingLabel="Cancelando…"
          action={cancelBuildAction.bind(null, { cityId: city.id })}
        >
          Cancelar obra
        </ActionButton>
      </div>
    </section>
  );
}

/** Below this wait, skipping with nectar isn't worth a word. */
const NECTAR_HINT_MIN_MS = 10 * 60_000;

/**
 * The player can't pay to finish now: one quiet line with a link, and only on long waits.
 * It never competes with the panel's own action.
 */
export function NectarHint({ price, msLeft }: { price: number; msLeft: number }) {
  if (msLeft < NECTAR_HINT_MIN_MS) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-ink-soft">
      <ResIcon kind="ambrosia" size={16} />
      <span>
        Terminar ya cuesta <strong className="text-ink tabular">{fmt(price)}</strong> de néctar.
      </span>
      <Link href="/tesoro" className="inline-flex min-h-10 items-center gap-0.5 font-bold text-ambrosia-dark underline-offset-4 hover:underline">
        Conseguir néctar
        <IconChevron size={14} />
      </Link>
    </p>
  );
}

/** One line telling the player another plot is busy, with a jump to it. */
export function BusyNotice({ game }: { game: Game }) {
  const work = game.city.construction;
  if (!work) return null;
  const def = BUILDINGS[work.type];
  return (
    <div className="flex items-center gap-2 rounded-lg border border-bronze/40 bg-gold/15 py-1 pr-1 pl-2.5">
      <IconHammer size={16} className="shrink-0 text-bronze-dark" />
      <p className="min-w-0 flex-1 text-sm leading-tight text-ink">
        <span className="font-bold">Obra en curso:</span> {def.name}
        {work.targetLevel > 1 ? ` nv ${work.targetLevel}` : ""} ·{" "}
        <strong className="whitespace-nowrap tabular">
          <Countdown endsAt={work.endsAt} serverNow={game.snapshot.now} />
        </strong>
      </p>
      <Link href={slotHref(game.city.id, work.slot)} scroll={false} className={buttonClass("secondary", "md", "shrink-0 px-3")}>
        Ver obra
      </Link>
    </div>
  );
}

/** What is missing to pay `cost`, and when production covers it. */
export function MissingLine({ game, cost }: { game: Game; cost: Partial<ResourceBag> }) {
  const can = affordability(cost, game.city);
  if (can.tooBig) {
    const warehouse = game.city.buildings.find((b) => b.type === "warehouse");
    return (
      <Reason>
        No entra en tu depósito.{" "}
        {warehouse ? (
          <Link href={slotHref(game.city.id, warehouse.slot)} scroll={false} className="underline underline-offset-4">
            Ampliá el Depósito
          </Link>
        ) : (
          "Construí un Depósito."
        )}
      </Reason>
    );
  }
  if (!can.missing) return null;
  return (
    <p className="text-sm">
      <span className="font-bold text-danger">{can.missing}</span>
      {can.etaMs != null && <span className="text-ink-soft"> Lo juntás en {fmtSoon(can.etaMs)}.</span>}
    </p>
  );
}

/**
 * Next level: what it gives, cost, time and the upgrade button (or why it can't start).
 * `primary` is the panel's main action (bronze, full width); otherwise a compact secondary row.
 */
export function UpgradeBlock({ game, building, primary }: { game: Game; building: BuildingState; primary: boolean }) {
  const { snapshot, city } = game;
  const def = BUILDINGS[building.type];
  if (building.level >= def.maxLevel) return null;
  const p = asPlayer(snapshot);
  const next = building.level + 1;
  const cost = buildingCost(p, city, building.type, next);
  const seconds = buildingSeconds(p, building.type, next, snapshot.speed);
  const busy = city.construction != null;
  const can = affordability(cost, city);
  const gains = levelGain(p, city, building.slot, building.type, next);

  const button = (
    <BuildButton
      cityId={city.id}
      slot={building.slot}
      variant={primary ? "primary" : "secondary"}
      className={primary ? "w-full" : "ml-auto shrink-0"}
      disabled={can.missing != null}
    >
      Mejorar a nivel {next}
    </BuildButton>
  );

  return (
    <section
      aria-label={`Mejora a nivel ${next}`}
      className={clsx(
        "flex flex-col gap-2 rounded-xl border p-3",
        primary ? "border-bronze/45 bg-gradient-to-b from-gold/15 to-parchment-2/70" : "border-parchment-3 bg-parchment-2/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="inline-flex items-center gap-1 text-xs font-extrabold tracking-wider text-bronze-dark uppercase">
            <IconUp size={13} />
            Nivel {next}
          </span>
          {gains.map((g) => (
            <span key={g} className="text-sm leading-tight font-bold text-success">
              {g}
            </span>
          ))}
        </p>
        <Duration className="shrink-0">{fmtDuration(seconds * 1000)}</Duration>
      </div>
      {primary ? (
        <>
          <CostList cost={cost} have={city.res} />
          {busy ? <BusyNotice game={game} /> : button}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <CostList cost={cost} have={city.res} />
            {!busy && button}
          </div>
          {busy && <BusyNotice game={game} />}
        </>
      )}
      {!busy && <MissingLine game={game} cost={cost} />}
    </section>
  );
}
