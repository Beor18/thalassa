// Client-safe helpers for the `thalassa` Anchor program (see ./idl/thalassa.json).
import {
  AccountRole,
  address,
  fetchEncodedAccount,
  getAddressDecoder,
  getAddressEncoder,
  getProgramDerivedAddress,
  getU16Encoder,
  type Address,
  type GetAccountInfoApi,
  type Instruction,
  type Rpc,
  type TransactionSigner,
} from "@solana/kit";
import { PROGRAM_ID } from "./config";

export const SYSTEM_PROGRAM = address("11111111111111111111111111111111");

// Anchor discriminators: sha256("global:buy_ambrosia")[0..8], sha256("account:<Name>")[0..8]
const BUY_AMBROSIA_DISCRIMINATOR = new Uint8Array([86, 129, 156, 216, 92, 22, 140, 138]);
const CONFIG_DISCRIMINATOR = [155, 12, 170, 224, 30, 250, 204, 130];
const CITIZEN_DISCRIMINATOR = [46, 45, 63, 201, 241, 115, 110, 93];

export const MAX_PACKS_PER_PURCHASE = 100;

/** Program address, or null while NEXT_PUBLIC_THALASSA_PROGRAM_ID is empty. */
export function programAddress(): Address | null {
  if (!PROGRAM_ID) return null;
  try {
    return address(PROGRAM_ID);
  } catch {
    return null;
  }
}

function requireProgram(): Address {
  const program = programAddress();
  if (!program) throw new Error("El programa de Thalassa todavía no está configurado.");
  return program;
}

const text = (s: string) => new TextEncoder().encode(s);

export async function findConfigPda(): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({ programAddress: requireProgram(), seeds: [text("config")] });
  return pda;
}

export async function findTreasuryPda(): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({ programAddress: requireProgram(), seeds: [text("treasury")] });
  return pda;
}

export async function findCitizenPda(owner: string): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: requireProgram(),
    seeds: [text("citizen"), getAddressEncoder().encode(address(owner))],
  });
  return pda;
}

// ---------------------------------------------------------------------------
// Account decoders
// ---------------------------------------------------------------------------

export interface ThalassaConfig {
  authority: Address;
  priceLamportsPerPack: bigint;
  ambrosiaPerPack: bigint;
  totalPacksSold: bigint;
  bump: number;
  treasuryBump: number;
}

export interface CitizenAccount {
  owner: Address;
  ambrosiaTotal: bigint;
  lamportsSpent: bigint;
  purchases: number;
  createdAt: number;
  bump: number;
}

function hasDiscriminator(data: Uint8Array, disc: number[]) {
  return data.length >= 8 && disc.every((b, i) => data[i] === b);
}

/** Config: disc | authority(32) | price u64 | ambrosia_per_pack u64 | total_packs_sold u64 | bump u8 | treasury_bump u8 */
export function decodeConfig(data: Uint8Array): ThalassaConfig {
  if (data.length < 66 || !hasDiscriminator(data, CONFIG_DISCRIMINATOR)) {
    throw new Error("La configuración de la tienda tiene un formato inesperado.");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    authority: getAddressDecoder().decode(data.subarray(8, 40)),
    priceLamportsPerPack: view.getBigUint64(40, true),
    ambrosiaPerPack: view.getBigUint64(48, true),
    totalPacksSold: view.getBigUint64(56, true),
    bump: data[64],
    treasuryBump: data[65],
  };
}

/** Citizen: disc | owner(32) | ambrosia_total u64 | lamports_spent u64 | purchases u32 | created_at i64 | bump u8 */
export function decodeCitizen(data: Uint8Array): CitizenAccount {
  if (data.length < 69 || !hasDiscriminator(data, CITIZEN_DISCRIMINATOR)) {
    throw new Error("Tu cuenta en la red tiene un formato inesperado.");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    owner: getAddressDecoder().decode(data.subarray(8, 40)),
    ambrosiaTotal: view.getBigUint64(40, true),
    lamportsSpent: view.getBigUint64(48, true),
    purchases: view.getUint32(56, true),
    createdAt: Number(view.getBigInt64(60, true)),
    bump: data[68],
  };
}

type AccountRpc = Rpc<GetAccountInfoApi>;

/** Live shop config, or null when the program exists but was never initialized. */
export async function fetchConfig(rpc: AccountRpc): Promise<ThalassaConfig | null> {
  const account = await fetchEncodedAccount(rpc, await findConfigPda(), { commitment: "confirmed" });
  if (!account.exists) return null;
  if (account.programAddress !== requireProgram()) throw new Error("La configuración de la tienda no pertenece al juego.");
  return decodeConfig(account.data as Uint8Array);
}

/** The player's on-chain purchase record, or null if they never bought. */
export async function fetchCitizen(rpc: AccountRpc, owner: string): Promise<CitizenAccount | null> {
  const account = await fetchEncodedAccount(rpc, await findCitizenPda(owner), { commitment: "confirmed" });
  if (!account.exists) return null;
  return decodeCitizen(account.data as Uint8Array);
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

/**
 * `buy_ambrosia(packs: u16)`. Account order follows the IDL:
 * buyer (writable signer), citizen (writable), config (writable), treasury (writable), system_program.
 */
export async function buyAmbrosiaInstruction(buyer: TransactionSigner, packs: number): Promise<Instruction> {
  if (!Number.isInteger(packs) || packs < 1 || packs > MAX_PACKS_PER_PURCHASE) {
    throw new Error(`Podés comprar entre 1 y ${MAX_PACKS_PER_PURCHASE} packs por vez.`);
  }
  const [citizen, config, treasury] = await Promise.all([findCitizenPda(buyer.address), findConfigPda(), findTreasuryPda()]);
  const data = new Uint8Array(10);
  data.set(BUY_AMBROSIA_DISCRIMINATOR, 0);
  data.set(getU16Encoder().encode(packs), 8);
  return {
    programAddress: requireProgram(),
    accounts: [
      { address: buyer.address, role: AccountRole.WRITABLE_SIGNER, signer: buyer },
      { address: citizen, role: AccountRole.WRITABLE },
      { address: config, role: AccountRole.WRITABLE },
      { address: treasury, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data,
  } as Instruction;
}

/** Friendly text for the program's custom error codes (IDL `errors`). */
export const PROGRAM_ERRORS: Record<number, string> = {
  6000: `Podés comprar entre 1 y ${MAX_PACKS_PER_PURCHASE} packs por vez.`,
  6001: "La cuenta dio un número demasiado grande. Probá con menos packs.",
  6002: "Esa operación es solo para la administración del juego.",
  6003: "La tesorería no tiene fondos suficientes.",
  6004: "La cantidad tiene que ser mayor que cero.",
  6005: "El precio del pack no es válido.",
  6006: "La cantidad de néctar por pack no es válida.",
  6007: "La tesorería tiene que quedar vacía o por encima del mínimo de la red.",
};
