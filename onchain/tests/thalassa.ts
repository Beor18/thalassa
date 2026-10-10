import { describe, it, before } from "mocha";
import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import type { Thalassa } from "../target/types/thalassa";

const { BN } = anchor;

const PRICE = new BN(50_000_000); // 0.05 SOL per pack
const AMBROSIA_PER_PACK = new BN(100);

async function expectAnchorError(p: Promise<unknown>, code: string): Promise<void> {
  try {
    await p;
  } catch (err) {
    const e = err as { error?: { errorCode?: { code?: string } }; logs?: string[] };
    const got = e.error?.errorCode?.code;
    if (got !== undefined) {
      expect(got).to.equal(code);
      return;
    }
    const logs = (e.logs ?? []).join("\n") + String(err);
    expect(logs).to.contain(code);
    return;
  }
  expect.fail(`expected error ${code}, but the transaction succeeded`);
}

describe("thalassa", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.thalassa as Program<Thalassa>;
  const connection = provider.connection;
  const authority = provider.wallet.publicKey;

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const [treasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], program.programId);
  const citizenPda = (owner: PublicKey) =>
    PublicKey.findProgramAddressSync([Buffer.from("citizen"), owner.toBuffer()], program.programId)[0];

  const buyer = Keypair.generate();
  const stranger = Keypair.generate();

  async function airdrop(to: PublicKey, sol: number) {
    const sig = await connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
    const bh = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  }

  function buy(who: Keypair, packs: number) {
    return program.methods
      .buyAmbrosia(packs)
      .accountsPartial({
        buyer: who.publicKey,
        citizen: citizenPda(who.publicKey),
        config: configPda,
        treasury: treasuryPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([who])
      .rpc({ commitment: "confirmed" });
  }

  before(async () => {
    if ((await connection.getBalance(authority)) < 10 * LAMPORTS_PER_SOL) {
      await airdrop(authority, 100);
    }
    await airdrop(buyer.publicKey, 10);
    await airdrop(stranger.publicKey, 2);
  });

  it("initialize creates the config", async () => {
    await program.methods
      .initialize(PRICE, AMBROSIA_PER_PACK)
      .accountsPartial({
        authority,
        config: configPda,
        treasury: treasuryPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });

    const config = await program.account.config.fetch(configPda);
    expect(config.authority.toBase58()).to.equal(authority.toBase58());
    expect(config.priceLamportsPerPack.toString()).to.equal(PRICE.toString());
    expect(config.ambrosiaPerPack.toString()).to.equal(AMBROSIA_PER_PACK.toString());
    expect(config.totalPacksSold.toNumber()).to.equal(0);
    expect(config.bump).to.equal(PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId)[1]);
    expect(config.treasuryBump).to.equal(
      PublicKey.findProgramAddressSync([Buffer.from("treasury")], program.programId)[1],
    );

    const info = await connection.getAccountInfo(configPda);
    expect(info!.data.length).to.equal(66);
  });

  it("initialize cannot run twice", async () => {
    let failed = false;
    try {
      await program.methods
        .initialize(PRICE, AMBROSIA_PER_PACK)
        .accountsPartial({ authority, config: configPda, treasury: treasuryPda, systemProgram: SystemProgram.programId })
        .rpc();
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
  });

  it("buy_ambrosia creates the citizen and pays the treasury", async () => {
    const treasuryBefore = await connection.getBalance(treasuryPda);
    const sig = await buy(buyer, 2);

    const citizen = await program.account.citizen.fetch(citizenPda(buyer.publicKey));
    expect(citizen.owner.toBase58()).to.equal(buyer.publicKey.toBase58());
    expect(citizen.ambrosiaTotal.toNumber()).to.equal(200);
    expect(citizen.lamportsSpent.toString()).to.equal(PRICE.muln(2).toString());
    expect(citizen.purchases).to.equal(1);
    expect(citizen.createdAt.toNumber()).to.be.greaterThan(0);
    expect(citizen.bump).to.equal(
      PublicKey.findProgramAddressSync([Buffer.from("citizen"), buyer.publicKey.toBuffer()], program.programId)[1],
    );

    const info = await connection.getAccountInfo(citizenPda(buyer.publicKey));
    expect(info!.data.length).to.equal(69);
    // Raw layout check: what the game server reads.
    const raw = info!.data;
    expect(new PublicKey(raw.subarray(8, 40)).toBase58()).to.equal(buyer.publicKey.toBase58());
    expect(raw.readBigUInt64LE(40)).to.equal(BigInt(200));
    expect(raw.readBigUInt64LE(48)).to.equal(BigInt(100_000_000));
    expect(raw.readUInt32LE(56)).to.equal(1);
    expect(raw.readBigInt64LE(60)).to.equal(BigInt(citizen.createdAt.toString()));
    expect(raw.readUInt8(68)).to.equal(citizen.bump);

    const treasuryAfter = await connection.getBalance(treasuryPda);
    expect(treasuryAfter - treasuryBefore).to.equal(100_000_000);

    const config = await program.account.config.fetch(configPda);
    expect(config.totalPacksSold.toNumber()).to.equal(2);

    // Event
    const tx = await connection.getTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    const parser = new anchor.EventParser(program.programId, program.coder);
    const events = [...parser.parseLogs(tx!.meta!.logMessages!)];
    const ev = events.find((e) => e.name === "ambrosiaPurchased");
    expect(ev, "AmbrosiaPurchased event").to.not.equal(undefined);
    expect(ev!.data.buyer.toBase58()).to.equal(buyer.publicKey.toBase58());
    expect(ev!.data.packs).to.equal(2);
    expect(ev!.data.ambrosia.toNumber()).to.equal(200);
    expect(ev!.data.lamports.toNumber()).to.equal(100_000_000);
    expect(ev!.data.ambrosiaTotal.toNumber()).to.equal(200);
  });

  it("a second purchase accumulates", async () => {
    const before = await program.account.citizen.fetch(citizenPda(buyer.publicKey));
    await buy(buyer, 3);
    const citizen = await program.account.citizen.fetch(citizenPda(buyer.publicKey));
    expect(citizen.ambrosiaTotal.toNumber()).to.equal(500);
    expect(citizen.lamportsSpent.toString()).to.equal(PRICE.muln(5).toString());
    expect(citizen.purchases).to.equal(2);
    expect(citizen.createdAt.toString()).to.equal(before.createdAt.toString());
    const config = await program.account.config.fetch(configPda);
    expect(config.totalPacksSold.toNumber()).to.equal(5);
    expect(await connection.getBalance(treasuryPda)).to.equal(250_000_000);
  });

  it("rejects packs = 0", async () => {
    await expectAnchorError(buy(buyer, 0), "InvalidPackCount");
  });

  it("rejects packs > 100", async () => {
    await expectAnchorError(buy(buyer, 101), "InvalidPackCount");
  });

  it("withdraw by a non-authority is rejected", async () => {
    await expectAnchorError(
      program.methods
        .withdraw(new BN(10_000_000))
        .accountsPartial({
          authority: stranger.publicKey,
          config: configPda,
          treasury: treasuryPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([stranger])
        .rpc(),
      "Unauthorized",
    );
  });

  it("set_price by a non-authority is rejected", async () => {
    await expectAnchorError(
      program.methods
        .setPrice(new BN(1), new BN(1))
        .accountsPartial({ authority: stranger.publicKey, config: configPda })
        .signers([stranger])
        .rpc(),
      "Unauthorized",
    );
  });

  it("withdraw by the authority moves lamports", async () => {
    const tBefore = await connection.getBalance(treasuryPda);
    const aBefore = await connection.getBalance(authority);
    const amount = 100_000_000;
    const sig = await program.methods
      .withdraw(new BN(amount))
      .accountsPartial({ authority, config: configPda, treasury: treasuryPda, systemProgram: SystemProgram.programId })
      .rpc({ commitment: "confirmed" });
    const tx = await connection.getTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    const fee = tx!.meta!.fee;
    expect(await connection.getBalance(treasuryPda)).to.equal(tBefore - amount);
    expect(await connection.getBalance(authority)).to.equal(aBefore + amount - fee);
  });

  it("withdraw cannot leave dust below rent or overdraw", async () => {
    const t = await connection.getBalance(treasuryPda);
    const withdraw = (amount: number) =>
      program.methods
        .withdraw(new BN(amount))
        .accountsPartial({ authority, config: configPda, treasury: treasuryPda, systemProgram: SystemProgram.programId })
        .rpc();
    await expectAnchorError(withdraw(t - 1), "TreasuryBelowRent");
    await expectAnchorError(withdraw(t + 1), "InsufficientTreasury");
  });

  it("withdraw can empty the treasury and buying refills it", async () => {
    const t = await connection.getBalance(treasuryPda);
    await program.methods
      .withdraw(new BN(t))
      .accountsPartial({ authority, config: configPda, treasury: treasuryPda, systemProgram: SystemProgram.programId })
      .rpc({ commitment: "confirmed" });
    expect(await connection.getBalance(treasuryPda)).to.equal(0);
    await buy(buyer, 1);
    expect(await connection.getBalance(treasuryPda)).to.equal(50_000_000);
  });

  it("set_price by the authority updates the next purchase", async () => {
    await program.methods
      .setPrice(new BN(20_000_000), new BN(250))
      .accountsPartial({ authority, config: configPda })
      .rpc({ commitment: "confirmed" });
    const config = await program.account.config.fetch(configPda);
    expect(config.priceLamportsPerPack.toNumber()).to.equal(20_000_000);
    expect(config.ambrosiaPerPack.toNumber()).to.equal(250);

    const before = await program.account.citizen.fetch(citizenPda(buyer.publicKey));
    await buy(buyer, 4);
    const after = await program.account.citizen.fetch(citizenPda(buyer.publicKey));
    expect(after.ambrosiaTotal.sub(before.ambrosiaTotal).toNumber()).to.equal(1000);
    expect(after.lamportsSpent.sub(before.lamportsSpent).toNumber()).to.equal(80_000_000);
  });
});
