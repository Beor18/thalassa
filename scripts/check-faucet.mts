// Verifies the game faucet end to end, paying into a wallet the project controls.
// Usage: pnpm check:faucet <wallet-you-control>
process.loadEnvFile(".env.local");
const { db } = await import("../src/db");
const { players } = await import("../src/db/schema");
const { eq } = await import("drizzle-orm");
const { findOrCreatePlayer } = await import("../src/server/world");
const { claimFaucet } = await import("../src/server/faucet");
const wallet = process.argv[2];
if (!wallet) throw new Error("Pasá una dirección de billetera.");
const existed = (await db.select({ id: players.id }).from(players).where(eq(players.wallet, wallet))).length > 0;
const { id } = await findOrCreatePlayer(wallet);
try {
  console.log("claim", await claimFaucet(id));
  const again = await claimFaucet(id).catch((e: Error) => e.message);
  console.log("second claim", again);
} finally {
  if (!existed) await db.delete(players).where(eq(players.id, id));
  process.exit(0);
}
