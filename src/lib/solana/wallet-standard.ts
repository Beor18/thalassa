// Wallet Standard (Phantom, Solflare, Backpack...) helpers. Import only from Client Components.
import { useMemo } from "react";
import { getWalletFeature, useWallets, type UiWallet, type UiWalletAccount } from "@wallet-standard/react";
import { SOLANA_CHAIN } from "./config";
import { FriendlyError } from "./errors";

/** Shape of a raw Wallet Standard account (what wallet features expect as input). */
interface RawWalletAccount {
  readonly address: string;
  readonly publicKey: Uint8Array;
  readonly chains: readonly string[];
  readonly features: readonly string[];
}

interface ConnectFeature {
  connect(input?: { silent?: boolean }): Promise<{ accounts: readonly RawWalletAccount[] }>;
}

interface SignMessageFeature {
  signMessage(
    ...inputs: { account: RawWalletAccount; message: Uint8Array }[]
  ): Promise<readonly { signedMessage: Uint8Array; signature: Uint8Array }[]>;
}

export const INSTALL_WALLET_URL = "https://phantom.com/download";

export function isSolanaWallet(wallet: UiWallet): boolean {
  return (
    wallet.chains.some((c) => c.startsWith("solana:")) &&
    wallet.features.includes("standard:connect") &&
    wallet.features.includes("solana:signMessage")
  );
}

/** Wallets registered in this browser that can sign in with Solana. */
export function useSolanaWallets(): readonly UiWallet[] {
  const wallets = useWallets();
  return useMemo(() => wallets.filter(isSolanaWallet), [wallets]);
}

/** True if the account can sign devnet transactions (needed to buy ambrosia). */
export function canSignDevnetTransactions(account: UiWalletAccount): boolean {
  return account.chains.includes(SOLANA_CHAIN) && account.features.includes("solana:signTransaction");
}

/**
 * Asks the wallet for access (or silently reuses an existing authorization) and returns
 * the raw accounts. `silent` never opens a popup; wallets that don't support it just return [].
 */
export async function connectWallet(wallet: UiWallet, silent = false): Promise<readonly RawWalletAccount[]> {
  const feature = getWalletFeature(wallet, "standard:connect") as ConnectFeature;
  try {
    const { accounts } = await feature.connect(silent ? { silent: true } : undefined);
    return accounts;
  } catch (err) {
    if (silent) return [];
    throw err;
  }
}

/** Connects (if needed) and signs a UTF-8 message with the wallet's first Solana account. */
export async function connectAndSignMessage(
  wallet: UiWallet,
  getMessage: (address: string) => Promise<string>,
): Promise<{ address: string; message: string; signature: Uint8Array }> {
  const accounts = await connectWallet(wallet);
  const account = accounts.find((a) => a.chains.includes(SOLANA_CHAIN)) ?? accounts.find((a) => a.chains.some((c) => c.startsWith("solana:")));
  if (!account) {
    throw new FriendlyError({ en: "Your wallet didn't share a Solana account.", es: "La billetera no compartió ninguna cuenta de Solana." });
  }
  const message = await getMessage(account.address);
  const feature = getWalletFeature(wallet, "solana:signMessage") as SignMessageFeature;
  const [out] = await feature.signMessage({ account, message: new TextEncoder().encode(message) });
  if (!out) throw new FriendlyError({ en: "Your wallet didn't return a signature.", es: "La billetera no devolvió la firma." });
  return { address: account.address, message, signature: out.signature };
}
