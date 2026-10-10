"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { BUILDING_TYPES, RESOURCES, TECH_IDS, UNIT_TYPES } from "@/game/data";
import { GameError } from "@/game/engine";
import type { ActionResult } from "@/lib/action-result";
import { readSession } from "./session";
import * as cmd from "./commands";
import { track, trackFirst } from "./growth/analytics";

async function run<T>(fn: (playerId: string) => Promise<T>, message?: string | ((r: T) => string)): Promise<ActionResult<T>> {
  const session = await readSession();
  if (!session) return { ok: false, error: "Tu sesión expiró. Volvé a entrar." };
  try {
    const data = await fn(session.playerId);
    refresh();
    return { ok: true, data, message: typeof message === "function" ? message(data) : message };
  } catch (err) {
    if (err instanceof GameError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return { ok: false, error: "Datos inválidos." };
    console.error("[thalassa] action failed", err);
    return { ok: false, error: "Algo salió mal. Probá de nuevo." };
  }
}

const id = z.uuid();
const int = (min = 0, max = 1_000_000) => z.coerce.number().int().min(min).max(max);
const cargoSchema = z.object(Object.fromEntries(RESOURCES.map((r) => [r, int(0, 1_000_000).optional()]))).partial();
const unitsSchema = z.object(Object.fromEntries(UNIT_TYPES.map((u) => [u, int(0, 100_000).optional()]))).partial();

export async function buildAction(input: { cityId: string; slot: number; type?: string | null }) {
  return run(async (pid) => {
    const v = z
      .object({ cityId: id, slot: int(0, 13), type: z.enum(BUILDING_TYPES).nullish() })
      .parse(input);
    const started = await cmd.build(pid, v.cityId, v.slot, v.type ?? null);
    await trackFirst("first_build_started", pid, { type: started.type }); // growth hook
    return started;
  }, "Obra en marcha.");
}

export async function cancelBuildAction(input: { cityId: string }) {
  return run(async (pid) => {
    await cmd.cancelBuild(pid, id.parse(input.cityId));
  }, "Obra cancelada. Te devolvimos los materiales.");
}

export async function finishNowAction(input: { cityId: string; what: "construction" | "training" }) {
  return run(
    async (pid) => {
      const v = z.object({ cityId: id, what: z.enum(["construction", "training"]) }).parse(input);
      return cmd.finishNow(pid, v.cityId, v.what);
    },
    (price) => `Listo. Usaste ${price} de néctar.`,
  );
}

export async function setWorkersAction(input: { cityId: string; woodWorkers?: number; luxWorkers?: number; scientists?: number }) {
  return run(async (pid) => {
    const v = z
      .object({ cityId: id, woodWorkers: int(0, 10_000).optional(), luxWorkers: int(0, 10_000).optional(), scientists: int(0, 10_000).optional() })
      .parse(input);
    await cmd.assignWorkers(pid, v.cityId, v);
  }, "Trabajadores asignados.");
}

export async function setWineAction(input: { cityId: string; level: number }) {
  return run(async (pid) => {
    const v = z.object({ cityId: id, level: int(0, 30) }).parse(input);
    await cmd.serveWine(pid, v.cityId, v.level);
  }, "La taberna ya sirve.");
}

export async function trainAction(input: { cityId: string; unit: string; count: number }) {
  return run(async (pid) => {
    const v = z.object({ cityId: id, unit: z.enum(UNIT_TYPES), count: int(1, 1000) }).parse(input);
    await cmd.train(pid, v.cityId, v.unit, v.count);
  }, "Entrenamiento en marcha.");
}

export async function buyShipAction(input: { cityId: string }) {
  return run(
    async (pid) => cmd.purchaseShip(pid, id.parse(input.cityId)),
    (price) => `Barco comprado por ${price} de oro.`,
  );
}

export async function researchAction(input: { tech: string }) {
  return run(async (pid) => {
    const tech = z.enum(TECH_IDS).parse(input.tech);
    await cmd.doResearch(pid, tech);
    await trackFirst("first_research", pid, { tech }); // growth hook
  }, "Investigación completa.");
}

export async function merchantAction(input: { cityId: string; resource: string }) {
  return run(async (pid) => {
    const v = z.object({ cityId: id, resource: z.enum(RESOURCES) }).parse(input);
    await cmd.tradeAmbrosia(pid, v.cityId, v.resource);
  }, "El mercader descargó la mercadería.");
}

export async function renameCityAction(input: { cityId: string; name: string }) {
  return run(async (pid) => {
    const v = z.object({ cityId: id, name: z.string().max(40) }).parse(input);
    await cmd.rename(pid, v.cityId, v.name);
  }, "Nombre actualizado.");
}

export async function renamePlayerAction(input: { name: string }) {
  return run(async (pid) => {
    await cmd.renamePlayer(pid, z.string().max(40).parse(input.name));
  }, "Nombre actualizado.");
}

export async function donateAction(input: { cityId: string; target: "sawmill" | "mine"; amount: number }) {
  return run(
    async (pid) => {
      const v = z.object({ cityId: id, target: z.enum(["sawmill", "mine"]), amount: int(1, 10_000_000) }).parse(input);
      return cmd.donate(pid, v.cityId, v.target, v.amount);
    },
    (r) => `Gracias por la donación. Nivel actual: ${r.level}.`,
  );
}

export async function transportAction(input: { originCityId: string; targetCityId: string; cargo: Record<string, number> }) {
  return run(async (pid) => {
    const v = z.object({ originCityId: id, targetCityId: id, cargo: cargoSchema }).parse(input);
    return cmd.sendTransport(pid, v.originCityId, v.targetCityId, v.cargo);
  }, (m) => (m.ships === 1 ? "Tu barco zarpó." : `Tus ${m.ships} barcos zarparon.`));
}

export async function attackAction(input: {
  originCityId: string;
  target: { cityId: string } | { barbariansOnIsland: number };
  units: Record<string, number>;
}) {
  return run(async (pid) => {
    const v = z
      .object({
        originCityId: id,
        target: z.union([z.object({ cityId: id }), z.object({ barbariansOnIsland: int(1, 100_000) })]),
        units: unitsSchema,
      })
      .parse(input);
    const sent = await cmd.sendAttack(pid, v.originCityId, v.target, v.units);
    await trackFirst("first_attack_sent", pid, { target: "cityId" in v.target ? "player" : "barbarians" }); // growth hook
    return sent;
  }, "Tus tropas zarparon.");
}

export async function colonizeAction(input: { originCityId: string; islandId: number; slot: number; name: string }) {
  return run(async (pid) => {
    const v = z.object({ originCityId: id, islandId: int(1, 100_000), slot: int(0, 7), name: z.string().max(40) }).parse(input);
    return cmd.sendColonists(pid, v.originCityId, v.islandId, v.slot, v.name);
  }, "Los colonos zarparon.");
}

export async function syncAmbrosiaAction() {
  return run(
    async (pid) => {
      const synced = await cmd.syncAmbrosia(pid);
      if (synced.credited > 0) await track("ambrosia_purchased", { amount: synced.credited }, pid); // growth hook
      return synced;
    },
    (r) => (r.credited > 0 ? `Sumaste ${r.credited} de néctar.` : "No hay compras nuevas en la red."),
  );
}

/** Sends 0.06 devnet SOL from the game faucet to the player's wallet (once every 12 h). */
export async function claimFaucetAction() {
  return run(
    async (pid) => {
      const { claimFaucet } = await import("./faucet");
      const claimed = await claimFaucet(pid);
      await track("faucet_claimed", {}, pid); // growth hook
      return claimed;
    },
    "Te mandamos 0,06 SOL de prueba. Ya podés comprar un pack.",
  );
}

export async function markReportsReadAction() {
  return run(async (pid) => {
    const { markReportsRead } = await import("./queries");
    await markReportsRead(pid);
  });
}
