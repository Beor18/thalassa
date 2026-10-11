import Link from "next/link";
import type { ReactNode } from "react";
import { BALANCE, CITY_SLOTS, RESOURCES, UNIT_TYPES, type Resource } from "@/game/data";
import {
  barbarianArmy,
  barbarianLoot,
  buildingLevel,
  capitalOf,
  hasTech,
  luxuryMultiplier,
  maxLuxWorkers,
  maxWoodWorkers,
  resolveCombat,
  type CityState,
  type PlayerState,
} from "@/game/engine";
import { ISLAND_FEATURE_IMAGE } from "@/game/layout";
import type { IslandCityView, IslandView, MissionView } from "@/server/queries";
import type { GameCity } from "@/server/game-context";
import { buttonClass } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import { CostList, ResIcon } from "@/components/ui/res";
import { fmt, fmtDuration } from "@/lib/format";
import { UnitPortrait, unitEntries, unitName } from "@/components/military/units";
import { TroopsAway } from "@/components/city/troops-away";
import {
  AttackForm,
  ColonizeForm,
  DonateForm,
  PlotActions,
  TransportForm,
  UseCityButton,
  WorkersForm,
  type Requirement,
} from "./forms";
import { IconClock, IconLock, IconShield, IconSwords, IconTemple } from "./icons";
import { PanelLink, type PanelDef } from "./panel-host";
import { MINE_NAME } from "./names";
import { Sprite, Token } from "./sprite";
import { Callout, Disclosure, ResGlyph, ShipGlyph, Stat, StatRow } from "./ui";

export interface IslandCtx {
  island: IslandView;
  player: PlayerState;
  /** the active city: every action leaves from here */
  city: GameCity;
  myCities: GameCity[];
  speed: number;
  now: number;
  pendingColonies: number;
  /** seconds from the active city to this island */
  travelSec: number;
  /** when the first ship of the active city that is at sea comes back (null if none) */
  shipsBackAt: number | null;
  /** missions of the active city that carry soldiers (outbound attacks and troops coming back) */
  troopsAway: MissionView[];
}

/*
  Every panel opens on its one main action (assign workers, attack, found a colony, go to the city).
  Numbers sit in icon chips; explanations and secondary actions open on demand.
*/

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const freeLandSlot = (c: CityState) =>
  CITY_SLOTS.find((s) => s.kind === "land" && !c.buildings.some((b) => b.slot === s.slot))?.slot ?? 1;
const slotOf = (c: CityState, type: CityState["buildings"][number]["type"]) => c.buildings.find((b) => b.type === type)?.slot;
const floorBag = (res: Record<Resource, number>) =>
  Object.fromEntries(RESOURCES.map((r) => [r, Math.floor(res[r])])) as Record<Resource, number>;

function PanelSprite({ image, fallback }: { image: string; fallback: ReactNode }) {
  return <Sprite src={image} fallback={<Token className="w-10">{fallback}</Token>} />;
}

