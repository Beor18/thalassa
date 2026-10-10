import Image from "next/image";
import Link from "next/link";
import { BUILDINGS, type BuildingType, type SlotKind } from "@/game/data";
import { buildingCost, buildingSeconds, canBuildType } from "@/game/engine";
import { ActionButton } from "@/components/ui/action-button";
import { CostList } from "@/components/ui/res";
import { fmtDuration } from "@/lib/format";
import { buildAction } from "@/server/actions";
import type { Game } from "@/server/game-context";
import { Duration, Note, Reason } from "./bits";
import { asPlayer, joinEs, missingText, slotHref, typesForKind } from "./lib";
import { BusyNotice } from "./work-blocks";

const INTRO: Record<SlotKind, string> = {
  land: "Elegí qué levantar en este lugar.",
  coast: "Este muelle da al mar. Acá van los puertos.",
  wall: "El borde de la polis. Acá se levanta la muralla.",
  town_hall: "La plaza central espera a su Intendencia.",
};

/** Options for an empty plot: what fits here, what it costs and what is still locked. */
export function BuildMenu({ game, slot, kind }: { game: Game; slot: number; kind: SlotKind }) {
  const { snapshot, city } = game;
  const p = asPlayer(snapshot);
  const busy = city.construction != null;

  const options = typesForKind(kind).map((type) => {
    const def = BUILDINGS[type];
    const built = def.unique && city.buildings.some((b) => b.type === type);
    const lock = built ? null : canBuildType(p, city, slot, type);
    const cost = buildingCost(p, city, type, 1);
    return {
      type,
      def,
      built,
      lock,
      cost,
      seconds: buildingSeconds(p, type, 1, snapshot.speed),
      missing: missingText(cost, city.res),
      unlock: lock ? unlockLink(game, type) : null,
    };
  });
  const open = options.filter((o) => !o.built && !o.lock);
  const locked = options.filter((o) => !o.built && o.lock);
  const built = options.filter((o) => o.built);

  return (
    <>
      <Note>{INTRO[kind]}</Note>
      {busy && <BusyNotice game={game} />}

      {open.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label="Edificios disponibles">
          {open.map((o) => (
            <li key={o.type} className="flex gap-3 rounded-xl border border-parchment-3 bg-parchment-2/60 p-3">
              <Image src={o.def.image} alt="" width={144} height={144} sizes="72px" className="sprite size-[72px] shrink-0 object-contain" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div>
                  <h3 className="font-display text-base leading-tight font-bold">{o.def.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-soft">{o.def.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <CostList cost={o.cost} have={city.res} />
                  <Duration>{fmtDuration(o.seconds * 1000)}</Duration>
                </div>
                <ActionButton
                  className="w-full sm:w-auto sm:self-start"
                  pendingLabel="Arrancando obra…"
                  disabled={busy || o.missing != null}
                  action={buildAction.bind(null, { cityId: city.id, slot, type: o.type })}
                >
                  Construir {o.def.name}
                </ActionButton>
                {!busy && o.missing && <Reason tone="missing">{o.missing}</Reason>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {locked.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-display text-[15px] font-bold">Todavía bloqueados</h3>
          <ul className="flex flex-col gap-2">
            {locked.map((o) => (
              <li key={o.type} className="flex items-center gap-3 rounded-xl border border-dashed border-parchment-3 p-2.5">
                <Image
                  src={o.def.image}
                  alt=""
                  width={96}
                  height={96}
                  sizes="48px"
                  className="size-12 shrink-0 object-contain opacity-60 grayscale-[60%]"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">{o.def.name}</p>
                  <Reason className="font-medium">{o.lock}</Reason>
                </div>
                {o.unlock && (
                  <Link
                    href={o.unlock.href}
                    scroll={!o.unlock.href.startsWith("/ciudad/")}
                    className="shrink-0 rounded-lg px-2 py-2.5 text-sm font-bold text-bronze-dark underline-offset-4 hover:underline"
                  >
                    {o.unlock.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {built.length > 0 && (
        <Note className="text-xs">
          Ya {built.length === 1 ? "está" : "están"} en tu ciudad: {joinEs(built.map((o) => o.def.name))}.
        </Note>
      )}

      {open.length === 0 && locked.length === 0 && <Note>No hay nada más para construir en este lugar.</Note>}
    </>
  );
}

/** Where the player can go to unlock a building: the research tree or the building it depends on. */
function unlockLink(game: Game, type: BuildingType): { href: string; label: string } | null {
  const req = BUILDINGS[type].requires;
  if (!req) return null;
  const { city } = game;
  if (req.capitalOnly && !city.isCapital) return null;
  if (req.tech && !game.snapshot.player.techs.includes(req.tech)) return { href: "/investigacion", label: "Investigar" };
  if (req.building) {
    const host = city.buildings.find((b) => b.type === req.building![0]);
    if (host) return { href: slotHref(city.id, host.slot), label: `Ir a ${BUILDINGS[host.type].name}` };
  }
  return null;
}
