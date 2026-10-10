import Image from "next/image";
import Link from "next/link";
import { BUILDINGS, type BuildingType } from "@/game/data";
import { ambrosiaToFinish, buildingCost, buildingSeconds, type BuildingState } from "@/game/engine";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClass } from "@/components/ui/button";
import { Countdown, TimeProgress } from "@/components/ui/countdown";
import { CostList, ResIcon } from "@/components/ui/res";
import { fmt, fmtDuration } from "@/lib/format";
import { buildAction, cancelBuildAction, finishNowAction } from "@/server/actions";
import type { Game } from "@/server/game-context";
import { Block, Duration, Note, Reason } from "./bits";
import { asPlayer, missingText, slotHref } from "./lib";

/** Construction running on this plot: progress, finish with ambrosia, cancel. */
export function ConstructionBlock({ game }: { game: Game }) {
  const { snapshot, city } = game;
  const work = city.construction;
  if (!work) return null;
  const def = BUILDINGS[work.type];
  const price = ambrosiaToFinish(snapshot.now, work.endsAt);
  const ambrosia = snapshot.player.ambrosia;
  const isNew = work.targetLevel === 1;

  return (
    <Block tone="inset" title={isNew ? `Construyendo ${def.name}` : `Mejorando a nivel ${work.targetLevel}`}>
      <div className="flex flex-col gap-1.5">
        <TimeProgress startedAt={work.startedAt} endsAt={work.endsAt} serverNow={snapshot.now} />
        <p className="flex items-center justify-between gap-2 text-sm text-ink-soft">
          <span>Termina en</span>
          <span className="font-extrabold text-ink">
            <Countdown endsAt={work.endsAt} serverNow={snapshot.now} doneLabel="Terminando…" />
          </span>
        </p>
      </div>
      {ambrosia >= price ? (
        <ActionButton
          variant="ambrosia"
          className="w-full"
          pendingLabel="Terminando…"
          action={finishNowAction.bind(null, { cityId: city.id, what: "construction" })}
        >
          Terminar ya por {fmt(price)} de ambrosía
        </ActionButton>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg bg-marble/50 p-3 ring-1 ring-parchment-3">
          <p className="flex items-center gap-1.5 text-sm text-ink-soft">
            <ResIcon kind="ambrosia" size={18} />
            Terminar ya cuesta {fmt(price)} de ambrosía y tenés {fmt(ambrosia)}.
          </p>
          <Link href="/tesoro" className={buttonClass("ambrosia", "md", "w-full")}>
            Conseguir ambrosía
          </Link>
        </div>
      )}
      <ActionButton
        variant="secondary"
        className="w-full"
        pendingLabel="Cancelando…"
        action={cancelBuildAction.bind(null, { cityId: city.id })}
      >
        Cancelar obra
      </ActionButton>
      <Note className="-mt-1 text-xs">Si cancelás, te devolvemos todos los materiales.</Note>
    </Block>
  );
}

/** Tells the player another plot is busy, with a link to it. */
export function BusyNotice({ game, after = "Para construir acá, esperá a que termine o terminala ya." }: { game: Game; after?: string }) {
  const work = game.city.construction;
  if (!work) return null;
  const def = BUILDINGS[work.type];
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-bronze/40 bg-gold/15 p-3 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm text-ink">
        <strong>Ya hay una obra en marcha:</strong> {def.name}
        {work.targetLevel > 1 ? ` a nivel ${work.targetLevel}` : ""}. Termina en{" "}
        <strong className="tabular">
          <Countdown endsAt={work.endsAt} serverNow={game.snapshot.now} />
        </strong>
        . {after}
      </p>
      <Link href={slotHref(game.city.id, work.slot)} scroll={false} className={buttonClass("secondary", "sm", "shrink-0")}>
        Ver obra
      </Link>
    </div>
  );
}

/** Next level: cost, time and the upgrade button (or why it can't happen). */
export function UpgradeBlock({
  game,
  building,
  primary,
}: {
  game: Game;
  building: BuildingState;
  primary: boolean;
}) {
  const { snapshot, city } = game;
  const def = BUILDINGS[building.type];
  if (building.level >= def.maxLevel) {
    return (
      <Block tone="inset" title="Nivel máximo">
        <Note>
          {def.name} llegó al nivel {def.maxLevel}. No se puede mejorar más.
        </Note>
      </Block>
    );
  }
  const p = asPlayer(snapshot);
  const next = building.level + 1;
  const cost = buildingCost(p, city, building.type, next);
  const seconds = buildingSeconds(p, building.type, next, snapshot.speed);
  const busy = city.construction != null;
  const missing = missingText(cost, city.res);

  return (
    <Block tone="inset" title="Próxima mejora">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <CostList cost={cost} have={city.res} />
        <Duration>{fmtDuration(seconds * 1000)}</Duration>
      </div>
      {busy ? (
        <BusyNotice game={game} after="Para mejorar este edificio, esperá a que termine o terminala ya." />
      ) : (
        <>
          <ActionButton
            variant={primary ? "primary" : "secondary"}
            className="w-full"
            pendingLabel="Arrancando obra…"
            disabled={missing != null}
            action={buildAction.bind(null, { cityId: city.id, slot: building.slot })}
          >
            Mejorar a nivel {next}
          </ActionButton>
          {missing && <Reason tone="missing">{missing}</Reason>}
        </>
      )}
    </Block>
  );
}

/** Small "image + name + level" header used at the top of a building panel. */
export function BuildingIntro({ type, level, underConstruction }: { type: BuildingType; level: number; underConstruction?: boolean }) {
  const def = BUILDINGS[type];
  return (
    <div className="flex items-start gap-3">
      <Image src={def.image} alt="" width={176} height={176} sizes="88px" className="sprite size-[88px] shrink-0 object-contain" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-soft">{def.description}</p>
        <p className="mt-1.5 text-xs font-bold text-ink-soft">
          {underConstruction && level === 0 ? "Se está levantando" : `Llega hasta el nivel ${def.maxLevel}`}
        </p>
      </div>
    </div>
  );
}
