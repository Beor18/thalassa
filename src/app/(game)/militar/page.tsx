import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { countUnits, militaryPower, unitUpkeep } from "@/game/engine";
import { getGame } from "@/server/game-context";
import { GameShell, GameSkeleton } from "@/components/game/shell";
import { buttonClass } from "@/components/ui/button";
import { fmt } from "@/lib/format";
import { CityForces, MissionCard, missionEventAt } from "@/components/military/forces";

export const metadata: Metadata = { title: "Flota y tropas" };

export default function Page() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <MilitaryContent />
    </Suspense>
  );
}

async function MilitaryContent() {
  const game = await getGame();
  const { snapshot, city } = game;
  const missions = [...snapshot.missions].sort((a, b) => missionEventAt(a) - missionEventAt(b));
  const home = snapshot.cities.reduce((s, c) => s + countUnits(c.units), 0);
  const away = missions.reduce((s, m) => s + countUnits(m.units), 0);
  const power = snapshot.cities.reduce((s, c) => s + militaryPower(c.units), 0);
  const docked = snapshot.cities.reduce((s, c) => s + c.ships, 0);
  const atSea = missions.reduce((s, m) => s + m.ships, 0);
  const upkeep = (snapshot.cities.reduce((s, c) => s + unitUpkeep(c.units), 0) + snapshot.player.awayUpkeep) * snapshot.speed;
  const shipsAtSeaFrom = (cityId: string) => missions.filter((m) => m.originCityId === cityId).reduce((s, m) => s + m.ships, 0);

  return (
    <GameShell game={game}>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold text-foam drop-shadow sm:text-3xl">Flota y tropas</h1>
        <dl className="panel-dark flex flex-wrap gap-x-6 gap-y-2 px-4 py-2.5 text-sm">
          <Stat label="Poder en casa" value={fmt(power)} />
          <Stat label="Soldados en casa" value={fmt(home)} />
          <Stat label="Soldados en el mar" value={fmt(away)} />
          <Stat label="Barcos en puerto" value={fmt(docked)} />
          <Stat label="Barcos en el mar" value={fmt(atSea)} />
          <Stat label="Sueldos" value={upkeep > 0 ? `${fmt(upkeep)} de oro/h` : "Nada"} />
        </dl>
      </div>

      <section aria-labelledby="sea-title" className="flex flex-col gap-2">
        <h2 id="sea-title" className="font-display text-xl font-bold text-foam">
          En el mar
        </h2>
        {missions.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {missions.map((m) => (
              <MissionCard key={m.id} mission={m} now={snapshot.now} />
            ))}
          </ul>
        ) : (
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold">No hay barcos navegando.</p>
              <p className="text-sm text-ink-soft">
                Los bárbaros de {city.island.name} guardan un botín. Mandá tropas cuando tengas Cuartel y barcos.
              </p>
            </div>
            <Link href={`/isla/${city.islandId}?panel=camp`} className={buttonClass("primary", "md")}>
              Ver el campamento bárbaro
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="cities-title" className="flex flex-col gap-2">
        <h2 id="cities-title" className="font-display text-xl font-bold text-foam">
          {snapshot.cities.length === 1 ? "Tu ciudad" : "Tus ciudades"}
        </h2>
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {snapshot.cities.map((c) => (
            <CityForces key={c.id} city={c} speed={snapshot.speed} now={snapshot.now} shipsAtSea={shipsAtSeaFrom(c.id)} />
          ))}
        </div>
      </section>
    </GameShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <dt className="text-xs text-foam/75">{label}</dt>
      <dd className="tabular text-base font-extrabold">{value}</dd>
    </div>
  );
}
