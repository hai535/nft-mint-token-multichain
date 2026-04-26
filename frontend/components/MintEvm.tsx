"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useReadContract, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { evmChains, evmContracts, evmLabel } from "@/lib/chains";
import { MINT_NFT_ABI } from "@/lib/abi";

export function MintEvm() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const address = evmContracts[chainId];
  const valid = address && address !== "0x0000000000000000000000000000000000000000";

  const { data: price } = useReadContract({
    address, abi: MINT_NFT_ABI, functionName: "mintPrice", query: { enabled: !!valid },
  });
  const { data: reward } = useReadContract({
    address, abi: MINT_NFT_ABI, functionName: "rewardPerMint", query: { enabled: !!valid },
  });
  const { data: nextId } = useReadContract({
    address, abi: MINT_NFT_ABI, functionName: "nextId", query: { enabled: !!valid },
  });
  const { data: maxSupply } = useReadContract({
    address, abi: MINT_NFT_ABI, functionName: "maxSupply", query: { enabled: !!valid },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const onMint = () => {
    if (!valid || price === undefined) return;
    writeContract({ address, abi: MINT_NFT_ABI, functionName: "mint", value: price });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {evmChains.map((c) => (
            <button
              key={c.id}
              onClick={() => switchChain({ chainId: c.id })}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                chainId === c.id
                  ? "bg-violet-600 border-violet-500"
                  : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
              }`}
            >
              {evmLabel[c.id]}
            </button>
          ))}
        </div>
        <ConnectButton />
      </div>

      {!valid ? (
        <p className="text-amber-400 text-sm">
          Contract for {evmLabel[chainId] ?? "this chain"} not configured. Set
          <code className="mx-1">NEXT_PUBLIC_NFT_*</code>in .env.
        </p>
      ) : (
        <div className="space-y-2 text-sm text-zinc-300">
          <div>Price: {price !== undefined ? `${formatEther(price as bigint)} ${chainId === 56 ? "BNB" : "ETH"}` : "—"}</div>
          <div>Reward per mint: {reward !== undefined ? `${formatEther(reward as bigint)} RWT` : "—"}</div>
          <div>Minted: {nextId !== undefined && maxSupply !== undefined ? `${Number(nextId) - 1} / ${maxSupply}` : "—"}</div>
        </div>
      )}

      <button
        onClick={onMint}
        disabled={!isConnected || !valid || isPending || confirming}
        className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:cursor-not-allowed font-medium"
      >
        {isPending ? "Confirm in wallet…" : confirming ? "Confirming…" : isSuccess ? "Minted ✓" : "Mint"}
      </button>

      {hash && (
        <p className="text-xs text-zinc-400 break-all">tx: {hash}</p>
      )}
      {error && (
        <p className="text-xs text-red-400 break-all">{error.message}</p>
      )}
    </div>
  );
}
