// Client-safe Solana settings. NEXT_PUBLIC_* values are inlined at build time,
// so they must be read with their literal names.
import type { Locale } from "@/i18n/config";
import { getFormat } from "@/i18n/format";

export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export const SOLANA_WS_URL =
  process.env.NEXT_PUBLIC_SOLANA_WS_URL || SOLANA_RPC_URL.replace(/^http(s?):\/\//, (_, s: string) => `ws${s}://`);

/** Base58 id of the Thalassa Anchor program. Empty until the program is deployed. */
export const PROGRAM_ID = (process.env.NEXT_PUBLIC_THALASSA_PROGRAM_ID ?? "").trim();

export const SOLANA_CHAIN = "solana:devnet" as const;
export const FAUCET_URL = "https://faucet.solana.com";
export const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

const EXPLORER = "https://explorer.solana.com";
export const explorerTx = (signature: string) => `${EXPLORER}/tx/${signature}?cluster=devnet`;
export const explorerAddress = (address: string) => `${EXPLORER}/address/${address}?cluster=devnet`;

/** Lamports as a plain SOL number (0.05 for 50_000_000), for the i18n formatters. */
export const toSol = (lamports: bigint | number) => Number(lamports) / Number(LAMPORTS_PER_SOL);

/**
 * "0.05" (en) or "0,05" (es) for 50_000_000 lamports. Keeps up to 4 decimals and trims trailing zeros.
 * Spanish unless told otherwise, as before; with useI18n() prefer fmtDecimal(toSol(lamports), 4).
 */
export function fmtSol(lamports: bigint | number, maxDecimals = 4, lang: Locale = "es"): string {
  return getFormat(lang).fmtDecimal(toSol(lamports), maxDecimals);
}
