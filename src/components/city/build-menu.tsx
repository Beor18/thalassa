import Image from "next/image";
import Link from "next/link";
import { BUILDINGS, type BuildingType, type SlotKind } from "@/game/data";
import { buildingCost, buildingSeconds, canBuildType } from "@/game/engine";
import type { Game } from "@/server/game-context";
import { Disclosure, Note } from "./bits";
import { BuildPicker, type BuildOption } from "./build-picker";
import { affordability, levelGain } from "./effects";
import { IconChevron, IconLock } from "./icons";
import { asPlayer, joinEs, slotHref, typesForKind } from "./lib";
import { BusyNotice } from "./work-blocks";

/** Short line under the plot name in the panel header. */
export const EMPTY_SLOT_HINT: Record<SlotKind, string> = {
  land: "Elegí qué construir",
  coast: "Acá van los puertos",
  wall: "Acá va la muralla",
  town_hall: "Acá va la Intendencia",
};

/** Options for an empty plot: what fits here (pick one, one button) and, folded, what is still locked. */
export function BuildMenu({ game, slot, kind }: { game: Game; slot: number; kind: SlotKind }) {
  const { snapshot, city } = game;
  const p = asPlayer(snapshot);
  const busy = city.construction != null;

  const all = typesForKind(kind).map((type) => {
    const def = BUILDINGS[type];
    const built = def.unique && city.buildings.some((b) => b.type === type);
    return { type, def, built, lock: built ? null : canBuildType(p, city, slot, type) };
  });
  const open: BuildOption[] = all
    .filter((o) => !o.built && !o.lock)
    .map(({ type, def }) => {
      const cost = buildingCost(p, city, type, 1);
      const can = affordability(cost, city);
      return {
        type,
        name: def.name,
        description: def.description,
        image: def.image,
        cost,
        seconds: buildingSeconds(p, type, 1, snapshot.speed),
        gains: levelGain(p, city, slot, type, 1),
        missing: can.missing,
        etaMs: can.etaMs,
        tooBig: can.tooBig,
      };
    });
  const locked = all.filter((o) => !o.built && o.lock).map((o) => ({ ...o, unlock: unlockLink(game, o.type) }));
  const built = all.filter((o) => o.built);

  const lockedList = (
    <ul className="flex flex-col gap-1.5">
      {locked.map((o) => (
        <li key={o.type} className="flex items-center gap-2.5 rounded-xl border border-dashed border-parchment-3 py-1.5 pr-1 pl-2">
          <Image src={o.def.image} alt="" width={96} height={96} sizes="40px" className="size-10 shrink-0 object-contain opacity-55 grayscale-[70%]" />
          <div className="min-w-0 flex-1">
            <p className="leading-tight font-bold">{o.def.name}</p>
            <p className="inline-flex items-center gap-1 text-sm leading-tight text-bronze-dark">
              <IconLock size={13} className="shrink-0" />
              {o.lock}
            </p>
          </div>
          {o.unlock && (
            <Link
              href={o.unlock.href}
              scroll={!o.unlock.href.startsWith("/ciudad/")}
              className="inline-flex min-h-10 shrink-0 items-center gap-0.5 rounded-lg px-2 text-sm font-bold text-bronze-dark underline-offset-4 hover:underline"
            >
              {o.unlock.label}
              <IconChevron size={14} />
            </Link>
          )}
        </li>
      ))}
      {built.length > 0 && (
        <li className="px-1 text-xs text-ink-soft">Ya en tu ciudad: {joinEs(built.map((o) => o.def.name))}.</li>
      )}
    </ul>
  );

  return (
    <>
      {busy && <BusyNotice game={game} />}
      {open.length > 0 && <BuildPicker cityId={city.id} slot={slot} options={open} res={city.res} busy={busy} />}
      {locked.length > 0 &&
        (open.length > 0 ? (
          <Disclosure summary={`Más adelante (${locked.length})`} icon={<IconLock size={15} />}>
            {lockedList}
          </Disclosure>
        ) : (
          lockedList
        ))}
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
