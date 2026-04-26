# Solana

## Setup
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest && avm use latest
yarn
```

## Build
```bash
anchor build
```

After build, replace the `declare_id!` placeholder in `programs/mint_nft/src/lib.rs` with the keypair-derived program id (`anchor keys list`), then `anchor build` again.

## Deploy
```bash
# devnet
anchor deploy --provider.cluster devnet

# mainnet
anchor deploy --provider.cluster mainnet-beta
```

## Test
```bash
anchor test
```
