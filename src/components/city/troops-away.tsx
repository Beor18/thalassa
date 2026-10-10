import { UNIT_TYPES, type UnitBag } from "@/game/data";
import { Countdown, TimeProgress } from "@/components/ui/countdown";
import type { MissionView } from "@/server/queries";
import { IconArrowRight, IconSwords } from "@/components/island/icons";
import { joinEs, unitCount } from "./lib";

/** Missions that carry soldiers out of `cityId` (attacks on their way or coming back). */
export function troopMissions(missions: MissionView[], cityId: string): MissionView[] {
  return missions.filter((m) => m.originCityId === cityId && UNIT_TYPES.some((t) => (m.units[t] ?? 0) > 0));
}

export function unitsText(units: UnitBag): string {
  return joinEs(UNIT_TYPES.filter((t) => (units[t] ?? 0) > 0).map((t) => unitCount(t, units[t] ?? 0)));
}

/** When the soldiers of a mission are back home (estimated while they are still outbound). */
export function backHomeAt(m: MissionView): number {
  return m.returnsAt ?? m.arrivesAt + (m.arrivesAt - m.departsAt);
}

/** "10 lanceros atacan Bárbaros de Kasos. Llegan en 52 s." per mission, with live countdowns. */
export function TroopsAway({ missions, now }: { missions: MissionView[]; now: number }) {
  if (!missions.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {missions.map((m) => {
        const outbound = m.status === "outbound";
        return (
          <li
            key={m.id}
            className="flex flex-col gap-0.5 rounded-xl bg-parchment-2/70 px-3 pt-2 pb-1 text-sm text-ink ring-1 ring-parchment-3"
          >
            <p className="flex items-start gap-2">
              {outbound ? (
                <IconSwords size={16} className="mt-0.5 shrink-0 text-terracotta" />
              ) : (
                <IconArrowRight size={16} className="mt-0.5 shrink-0 -scale-x-100 text-bronze-dark" />
              )}
              <span className="min-w-0">
                <strong>{unitsText(m.units)}</strong> {outbound ? `atacan ${m.targetLabel}` : `vuelven de ${m.targetLabel}`}.{" "}
                {outbound ? "Llegan en " : "Están en casa en "}
                <strong className="tabular">
                  <Countdown endsAt={outbound ? m.arrivesAt : backHomeAt(m)} serverNow={now} doneLabel="un momento" />
                </strong>
                .
              </span>
            </p>
            <TimeProgress
              startedAt={outbound ? m.departsAt : m.arrivesAt}
              endsAt={outbound ? m.arrivesAt : backHomeAt(m)}
              serverNow={now}
              marker="ship"
            />
          </li>
        );
      })}
    </ul>
  );
}
