import { EcosystemTabs } from "@/components/EcosystemTabs";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Multi-chain NFT Mint</h1>
          <p className="text-zinc-400 text-sm">
            Mint an NFT and receive reward tokens. Same UX across BSC, Ethereum, Base, Solana, and Sui.
          </p>
        </header>
        <EcosystemTabs />
        <footer className="text-xs text-zinc-500 pt-8 border-t border-zinc-800">
          Contracts:{" "}
          <a className="underline hover:text-zinc-300" href="https://github.com/hai535/nft-mint-token-multichain" target="_blank">
            github.com/hai535/nft-mint-token-multichain
          </a>
        </footer>
      </div>
    </main>
  );
}
