import { beforeEach, describe, expect, it } from "vitest";
import { getBase58Decoder, getBase58Encoder } from "@solana/kit";
import {
  LOCAL_WALLET_KEY,
  exportLocalWalletCode,
  importLocalWallet,
  loadOrCreateLocalWallet,
  localWalletAddressSync,
  transferCodeAddress,
} from "./local-wallet";

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

/** A fresh browser: its own localStorage. */
function newDevice() {
  (globalThis as { window?: unknown }).window = { localStorage: memoryStorage() };
}

describe("moving the game key to another device", () => {
  beforeEach(newDevice);

  it("exports a code the other device turns back into the same account", async () => {
    const { signer } = await loadOrCreateLocalWallet();
    const code = exportLocalWalletCode();
    expect(code).toBeTruthy();
    expect(transferCodeAddress(code!)).toBe(signer.address);

    newDevice();
    expect(localWalletAddressSync()).toBeNull();
    const imported = await importLocalWallet(code!);
    expect(imported.address).toBe(signer.address);
    expect(localWalletAddressSync()).toBe(signer.address);
  });

  it("has nothing to export without a key", () => {
    expect(exportLocalWalletCode()).toBeNull();
  });

  it("rejects cut or tampered codes and keeps the browser's key", async () => {
    const { signer } = await loadOrCreateLocalWallet();
    const code = exportLocalWalletCode()!;
    newDevice();
    const { signer: mine } = await loadOrCreateLocalWallet();
    const before = window.localStorage.getItem(LOCAL_WALLET_KEY);

    expect(() => transferCodeAddress(code.slice(0, 40))).toThrow();
    expect(() => transferCodeAddress("not-base58-0OIl")).toThrow();

    // Right length, wrong public half: the key must match its address.
    const bytes = new Uint8Array(getBase58Encoder().encode(code));
    bytes[40] ^= 1;
    await expect(importLocalWallet(getBase58Decoder().decode(bytes))).rejects.toThrow();
    expect(window.localStorage.getItem(LOCAL_WALLET_KEY)).toBe(before);
    expect(localWalletAddressSync()).toBe(mine.address);
    expect(mine.address).not.toBe(signer.address);
  });
});
