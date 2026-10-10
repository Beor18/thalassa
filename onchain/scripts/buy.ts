// Buys ambrosia packs on devnet with the configured wallet.
// Usage (from onchain/): npx tsx scripts/buy.ts [packs=1]
import { SystemProgram } from "@solana/web3.js";
import { setup } from "./common";

async function main() {
  const packs = Number(process.argv[2] ?? "1");
  const { program, accounts, wallet, connection, configPda, treasuryPda, citizenPda } = setup();
  const citizen = citizenPda(wallet.publicKey);

  const sig = await program.methods
    .buyAmbrosia(packs)
    .accountsPartial({
      buyer: wallet.publicKey,
      citizen,
      config: configPda,
      treasury: treasuryPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("buy_ambrosia signature", sig);

  const c = await accounts.citizen.fetch(citizen);
  console.log({
    citizen: citizen.toBase58(),
    owner: c.owner.toBase58(),
    ambrosiaTotal: c.ambrosiaTotal.toString(),
    lamportsSpent: c.lamportsSpent.toString(),
    purchases: c.purchases,
    createdAt: c.createdAt.toString(),
    bump: c.bump,
  });
  console.log("treasury lamports", await connection.getBalance(treasuryPda));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
