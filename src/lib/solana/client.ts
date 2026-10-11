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
import { SOLANA_RPC_URL, SOLANA_WS_URL } from "./config";
import { PROGRAM_ERRORS } from "./program";

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

/** An error whose message is safe to show to the player as-is. */
export class FriendlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FriendlyError";
  }
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

/** Turns anything thrown by kit, the RPC or a wallet into one short Spanish sentence. */
export function friendlySolanaError(err: unknown): string {
  if (err instanceof FriendlyError) return err.message;
  const seen = new Set<unknown>();
  let e: unknown = err;
  while (e && typeof e === "object" && !seen.has(e)) {
    seen.add(e);
    if (isSolanaError(e, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM)) {
      const code = Number((e.context as { code?: number }).code);
      if (PROGRAM_ERRORS[code]) return PROGRAM_ERRORS[code];
    }
    if (
      isSolanaError(e, SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE) ||
      isSolanaError(e, SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT) ||
      isSolanaError(e, SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS)
    ) {
      return "No te alcanza el SOL de prueba. Pedí más y volvé a intentar.";
    }
    if (isSolanaError(e, SOLANA_ERROR__TRANSACTION_ERROR__PROGRAM_ACCOUNT_NOT_FOUND)) {
      return "El programa del juego no está en la red de prueba todavía.";
    }
    if (isSolanaError(e, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)) {
      return "La red tardó demasiado en confirmar. Probá de nuevo.";
    }
    const message = (e as { message?: string }).message ?? "";
    if (/insufficient (funds|lamports)|0x1\b|debit an account/i.test(message)) {
      return "No te alcanza el SOL de prueba. Pedí más y volvé a intentar.";
    }
    if (/429|too many requests|rate limit/i.test(message)) {
      return "La red de prueba está saturada. Esperá unos segundos y probá de nuevo.";
    }
    if (/failed to fetch|network ?error|load failed/i.test(message)) {
      return "No pudimos hablar con la red de prueba. Revisá tu conexión.";
    }
    e = (e as { cause?: unknown }).cause;
  }
  return "La red de prueba devolvió un error. Probá de nuevo en un rato.";
}
