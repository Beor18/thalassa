import "server-only";

export const GAME_SPEED = Math.max(1, Number(process.env.GAME_SPEED ?? 10) || 10);
export const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const PROGRAM_ID = process.env.NEXT_PUBLIC_THALASSA_PROGRAM_ID ?? "";
