import Link from "next/link";
import type { ReactNode } from "react";
import { BALANCE, CITY_SLOTS, RESOURCES, RESOURCE_INFO, UNIT_TYPES, type Resource } from "@/game/data";
import {
  barbarianArmy,
  barbarianLoot,
  buildingLevel,
  capitalOf,
  hasTech,
  luxuryMultiplier,
  maxLuxWorkers,
  maxWoodWorkers,
  type CityState,
  type PlayerState,
} from "@/game/engine";
import { ISLAND_FEATURE_IMAGE } from "@/game/layout";
import type { IslandCityView, IslandView, MissionView } from "@/server/queries";
import type { GameCity } from "@/server/game-context";
import { buttonClass } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import { CostList, ResIcon } from "@/components/ui/res";
import { fmt, fmt1, fmtDuration } from "@/lib/format";
import { UnitStrip } from "@/components/military/units";
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
import { IconLock, IconSwords } from "./icons";
import { PanelLink, type PanelDef } from "./panel-host";
import { MINE_NAME } from "./names";
import { Sprite, Token } from "./sprite";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const freeLandSlot = (c: CityState) =>
  CITY_SLOTS.find((s) => s.kind === "land" && !c.buildings.some((b) => b.slot === s.slot))?.slot ?? 1;
const slotOf = (c: CityState, type: CityState["buildings"][number]["type"]) => c.buildings.find((b) => b.type === type)?.slot;
const floorBag = (res: Record<Resource, number>) =>
  Object.fromEntries(RESOURCES.map((r) => [r, Math.floor(res[r])])) as Record<Resource, number>;

function Divider() {
  return <hr className="border-parchment-3" />;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-extrabold tracking-wider text-bronze-dark uppercase">{children}</h3>;
}

function FeatureIntro({ image, fallback, children }: { image: string; fallback: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-20 shrink-0 place-items-center">
        <Sprite src={image} fallback={<Token className="w-16">{fallback}</Token>} />
      </span>
      <div className="min-w-0 text-[15px] leading-snug text-ink-soft">{children}</div>
    </div>
  );
}

