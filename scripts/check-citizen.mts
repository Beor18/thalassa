// Prints the on-chain ambrosia total for a wallet, as the game server reads it.
// Usage: pnpm check:citizen <wallet>
process.loadEnvFile(".env.local");
const { readCitizenAmbrosia, citizenAddress } = await import("../src/server/solana");
const wallet = process.argv[2];
if (!wallet) throw new Error("Pasá una dirección de billetera.");
console.log("citizen", await citizenAddress(wallet), "ambrosia_total", await readCitizenAmbrosia(wallet));
process.exit(0);
