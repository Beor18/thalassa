// Browser-side RPC access, transaction sending and friendly error messages.
import {
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  devnet,
  getSignatureFromTransaction,
  isSolanaError,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  assertIsTransactionWithBlockhashLifetime,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
  SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS,
  SOLANA_ERROR__TRANSACTION_ERROR__PROGRAM_ACCOUNT_NOT_FOUND,
  type Address,
  type Instruction,
  type Signature,
  type TransactionSigner,
} from "@solana/kit";
import type { Locale, Text } from "@/i18n/config";
import { SOLANA_RPC_URL, SOLANA_WS_URL } from "./config";
import { FriendlyError } from "./errors";
import { PROGRAM_ERRORS } from "./program";

export { FriendlyError };

let rpcSingleton: ReturnType<typeof makeRpc> | null = null;
let subsSingleton: ReturnType<typeof makeSubs> | null = null;
const makeRpc = () => createSolanaRpc(devnet(SOLANA_RPC_URL));
const makeSubs = () => createSolanaRpcSubscriptions(devnet(SOLANA_WS_URL));

export function getRpc() {
  return (rpcSingleton ??= makeRpc());
}

export function getRpcSubscriptions() {
  return (subsSingleton ??= makeSubs());
}

export async function getSolBalance(owner: Address): Promise<bigint> {
  const { value } = await getRpc().getBalance(owner, { commitment: "confirmed" }).send();
  return value;
}

/**
 * Builds, signs and sends a transaction paid by `feePayer`, then waits for confirmation.
 * Works with a local KeyPairSigner and with wallet-standard signers (sign-only), because we
 * always broadcast through our own devnet RPC.
 */
export async function sendInstructions(
  feePayer: TransactionSigner,
  instructions: Instruction[],
  onStage?: (stage: "signing" | "confirming") => void,
): Promise<Signature> {
  const rpc = getRpc();
  const { value: latestBlockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(feePayer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
  onStage?.("signing");
  const signed = await signTransactionMessageWithSigners(message);
  assertIsTransactionWithBlockhashLifetime(signed);
  onStage?.("confirming");
  const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: getRpcSubscriptions() });
  await sendAndConfirm(signed, { commitment: "confirmed" });
  return getSignatureFromTransaction(signed);
}

/** True when the player closed or rejected the wallet prompt. That is a choice, not an error. */
export function isUserRejection(err: unknown): boolean {
  const seen = new Set<unknown>();
  let e: unknown = err;
  while (e && typeof e === "object" && !seen.has(e)) {
    seen.add(e);
    const { name, message, code } = e as { name?: string; message?: string; code?: number };
    if (code === 4001) return true;
    if (name === "WalletSignTransactionError" && /reject/i.test(message ?? "")) return true;
    if (/user rejected|rejected the request|user denied|denied by user|user cancel|request was cancelled/i.test(message ?? "")) {
      return true;
    }
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

const NOT_ENOUGH_SOL: Text = {
  en: "You don't have enough test SOL. Get more and try again.",
  es: "No te alcanza el SOL de prueba. Pedí más y volvé a intentar.",
};

/** Turns anything thrown by kit, the RPC or a wallet into one short sentence in every language. */
export function friendlySolanaText(err: unknown): Text {
  if (err instanceof FriendlyError) return err.text;
  const seen = new Set<unknown>();
  let e: unknown = err;
  while (e && typeof e === "object" && !seen.has(e)) {
    seen.add(e);
    if (e instanceof FriendlyError) return e.text;
    if (isSolanaError(e, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM)) {
      const code = Number((e.context as { code?: number }).code);
      if (PROGRAM_ERRORS[code]) return PROGRAM_ERRORS[code];
    }
    if (
      isSolanaError(e, SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE) ||
      isSolanaError(e, SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT) ||
      isSolanaError(e, SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS)
    ) {
      return NOT_ENOUGH_SOL;
    }
    if (isSolanaError(e, SOLANA_ERROR__TRANSACTION_ERROR__PROGRAM_ACCOUNT_NOT_FOUND)) {
      return { en: "The Nectar shop isn't on the test network yet.", es: "El programa del juego no está en la red de prueba todavía." };
    }
    if (isSolanaError(e, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)) {
      return { en: "The network took too long to confirm. Try again.", es: "La red tardó demasiado en confirmar. Probá de nuevo." };
    }
    const message = (e as { message?: string }).message ?? "";
    if (/insufficient (funds|lamports)|0x1\b|debit an account/i.test(message)) {
      return NOT_ENOUGH_SOL;
    }
    if (/429|too many requests|rate limit/i.test(message)) {
      return {
        en: "The test network is busy. Wait a few seconds and try again.",
        es: "La red de prueba está saturada. Esperá unos segundos y probá de nuevo.",
      };
    }
    if (/failed to fetch|network ?error|load failed/i.test(message)) {
      return { en: "We couldn't reach the test network. Check your connection.", es: "No pudimos hablar con la red de prueba. Revisá tu conexión." };
    }
    e = (e as { cause?: unknown }).cause;
  }
  return { en: "The test network returned an error. Try again in a little while.", es: "La red de prueba devolvió un error. Probá de nuevo en un rato." };
}

/** friendlySolanaText in one language (Spanish unless told otherwise, as before). */
export function friendlySolanaError(err: unknown, lang: Locale = "es"): string {
  return friendlySolanaText(err)[lang];
}
