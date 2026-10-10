import * as fs from "fs";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const ROOT = path.resolve(__dirname, "..");

export const RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com";
export const WALLET_PATH = process.env.WALLET ?? path.join(ROOT, "keys", "deployer.json");

export function loadKeypair(file: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
}

// Prefer the freshly built IDL, fall back to the copy shipped with the app.
function loadIdl(): anchor.Idl {
  const candidates = [
    path.join(ROOT, "target", "idl", "thalassa.json"),
    path.join(ROOT, "..", "src", "lib", "solana", "idl", "thalassa.json"),
  ];
  const file = candidates.find((f) => fs.existsSync(f));
  if (!file) throw new Error("IDL not found. Run `anchor build` first.");
  return JSON.parse(fs.readFileSync(file, "utf8")) as anchor.Idl;
}

export interface ConfigAccount {
  authority: PublicKey;
  priceLamportsPerPack: anchor.BN;
  ambrosiaPerPack: anchor.BN;
  totalPacksSold: anchor.BN;
  bump: number;
  treasuryBump: number;
}

export interface CitizenAccount {
  owner: PublicKey;
  ambrosiaTotal: anchor.BN;
  lamportsSpent: anchor.BN;
  purchases: number;
  createdAt: anchor.BN;
  bump: number;
}

export function setup() {
  const wallet = new anchor.Wallet(loadKeypair(WALLET_PATH));
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const program = new anchor.Program(loadIdl(), provider);
  // Typed decode without depending on target/types (works on a fresh clone).
  async function decode<T>(name: "config" | "citizen", address: PublicKey): Promise<T> {
    const info = await connection.getAccountInfo(address);
    if (!info) throw new Error(`${name} account ${address.toBase58()} not found`);
    return program.coder.accounts.decode<T>(name, info.data);
  }
  const accounts = {
    config: { fetch: (a: PublicKey) => decode<ConfigAccount>("config", a) },
    citizen: { fetch: (a: PublicKey) => decode<CitizenAccount>("citizen", a) },
  };
  const pda = (...seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  return {
    provider,
    program,
    accounts,
    wallet,
    connection,
    configPda: pda(Buffer.from("config")),
    treasuryPda: pda(Buffer.from("treasury")),
    citizenPda: (owner: PublicKey) => pda(Buffer.from("citizen"), owner.toBuffer()),
  };
}
