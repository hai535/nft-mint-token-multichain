"use client";

import { useState } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { suiConfig } from "@/lib/chains";

const PRICE_MIST = 1_000_000_000n;

export function MintSui() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const ready = suiConfig.packageId !== "0x0" && suiConfig.dropObject !== "0x0";

  const onMint = async () => {
    if (!account) return;
    setBusy(true);
    setStatus("Building transaction…");
    try {
      const tx = new Transaction();
      const [payment] = tx.splitCoins(tx.gas, [PRICE_MIST]);
      tx.moveCall({
        target: `${suiConfig.packageId}::mint_nft::mint`,
        arguments: [
          tx.object(suiConfig.dropObject),
          payment,
          tx.pure.vector("u8", Array.from(new TextEncoder().encode("ipfs://your-cid"))),
        ],
      });
      const result = await signAndExecute({ transaction: tx });
      setStatus(`Sent: ${result.digest}`);
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ConnectButton />
      </div>
      {!ready && (
        <p className="text-amber-400 text-sm">
          Sui package not configured. Publish module, then set
          <code className="mx-1">NEXT_PUBLIC_SUI_PACKAGE</code>and
          <code className="mx-1">NEXT_PUBLIC_SUI_DROP</code>in .env.
        </p>
      )}
      <button
        onClick={onMint}
        disabled={!account || !ready || busy}
        className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:cursor-not-allowed font-medium"
      >
        {busy ? "Sending…" : "Mint"}
      </button>
      {status && <p className="text-xs text-zinc-400 break-all">{status}</p>}
    </div>
  );
}
