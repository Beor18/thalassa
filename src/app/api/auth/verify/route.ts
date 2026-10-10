import { and, desc, eq, gt } from "drizzle-orm";
import {
  address,
  getBase58Encoder,
  getBase64Encoder,
  getPublicKeyFromAddress,
  isAddress,
  signatureBytes,
  verifySignature,
} from "@solana/kit";
import { z } from "zod";
import { db } from "@/db";
import { authNonces } from "@/db/schema";
import { createSession } from "@/server/session";
import { findOrCreatePlayer } from "@/server/world";
import { onLogin } from "@/server/growth/login";

const Body = z.object({
  wallet: z.string().trim().refine(isAddress, "Dirección de Solana inválida."),
  /** base58 or base64 encoding of the 64-byte Ed25519 signature */
  signature: z.string().trim().min(64).max(128),
  /** the exact message that was signed (optional: falls back to the wallet's latest challenge) */
  message: z.string().min(1).max(1000).optional(),
});

/** Every plausible decoding of the signature string that yields 64 bytes. */
function signatureCandidates(sig: string): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (const encoder of [getBase58Encoder(), getBase64Encoder()]) {
    try {
      const bytes = encoder.encode(sig);
      if (bytes.length === 64) out.push(Uint8Array.from(bytes));
    } catch {
      // not this encoding
    }
  }
  return out;
}

const fail = (error: string, status = 400) => Response.json({ ok: false, error }, { status });

/** POST { wallet, signature, message? } -> sets the session cookie and returns { ok, redirect }. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Faltan datos para entrar.");
  const { wallet, signature, message } = parsed.data;

  const candidates = signatureCandidates(signature);
  if (!candidates.length) return fail("La firma no tiene el formato esperado.");

  const now = new Date();
  const rows = await db
    .select()
    .from(authNonces)
    .where(
      and(
        eq(authNonces.wallet, wallet),
        gt(authNonces.expiresAt, now),
        message ? eq(authNonces.message, message) : undefined,
      ),
    )
    .orderBy(desc(authNonces.expiresAt))
    .limit(5);
  if (!rows.length) return fail("El código para entrar venció. Probá de nuevo.", 401);

  const publicKey = await getPublicKeyFromAddress(address(wallet));
  let matched: (typeof rows)[number] | null = null;
  outer: for (const row of rows) {
    const data = new TextEncoder().encode(row.message);
    for (const sig of candidates) {
      if (await verifySignature(publicKey, signatureBytes(sig), data)) {
        matched = row;
        break outer;
      }
    }
  }
  if (!matched) return fail("La firma no coincide con esta cuenta.", 401);

  // Single use: burn every pending challenge for this wallet.
  await db.delete(authNonces).where(eq(authNonces.wallet, wallet));

  try {
    const player = await findOrCreatePlayer(wallet);
    await createSession({ playerId: player.id, wallet });
    await onLogin({ id: player.id, wallet, created: player.created }); // growth hook: funnel + referral (never throws)
    return Response.json({ ok: true, redirect: "/ciudad", created: player.created }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[thalassa] login failed", err);
    return fail("No pudimos abrir tu polis. Probá de nuevo en un momento.", 500);
  }
}
