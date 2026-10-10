import Image from "next/image";
import Link from "next/link";
import { BALANCE, RESOURCES, RESOURCE_INFO, UNITS, UNIT_TYPES, type BuildingType } from "@/game/data";
import {
  ambrosiaToFinish,
  buildingLevel,
  canTrain,
  hasTech,
  researchMultiplier,
  shipPrice,
  wineUse,
  type BuildingState,
} from "@/game/engine";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClass } from "@/components/ui/button";
import { Countdown, TimeProgress } from "@/components/ui/countdown";
import { CostList, ResIcon } from "@/components/ui/res";
import { fmt, fmt1, fmtSigned } from "@/lib/format";
import { buyShipAction, finishNowAction } from "@/server/actions";
import type { Game } from "@/server/game-context";
import { getDestinations } from "@/server/queries";
import { Block, Note, Reason, Stat, StatGrid } from "./bits";
import { asPlayer, slotHref, totalShips, unitCount } from "./lib";
import { RenameCityForm } from "./rename-city-form";
import { ScientistsControl } from "./scientists-control";
import { TrainUnitForm } from "./train-unit-form";
import { TransportForm, type Destination } from "./transport-form";
import { TroopsAway, troopMissions } from "./troops-away";
import { WineControl } from "./wine-control";

/** Buildings whose panel leads with what they do (their own action) instead of the upgrade. */
export const FUNCTION_FIRST = new Set<BuildingType>(["academy", "tavern", "barracks", "port"]);

const signed1 = (n: number) => (n > 0.05 ? `+${fmt1(n)}` : n < -0.05 ? `−${fmt1(Math.abs(n))}` : "0");

