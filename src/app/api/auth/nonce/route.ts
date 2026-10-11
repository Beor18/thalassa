import { randomBytes } from "node:crypto";
import { lt } from "drizzle-orm";
import { isAddress } from "@solana/kit";
import { z } from "zod";
import { db } from "@/db";
import { authNonces } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { getRequestI18n } from "@/i18n/request";

const NONCE_TTL_MS = 5 * 60 * 1000;

const Body = z.object({
  wallet: z.string().trim().refine(isAddress, "Invalid Solana address."),
});

/**
 * The text the wallet signs, in the player's language. Safe to vary: it is stored with the nonce
 * and /api/auth/verify checks the signature against that exact stored text.
 */
function loginMessage(lang: Locale, wallet: string, nonce: string, issuedAt: Date) {
  if (lang === "en") {
    return (
      "Thalassa wants to confirm this account is yours.\n\n" +
      `Account: ${wallet}\n` +
      `Code: ${nonce}\n` +
      `Issued: ${issuedAt.toISOString()}\n\n` +
      "Signing is free and doesn't move any funds."
    );
  }
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
  const { t, lang } = await getRequestI18n();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: t({ en: "That account address isn't valid.", es: "Esa dirección de Solana no es válida." }) }, { status: 400 });
  }
  const { wallet } = parsed.data;
  const now = new Date();
  const nonce = randomBytes(16).toString("hex");
  const message = loginMessage(lang, wallet, nonce, now);

  try {
    // Housekeeping: drop expired challenges so the table stays tiny.
    await db.delete(authNonces).where(lt(authNonces.expiresAt, now));
    await db.insert(authNonces).values({ nonce, wallet, message, expiresAt: new Date(now.getTime() + NONCE_TTL_MS) });
  } catch (err) {
    console.error("[thalassa] nonce failed", err);
    return Response.json({ error: t({ en: "We couldn't get your sign-in ready. Try again.", es: "No pudimos preparar el ingreso. Probá de nuevo." }) }, { status: 500 });
  }

  return Response.json({ message }, { headers: { "cache-control": "no-store" } });
}
