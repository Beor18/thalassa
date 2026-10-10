import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import {
  address,
  appendTransactionMessageInstruction,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  devnet,
  getSignatureFromTransaction,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { db } from "@/db";
import { players } from "@/db/schema";
import { GameError } from "@/game/engine";
import { fmtDuration } from "@/lib/format";
import { SOLANA_RPC_URL } from "./config";

/** Enough for one ambrosia pack (0.05 SOL) plus the first purchase's account rent and fees. */
export const FAUCET_LAMPORTS = 60_000_000n;
const COOLDOWN_MS = 12 * 3_600_000;

const rpc = createSolanaRpc(devnet(SOLANA_RPC_URL));
const rpcSubscriptions = createSolanaRpcSubscriptions(
  devnet(process.env.SOLANA_WS_URL ?? SOLANA_RPC_URL.replace(/^http/, "ws")),
);

async function faucetSigner() {
  const file = process.env.FAUCET_KEYPAIR_PATH;
  if (!file) throw new GameError("La canilla de SOL de prueba no está configurada.");
  const bytes = JSON.parse(await readFile(path.resolve(file), "utf8")) as number[];
  return createKeyPairSignerFromBytes(new Uint8Array(bytes));
}

/**
 * Game faucet: sends a little devnet SOL to the player's wallet, at most once every 12 hours.
 * Fallback for the public devnet airdrop, which is often rate limited.
 */
export async function claimFaucet(playerId: string) {
  const now = Date.now();
  const claim = await db.transaction(async (tx) => {
    const [p] = await tx
      .select({ wallet: players.wallet, claimedAt: players.faucetClaimedAt })
      .from(players)
      .where(eq(players.id, playerId))
      .for("update");
    if (!p) throw new GameError("Tu cuenta no existe.");
    const next = (p.claimedAt?.getTime() ?? 0) + COOLDOWN_MS;
    if (next > now) throw new GameError(`Ya te mandamos SOL de prueba. Volvé en ${fmtDuration(next - now)}.`);
    await tx.update(players).set({ faucetClaimedAt: new Date(now) }).where(eq(players.id, playerId));
    return p;
  });

  try {
    const faucet = await faucetSigner();
    const { value: balance } = await rpc.getBalance(faucet.address, { commitment: "confirmed" }).send();
    if (balance < FAUCET_LAMPORTS + 10_000n) throw new GameError("La canilla del juego se quedó seca. Probá con faucet.solana.com.");
    const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(faucet, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) =>
        appendTransactionMessageInstruction(
          getTransferSolInstruction({ source: faucet, destination: address(claim.wallet), amount: lamports(FAUCET_LAMPORTS) }),
          m,
        ),
    );
    const signed = await signTransactionMessageWithSigners(message);
    assertIsTransactionWithBlockhashLifetime(signed);
    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed, { commitment: "confirmed" });
    return { signature: getSignatureFromTransaction(signed), lamports: Number(FAUCET_LAMPORTS) };
  } catch (err) {
    // Give the claim back so the player can retry.
    await db.update(players).set({ faucetClaimedAt: claim.claimedAt }).where(eq(players.id, playerId));
    if (err instanceof GameError) throw err;
    console.error("[thalassa] faucet failed", err);
    throw new GameError("La red de prueba no respondió. Probá de nuevo en un rato.");
  }
}