/** Donations toward the next level. With `donate`, the card opens to the donation form. */
function LevelCard({ level, donated, nextCost, donate }: { level: number; donated: number; nextCost: number; donate?: ReactNode }) {
  const pct = Math.max(0, Math.min(100, (donated / nextCost) * 100));
  const progress = (
    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-bold">Nivel {level + 1}</span>
        <span className="tabular inline-flex items-center gap-1 font-semibold text-ink-soft">
          <ResGlyph kind="wood" size={16} />
          {fmt(donated)}/{fmt(nextCost)}
        </span>
      </span>
      <span
        className="block h-2 w-full overflow-hidden rounded-full bg-ink/15"
        role="progressbar"
        aria-label={`Donaciones para el nivel ${level + 1}`}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="block h-full rounded-full bg-gradient-to-r from-bronze to-gold" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
  if (!donate) return <div className="flex rounded-xl bg-parchment-2/50 px-3 py-2.5 ring-1 ring-parchment-3">{progress}</div>;
  return (
    <Disclosure summary={progress} aside={<span className="font-bold text-bronze-dark">Donar</span>}>
      <p className="text-xs text-ink-soft">El nivel lo suben entre todos los vecinos de la isla.</p>
      {donate}
    </Disclosure>
  );
}

/** Why the active city can't put people to work here, and the one way to fix it. */
function NotHere({ ctx }: { ctx: IslandCtx }) {
  const here = ctx.myCities.filter((c) => c.islandId === ctx.island.id);
  const firstFree = Array.from({ length: 8 }, (_, i) => i).find((s) => !ctx.island.cities.some((c) => c.slot === s));
  return (
    <Callout
      title={`Trabajan solo las ciudades de ${ctx.island.name}`}
      action={
        here.length > 0 ? (
          here.map((c) => <UseCityButton key={c.id} cityId={c.id} name={c.name} />)
        ) : firstFree !== undefined ? (
          <PanelLink panel={`plot-${firstFree}`} className={buttonClass("secondary", "md", "w-full")}>
            Ver un lugar libre
          </PanelLink>
        ) : null
      }
    >
      {here.length === 0 && "Fundá una colonia acá para sumarte."}
    </Callout>
  );
}

/** Where to train more soldiers from the active city (its Cuartel), if it has one. */
const trainHref = (city: GameCity) => {
  const barracks = slotOf(city, "barracks");
  return barracks === undefined ? undefined : `/ciudad/${city.id}?slot=${barracks}`;
};

const stepLink = (href: string, label: string, variant: "primary" | "secondary" = "primary") => (
  <Link href={href} className={buttonClass(variant, "md", "w-full")}>
    {label}
  </Link>
);

/** What's missing before the active city can attack, as one card with one button. */
function attackNextStep(ctx: IslandCtx): ReactNode {
  const { city } = ctx;
  const hasUnits = UNIT_TYPES.some((t) => (city.units[t] ?? 0) > 0);
  const barracks = slotOf(city, "barracks");
  if (!hasUnits && ctx.troopsAway.length > 0) {
    return (
      <Callout
        title="Tus tropas están afuera"
        action={
          <>
            <TroopsAway missions={ctx.troopsAway} now={ctx.now} />
            {barracks !== undefined && stepLink(`/ciudad/${city.id}?slot=${barracks}`, "Entrenar más", "secondary")}
          </>
        }
      />
    );
  }
  if (!hasUnits && barracks === undefined) {
    return (
      <Callout title="Construí un Cuartel" action={stepLink(`/ciudad/${city.id}?slot=${freeLandSlot(city)}`, "Construir un Cuartel")}>
        Sin tropas no hay ataque.
      </Callout>
    );
  }
  if (!hasUnits) {
    return (
      <Callout title="Entrená tropas" action={stepLink(`/ciudad/${city.id}?slot=${barracks}`, "Ir al Cuartel")}>
        No hay soldados en {city.name}.
      </Callout>
    );
  }
  if (city.ships === 0) {
    const port = slotOf(city, "port");
    if (ctx.shipsBackAt && port !== undefined) {
      return (
        <Callout title="Tus barcos están en el mar" action={stepLink(`/ciudad/${city.id}?slot=${port}`, "Comprar otro barco", "secondary")}>
          Vuelve uno en{" "}
          <strong className="text-ink">
            <Countdown endsAt={ctx.shipsBackAt} serverNow={ctx.now} />
          </strong>
          .
        </Callout>
      );
    }
    return (
      <Callout
        title={port === undefined ? "Hacé un Puerto" : "Comprá un barco"}
        action={stepLink(`/ciudad/${city.id}?slot=${port ?? 12}`, port === undefined ? "Construir un Puerto" : "Ir al Puerto")}
      >
        Las tropas viajan en barco: {BALANCE.unitsPerShip} por barco.
      </Callout>
    );
  }
  return null;
}

const unitsAtHome = (city: GameCity) =>
  UNIT_TYPES.filter((t) => (city.units[t] ?? 0) > 0).map((t) => ({ type: t, have: city.units[t] ?? 0 }));

// ---------------------------------------------------------------------------
// Sawmill and luxury mine
// ---------------------------------------------------------------------------

export function sawmillPanel(ctx: IslandCtx): PanelDef {
  const { island, city, speed } = ctx;
  const here = city.islandId === island.id;
  const level = island.sawmill.level;
  const capacity = maxWoodWorkers(level);
  const perWorker = BALANCE.woodPerWorker * speed;
  const progress = { level, donated: island.sawmill.donated, nextCost: island.sawmill.nextCost };
  return {
    icon: <PanelSprite image={ISLAND_FEATURE_IMAGE.sawmill} fallback={<ResIcon kind="wood" size={24} />} />,
    kicker: `Nivel ${level}`,
    title: "Aserradero",
    body: here ? (
      <>
        <WorkersForm
          key={city.id}
          cityId={city.id}
          field="woodWorkers"
          current={city.woodWorkers}
          max={Math.min(capacity, city.woodWorkers + city.rates.freeCitizens)}
          capacity={capacity}
          free={city.rates.freeCitizens}
          perWorker={perWorker}
          resource="wood"
          goldPerCitizen={BALANCE.goldPerCitizen * speed}
          goldPerHour={city.rates.goldIncome - city.rates.goldUpkeep}
        />
        <LevelCard
          {...progress}
          donate={
            <DonateForm
              cityId={city.id}
              target="sawmill"
              have={Math.floor(city.res.wood)}
              remaining={Math.max(0, island.sawmill.nextCost - island.sawmill.donated)}
            />
          }
        />
      </>
    ) : (
      <>
        <NotHere ctx={ctx} />
        <LevelCard {...progress} />
      </>
    ),
  };
}

export function minePanel(ctx: IslandCtx): PanelDef {
  const { island, city, speed, player } = ctx;
  const here = city.islandId === island.id;
  const resource = island.resource;
  const level = island.mine.level;
  const capacity = maxLuxWorkers(level);
  const unlocked = hasTech(player, "wealth");
  const perWorker = BALANCE.luxuryPerWorker * speed * (here ? luxuryMultiplier(city) : 1);
  const progress = { level, donated: island.mine.donated, nextCost: island.mine.nextCost };
  const levelCard = here ? (
    <LevelCard
      {...progress}
      donate={
        <DonateForm
          cityId={city.id}
          target="mine"
          have={Math.floor(city.res.wood)}
          remaining={Math.max(0, island.mine.nextCost - island.mine.donated)}
        />
      }
    />
  ) : (
    <LevelCard {...progress} />
  );
  return {
    icon: <PanelSprite image={ISLAND_FEATURE_IMAGE[resource]} fallback={<ResIcon kind={resource} size={24} />} />,
    kicker: `Nivel ${level}`,
    title: MINE_NAME[resource],
    body: (
      <>
        {!unlocked ? (
          <Callout
            tone="dark"
            icon={<IconLock size={18} className="shrink-0 text-gold" />}
            title="Investigá Riqueza para trabajar acá"
            action={stepLink("/investigacion", "Ir a Investigación")}
          />
        ) : here ? (
          <WorkersForm
            key={city.id}
            cityId={city.id}
            field="luxWorkers"
            current={city.luxWorkers}
            max={Math.min(capacity, city.luxWorkers + city.rates.freeCitizens)}
            capacity={capacity}
            free={city.rates.freeCitizens}
            perWorker={perWorker}
            resource={resource}
            goldPerCitizen={BALANCE.goldPerCitizen * speed}
          goldPerHour={city.rates.goldIncome - city.rates.goldUpkeep}
          />
        ) : (
          <NotHere ctx={ctx} />
        )}
        {levelCard}
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// Barbarian camp
// ---------------------------------------------------------------------------

export function campPanel(ctx: IslandCtx): PanelDef {
  const { island, city, now, travelSec, speed } = ctx;
  const level = island.barbarians.level;
  const army = barbarianArmy(level);
  const loot = barbarianLoot(level);
  const defense = resolveCombat({}, army.units, army.wall).defensePower;
  const rebuildingUntil = island.barbarians.rebuildingUntil;
  const canLeaveAt = rebuildingUntil ? rebuildingUntil - travelSec * 1000 : 0;
  const nextStep = attackNextStep(ctx);
  const cooldown = fmtDuration((BALANCE.barbarianCooldown * 1000) / speed);
  // Attacks from the active city already sailing to this camp.
  const incoming = ctx.troopsAway.filter((m) => m.kind === "attack" && m.targetIslandId === island.id && m.targetLabel.startsWith("Bárbaros"));

  return {
    icon: <PanelSprite image={ISLAND_FEATURE_IMAGE.barbarians} fallback={<IconSwords size={22} />} />,
    kicker: `Nivel ${level}`,
    title: "Campamento bárbaro",
    body: (
      <>
        {rebuildingUntil && (
          <p className="flex items-center gap-2 rounded-xl bg-sea-900 px-3 py-2 text-sm font-bold text-foam ring-1 ring-sea-500/40">
            <IconClock size={16} className="shrink-0 text-gold" />
            Se rearman en
            <strong className="text-gold">
              <Countdown endsAt={rebuildingUntil} serverNow={now} />
            </strong>
          </p>
        )}
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-xl bg-parchment-2/50 px-3 py-2.5 ring-1 ring-parchment-3">
          <dt className="text-xs font-extrabold tracking-wider text-bronze-dark uppercase">Defensa</dt>
          <dd className="flex flex-wrap items-center gap-1.5">
            {unitEntries(army.units).map(([t, n]) => (
              <span
                key={t}
                title={`${fmt(n)} ${unitName(t, n)}`}
                className="tabular inline-flex h-8 items-center gap-0.5 rounded-lg bg-parchment-2/70 pr-2 text-sm font-bold ring-1 ring-parchment-3"
              >
                <UnitPortrait unit={t} size={30} className="bg-transparent" />
                {fmt(n)}
                <span className="sr-only"> {unitName(t, n)}</span>
              </span>
            ))}
            <Stat
              icon={<IconShield size={16} />}
              label={army.wall > 0 ? `Defensa total, con empalizada nivel ${army.wall} (+${army.wall * 10}%)` : "Defensa total, sin empalizada"}
            >
              {fmt(defense)}
            </Stat>
          </dd>
          <dt className="text-xs font-extrabold tracking-wider text-bronze-dark uppercase">Botín</dt>
          <dd>
            <CostList cost={loot} className="text-sm" />
          </dd>
        </dl>
        {incoming.length > 0 && !nextStep && <TroopsAway missions={incoming} now={now} />}
        {nextStep ?? (
          <AttackForm
            originCityId={city.id}
            originName={city.name}
            available={unitsAtHome(city)}
            shipsDocked={city.ships}
            travelSec={travelSec}
            target={{ barbariansOnIsland: island.id }}
            defender={army}
            trainHref={trainHref(city)}
            submitLabel="Atacar el campamento"
            blocked={
              canLeaveAt > now ? (
                <>
                  Llegarías antes de que se rearmen. Zarpá en <Countdown endsAt={canLeaveAt} serverNow={now} />.
                </>
              ) : null
            }
          />
        )}
        <p className="text-xs text-ink-soft">Si ganás, el campamento sube de nivel y se rearma en {cooldown}.</p>
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// Coastal plots
// ---------------------------------------------------------------------------

export function plotPanel(ctx: IslandCtx, slot: number): PanelDef {
  const c = ctx.island.cities.find((x) => x.slot === slot);
  if (!c) return freePlotPanel(ctx, slot);
  if (c.isMine) return ownPlotPanel(ctx, c);
  return rivalPlotPanel(ctx, c);
}

const citySprite = (mine: boolean) => (
  <PanelSprite image={ISLAND_FEATURE_IMAGE.city} fallback={<IconTemple size={22} className={mine ? "text-ink" : undefined} />} />
);

function freePlotPanel(ctx: IslandCtx, slot: number): PanelDef {
  const { island, player, city, travelSec } = ctx;
  const capital = capitalOf(player);
  const palace = buildingLevel(capital, "palace");
  const colonies = player.cities.length - 1 + ctx.pendingColonies;
  const cost = BALANCE.colonizeCost;
  const port = slotOf(city, "port");
  const costOk = city.res.wood >= cost.wood && player.gold >= cost.gold && city.rates.freeCitizens >= cost.citizens;
  const steps: Requirement[] = [
    { ok: hasTech(player, "expansion"), label: "Expansión investigada", href: "/investigacion", cta: "Investigar", action: "Investigar Expansión" },
    {
      ok: palace > colonies,
      label: palace === 0 && colonies === 0 ? `Palacio en ${capital.name}` : `Palacio nivel ${colonies + 1} en ${capital.name}`,
      href: `/ciudad/${capital.id}?slot=${slotOf(capital, "palace") ?? freeLandSlot(capital)}`,
      cta: palace === 0 ? "Construir" : "Subir",
      action: palace === 0 ? "Construir el Palacio" : "Subir el Palacio",
    },
    {
      ok: city.ships >= 1,
      label: `1 barco en ${city.name}`,
      href: `/ciudad/${city.id}?slot=${port ?? 12}`,
      cta: port === undefined ? "Hacer Puerto" : "Comprar",
      action: port === undefined ? "Construir un Puerto" : "Comprar un barco",
    },
  ];
  return {
    icon: (
      <span className="grid size-10 place-items-center rounded-full bg-parchment-2 text-bronze-dark ring-1 ring-parchment-3">
        <IconTemple size={20} />
      </span>
    ),
    kicker: `Lugar ${slot + 1} de la costa`,
    title: "Lugar libre",
    body: (
      <>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl bg-parchment-2/50 px-3 py-2 ring-1 ring-parchment-3">
          <span className="sr-only">Cuesta:</span>
          <CostList
            cost={{ wood: cost.wood, gold: cost.gold, citizens: cost.citizens }}
            have={{ wood: city.res.wood, gold: player.gold, citizens: city.rates.freeCitizens }}
            className="text-sm"
          />
          <span className="tabular inline-flex items-center gap-1 text-sm font-semibold text-ink-soft" title={`Viaje desde ${city.name}`}>
            <IconClock size={16} />
            <span className="sr-only">Viaje desde {city.name}:</span>
            {fmtDuration(travelSec * 1000)}
          </span>
        </div>
        <ColonizeForm originCityId={city.id} islandId={island.id} islandName={island.name} slot={slot} steps={steps} costOk={costOk} />
      </>
    ),
  };
}

function ownPlotPanel(ctx: IslandCtx, c: IslandCityView): PanelDef {
  const { city, travelSec } = ctx;
  const full = ctx.myCities.find((x) => x.id === c.id);
  const isActive = c.id === city.id;
  return {
    icon: citySprite(true),
    kicker: isActive ? "Tu ciudad · estás acá" : "Tu ciudad",
    title: c.name,
    body: (
      <>
        <StatRow>
          <Stat icon={<IconTemple size={16} />} label="Nivel de la Intendencia">
            Intendencia {c.townHall}
          </Stat>
          <Stat icon={<IconShield size={16} />} label="Nivel de la muralla" tone={c.wall ? "default" : "muted"}>
            {c.wall ? `Muralla ${c.wall}` : "Sin muralla"}
          </Stat>
          {full && (
            <>
              <Stat icon={<ResGlyph kind="citizens" />} label="Ciudadanos">
                {fmt(full.population)}
              </Stat>
              <Stat icon={<ShipGlyph />} label="Barcos en el puerto">
                {fmt(full.ships)}
              </Stat>
            </>
          )}
        </StatRow>
        <Link href={`/ciudad/${c.id}`} className={buttonClass("primary", "lg", "w-full")}>
          Ir a {c.name}
        </Link>
        {!isActive && (
          <Disclosure summary="Mandar recursos" aside={`desde ${city.name}`}>
            <TransportForm
              originCityId={city.id}
              originName={city.name}
              targetCityId={c.id}
              have={floorBag(city.res)}
              shipsDocked={city.ships}
              travelSec={travelSec}
            />
          </Disclosure>
        )}
      </>
    ),
  };
}

function rivalPlotPanel(ctx: IslandCtx, c: IslandCityView): PanelDef {
  const { city, travelSec } = ctx;
  return {
    icon: citySprite(false),
    kicker: `Ciudad de ${c.playerName}`,
    title: c.name,
    body: (
      <>
        <StatRow>
          <Stat icon={<IconTemple size={16} />} label="Nivel de la Intendencia">
            Intendencia {c.townHall}
          </Stat>
          <Stat icon={<IconShield size={16} />} label="Nivel de la muralla" tone={c.wall ? "default" : "muted"}>
            {c.wall ? `Muralla ${c.wall} · +${c.wall * 10}%` : "Sin muralla"}
          </Stat>
        </StatRow>
        <PlotActions
          attack={
            attackNextStep(ctx) ?? (
              <AttackForm
                originCityId={city.id}
                originName={city.name}
                available={unitsAtHome(city)}
                shipsDocked={city.ships}
                travelSec={travelSec}
                target={{ cityId: c.id }}
                trainHref={trainHref(city)}
                submitLabel={`Atacar ${c.name}`}
              />
            )
          }
          transport={
            <TransportForm
              originCityId={city.id}
              originName={city.name}
              targetCityId={c.id}
              have={floorBag(city.res)}
              shipsDocked={city.ships}
              travelSec={travelSec}
            />
          }
        />
      </>
    ),
  };
}
