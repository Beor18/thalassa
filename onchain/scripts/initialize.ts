// Initializes the Thalassa Config on devnet (idempotent: skips if it exists).
// Usage (from onchain/): npx tsx scripts/initialize.ts
// Env: RPC_URL (default devnet), WALLET (default keys/deployer.json),
//      PRICE_LAMPORTS (default 50_000_000), AMBROSIA_PER_PACK (default 100).
import { BN } from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";
import { setup } from "./common";

async function main() {
  const { program, accounts, wallet, connection, configPda, treasuryPda } = setup();
  const price = new BN(process.env.PRICE_LAMPORTS ?? "50000000");
  const ambrosia = new BN(process.env.AMBROSIA_PER_PACK ?? "100");

  console.log("program  ", program.programId.toBase58());
  console.log("authority", wallet.publicKey.toBase58());
  console.log("config   ", configPda.toBase58());
  console.log("treasury ", treasuryPda.toBase58());

  if (await connection.getAccountInfo(configPda)) {
    console.log("Config already exists, skipping initialize.");
  } else {
    const sig = await program.methods
      .initialize(price, ambrosia)
      .accountsPartial({
        authority: wallet.publicKey,
        config: configPda,
        treasury: treasuryPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("initialize signature", sig);
  }

  const config = await accounts.config.fetch(configPda);
  console.log({
    authority: config.authority.toBase58(),
    priceLamportsPerPack: config.priceLamportsPerPack.toString(),
    ambrosiaPerPack: config.ambrosiaPerPack.toString(),
    totalPacksSold: config.totalPacksSold.toString(),
    bump: config.bump,
    treasuryBump: config.treasuryBump,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
