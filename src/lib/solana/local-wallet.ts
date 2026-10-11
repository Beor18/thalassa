// The zero-friction "llave de juego": a devnet keypair created once and kept in this browser.
import {
  airdropFactory,
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKeyBytes,
  getAddressEncoder,
  getBase58Decoder,
  lamports,
  signBytes,
  type Address,
  type Instruction,
  type KeyPairSigner,
  type Signature,
} from "@solana/kit";
import { FAUCET_URL, LAMPORTS_PER_SOL } from "./config";
import { FriendlyError, getRpc, getRpcSubscriptions, getSolBalance, sendInstructions } from "./client";

export const LOCAL_WALLET_KEY = "thalassa:wallet:v1";
export const WALLET_KIND_KEY = "thalassa:wallet:kind";

/** "local" for the game key, otherwise the wallet-standard wallet name (e.g. "Phantom"). */
export type WalletKind = "local" | (string & {});

function storage(): Storage {
  try {
    const s = window.localStorage;
    const probe = "thalassa:probe";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    throw new FriendlyError({
      en: "Your browser won't let us save your game key. Try signing in with your wallet.",
      es: "Tu navegador no deja guardar la llave de juego. Probá entrar con tu billetera.",
    });
  }
}

export function getWalletKind(): WalletKind | null {
  try {
    return window.localStorage.getItem(WALLET_KIND_KEY);
  } catch {
    return null;
  }
}

export function setWalletKind(kind: WalletKind) {
  try {
    window.localStorage.setItem(WALLET_KIND_KEY, kind);
  } catch {
    // Not critical: the treasury page can still detect the wallet.
  }
}

function readStoredBytes(): Uint8Array | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LOCAL_WALLET_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length !== 64 || arr.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) throw new Error();
    return Uint8Array.from(arr);
  } catch {
    throw new FriendlyError({ en: "The game key saved in this browser is damaged.", es: "La llave de juego guardada en este navegador está dañada." });
  }
}

export function hasLocalWallet(): boolean {
  try {
    return !!window.localStorage.getItem(LOCAL_WALLET_KEY);
  } catch {
    return false;
  }
}

/** Address of the stored game key without loading the private key, or null if there is none. */
export function localWalletAddressSync(): string | null {
  try {
    const bytes = readStoredBytes();
    if (!bytes) return null;
    // The last 32 bytes are the public key (Solana CLI keypair format).
    return getBase58Decoder().decode(bytes.subarray(32));
  } catch {
    return null;
  }
}

/** Loads the game key, or null when this browser has none. */
export async function loadLocalWallet(): Promise<KeyPairSigner | null> {
  const bytes = readStoredBytes();
  if (!bytes) return null;
  return createKeyPairSignerFromBytes(bytes);
}

/** Loads the game key, creating and saving it the first time. */
export async function loadOrCreateLocalWallet(): Promise<{ signer: KeyPairSigner; created: boolean }> {
  const s = storage();
  const existing = await loadLocalWallet();
  if (existing) return { signer: existing, created: false };
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const signer = await createKeyPairSignerFromPrivateKeyBytes(seed);
  // Store as the 64-byte [secret | public] array the Solana CLI uses, so it can be exported later.
  const full = new Uint8Array(64);
  full.set(seed, 0);
  full.set(getAddressEncoder().encode(signer.address), 32);
  s.setItem(LOCAL_WALLET_KEY, JSON.stringify(Array.from(full)));
  seed.fill(0);
  return { signer, created: true };
}

export async function signMessageWithLocal(signer: KeyPairSigner, message: string): Promise<Uint8Array> {
  return signBytes(signer.keyPair.privateKey, new TextEncoder().encode(message));
}

export function getLocalBalance(owner: Address): Promise<bigint> {
  return getSolBalance(owner);
}

/** Requests 1 SOL from the devnet faucet and waits for it. Throws a FriendlyError on rate limits. */
export async function requestDevnetSol(owner: Address, sol = BigInt(1)): Promise<Signature> {
  const airdrop = airdropFactory({ rpc: getRpc(), rpcSubscriptions: getRpcSubscriptions() });
  try {
    return await airdrop({ commitment: "confirmed", recipientAddress: owner, lamports: lamports(sol * LAMPORTS_PER_SOL) });
  } catch (err) {
    const text = collectMessages(err);
    if (/429|rate|limit|too many|faucet has run dry|airdrop/i.test(text) || /internal error/i.test(text)) {
      throw new FriendlyError({
        en: `Free test SOL is busy right now. Ask for it at ${FAUCET_URL} with your address.`,
        es: `La canilla de SOL de prueba está saturada. Pedilo a mano en ${FAUCET_URL} con tu dirección.`,
      });
    }
    throw new FriendlyError({
      en: `We couldn't get test SOL. Try ${FAUCET_URL} with your address.`,
      es: `No pudimos conseguir SOL de prueba. Probá en ${FAUCET_URL} con tu dirección.`,
    });
  }
}

export function sendWithLocal(signer: KeyPairSigner, instructions: Instruction[]): Promise<Signature> {
  return sendInstructions(signer, instructions);
}

function collectMessages(err: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let e: unknown = err;
  while (e && typeof e === "object" && !seen.has(e)) {
    seen.add(e);
    parts.push(String((e as { message?: string }).message ?? ""));
    const ctx = (e as { context?: unknown }).context;
    if (ctx) parts.push(JSON.stringify(ctx, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
    e = (e as { cause?: unknown }).cause;
  }
  return parts.join(" ");
}
