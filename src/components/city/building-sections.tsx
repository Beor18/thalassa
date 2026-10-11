import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BALANCE, UNITS, UNIT_TYPES, type BuildingType } from "@/game/data";
import {
  ambrosiaToFinish,
  buildingLevel,
  canTrain,
  hasTech,
  luxuryMultiplier,
  researchMultiplier,
  shipPrice,
  wineUse,
  type BuildingState,
} from "@/game/engine";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClass } from "@/components/ui/button";
import { Countdown, TimeProgress } from "@/components/ui/countdown";
import { CostList, ResIcon } from "@/components/ui/res";
import { buildingDescription, buildingName, resourceLabel, unitName } from "@/game/names";
import { getI18n } from "@/i18n/server";
import { buyShipAction, finishNowAction } from "@/server/actions";
import type { Game } from "@/server/game-context";
import { getDestinations } from "@/server/queries";
import { Block, Disclosure, Meter, Reason, Stat, StatGrid, jumpLink } from "./bits";
import { FaceIcon, IconBox, IconChevron, IconColumns, IconPencil, IconShield, IconShip } from "./icons";
import { asPlayer, slotHref, totalShips, unitCount } from "./lib";
import { PanelTabs } from "./panel-tabs";
import { PopulationBar } from "./population";
import { RenameCityForm } from "./rename-city-form";
import { ScientistsControl } from "./scientists-control";
import { TrainingPicker, type UnitOption } from "./train-unit-form";
import { TransportForm, type Destination } from "./transport-form";
import { TroopsAway, troopMissions } from "./troops-away";
import { WineControl } from "./wine-control";
import { NectarHint } from "./work-blocks";

/** Buildings whose panel leads with what they do (their own action); their upgrade is a secondary row. */
export const FUNCTION_FIRST = new Set<BuildingType>(["academy", "tavern", "barracks", "port"]);

export function BuildingSection({ game, building }: { game: Game; building: BuildingState }) {
  switch (building.type) {
    case "town_hall":
      return <TownHallSection game={game} />;
    case "academy":
      return <AcademySection game={game} />;
    case "warehouse":
      return <WarehouseSection game={game} />;
    case "tavern":
      return <TavernSection game={game} />;
    case "museum":
      return <MuseumSection level={building.level} />;
    case "barracks":
      return <BarracksSection game={game} />;
    case "port":
      return <PortSection game={game} />;
    case "wall":
      return <WallSection level={building.level} />;
    case "carpenter":
      return <CarpenterSection level={building.level} />;
    case "stonemason":
      return <StonemasonSection game={game} level={building.level} />;
    case "palace":
      return <PalaceSection game={game} level={building.level} />;
  }
}

