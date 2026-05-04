import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Escrowfi } from "../target/types/escrowfi";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { assert } from "chai";

describe("escrowfi", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrowfi as Program<Escrowfi>;

  // Participants
  const buyer = Keypair.generate();
  const seller = Keypair.generate();
  const arbitrator = Keypair.generate();

  // Token state
  let mint: PublicKey;
  let buyerTokenAccount: PublicKey;
  let sellerTokenAccount: PublicKey;

  const ESCROW_ID = new BN(1);
  const AMOUNT = new BN(100_000_000); // 100 USDC (6 decimals)

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function escrowPda(buyer: PublicKey, escrowId: BN): [PublicKey, number] {
    const idBytes = Buffer.alloc(8);
    idBytes.writeBigUInt64LE(BigInt(escrowId.toString()));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), buyer.toBuffer(), idBytes],
      program.programId
    );
  }

  function vaultPda(escrowKey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowKey.toBuffer()],
      program.programId
    );
  }

  // ─── Setup ──────────────────────────────────────────────────────────────────

  before(async () => {
    // Fund all participants
    for (const kp of [buyer, seller, arbitrator]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig, "confirmed");
    }

    // Create a test mint (simulates USDC)
    mint = await createMint(
      provider.connection,
      buyer,           // payer
      buyer.publicKey, // mint authority
      null,
      6                // 6 decimals like USDC
    );

    // Create token accounts
    buyerTokenAccount = await createAccount(
      provider.connection,
      buyer,
      mint,
      buyer.publicKey
    );

    sellerTokenAccount = await createAccount(
      provider.connection,
      seller,
      mint,
      seller.publicKey
    );

    // Mint 1000 USDC to buyer
    await mintTo(
      provider.connection,
      buyer,
      mint,
      buyerTokenAccount,
      buyer,
      1_000_000_000 // 1000 USDC
    );
  });

  // ─── Happy Path ─────────────────────────────────────────────────────────────

  describe("Happy Path: Create → Deliver → Confirm", () => {
    const escrowId = new BN(1);
    let escrowKey: PublicKey;
    let vaultKey: PublicKey;

    it("creates an escrow and locks USDC", async () => {
      [escrowKey] = escrowPda(buyer.publicKey, escrowId);
      [vaultKey] = vaultPda(escrowKey);

      const idBytes = Buffer.alloc(8);
      idBytes.writeBigUInt64LE(BigInt(escrowId.toString()));

      await program.methods
        .createEscrow(escrowId, AMOUNT, "MacBook Pro 16-inch, good condition")
        .accounts({
          buyer: buyer.publicKey,
          seller: seller.publicKey,
          arbitrator: arbitrator.publicKey,
          mint,
          escrow: escrowKey,
          vault: vaultKey,
          buyerTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([buyer])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowKey);
      assert.equal(escrow.buyer.toBase58(), buyer.publicKey.toBase58());
      assert.equal(escrow.seller.toBase58(), seller.publicKey.toBase58());
      assert.equal(escrow.amount.toNumber(), AMOUNT.toNumber());
      assert.deepEqual(escrow.status, { active: {} });

      const vault = await getAccount(provider.connection, vaultKey);
      assert.equal(vault.amount.toString(), AMOUNT.toString());
    });

    it("seller marks as delivered", async () => {
      await program.methods
        .markDelivered()
        .accounts({
          seller: seller.publicKey,
          escrow: escrowKey,
        })
        .signers([seller])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowKey);
      assert.deepEqual(escrow.status, { delivered: {} });
    });

    it("buyer confirms receipt — releases funds to seller", async () => {
      const sellerBalanceBefore = (
        await getAccount(provider.connection, sellerTokenAccount)
      ).amount;

      await program.methods
        .confirmReceipt()
        .accounts({
          buyer: buyer.publicKey,
          escrow: escrowKey,
          vault: vaultKey,
          sellerTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowKey);
      assert.deepEqual(escrow.status, { completed: {} });

      const sellerBalanceAfter = (
        await getAccount(provider.connection, sellerTokenAccount)
      ).amount;
      assert.equal(
        (sellerBalanceAfter - sellerBalanceBefore).toString(),
        AMOUNT.toString()
      );
    });
  });

  // ─── Cancel Flow ────────────────────────────────────────────────────────────

  describe("Cancel: buyer cancels before delivery", () => {
    const escrowId = new BN(2);
    let escrowKey: PublicKey;
    let vaultKey: PublicKey;

    it("creates a second escrow", async () => {
      [escrowKey] = escrowPda(buyer.publicKey, escrowId);
      [vaultKey] = vaultPda(escrowKey);

      await program.methods
        .createEscrow(escrowId, AMOUNT, "Freelance design work, 50 USDC")
        .accounts({
          buyer: buyer.publicKey,
          seller: seller.publicKey,
          arbitrator: arbitrator.publicKey,
          mint,
          escrow: escrowKey,
          vault: vaultKey,
          buyerTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([buyer])
        .rpc();
    });

    it("buyer cancels — refunds USDC", async () => {
      const buyerBalanceBefore = (
        await getAccount(provider.connection, buyerTokenAccount)
      ).amount;

      await program.methods
        .cancelEscrow()
        .accounts({
          buyer: buyer.publicKey,
          escrow: escrowKey,
          vault: vaultKey,
          buyerTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowKey);
      assert.deepEqual(escrow.status, { cancelled: {} });

      const buyerBalanceAfter = (
        await getAccount(provider.connection, buyerTokenAccount)
      ).amount;
      assert.equal(
        (buyerBalanceAfter - buyerBalanceBefore).toString(),
        AMOUNT.toString()
      );
    });
  });

  // ─── Dispute Flow ───────────────────────────────────────────────────────────

  describe("Dispute: raise → resolve (in favour of seller)", () => {
    const escrowId = new BN(3);
    let escrowKey: PublicKey;
    let vaultKey: PublicKey;

    it("creates a third escrow", async () => {
      [escrowKey] = escrowPda(buyer.publicKey, escrowId);
      [vaultKey] = vaultPda(escrowKey);

      await program.methods
        .createEscrow(escrowId, AMOUNT, "Consulting services")
        .accounts({
          buyer: buyer.publicKey,
          seller: seller.publicKey,
          arbitrator: arbitrator.publicKey,
          mint,
          escrow: escrowKey,
          vault: vaultKey,
          buyerTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([buyer])
        .rpc();
    });

    it("buyer raises dispute", async () => {
      await program.methods
        .raiseDispute("Item not as described — requesting refund or replacement")
        .accounts({
          initiator: buyer.publicKey,
          escrow: escrowKey,
        })
        .signers([buyer])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowKey);
      assert.deepEqual(escrow.status, { disputed: {} });
      assert.include(escrow.disputeReason, "not as described");
    });

    it("arbitrator resolves in favour of seller", async () => {
      const sellerBalanceBefore = (
        await getAccount(provider.connection, sellerTokenAccount)
      ).amount;

      await program.methods
        .resolveDispute(true) // true = release to seller
        .accounts({
          arbitrator: arbitrator.publicKey,
          escrow: escrowKey,
          vault: vaultKey,
          buyerTokenAccount,
          sellerTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([arbitrator])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowKey);
      assert.deepEqual(escrow.status, { completed: {} });

      const sellerBalanceAfter = (
        await getAccount(provider.connection, sellerTokenAccount)
      ).amount;
      assert.equal(
        (sellerBalanceAfter - sellerBalanceBefore).toString(),
        AMOUNT.toString()
      );
    });
  });

  // ─── Error Guards ───────────────────────────────────────────────────────────

  describe("Error guards", () => {
    it("rejects zero amount", async () => {
      const escrowId = new BN(99);
      const [escrowKey] = escrowPda(buyer.publicKey, escrowId);
      const [vaultKey] = vaultPda(escrowKey);

      try {
        await program.methods
          .createEscrow(escrowId, new BN(0), "zero amount test")
          .accounts({
            buyer: buyer.publicKey,
            seller: seller.publicKey,
            arbitrator: arbitrator.publicKey,
            mint,
            escrow: escrowKey,
            vault: vaultKey,
            buyerTokenAccount,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .signers([buyer])
          .rpc();
        assert.fail("Should have thrown InvalidAmount");
      } catch (err: any) {
        assert.include(err.toString(), "InvalidAmount");
      }
    });

    it("rejects buyer == seller", async () => {
      const escrowId = new BN(100);
      const [escrowKey] = escrowPda(buyer.publicKey, escrowId);
      const [vaultKey] = vaultPda(escrowKey);

      try {
        await program.methods
          .createEscrow(escrowId, AMOUNT, "same wallet test")
          .accounts({
            buyer: buyer.publicKey,
            seller: buyer.publicKey, // same as buyer
            arbitrator: arbitrator.publicKey,
            mint,
            escrow: escrowKey,
            vault: vaultKey,
            buyerTokenAccount,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .signers([buyer])
          .rpc();
        assert.fail("Should have thrown BuyerSellerSame");
      } catch (err: any) {
        assert.include(err.toString(), "BuyerSellerSame");
      }
    });
  });
});
