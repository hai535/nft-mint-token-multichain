import { mainnet, bsc, base } from "wagmi/chains";

export const evmChains = [mainnet, bsc, base] as const;

export const evmContracts: Record<number, `0x${string}`> = {
  [mainnet.id]: (process.env.NEXT_PUBLIC_NFT_ETH ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  [bsc.id]:     (process.env.NEXT_PUBLIC_NFT_BSC ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  [base.id]:    (process.env.NEXT_PUBLIC_NFT_BASE ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
};

export const evmLabel: Record<number, string> = {
  [mainnet.id]: "Ethereum",
  [bsc.id]: "BSC",
  [base.id]: "Base",
};

export const solConfig = {
  programId: process.env.NEXT_PUBLIC_SOL_PROGRAM_ID ?? "",
  rewardMint: process.env.NEXT_PUBLIC_SOL_REWARD_MINT ?? "",
  treasury: process.env.NEXT_PUBLIC_SOL_TREASURY ?? "",
};

export const suiConfig = {
  packageId: process.env.NEXT_PUBLIC_SUI_PACKAGE ?? "0x0",
  dropObject: process.env.NEXT_PUBLIC_SUI_DROP ?? "0x0",
};