/** "How it works" text for the ⓘ button: what the building does and the rules behind its numbers. */
export async function BuildingInfo({ game, type, level }: { game: Game; type: BuildingType; level: number }) {
  const { t, lang, fmt } = await getI18n();
  const speed = game.snapshot.speed;
  const rules: string[] = [];
  switch (type) {
    case "town_hall": {
      const tax = fmt(BALANCE.goldPerCitizen * speed);
      rules.push(
        t({
          en: "Population grows while satisfaction is higher than the number of citizens.",
          es: "La población crece mientras la satisfacción supere a los habitantes.",
        }),
        t({ en: `Each idle citizen pays ${tax} gold per hour.`, es: `Cada ciudadano libre paga ${tax} de oro por hora.` }),
      );
      break;
    }
    case "academy":
      rules.push(
        t({
          en: "Each scientist comes from an idle citizen: adds research and is paid a gold wage.",
          es: "Cada científico sale de un ciudadano libre: suma investigación y cobra sueldo en oro.",
        }),
      );
      break;
    case "warehouse": {
      const cap = fmt(BALANCE.storagePerWarehouseLevel * level);
      const safe = fmt(BALANCE.safePerWarehouseLevel * level);
      rules.push(
        t({ en: `This warehouse adds ${cap} capacity and keeps ${safe} safe.`, es: `Este depósito suma ${cap} de capacidad y ${safe} a salvo.` }),
        t({ en: "Anything above the cap is lost.", es: "Lo que pasa del tope se pierde." }),
      );
      break;
    }
    case "tavern": {
      const base = fmt(BALANCE.tavernHappinessPerLevel * level);
      const per = BALANCE.winePerServedLevel;
      rules.push(
        t({
          en: `The tavern adds +${base} satisfaction. Each level of wine served adds +${per} more and uses wine every hour.`,
          es: `La taberna suma +${base} de satisfacción. Cada nivel de vino servido suma +${per} más y gasta vino cada hora.`,
        }),
      );
      break;
    }
    case "barracks":
      rules.push(
        t({
          en: "Each soldier comes from an idle citizen and is paid a gold wage.",
          es: "Cada soldado sale de un ciudadano libre y cobra sueldo en oro.",
        }),
        t({ en: "Each level cuts training time by 2%, up to 40%.", es: "Cada nivel acorta el entrenamiento 2%, hasta 40%." }),
      );
      break;
    case "port": {
      const cargo = fmt(BALANCE.shipCapacity);
      rules.push(
        t({
          en: `Each ship carries ${cargo} cargo or ${BALANCE.unitsPerShip} soldiers. Every new ship costs a bit more.`,
          es: `Cada barco lleva ${cargo} de carga o ${BALANCE.unitsPerShip} soldados. Cada barco nuevo cuesta un poco más.`,
        }),
      );
      break;
    }
    case "wall":
      rules.push(
        t({
          en: "Every two enemy catapults cancel one wall level during an assault.",
          es: "Dos catapultas enemigas anulan un nivel de muralla durante el asalto.",
        }),
      );
      break;
    case "carpenter":
      rules.push(t({ en: "Total wood savings top out at 50%.", es: "El ahorro total de madera llega hasta 50%." }));
      break;
    case "stonemason":
      rules.push(
        t({
          en: "Only pays off if people are working the island's mine.",
          es: "Solo rinde si tenés gente trabajando en la mina de la isla.",
        }),
      );
      break;
    case "palace":
      rules.push(
        t({
          en: `To found one, pick an island with a free spot on the map and send settlers from the ${buildingName("port", lang)}.`,
          es: `Para fundar, elegí en el mapa una isla con lugar libre y mandá colonos desde el ${buildingName("port", lang)}.`,
        }),
      );
      break;
  }
  return (
    <ul className="flex flex-col gap-1">
      <li className="font-bold text-ink">{buildingDescription(type, lang)}</li>
      {rules.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  );
}

async function TownHallSection({ game }: { game: Game }) {
  const { t, lang, fmt, fmtSigned } = await getI18n();
  const { city } = game;
  const r = city.rates;
  const full = city.population >= r.housing - 0.5;
  const goldNet = r.goldIncome - r.goldUpkeep;
  const tavern = city.buildings.find((b) => b.type === "tavern");
  return (
    <>
      <Block title={t({ en: "Population", es: "Población" })}>
        <PopulationBar population={city.population} housing={r.housing} growth={r.growth} />
        <StatGrid cols={3}>
          <Stat
            icon={<FaceIcon happy={r.netHappiness > 0} />}
            label={t({ en: "Satisfaction", es: "Satisfacción" })}
            value={fmtSigned(r.netHappiness)}
            tone={r.netHappiness > 0 ? "good" : r.netHappiness < 0 ? "bad" : undefined}
            tip={t({
              en: `${fmt(r.happiness)} satisfaction for ${fmt(city.population)} citizens`,
              es: `${fmt(r.happiness)} de satisfacción para ${fmt(city.population)} habitantes`,
            })}
          />
          <Stat
            icon={<ResIcon kind="citizens" size={20} />}
            label={t({ en: "Idle", es: "Libres" })}
            value={fmt(r.freeCitizens)}
            tip={t({ en: "Idle citizens pay taxes", es: "Ciudadanos sin trabajo: pagan impuestos" })}
            align="center"
          />
          <Stat
            icon={<ResIcon kind="gold" size={20} />}
            label={t({ en: "Gold/h", es: "Oro/h" })}
            value={fmtSigned(goldNet)}
            tone={goldNet < 0 ? "bad" : "gold"}
            tip={t({
              en: `Taxes +${fmt(r.goldIncome)}, wages −${fmt(r.goldUpkeep)}`,
              es: `Impuestos +${fmt(r.goldIncome)}, gastos −${fmt(r.goldUpkeep)}`,
            })}
            align="end"
          />
        </StatGrid>
        {full ? (
          <Reason>
            {t({
              en: `City full: upgrade the ${buildingName("town_hall", lang)} for more housing.`,
              es: `Ciudad llena: subí la ${buildingName("town_hall", lang)} para sumar viviendas.`,
            })}
          </Reason>
        ) : r.netHappiness <= 0 ? (
          <Reason>
            {t({ en: "Your people are unhappy and won't grow.", es: "La gente no está contenta y no crece." })}{" "}
            {tavern ? (
              <Link href={slotHref(city.id, tavern.slot)} scroll={false} className="underline underline-offset-4">
                {t({ en: `Serve wine at the ${buildingName("tavern", lang)}`, es: `Serví vino en la ${buildingName("tavern", lang)}` })}
              </Link>
            ) : (
              t({ en: `Build a ${buildingName("tavern", lang)}.`, es: `Construí una ${buildingName("tavern", lang)}.` })
            )}
          </Reason>
        ) : null}
      </Block>
      <Disclosure summary={t({ en: "Rename city", es: "Cambiar nombre de la ciudad" })} icon={<IconPencil size={15} />}>
        <RenameCityForm cityId={city.id} name={city.name} />
      </Disclosure>
    </>
  );
}

async function AcademySection({ game }: { game: Game }) {
  const { t, fmt } = await getI18n();
  const { snapshot, city } = game;
  const p = asPlayer(snapshot);
  const r = city.rates;
  const max = Math.min(r.maxScientists, city.scientists + r.freeCitizens);
  return (
    <Block>
      <ScientistsControl
        key={`${city.scientists}-${max}`}
        cityId={city.id}
        current={city.scientists}
        max={max}
        seats={r.maxScientists}
        freeCitizens={r.freeCitizens}
        researchPer={BALANCE.researchPerScientist * researchMultiplier(p) * snapshot.speed}
        goldPer={BALANCE.scientistUpkeep * snapshot.speed}
      />
      <Link href="/investigacion" className={jumpLink}>
        <ResIcon kind="research" size={18} />
        {t({
          en: `Research · you have ${fmt(snapshot.player.research)} points`,
          es: `Investigar · tenés ${fmt(snapshot.player.research)} puntos`,
        })}
        <IconChevron size={14} />
      </Link>
    </Block>
  );
}

async function WarehouseSection({ game }: { game: Game }) {
  const { t, fmt } = await getI18n();
  const { city } = game;
  const r = city.rates;
  return (
    <Block title={t({ en: "Storage", es: "Almacén" })}>
      <StatGrid>
        <Stat
          icon={<IconBox size={20} className="text-bronze-dark" />}
          label={t({ en: "Capacity per resource", es: "Capacidad por recurso" })}
          value={fmt(r.storage)}
        />
        <Stat
          icon={<IconShield size={20} className="text-bronze-dark" />}
          label={t({ en: "Safe from raids", es: "A salvo de saqueos" })}
          value={fmt(r.safe)}
          tone="gold"
          tip={t({ en: "Per resource: this can never be stolen", es: "Por recurso: esto nunca te lo pueden robar" })}
          align="end"
        />
      </StatGrid>
      <ul className="flex flex-col gap-1.5" aria-label={t({ en: "Stock per resource", es: "Depósito por recurso" })}>
        {(["wood", "wine", "marble", "crystal", "sulfur"] as const).map((res) => {
          const have = city.res[res];
          const full = have >= r.storage - 0.5;
          return (
            <li key={res} className="flex items-center gap-2 text-sm">
              <ResIcon kind={res} size={20} />
              <Meter value={have} max={r.storage} danger={full} className="min-w-0 flex-1" />
              <span className={full ? "w-14 shrink-0 text-right font-bold text-danger tabular" : "w-14 shrink-0 text-right text-ink-soft tabular"}>
                {fmt(have)}
                <span className="sr-only">
                  {t({ en: ` of ${fmt(r.storage)}${full ? ", full" : ""}`, es: ` de ${fmt(r.storage)}${full ? ", lleno" : ""}` })}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Block>
  );
}

function TavernSection({ game }: { game: Game }) {
  const { snapshot, city } = game;
  const p = asPlayer(snapshot);
  const max = buildingLevel(city, "tavern");
  const r = city.rates;
  return (
    <WineControl
      key={`${city.wineLevel}-${max}`}
      cityId={city.id}
      current={city.wineLevel}
      max={max}
      wineByLevel={Array.from({ length: max + 1 }, (_, l) => wineUse(p, l) * snapshot.speed)}
      happinessPerLevel={BALANCE.winePerServedLevel}
      stock={city.res.wine}
      production={r.luxuryResource === "wine" ? r.luxury : 0}
    />
  );
}

/** One big number for buildings that only give a passive bonus. */
function EffectTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <StatGrid>
      <Stat wide icon={icon} label={label} value={value} tone="good" />
    </StatGrid>
  );
}

async function MuseumSection({ level }: { level: number }) {
  const { t, fmt } = await getI18n();
  return (
    <EffectTile
      icon={<FaceIcon />}
      value={`+${fmt(BALANCE.museumHappinessPerLevel * level)}`}
      label={t({ en: "Satisfaction from the works on display", es: "Satisfacción por las obras expuestas" })}
    />
  );
}

async function WallSection({ level }: { level: number }) {
  const { t } = await getI18n();
  return (
    <EffectTile
      icon={<IconShield size={22} className="text-sea-700" />}
      value={`+${10 * level}%`}
      label={t({ en: "Defense for the troops guarding the city", es: "Defensa de las tropas que cuidan la ciudad" })}
    />
  );
}

async function CarpenterSection({ level }: { level: number }) {
  const { t } = await getI18n();
  return (
    <EffectTile
      icon={<ResIcon kind="wood" size={22} />}
      value={`−${Math.min(50, 2 * level)}%`}
      label={t({ en: "Wood on every build in the city", es: "Madera en todas las obras de la ciudad" })}
    />
  );
}

async function StonemasonSection({ game, level }: { game: Game; level: number }) {
  const { t, lang, fmt1 } = await getI18n();
  const { city } = game;
  const lux = city.rates.luxuryResource;
  const extra = city.rates.luxury - city.rates.luxury / luxuryMultiplier(city);
  const label = resourceLabel(lux, lang);
  return (
    <>
      <StatGrid>
        <Stat
          icon={<ResIcon kind={lux} size={22} />}
          label={t({ en: `${label} output`, es: `Más ${label.toLowerCase()}` })}
          value={`+${3 * level}%`}
          tone="good"
        />
        <Stat
          icon={<ResIcon kind={lux} size={22} />}
          label={t({ en: "Extra per hour", es: "Extra por hora" })}
          value={`+${fmt1(extra)}/h`}
          tone={extra > 0 ? "good" : undefined}
          align="end"
        />
      </StatGrid>
      {city.luxWorkers === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <Reason>{t({ en: "Nobody is working the mine.", es: "Nadie trabaja en la mina." })}</Reason>
          <Link href={`/isla/${city.islandId}`} className={jumpLink}>
            {t({ en: "Go to the island", es: "Ir a la isla" })}
            <IconChevron size={14} />
          </Link>
        </div>
      )}
    </>
  );
}

async function PalaceSection({ game, level }: { game: Game; level: number }) {
  const { t, lang, fmt } = await getI18n();
  const { snapshot, city } = game;
  const used = snapshot.cities.length - 1;
  const sailing = snapshot.missions.filter((m) => m.kind === "colonize").length;
  const room = level - used - sailing;
  const cost = BALANCE.colonizeCost;
  const hasPort = buildingLevel(city, "port") > 0;
  return (
    <Block title={t({ en: "Colonies", es: "Colonias" })}>
      <StatGrid>
        <Stat
          icon={<IconColumns size={20} className="text-bronze-dark" />}
          label={
            sailing
              ? t({ en: `Founded · ${fmt(sailing)} on the way`, es: `Fundadas · ${fmt(sailing)} en camino` })
              : t({ en: "Founded", es: "Fundadas" })
          }
          value={`${fmt(used)} / ${fmt(level)}`}
        />
        <Stat
          icon={<IconColumns size={20} className="text-success" />}
          label={room === 1 ? t({ en: "Room for 1 more", es: "Lugar para 1 más" }) : t({ en: "Free slots", es: "Lugar libre" })}
          value={fmt(Math.max(0, room))}
          tone={room > 0 ? "good" : undefined}
          align="end"
        />
      </StatGrid>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-xs font-bold text-ink-soft uppercase">{t({ en: "To found", es: "Para fundar" })}</span>
        <span className={city.ships > 0 ? "inline-flex items-center gap-1 font-bold tabular" : "inline-flex items-center gap-1 font-bold text-danger tabular"}>
          <IconShip size={17} />1<span className="sr-only">{t({ en: " ship", es: " barco" })}</span>
        </span>
        <CostList
          cost={{ wood: cost.wood, gold: cost.gold, citizens: cost.citizens }}
          have={{ wood: city.res.wood, gold: snapshot.player.gold, citizens: city.rates.freeCitizens }}
        />
      </div>
      {room > 0 ? (
        <Link href="/mundo" className={buttonClass("secondary", "md", "w-full")}>
          {t({ en: "Find an island on the map", es: "Buscar isla en el mapa" })}
        </Link>
      ) : (
        <Reason>
          {t({
            en: `Upgrade the ${buildingName("palace", lang)} to found another colony.`,
            es: `Mejorá el ${buildingName("palace", lang)} para fundar otra colonia.`,
          })}
        </Reason>
      )}
      {!hasPort && (
        <Reason>
          {t({ en: `You need a ${buildingName("port", lang)}.`, es: `Necesitás un ${buildingName("port", lang)}.` })}{" "}
          <Link href={slotHref(city.id, 12)} scroll={false} className="underline underline-offset-4">
            {t({ en: "Build one at the dock", es: "Construir uno en el muelle" })}
          </Link>
        </Reason>
      )}
    </Block>
  );
}

async function BarracksSection({ game }: { game: Game }) {
  const { t, lang, fmt } = await getI18n();
  const { snapshot, city } = game;
  const p = asPlayer(snapshot);
  const barracksCut = 1 - Math.min(0.4, buildingLevel(city, "barracks") * 0.02);
  const drill = hasTech(p, "drill") ? 0.9 : 1;
  const queue = [...city.training].sort((a, b) => a.endsAt - b.endsAt);
  const lastEnd = queue.reduce((m, b) => Math.max(m, b.endsAt), 0);
  const price = lastEnd > snapshot.now ? ambrosiaToFinish(snapshot.now, lastEnd) : 0;
  const away = troopMissions(snapshot.missions, city.id);
  const atHome = UNIT_TYPES.reduce((s, u) => s + (city.units[u] ?? 0), 0);
  // Same net gold per hour the header shows: every city, minus the troops at sea.
  const goldPerHour =
    snapshot.cities.reduce((s, c) => s + c.rates.goldIncome - c.rates.goldUpkeep, 0) - snapshot.player.awayUpkeep * snapshot.speed;

  const units: UnitOption[] = UNIT_TYPES.map((u) => {
    const def = UNITS[u];
    const lock = canTrain(p, city, u, lang);
    const needsTech = def.requires.tech != null && !hasTech(p, def.requires.tech);
    return {
      unit: u,
      name: unitName(u, lang),
      image: def.image,
      attack: def.attack,
      defense: def.defense,
      upkeep: def.upkeep * snapshot.speed,
      cost: def.cost,
      secondsPerUnit: ((def.time * drill) / snapshot.speed) * barracksCut,
      home: city.units[u] ?? 0,
      lock,
      unlock: lock && needsTech ? { href: "/investigacion", label: t({ en: "Research", es: "Investigar" }) } : null,
    };
  });

  return (
    <>
      <Block
        title={t({ en: "Troops", es: "Tropas" })}
        aside={
          atHome > 0
            ? t({ en: `${fmt(atHome)} in the city`, es: `${fmt(atHome)} en la ciudad` })
            : t({ en: "none in the city", es: "ninguna en la ciudad" })
        }
      >
        <TrainingPicker
          cityId={city.id}
          units={units}
          freeCitizens={city.rates.freeCitizens}
          res={city.res}
          goldPerHour={goldPerHour}
          taxPerCitizen={BALANCE.goldPerCitizen * snapshot.speed}
        />
      </Block>

      {queue.length > 0 && (
        <Block title={t({ en: "In training", es: "En entrenamiento" })} tone="inset">
          <ul className="flex flex-col gap-2">
            {queue.map((b) => (
              <li key={b.id} className="flex items-center gap-2.5">
                <Image src={UNITS[b.unit].image} alt="" width={64} height={64} sizes="32px" className="size-8 shrink-0 object-contain" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-bold">{unitCount(b.unit, b.count, lang)}</span>
                    <span className="shrink-0 font-bold text-ink-soft">
                      {b.startedAt > snapshot.now ? t({ en: "Queued · ", es: "En espera · " }) : ""}
                      <Countdown endsAt={b.endsAt} serverNow={snapshot.now} />
                    </span>
                  </p>
                  <TimeProgress startedAt={b.startedAt} endsAt={b.endsAt} serverNow={snapshot.now} />
                </div>
              </li>
            ))}
          </ul>
          {price > 0 &&
            (snapshot.player.ambrosia >= price ? (
              <ActionButton
                variant="ambrosia"
                className="w-full"
                pendingLabel={t({ en: "Finishing…", es: "Terminando…" })}
                action={finishNowAction.bind(null, { cityId: city.id, what: "training" })}
              >
                {t({ en: `Finish now for ${fmt(price)} Nectar`, es: `Terminar ya por ${fmt(price)} de néctar` })}
              </ActionButton>
            ) : (
              <NectarHint price={price} msLeft={lastEnd - snapshot.now} />
            ))}
        </Block>
      )}

      {away.length > 0 && (
        <Block title={t({ en: "Away from the city", es: "Fuera de la ciudad" })}>
          <TroopsAway missions={away} now={snapshot.now} />
        </Block>
      )}
    </>
  );
}

async function PortSection({ game }: { game: Game }) {
  const { t, lang, fmt } = await getI18n();
  const { snapshot, city } = game;
  const p = asPlayer(snapshot);
  const r = city.rates;
  const price = shipPrice(p, totalShips(snapshot));
  const atSea = snapshot.missions.filter((m) => m.originCityId === city.id).reduce((s, m) => s + m.ships, 0);
  const full = city.ships >= r.maxShips;
  const broke = snapshot.player.gold < price;
  const rows = await getDestinations(snapshot.player.id);
  // Own cities first, then neighbours on this island, then the rest of the world (by island).
  const destinations: Destination[] = rows
    .filter((d) => d.id !== city.id)
    .map((d) => ({
      id: d.id,
      name: d.name,
      mine: Boolean(d.isMine),
      near: d.islandId === city.islandId,
      label: d.isMine ? `${d.name} · ${d.islandName}` : `${d.name} (${d.playerName}) · ${d.islandName}`,
    }));

  const fleet = (
    <>
      <StatGrid>
        <Stat
          icon={<IconShip size={20} className="text-sea-700" />}
          label={t({ en: "Docked / berths", es: "En el puerto / amarras" })}
          value={`${fmt(city.ships)} / ${fmt(r.maxShips)}`}
          tip={t({
            en: `Each ship carries ${fmt(BALANCE.shipCapacity)} cargo or ${BALANCE.unitsPerShip} soldiers`,
            es: `Cada barco lleva ${fmt(BALANCE.shipCapacity)} de carga o ${BALANCE.unitsPerShip} soldados`,
          })}
        />
        <Stat icon={<IconShip size={20} className="text-ink-soft" />} label={t({ en: "At sea", es: "Navegando" })} value={fmt(atSea)} align="end" />
      </StatGrid>
      <ActionButton
        className="w-full"
        disabled={full || broke}
        pendingLabel={t({ en: "Buying…", es: "Comprando…" })}
        action={buyShipAction.bind(null, { cityId: city.id })}
      >
        {t({ en: `Buy a ship for ${fmt(price)} gold`, es: `Comprar barco por ${fmt(price)} de oro` })}
      </ActionButton>
      {full ? (
        <Reason className="-mt-1">
          {t({
            en: `No free berths: upgrade the ${buildingName("port", lang)} for more.`,
            es: `No quedan amarras: subí el ${buildingName("port", lang)} para sumar más.`,
          })}
        </Reason>
      ) : broke ? (
        <Reason tone="missing" className="-mt-1">
          {t({ en: `You need ${fmt(price - snapshot.player.gold)} more gold.`, es: `Te falta ${fmt(price - snapshot.player.gold)} de oro.` })}
        </Reason>
      ) : null}
    </>
  );

  if (destinations.length === 0) return <Block title={t({ en: "Ships", es: "Barcos" })}>{fleet}</Block>;

  return (
    <PanelTabs
      label={buildingName("port", lang)}
      initial={city.ships > 0 ? "send" : "fleet"}
      tabs={[
        {
          id: "send",
          label: t({ en: "Send goods", es: "Enviar recursos" }),
          content: (
            <TransportForm
              key={city.ships}
              cityId={city.id}
              ships={city.ships}
              shipCapacity={BALANCE.shipCapacity}
              stock={city.res}
              destinations={destinations}
            />
          ),
        },
        { id: "fleet", label: t({ en: "Ships", es: "Barcos" }), badge: fmt(city.ships), content: fleet },
      ]}
    />
  );
}

/** Small "Level 4/25" badge for the panel header, gold when the building is at its top level. */
export async function LevelChip({ level, max }: { level: number; max: number }) {
  const { t } = await getI18n();
  const top = level >= max;
  return (
    <span
      className={
        top
          ? "inline-flex shrink-0 items-center rounded-full bg-gradient-to-b from-gold-light to-gold px-2 py-px text-xs font-extrabold text-bronze-deep ring-1 ring-bronze/60 tabular"
          : "inline-flex shrink-0 items-center rounded-full bg-sea-900 px-2 py-px text-xs font-extrabold text-gold ring-1 ring-gold/50 tabular"
      }
    >
      <span className="sr-only">
        {top ? t({ en: `Level ${level}, the max`, es: `Nivel ${level}, el máximo` }) : t({ en: `Level ${level} of ${max}`, es: `Nivel ${level} de ${max}` })}
      </span>
      <span aria-hidden>
        {t({ en: `Level ${level}`, es: `Nivel ${level}` })}
        {top ? t({ en: " · max", es: " · máx." }) : <span className="font-bold text-gold/65">/{max}</span>}
      </span>
    </span>
  );
}
