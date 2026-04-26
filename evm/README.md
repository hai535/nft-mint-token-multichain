# EVM (Ethereum / BSC / Base)

## Setup
```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
```

## Test
```bash
forge test -vv
```

## Deploy
```bash
export PRIVATE_KEY=0x...

# Ethereum
forge script script/Deploy.s.sol --rpc-url $ETH_RPC --broadcast --verify

# BSC
forge script script/Deploy.s.sol --rpc-url bsc --broadcast --verify

# Base
forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
```
