/*
  Every line a report can carry, in every language. The server writes these into `body.title` /
  `body.text` (and the Spanish one into the legacy `title` column); the Informes screen uses the same
  builders to read older Spanish-only rows in English. Pure: no database, safe anywhere.
*/
import type { Text } from "@/i18n/config";

export const REPORT_TITLES = {
  shipsArrived: (city: string): Text => ({ en: `Your ships reached ${city}`, es: `Tus barcos llegaron a ${city}` }),
  resourcesReceived: (sender: string): Text => ({ en: `${sender} sent you resources`, es: `${sender} te mandó recursos` }),
  victory: (city: string): Text => ({ en: `Victory at ${city}`, es: `Victoria en ${city}` }),
  defeat: (city: string): Text => ({ en: `Defeat at ${city}`, es: `Derrota en ${city}` }),
  raided: (attacker: string, city: string): Text => ({ en: `${attacker} raided ${city}`, es: `${attacker} saqueó ${city}` }),
  droveOff: (attacker: string): Text => ({ en: `You drove off ${attacker}`, es: `Rechazaste a ${attacker}` }),
  campEmpty: (island: string): Text => ({ en: `The camp on ${island} was empty`, es: `El campamento de ${island} estaba vacío` }),
  campCrushed: (island: string): Text => ({ en: `You crushed the camp on ${island}`, es: `Arrasaste el campamento de ${island}` }),
  campHeld: (island: string): Text => ({ en: `The barbarians on ${island} held out`, es: `Los bárbaros de ${island} resistieron` }),
  colonyFounded: (city: string): Text => ({ en: `You founded ${city}`, es: `Fundaste ${city}` }),
  colonyNoRoom: (island: string): Text => ({ en: `No room left on ${island}`, es: `No quedaba lugar en ${island}` }),
  welcome: { en: "Welcome to the Aegean", es: "Bienvenido al Egeo" } as Text,
  referralGift: { en: "Welcome gift", es: "Regalo de bienvenida" } as Text,
  referralPaidOff: { en: "Your invite paid off", es: "Tu invitado creció" } as Text,
};

export const REPORT_TEXTS = {
  welcome: {
    en: "You founded your polis. Send citizens to the sawmill, build an Academy and get your fleet ready. Before you attack the island's barbarians, check how many there are.",
    es: "Fundaste tu polis. Mandá ciudadanos al aserradero, levantá una Academia y prepará la flota. Antes de atacar a los bárbaros de la isla, mirá cuántos son.",
  } as Text,
  /** The invitee's side. `referrer` is null when their name couldn't be read. */
  referralGift: (referrer: string | null, townHall: number, reward: number): Text => ({
    en: `You reached Town Hall level ${townHall}. Since ${referrer ?? "another archon"} invited you, you each got ${reward} Nectar.`,
    es: `Llegaste a Intendencia ${townHall}. Como te invitó ${referrer ?? "otro arconte"}, sumaron ${reward} de néctar cada uno.`,
  }),
  /** The referrer's side. `invitee` is null when their name couldn't be read. */
  referralPaidOff: (invitee: string | null, townHall: number, reward: number): Text => ({
    en: `${invitee ?? "Your friend"} reached Town Hall level ${townHall}. You got ${reward} Nectar. Keep inviting from the Invite page.`,
    es: `${invitee ?? "Tu invitado"} llegó a Intendencia ${townHall}. Te sumamos ${reward} de néctar. Seguí invitando desde la sección Invitar.`,
  }),
};

/** Earlier wording of the welcome text, still stored in older accounts. */
const OLD_WELCOME: Text = {
  en: "You founded your polis. Send citizens to the sawmill, build an Academy and get your fleet ready. The island's barbarians are sitting on loot.",
  es: "Fundaste tu polis. Mandá ciudadanos al aserradero, levantá una Academia y prepará la flota. Los bárbaros de la isla guardan un botín.",
};

const isText = (v: unknown): v is Text =>
  typeof v === "object" && v !== null && typeof (v as Text).en === "string" && typeof (v as Text).es === "string";

type Body = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const get = (o: unknown, key: string): unknown => (typeof o === "object" && o !== null ? (o as Body)[key] : undefined);

/** Every title an older row of this kind could have had, rebuilt from its body. */
function titleCandidates(kind: string, body: Body): Text[] {
  if (kind === "system") return [REPORT_TITLES.welcome, REPORT_TITLES.referralGift, REPORT_TITLES.referralPaidOff];
  if (kind === "transport") {
    return [REPORT_TITLES.shipsArrived(str(get(body.to, "name"))), REPORT_TITLES.resourcesReceived(str(get(body.from, "playerName")))];
  }
  if (kind === "colony") return [REPORT_TITLES.colonyFounded(str(body.cityName)), REPORT_TITLES.colonyNoRoom(str(body.islandName))];
  const target = body.target;
  const island = str(get(target, "islandName"));
  if (get(target, "kind") === "barbarians") {
    return [REPORT_TITLES.campEmpty(island), REPORT_TITLES.campCrushed(island), REPORT_TITLES.campHeld(island)];
  }
  const city = str(get(target, "name"));
  const attacker = str(get(body.attacker, "name"));
  return [REPORT_TITLES.victory(city), REPORT_TITLES.defeat(city), REPORT_TITLES.raided(attacker, city), REPORT_TITLES.droveOff(attacker)];
}

/**
 * A report's title in every language. New rows carry it in `body.title`; for older rows it is
 * rebuilt from the body and only trusted when its Spanish matches the stored title exactly.
 * Null when nothing matches: show the stored Spanish title.
 */
export function reportTitle(kind: string, storedTitle: string, body: Body): Text | null {
  if (isText(body.title)) return body.title;
  return titleCandidates(kind, body).find((c) => c.es === storedTitle) ?? null;
}

/** A system report's text in every language, or null when there is none to show. Older rows: see reportTitle. */
export function reportText(body: Body): Text | null {
  const text = body.text;
  if (isText(text)) return text;
  if (typeof text !== "string" || !text) return null;
  for (const known of [REPORT_TEXTS.welcome, OLD_WELCOME]) if (known.es === text) return known;
  const gift = /^Llegaste a Intendencia (\d+)\. Como te invitó (.+), sumaron (\d+) de néctar cada uno\.$/.exec(text);
  if (gift) {
    const rebuilt = REPORT_TEXTS.referralGift(gift[2] === "otro arconte" ? null : gift[2], Number(gift[1]), Number(gift[3]));
    if (rebuilt.es === text) return rebuilt;
  }
  const paid = /^(.+) llegó a Intendencia (\d+)\. Te sumamos (\d+) de néctar\. Seguí invitando desde la sección Invitar\.$/.exec(text);
  if (paid) {
    const rebuilt = REPORT_TEXTS.referralPaidOff(paid[1] === "Tu invitado" ? null : paid[1], Number(paid[2]), Number(paid[3]));
    if (rebuilt.es === text) return rebuilt;
  }
  return { en: text, es: text };
}
