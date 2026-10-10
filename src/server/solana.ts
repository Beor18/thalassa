import "server-only";
import { address, createSolanaRpc, fetchEncodedAccount, getAddressEncoder, getProgramDerivedAddress } from "@solana/kit";
import { GameError } from "@/game/engine";
import { PROGRAM_ID, SOLANA_RPC_URL } from "./config";

// Anchor account discriminator: sha256("account:Citizen")[0..8]
const CITIZEN_DISCRIMINATOR = [46, 45, 63, 201, 241, 115, 110, 93];
// Citizen layout after the discriminator: owner (32) | ambrosia_total u64 LE | ...
const OWNER_OFFSET = 8;
const AMBROSIA_OFFSET = 40;

const rpc = createSolanaRpc(SOLANA_RPC_URL);

export async function citizenAddress(owner: string) {
  if (!PROGRAM_ID) throw new GameError("El programa de Solana todavía no está configurado.");
  const [pda] = await getProgramDerivedAddress({
    programAddress: address(PROGRAM_ID),
    seeds: [new TextEncoder().encode("citizen"), getAddressEncoder().encode(address(owner))],
  });
  return pda;
}

/** Total ambrosia ever bought on-chain by `owner` (0 if they never bought). */
export async function readCitizenAmbrosia(owner: string): Promise<number> {
  const pda = await citizenAddress(owner);
  const account = await fetchEncodedAccount(rpc, pda, { commitment: "confirmed" });
  if (!account.exists) return 0;
  if (account.programAddress !== PROGRAM_ID) throw new GameError("La cuenta on-chain no pertenece al juego.");
  const data = account.data;
  if (data.length < AMBROSIA_OFFSET + 8 || CITIZEN_DISCRIMINATOR.some((b, i) => data[i] !== b)) {
    throw new GameError("La cuenta on-chain tiene un formato inesperado.");
  }
  const ownerBytes = getAddressEncoder().encode(address(owner));
  for (let i = 0; i < 32; i++) {
    if (data[OWNER_OFFSET + i] !== ownerBytes[i]) throw new GameError("La cuenta on-chain no es tuya.");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return Number(view.getBigUint64(AMBROSIA_OFFSET, true));
}
