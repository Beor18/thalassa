// Client-safe Solana settings. NEXT_PUBLIC_* values are inlined at build time,
// so they must be read with their literal names.

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

/** "0,05" for 50_000_000 lamports. Keeps up to 4 decimals and trims trailing zeros. */
export function fmtSol(lamports: bigint | number, maxDecimals = 4): string {
  const value = Number(lamports) / Number(LAMPORTS_PER_SOL);
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: maxDecimals }).format(value);
}