export function BuildingSection({ game, building }: { game: Game; building: BuildingState }) {
  switch (building.type) {
    case "town_hall":
      return <TownHallSection game={game} />;
    case "academy":
      return <AcademySection game={game} />;
    case "warehouse":
      return <WarehouseSection game={game} level={building.level} />;
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

function TownHallSection({ game }: { game: Game }) {
  const { city } = game;
  const r = city.rates;
  const full = city.population >= r.housing - 0.5;
  const goldNet = r.goldIncome - r.goldUpkeep;
  return (
    <>
      <Block title="Tu gente">
        <StatGrid>
          <Stat label="Población" value={`${fmt(city.population)} / ${fmt(r.housing)}`} hint="habitantes / viviendas" />
          <Stat label="Ciudadanos libres" value={fmt(r.freeCitizens)} hint="pagan impuestos" />
          <Stat
            label="Satisfacción"
            value={fmt(r.happiness)}
            hint={`Balance ${fmtSigned(r.netHappiness)}`}
            tone={r.netHappiness > 0 ? "good" : r.netHappiness < 0 ? "bad" : undefined}
          />
          <Stat
            label="Crecimiento"
            value={`${signed1(r.growth)}/h`}
            hint="habitantes por hora"
            tone={r.growth > 0.05 ? "good" : r.growth < -0.05 ? "bad" : undefined}
          />
          <Stat label="Impuestos" value={`+${fmt(r.goldIncome)}/h`} hint="oro de los libres" tone="gold" />
          <Stat
            label="Gastos"
            value={`−${fmt(r.goldUpkeep)}/h`}
            hint={`Neto ${fmtSigned(goldNet)}/h`}
            tone={goldNet < 0 ? "bad" : undefined}
          />
        </StatGrid>
        <Note>
          {full
            ? "La ciudad está llena. Mejorá la Intendencia para sumar viviendas."
            : r.netHappiness <= 0
              ? "La gente no está contenta y la ciudad no crece. Serví vino en la Taberna."
              : "La población crece mientras la satisfacción supere a los habitantes."}
        </Note>
      </Block>
      <Block title="Nombre">
        <RenameCityForm cityId={city.id} name={city.name} />
      </Block>
    </>
  );
}

function AcademySection({ game }: { game: Game }) {
  const { snapshot, city } = game;
  const p = asPlayer(snapshot);
  const r = city.rates;
  const max = Math.min(r.maxScientists, city.scientists + r.freeCitizens);
  return (
    <Block title="Investigación">
      <Note>Cada científico suma investigación y cobra un sueldo en oro.</Note>
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
      <Link href="/investigacion" className="self-start py-1 text-sm font-bold text-bronze-dark underline-offset-4 hover:underline">
        Gastar puntos en investigación
      </Link>
    </Block>
  );
}

function WarehouseSection({ game, level }: { game: Game; level: number }) {
  const { city } = game;
  const r = city.rates;
  return (
    <Block title="Almacén">
      <StatGrid>
        <Stat label="Capacidad" value={fmt(r.storage)} hint="por recurso, toda la ciudad" />
        <Stat label="A salvo" value={fmt(r.safe)} hint="por recurso, no se saquea" tone="gold" />
      </StatGrid>
      <ul className="flex flex-col gap-2" aria-label="Depósito por recurso">
        {RESOURCES.map((res) => {
          const have = city.res[res];
          const pct = Math.min(100, (have / r.storage) * 100);
          return (
            <li key={res} className="flex items-center gap-2 text-sm">
              <ResIcon kind={res} size={20} />
              <span className="w-16 shrink-0 font-bold">{RESOURCE_INFO[res].label}</span>
              <span aria-hidden className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/15">
                <span
                  className={`block h-full rounded-full ${pct >= 99.5 ? "bg-danger" : "bg-gradient-to-r from-bronze to-gold"}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-28 shrink-0 text-right text-ink-soft tabular">
                {fmt(have)} / {fmt(r.storage)}
              </span>
            </li>
          );
        })}
      </ul>
      <Note>
        Este depósito aporta {fmt(BALANCE.storagePerWarehouseLevel * level)} de capacidad y{" "}
        {fmt(BALANCE.safePerWarehouseLevel * level)} a salvo. Lo que pasa del tope se pierde.
      </Note>
    </Block>
  );
}

function TavernSection({ game }: { game: Game }) {
  const { snapshot, city } = game;
  const p = asPlayer(snapshot);
  const max = buildingLevel(city, "tavern");
  const r = city.rates;
  return (
    <Block title="Vino">
      <Note>
        La taberna ya suma +{fmt(BALANCE.tavernHappinessPerLevel * max)} de satisfacción. Cada nivel de vino servido suma +
        {BALANCE.winePerServedLevel} más.
      </Note>
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
    </Block>
  );
}

function MuseumSection({ level }: { level: number }) {
  return (
    <Block title="Cultura">
      <StatGrid>
        <Stat label="Satisfacción" value={`+${fmt(BALANCE.museumHappinessPerLevel * level)}`} tone="good" hint="por las obras expuestas" />
        <Stat label="Por nivel" value={`+${BALANCE.museumHappinessPerLevel}`} hint="al mejorar" />
      </StatGrid>
    </Block>
  );
}

function BarracksSection({ game }: { game: Game }) {
  const { snapshot, city } = game;
  const p = asPlayer(snapshot);
  const barracks = buildingLevel(city, "barracks");
  const barracksCut = 1 - Math.min(0.4, barracks * 0.02);
  const drill = hasTech(p, "drill") ? 0.9 : 1;
  const home = UNIT_TYPES.filter((u) => (city.units[u] ?? 0) > 0);
  const queue = [...city.training].sort((a, b) => a.endsAt - b.endsAt);
  const lastEnd = queue.reduce((m, b) => Math.max(m, b.endsAt), 0);
  const price = lastEnd > snapshot.now ? ambrosiaToFinish(snapshot.now, lastEnd) : 0;
  const open = UNIT_TYPES.filter((u) => !canTrain(p, city, u));
  const locked = UNIT_TYPES.filter((u) => canTrain(p, city, u));
  const away = troopMissions(snapshot.missions, city.id);
  // Same net gold per hour the header shows: every city, minus the troops at sea.
  const goldPerHour =
    snapshot.cities.reduce((s, c) => s + c.rates.goldIncome - c.rates.goldUpkeep, 0) - snapshot.player.awayUpkeep * snapshot.speed;

  return (
    <>
      <Block title="Tropas en la ciudad">
        {home.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {home.map((u) => (
              <li key={u} className="flex items-center gap-1.5 rounded-full bg-marble/60 py-1 pr-3 pl-1 text-sm font-bold ring-1 ring-parchment-3">
                <Image src={UNITS[u].image} alt="" width={64} height={64} sizes="28px" className="size-7 object-contain" />
                {unitCount(u, city.units[u] ?? 0)}
              </li>
            ))}
          </ul>
        )}
        {away.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {!home.length && <p className="font-bold">Tus tropas están en camino</p>}
            <TroopsAway missions={away} now={snapshot.now} />
          </div>
        )}
        {!home.length && !away.length && <Note>Todavía no hay tropas. Entrená unas pocas para cuidar la polis.</Note>}
      </Block>

      {queue.length > 0 && (
        <Block title="En entrenamiento" tone="inset">
          <ul className="flex flex-col gap-3">
            {queue.map((b) => (
              <li key={b.id} className="flex items-center gap-2.5">
                <Image src={UNITS[b.unit].image} alt="" width={80} height={80} sizes="40px" className="size-10 shrink-0 object-contain" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="flex justify-between gap-2 text-sm">
                    <span className="font-bold">{unitCount(b.unit, b.count)}</span>
                    <span className="font-bold text-ink-soft">
                      {b.startedAt > snapshot.now ? "En espera · " : ""}
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
                pendingLabel="Terminando…"
                action={finishNowAction.bind(null, { cityId: city.id, what: "training" })}
              >
                Terminar entrenamiento ya por {fmt(price)} de néctar
              </ActionButton>
            ) : (
              <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
                <span>
                  Terminar ya cuesta {fmt(price)} de néctar y tenés {fmt(snapshot.player.ambrosia)}.
                </span>
                <Link href="/tesoro" className={buttonClass("ambrosia", "sm")}>
                  Conseguir néctar
                </Link>
              </p>
            ))}
        </Block>
      )}

      <Block title="Entrenar">
        <Note>
          Cada soldado sale de un ciudadano libre. Hoy tenés {fmt(city.rates.freeCitizens)} libres.
        </Note>
        <ul className="flex flex-col gap-3">
          {open.map((u) => {
            const def = UNITS[u];
            return (
              <TrainUnitForm
                key={u}
                cityId={city.id}
                unit={u}
                name={def.name}
                image={def.image}
                attack={def.attack}
                defense={def.defense}
                upkeep={def.upkeep * snapshot.speed}
                taxPerCitizen={BALANCE.goldPerCitizen * snapshot.speed}
                goldPerHour={goldPerHour}
                cost={def.cost}
                secondsPerUnit={((def.time * drill) / snapshot.speed) * barracksCut}
                freeCitizens={city.rates.freeCitizens}
                res={city.res}
              />
            );
          })}
        </ul>
        {locked.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Tropas bloqueadas">
            {locked.map((u) => {
              const def = UNITS[u];
              const needsTech = def.requires.tech && !hasTech(p, def.requires.tech);
              return (
                <li key={u} className="flex items-center gap-3 rounded-xl border border-dashed border-parchment-3 p-2.5">
                  <Image
                    src={def.image}
                    alt=""
                    width={96}
                    height={96}
                    sizes="44px"
                    className="size-11 shrink-0 object-contain opacity-60 grayscale-[60%]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="leading-tight font-bold">{def.name}</p>
                    <Reason className="font-medium">{canTrain(p, city, u)}</Reason>
                  </div>
                  {needsTech && (
                    <Link
                      href="/investigacion"
                      className="shrink-0 rounded-lg px-2 py-2.5 text-sm font-bold text-bronze-dark underline-offset-4 hover:underline"
                    >
                      Investigar
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Block>
    </>
  );
}

async function PortSection({ game }: { game: Game }) {
  const { snapshot, city } = game;
  const p = asPlayer(snapshot);
  const r = city.rates;
  const price = shipPrice(p, totalShips(snapshot));
  const atSea = snapshot.missions.filter((m) => m.originCityId === city.id).reduce((s, m) => s + m.ships, 0);
  const full = city.ships >= r.maxShips;
  const broke = snapshot.player.gold < price;
  const rows = await getDestinations(snapshot.player.id);
  const destinations: Destination[] = rows
    .filter((d) => d.id !== city.id)
    .map((d) => ({
      id: d.id,
      name: d.name,
      mine: Boolean(d.isMine),
      label: d.isMine ? `${d.name} · ${d.islandName}` : `${d.name} (${d.playerName}) · ${d.islandName}`,
    }));

  return (
    <>
      <Block title="Flota mercante">
        <StatGrid>
          <Stat label="En el puerto" value={`${fmt(city.ships)} / ${fmt(r.maxShips)}`} hint="barcos / amarras" />
          <Stat label="Navegando" value={fmt(atSea)} hint="salieron de acá" />
        </StatGrid>
        <ActionButton
          className="w-full"
          disabled={full || broke}
          pendingLabel="Comprando…"
          action={buyShipAction.bind(null, { cityId: city.id })}
        >
          Comprar barco por {fmt(price)} de oro
        </ActionButton>
        {full ? (
          <Reason>No quedan amarras libres. Mejorá el Puerto para sumar más.</Reason>
        ) : broke ? (
          <Reason tone="missing">Te falta {fmt(price - snapshot.player.gold)} de oro.</Reason>
        ) : (
          <Note className="-mt-1 text-xs">Cada barco lleva {fmt(BALANCE.shipCapacity)} de carga o {BALANCE.unitsPerShip} soldados.</Note>
        )}
      </Block>

      <Block title="Mandar recursos" tone="inset">
        <TransportForm
          key={city.ships}
          cityId={city.id}
          ships={city.ships}
          shipCapacity={BALANCE.shipCapacity}
          stock={city.res}
          destinations={destinations}
        />
      </Block>
    </>
  );
}

function WallSection({ level }: { level: number }) {
  return (
    <Block title="Defensa">
      <StatGrid>
        <Stat label="Defensa extra" value={`+${10 * level}%`} tone="good" hint="para las tropas de la ciudad" />
        <Stat label="Por nivel" value="+10%" hint="al mejorar" />
      </StatGrid>
      <Note>Dos catapultas enemigas anulan un nivel de muralla durante el asalto.</Note>
    </Block>
  );
}

function CarpenterSection({ level }: { level: number }) {
  return (
    <Block title="Ahorro">
      <StatGrid>
        <Stat label="Madera ahorrada" value={`−${2 * level}%`} tone="good" hint="en todas las obras de la ciudad" />
        <Stat label="Por nivel" value="−2%" hint="tope total: 50%" />
      </StatGrid>
    </Block>
  );
}

function StonemasonSection({ game, level }: { game: Game; level: number }) {
  const lux = game.city.rates.luxuryResource;
  return (
    <Block title="Producción de lujo">
      <StatGrid>
        <Stat
          label={`Más ${RESOURCE_INFO[lux].label.toLowerCase()}`}
          value={`+${3 * level}%`}
          tone="good"
          hint="de la mina de la isla"
        />
        <Stat label="Por nivel" value="+3%" hint="al mejorar" />
      </StatGrid>
      <Note>Solo rinde si tenés gente trabajando en la mina de la isla.</Note>
      <Link
        href={`/isla/${game.city.islandId}`}
        className="self-start py-1 text-sm font-bold text-bronze-dark underline-offset-4 hover:underline"
      >
        Ir a la isla
      </Link>
    </Block>
  );
}

function PalaceSection({ game, level }: { game: Game; level: number }) {
  const { snapshot, city } = game;
  const used = snapshot.cities.length - 1;
  const sailing = snapshot.missions.filter((m) => m.kind === "colonize").length;
  const room = level - used - sailing;
  const cost = BALANCE.colonizeCost;
  return (
    <Block title="Colonias">
      <StatGrid>
        <Stat label="Fundadas" value={`${fmt(used)} de ${fmt(level)}`} hint={sailing ? `${sailing} en camino` : "una más por nivel"} />
        <Stat label="Lugar para" value={fmt(Math.max(0, room))} hint={room === 1 ? "colonia nueva" : "colonias nuevas"} tone={room > 0 ? "good" : undefined} />
      </StatGrid>
      <Note>
        Para fundar una colonia, buscá en el mapa una isla con lugar libre y mandá colonos desde el Puerto. Necesitás un barco y:
      </Note>
      <CostList
        cost={{ wood: cost.wood, gold: cost.gold, citizens: cost.citizens }}
        have={{ wood: city.res.wood, gold: snapshot.player.gold, citizens: city.rates.freeCitizens }}
      />
      {room > 0 ? (
        <Link href="/mundo" className={buttonClass("secondary", "md", "w-full")}>
          Buscar isla en el mapa
        </Link>
      ) : (
        <Reason>Mejorá el Palacio para fundar otra colonia.</Reason>
      )}
      {buildingLevel(city, "port") === 0 && (
        <Note className="text-xs">
          Todavía no tenés Puerto.{" "}
          <Link href={slotHref(city.id, 12)} scroll={false} className="font-bold text-bronze-dark underline underline-offset-4">
            Construir uno en el muelle
          </Link>
        </Note>
      )}
    </Block>
  );
}
