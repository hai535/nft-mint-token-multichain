# Frontend — Multi-chain NFT Mint

Next.js 14 (App Router) + Tailwind. Three wallet stacks in one app:

| Ecosystem | Library |
| --- | --- |
| EVM (ETH / BSC / Base) | `wagmi` + `viem` + `@rainbow-me/rainbowkit` |
| Solana | `@solana/wallet-adapter-*` + `@solana/web3.js` |
| Sui | `@mysten/dapp-kit` + `@mysten/sui` |

## Run

```bash
cd frontend
cp .env.example .env.local
# fill in NFT addresses + WalletConnect projectId
npm install
npm run dev
# http://localhost:3000
```

## After deploying contracts

1. **EVM** — paste the `MintNFT` address into `NEXT_PUBLIC_NFT_ETH/BSC/BASE`.
2. **Solana** — replace `declare_id!` in the program, paste it into `NEXT_PUBLIC_SOL_PROGRAM_ID`. To do real `mint_one` calls, copy the IDL from `solana/target/idl/mint_nft.json` into `frontend/lib/idl.ts` and replace the placeholder transfer in `MintSolana.tsx` with `program.methods.mintOne(...)`.
3. **Sui** — paste package id + shared `Drop` object id into `NEXT_PUBLIC_SUI_*`.

## Files

```
app/
  layout.tsx        # html shell
  page.tsx          # landing
  providers.tsx     # wagmi + rainbowkit + solana + sui providers in one tree
components/
  EcosystemTabs.tsx # EVM / Solana / Sui tab switcher
  MintEvm.tsx       # reads price/supply, calls mint() with msg.value
  MintSolana.tsx    # placeholder; swap in Anchor program.methods.mintOne
  MintSui.tsx       # tx.moveCall(`${pkg}::mint_nft::mint`, [drop, payment, url])
lib/
  abi.ts            # MintNFT ABI subset
  chains.ts         # chain configs + addresses from env
```
