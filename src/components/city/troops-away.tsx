import { UNIT_TYPES, type UnitBag } from "@/game/data";
import { Countdown, TimeProgress } from "@/components/ui/countdown";
import type { Locale } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import type { MissionView } from "@/server/queries";
import { IconArrowRight, IconSwords } from "@/components/island/icons";
import { joinList, unitCount } from "./lib";

/** Missions that carry soldiers out of `cityId` (attacks on their way or coming back). */
export function troopMissions(missions: MissionView[], cityId: string): MissionView[] {
  return missions.filter((m) => m.originCityId === cityId && UNIT_TYPES.some((t) => (m.units[t] ?? 0) > 0));
}

export function unitsText(units: UnitBag, lang: Locale): string {
  return joinList(
    UNIT_TYPES.filter((t) => (units[t] ?? 0) > 0).map((t) => unitCount(t, units[t] ?? 0, lang)),
    lang,
  );
}

/** When the soldiers of a mission are back home (estimated while they are still outbound). */
export function backHomeAt(m: MissionView): number {
  return m.returnsAt ?? m.arrivesAt + (m.arrivesAt - m.departsAt);
}

/** "10 spearmen attacking Barbarians on Kasos. Arriving in 52 s." per mission, with live countdowns. Server Component. */
export async function TroopsAway({ missions, now }: { missions: MissionView[]; now: number }) {
  if (!missions.length) return null;
  const { t, lang } = await getI18n();
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
                <strong>{unitsText(m.units, lang)}</strong>{" "}
                {outbound
                  ? t({ en: `attacking ${m.targetText.en}`, es: `atacan ${m.targetText.es}` })
                  : t({ en: `heading home from ${m.targetText.en}`, es: `vuelven de ${m.targetText.es}` })}
                .{" "}
                {outbound ? t({ en: "Arriving in ", es: "Llegan en " }) : t({ en: "Home in ", es: "Están en casa en " })}
                <strong className="tabular">
                  <Countdown endsAt={outbound ? m.arrivesAt : backHomeAt(m)} serverNow={now} doneLabel={t({ en: "a moment", es: "un momento" })} />
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
