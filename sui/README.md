# Sui

## Setup
```bash
brew install sui   # or: cargo install --git https://github.com/MystenLabs/sui.git sui --branch mainnet
sui client switch --env testnet   # or mainnet
```

## Build
```bash
sui move build
```

## Publish
```bash
sui client publish --gas-budget 300000000
# note PACKAGE_ID, ADMIN_CAP, and the REWARD TreasuryCap object id
```

## Operate
```bash
# 1) mint reward seed (one Coin<REWARD>)
sui client call --package $PKG --module reward --function mint \
  --args $REWARD_TREASURY_CAP 1000000000000 $YOUR_ADDR \
  --gas-budget 50000000

# 2) create drop
sui client call --package $PKG --module mint_nft --function create_drop \
  --args $ADMIN_CAP 1000000000 100000000000 10000 $SEED_REWARD_COIN \
  --gas-budget 100000000

# 3) user mint
sui client call --package $PKG --module mint_nft --function mint \
  --args $DROP_OBJ $PAYMENT_COIN '"ipfs://..."' \
  --gas-budget 50000000
```
