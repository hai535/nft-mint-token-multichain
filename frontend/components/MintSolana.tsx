"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  createMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MintLayout,
  createInitializeMintInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import { solConfig } from "@/lib/chains";

export function MintSolana() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const ready = !!solConfig.programId && solConfig.programId !== "Replace111111111111111111111111111111111111";

  const onMint = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;
    setBusy(true);
    setStatus("Building transaction…");
    try {
      // NOTE: full mint flow needs anchor IDL bound to programId.
      // This is a placeholder transfer to treasury; replace with program.methods.mintOne(...).
      if (!solConfig.treasury) throw new Error("treasury not configured");

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(solConfig.treasury),
          lamports: 10_000_000,
        })
      );
      tx.feePayer = wallet.publicKey;
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");
      setStatus(`Sent: ${sig}`);
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <WalletMultiButton />
      </div>
      {!ready && (
        <p className="text-amber-400 text-sm">
          Solana program id not set. Deploy program, then set
          <code className="mx-1">NEXT_PUBLIC_SOL_*</code>in .env.
        </p>
      )}
      <p className="text-xs text-zinc-400">
        Note: this stub demonstrates wallet + tx; the full flow calls
        <code className="mx-1">mint_one</code>via Anchor — paste the IDL into <code>lib/idl.ts</code> after <code>anchor build</code>.
      </p>
      <button
        onClick={onMint}
        disabled={!wallet.publicKey || busy}
        className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:cursor-not-allowed font-medium"
      >
        {busy ? "Sending…" : "Mint"}
      </button>
      {status && <p className="text-xs text-zinc-400 break-all">{status}</p>}
    </div>
  );
}
