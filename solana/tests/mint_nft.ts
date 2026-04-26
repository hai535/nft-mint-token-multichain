import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { MintNft } from "../target/types/mint_nft";

const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

describe("mint_nft", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MintNft as Program<MintNft>;

  it("init + mint", async () => {
    const authority = provider.wallet.publicKey;

    const rewardMint = await createMint(
      provider.connection,
      (provider.wallet as any).payer,
      authority,
      null,
      9
    );

    const [config] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    const rewardVault = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      rewardMint,
      config,
      true
    );

    await mintTo(
      provider.connection,
      (provider.wallet as any).payer,
      rewardMint,
      rewardVault.address,
      authority,
      1_000_000_000_000
    );

    await program.methods
      .initConfig(new anchor.BN(100_000_000_000), new anchor.BN(10_000_000))
      .accounts({
        config,
        rewardMint,
        rewardVault: rewardVault.address,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("config initialized");
  });
});
