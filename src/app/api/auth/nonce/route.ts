import { randomBytes } from "node:crypto";
import { lt } from "drizzle-orm";
import { isAddress } from "@solana/kit";
import { z } from "zod";
import { db } from "@/db";
import { authNonces } from "@/db/schema";

const NONCE_TTL_MS = 5 * 60 * 1000;

const Body = z.object({
  wallet: z.string().trim().refine(isAddress, "Dirección de Solana inválida."),
});

function loginMessage(wallet: string, nonce: string, issuedAt: Date) {
  return (
    "Thalassa quiere confirmar que esta cuenta es tuya.\n\n" +
    `Cuenta: ${wallet}\n` +
    `Código: ${nonce}\n` +
    `Emitido: ${issuedAt.toISOString()}\n\n` +
    "Firmar no cuesta nada ni mueve fondos."
  );
}

/** POST { wallet } -> { message } to be signed by that wallet. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Esa dirección de Solana no es válida." }, { status: 400 });
  }
  const { wallet } = parsed.data;
  const now = new Date();
  const nonce = randomBytes(16).toString("hex");
  const message = loginMessage(wallet, nonce, now);

  try {
    // Housekeeping: drop expired challenges so the table stays tiny.
    await db.delete(authNonces).where(lt(authNonces.expiresAt, now));
    await db.insert(authNonces).values({ nonce, wallet, message, expiresAt: new Date(now.getTime() + NONCE_TTL_MS) });
  } catch (err) {
    console.error("[thalassa] nonce failed", err);
    return Response.json({ error: "No pudimos preparar el ingreso. Probá de nuevo." }, { status: 500 });
  }

  return Response.json({ message }, { headers: { "cache-control": "no-store" } });
}