function LevelProgress({ level, donated, nextCost }: { level: number; donated: number; nextCost: number }) {
  const pct = Math.max(0, Math.min(100, (donated / nextCost) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-bold">Hacia el nivel {level + 1}</span>
        <span className="tabular inline-flex items-center gap-1 text-ink-soft">
          <ResIcon kind="wood" size={16} />
          {fmt(donated)} de {fmt(nextCost)}
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-ink/15"
        role="progressbar"
        aria-label={`Donaciones para el nivel ${level + 1}`}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-bronze to-gold" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function NextStep({ title, body, href, cta }: { title: string; body: ReactNode; href: string; cta: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-parchment-2/70 p-3 ring-1 ring-parchment-3">
      <p className="font-bold">{title}</p>
      <p className="text-sm text-ink-soft">{body}</p>
      <Link href={href} className={buttonClass("primary", "md", "self-start")}>
        {cta}
      </Link>
    </div>
  );
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-parchment-2/60 px-3 py-2 ring-1 ring-parchment-3">
          <dt className="text-xs text-ink-soft">{label}</dt>
          <dd className="tabular font-bold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Explains why workers can't be assigned from the active city, and how to fix it. */
function NotHere({ ctx, what }: { ctx: IslandCtx; what: string }) {
  const here = ctx.myCities.filter((c) => c.islandId === ctx.island.id);
  const firstFree = Array.from({ length: 8 }, (_, i) => i).find((s) => !ctx.island.cities.some((c) => c.slot === s));
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-parchment-2/70 p-3 ring-1 ring-parchment-3">
      <p className="font-bold">
        Solo trabajan {what} las ciudades de {ctx.island.name}.
      </p>
      {here.length > 0 ? (
        <>
          <p className="text-sm text-ink-soft">
            Estás jugando desde {ctx.city.name}, en {ctx.city.island.name}. Pasá a tu ciudad de esta isla.
          </p>
          {here.map((c) => (
            <UseCityButton key={c.id} cityId={c.id} name={c.name} />
          ))}
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">No tenés ciudades en esta isla. Fundá una colonia en un lugar libre de la costa.</p>
          {firstFree !== undefined && (
            <PanelLink panel={`plot-${firstFree}`} className={buttonClass("secondary", "md", "self-start")}>
              Ver un lugar libre
            </PanelLink>
          )}
        </>
      )}
    </div>
  );
}

/** Where to train more soldiers from the active city (its Cuartel), if it has one. */
const trainHref = (city: GameCity) => {
  const barracks = slotOf(city, "barracks");
  return barracks === undefined ? undefined : `/ciudad/${city.id}?slot=${barracks}`;
};

function attackNextStep(ctx: IslandCtx): ReactNode {
  const { city } = ctx;
  const hasUnits = UNIT_TYPES.some((t) => (city.units[t] ?? 0) > 0);
  const barracks = slotOf(city, "barracks");
  if (!hasUnits && ctx.troopsAway.length > 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-parchment-2/70 p-3 ring-1 ring-parchment-3">
        <p className="font-bold">Tus tropas están en camino</p>
        <p className="text-sm text-ink-soft">No queda nadie en {city.name} para atacar. Esperá a que vuelvan o entrená más.</p>
        <TroopsAway missions={ctx.troopsAway} now={ctx.now} />
        {barracks !== undefined && (
          <Link href={`/ciudad/${city.id}?slot=${barracks}`} className={buttonClass("secondary", "md", "self-start")}>
            Ir al Cuartel
          </Link>
        )}
      </div>
    );
  }
  if (!hasUnits && barracks === undefined) {
    return (
      <NextStep
        title="Construí un Cuartel"
        body={`Sin tropas no hay ataque. Levantá un Cuartel en ${city.name} y entrená lanceros.`}
        href={`/ciudad/${city.id}?slot=${freeLandSlot(city)}`}
        cta="Construir un Cuartel"
      />
    );
  }
  if (!hasUnits) {
    return (
      <NextStep
        title="Entrená tropas"
        body={`No hay soldados en casa en ${city.name}. Los lanceros son baratos y firmes.`}
        href={`/ciudad/${city.id}?slot=${barracks}`}
        cta="Ir al Cuartel"
      />
    );
  }
  if (city.ships === 0) {
    const port = slotOf(city, "port");
    if (ctx.shipsBackAt && port !== undefined) {
      return (
        <NextStep
          title="Tus barcos están en el mar"
          body={
            <>
              El primero vuelve en <Countdown endsAt={ctx.shipsBackAt} serverNow={ctx.now} />. Si no querés esperar, comprá otro en el Puerto.
            </>
          }
          href={`/ciudad/${city.id}?slot=${port}`}
          cta="Ir al Puerto"
        />
      );
    }
    return (
      <NextStep
        title={port === undefined ? "Hacé un Puerto" : "Comprá un barco"}
        body="Las tropas viajan en barco, aunque el blanco esté en tu misma isla. Cada barco lleva 50 soldados."
        href={`/ciudad/${city.id}?slot=${port ?? 12}`}
        cta={port === undefined ? "Construir un Puerto" : "Ir al Puerto"}
      />
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
  return {
    kicker: `Nivel ${level}`,
    title: "Aserradero",
    body: (
      <>
        <FeatureIntro image={ISLAND_FEATURE_IMAGE.sawmill} fallback={<ResIcon kind="wood" size={30} />}>
          <p>
            Cada trabajador tala <strong className="text-ink">{fmt1(perWorker)} de madera</strong> por hora. Hay lugar para{" "}
            {fmt(capacity)} trabajadores por ciudad.
          </p>
        </FeatureIntro>
        <LevelProgress level={level} donated={island.sawmill.donated} nextCost={island.sawmill.nextCost} />
        {here ? (
          <>
            <WorkersForm
              key={`${city.id}-${city.woodWorkers}-${city.rates.freeCitizens}`}
              cityId={city.id}
              field="woodWorkers"
              current={city.woodWorkers}
              max={Math.min(capacity, city.woodWorkers + city.rates.freeCitizens)}
              capacity={capacity}
              free={city.rates.freeCitizens}
              perWorker={perWorker}
              resource="wood"
              goldPerCitizen={BALANCE.goldPerCitizen * speed}
            />
            <Divider />
            <DonateForm
              cityId={city.id}
              target="sawmill"
              have={Math.floor(city.res.wood)}
              remaining={Math.max(0, island.sawmill.nextCost - island.sawmill.donated)}
              nextLevel={level + 1}
            />
          </>
        ) : (
          <NotHere ctx={ctx} what="el aserradero" />
        )}
      </>
    ),
  };
}

export function minePanel(ctx: IslandCtx): PanelDef {
  const { island, city, speed, player } = ctx;
  const here = city.islandId === island.id;
  const resource = island.resource;
  const name = MINE_NAME[resource];
  const level = island.mine.level;
  const capacity = maxLuxWorkers(level);
  const unlocked = hasTech(player, "wealth");
  const perWorker = BALANCE.luxuryPerWorker * speed * (here ? luxuryMultiplier(city) : 1);
  const label = RESOURCE_INFO[resource].label.toLowerCase();
  return {
    kicker: `Nivel ${level}`,
    title: name,
    body: (
      <>
        <FeatureIntro image={ISLAND_FEATURE_IMAGE[resource]} fallback={<ResIcon kind={resource} size={30} />}>
          <p>
            El lujo de {island.name} es el {label}. Cada trabajador saca <strong className="text-ink">{fmt1(perWorker)}</strong> por hora.
          </p>
        </FeatureIntro>
        <LevelProgress level={level} donated={island.mine.donated} nextCost={island.mine.nextCost} />
        {!unlocked ? (
          <div className="flex flex-col gap-2 rounded-xl bg-sea-900 p-3 text-foam ring-1 ring-sea-500/40">
            <p className="inline-flex items-center gap-2 font-bold">
              <IconLock size={18} className="text-gold" />
              Investigá Riqueza para trabajar acá
            </p>
            <p className="text-sm text-foam/80">Destraba los trabajadores de la mina de lujo de cada isla y la Cantería.</p>
            <Link href="/investigacion" className={buttonClass("primary", "md", "self-start")}>
              Ir a Investigación
            </Link>
          </div>
        ) : here ? (
          <WorkersForm
            key={`${city.id}-${city.luxWorkers}-${city.rates.freeCitizens}`}
            cityId={city.id}
            field="luxWorkers"
            current={city.luxWorkers}
            max={Math.min(capacity, city.luxWorkers + city.rates.freeCitizens)}
            capacity={capacity}
            free={city.rates.freeCitizens}
            perWorker={perWorker}
            resource={resource}
            goldPerCitizen={BALANCE.goldPerCitizen * speed}
          />
        ) : (
          <NotHere ctx={ctx} what={`el ${name.toLowerCase()}`} />
        )}
        {here && (
          <>
            <Divider />
            <DonateForm
              cityId={city.id}
              target="mine"
              have={Math.floor(city.res.wood)}
              remaining={Math.max(0, island.mine.nextCost - island.mine.donated)}
              nextLevel={level + 1}
            />
          </>
        )}
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
  const rebuildingUntil = island.barbarians.rebuildingUntil;
  const canLeaveAt = rebuildingUntil ? rebuildingUntil - travelSec * 1000 : 0;
  const nextStep = attackNextStep(ctx);
  const cooldown = fmtDuration((BALANCE.barbarianCooldown * 1000) / speed);
  // Attacks from the active city already sailing to this camp.
  const incoming = ctx.troopsAway.filter((m) => m.kind === "attack" && m.targetIslandId === island.id && m.targetLabel.startsWith("Bárbaros"));

  return {
    kicker: `Nivel ${level}`,
    title: "Campamento bárbaro",
    body: (
      <>
        <FeatureIntro image={ISLAND_FEATURE_IMAGE.barbarians} fallback={<IconSwords size={28} />}>
          <p>
            Saqueadores acampados en {island.name}. Si los vencés te llevás su botín, el campamento sube de nivel y se rearma en {cooldown}.
          </p>
        </FeatureIntro>
        {rebuildingUntil && (
          <p className="rounded-xl bg-sea-900 px-3 py-2 text-foam ring-1 ring-sea-500/40">
            <strong>Reconstruyendo.</strong> Vuelven a estar listos en{" "}
            <strong className="text-gold">
              <Countdown endsAt={rebuildingUntil} serverNow={now} />
            </strong>
            .
          </p>
        )}
        {incoming.length > 0 && !nextStep && <TroopsAway missions={incoming} now={now} />}
        <section className="flex flex-col gap-2">
          <SectionTitle>Defensores</SectionTitle>
          <UnitStrip units={army.units} size={40} />
          <p className="text-sm text-ink-soft">
            {army.wall > 0 ? `Empalizada nivel ${army.wall}: +${army.wall * 10}% de defensa.` : "Sin empalizada."}
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <SectionTitle>Botín si ganás</SectionTitle>
          <CostList cost={loot} />
          <p className="text-sm text-ink-soft">Cada barco trae hasta {fmt(BALANCE.shipCapacity)} de botín.</p>
        </section>
        <Divider />
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
                  Si zarpás ahora llegás antes de que se rearmen y encontrás el campamento vacío. Podés salir en{" "}
                  <Countdown endsAt={canLeaveAt} serverNow={now} />.
                </>
              ) : null
            }
          />
        )}
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

function freePlotPanel(ctx: IslandCtx, slot: number): PanelDef {
  const { island, player, city, travelSec } = ctx;
  const capital = capitalOf(player);
  const palace = buildingLevel(capital, "palace");
  const colonies = player.cities.length - 1 + ctx.pendingColonies;
  const cost = BALANCE.colonizeCost;
  const port = slotOf(city, "port");
  const requirements: Requirement[] = [
    { ok: hasTech(player, "expansion"), label: "Investigar Expansión", href: "/investigacion", cta: "Investigar" },
    {
      ok: palace > colonies,
      label: palace === 0 && colonies === 0 ? `Palacio en ${capital.name}` : `Palacio nivel ${colonies + 1} en ${capital.name}`,
      href: `/ciudad/${capital.id}?slot=${slotOf(capital, "palace") ?? freeLandSlot(capital)}`,
      cta: palace === 0 ? "Construir" : "Subir",
    },
    { ok: city.res.wood >= cost.wood, label: `${fmt(cost.wood)} de madera en ${city.name}` },
    { ok: player.gold >= cost.gold, label: `${fmt(cost.gold)} de oro` },
    { ok: city.rates.freeCitizens >= cost.citizens, label: `${cost.citizens} ciudadanos libres en ${city.name}` },
    {
      ok: city.ships >= 1,
      label: `1 barco en el puerto de ${city.name}`,
      href: `/ciudad/${city.id}?slot=${port ?? 12}`,
      cta: port === undefined ? "Hacer Puerto" : "Comprar",
    },
  ];
  return {
    kicker: `Lugar ${slot + 1} de la costa`,
    title: "Lugar libre",
    body: (
      <>
        <p className="text-[15px] text-ink-soft">
          Nadie construyó acá todavía. Mandá colonos y fundá una ciudad nueva en {island.name}.
        </p>
        <section className="flex flex-col gap-2">
          <SectionTitle>Lo que cuesta</SectionTitle>
          <CostList
            cost={{ wood: cost.wood, gold: cost.gold, citizens: cost.citizens }}
            have={{ wood: city.res.wood, gold: player.gold, citizens: city.rates.freeCitizens }}
          />
        </section>
        <ColonizeForm
          originCityId={city.id}
          originName={city.name}
          islandId={island.id}
          islandName={island.name}
          slot={slot}
          requirements={requirements}
          travelSec={travelSec}
        />
      </>
    ),
  };
}

function ownPlotPanel(ctx: IslandCtx, c: IslandCityView): PanelDef {
  const { city, travelSec } = ctx;
  const full = ctx.myCities.find((x) => x.id === c.id);
  const isActive = c.id === city.id;
  return {
    kicker: isActive ? "Tu ciudad · la que estás jugando" : "Tu ciudad",
    title: c.name,
    body: (
      <>
        <Facts
          items={[
            ["Intendencia", `Nivel ${c.townHall}`],
            ["Muralla", c.wall ? `Nivel ${c.wall}` : "Sin muralla"],
            ...(full
              ? ([
                  ["Ciudadanos", fmt(full.population)],
                  ["Barcos en el puerto", fmt(full.ships)],
                ] as [string, ReactNode][])
              : []),
          ]}
        />
        <Link href={`/ciudad/${c.id}`} className={buttonClass("primary", "lg", "w-full")}>
          Ir a {c.name}
        </Link>
        {!isActive && (
          <>
            <Divider />
            <TransportForm
              originCityId={city.id}
              originName={city.name}
              targetCityId={c.id}
              targetName={c.name}
              have={floorBag(city.res)}
              shipsDocked={city.ships}
              travelSec={travelSec}
              primary={false}
            />
          </>
        )}
      </>
    ),
  };
}

function rivalPlotPanel(ctx: IslandCtx, c: IslandCityView): PanelDef {
  const { city, travelSec } = ctx;
  return {
    kicker: `Ciudad de ${c.playerName}`,
    title: c.name,
    body: (
      <>
        <Facts
          items={[
            ["Jugador", c.playerName],
            ["Intendencia", `Nivel ${c.townHall}`],
            ["Muralla", c.wall ? `Nivel ${c.wall} · +${c.wall * 10}% defensa` : "Sin muralla"],
            ["Viaje desde " + city.name, fmtDuration(travelSec * 1000)],
          ]}
        />
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
              targetName={c.name}
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
