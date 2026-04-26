# NFT Mint → Token Reward 多链合约功能清单

> 用户铸造 NFT，同一笔交易内拿到一定数量的项目方代币。覆盖 BSC / ETH / Base / Solana / Sui 五条链。
> （原始需求里的 "bash" 按 **Base** 处理，如果是别的链请改）

---

## 1. 通用功能清单（与链无关）

### 1.1 必备能力
- [ ] NFT 合约：name / symbol / tokenURI（baseURI + tokenId 或 IPFS 单独映射）
- [ ] 奖励代币合约：18 位精度（Solana 9 位、Sui 通常 9 位）
- [ ] `mint()` 入口：用户支付（或免费）→ 收到 1 个 NFT + N 个奖励代币
- [ ] 单次 mint 价格（原生币计价）
- [ ] 单次 mint 奖励数量（可配置，区分阶段或线性递减）
- [ ] 总供给上限 `MAX_SUPPLY`
- [ ] 单地址 mint 上限 `MAX_PER_WALLET`
- [ ] mint 开关 / 时间窗口 `mintStart / mintEnd`
- [ ] Owner 提现入口（提取用户支付的原生币）
- [ ] 事件：`Minted(user, tokenId, rewardAmount)`

### 1.2 安全 & 防女巫（按需开启）
- [ ] Pausable（紧急暂停）
- [ ] ReentrancyGuard（EVM 必备）
- [ ] 白名单：Merkle Root / 签名（EIP-712 / ed25519）
- [ ] 限频（每 N 秒最多一次）
- [ ] 仅 EOA：`tx.origin == msg.sender`（EVM）
- [ ] 奖励代币来源：①预存奖池（推荐）②NFT 合约具备 token mint 权限

### 1.3 运营 & 升级
- [ ] 可调参数：mint 价 / 奖励数 / URI / 收款地址
- [ ] Owner 转移（Ownable2Step / multisig）
- [ ] 可升级（EVM：UUPS；Sui：package upgrade；Solana：upgrade authority）
- [ ] 子图 / 索引（The Graph / Helius / SuiScan）

---

## 2. 各链实现

### 2.1 EVM 三链（ETH / BSC / Base）—— 共用 Solidity 代码

只是 RPC、chainId、gas、浏览器 verify 工具不同；合约本身一份就够。

#### 2.1.1 目录
```
evm/
├── foundry.toml
├── src/
│   ├── RewardToken.sol         # ERC20
│   └── MintNFT.sol             # ERC721 + 奖励分发
├── script/
│   └── Deploy.s.sol
└── test/
    └── MintNFT.t.sol
```

#### 2.1.2 合约 —— `RewardToken.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RewardToken is ERC20, Ownable {
    constructor(address owner_) ERC20("Reward Token", "RWT") Ownable(owner_) {
        _mint(owner_, 1_000_000_000 ether); // 10亿初始, 由 owner 转入 NFT 合约做奖池
    }
}
```

#### 2.1.3 合约 —— `MintNFT.sol`（核心）
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MintNFT is ERC721, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable rewardToken;
    uint256 public immutable rewardPerMint;   // 例 100 ether
    uint256 public immutable maxSupply;       // 例 10_000
    uint256 public immutable maxPerWallet;    // 例 5
    uint256 public mintPrice;                 // wei
    string  private _baseTokenURI;
    uint256 public nextId = 1;

    mapping(address => uint256) public mintedOf;

    event Minted(address indexed user, uint256 indexed tokenId, uint256 rewardAmount);

    constructor(
        address owner_,
        IERC20 rewardToken_,
        uint256 rewardPerMint_,
        uint256 maxSupply_,
        uint256 maxPerWallet_,
        uint256 mintPrice_,
        string memory baseURI_
    ) ERC721("MintNFT", "MNFT") Ownable(owner_) {
        rewardToken    = rewardToken_;
        rewardPerMint  = rewardPerMint_;
        maxSupply      = maxSupply_;
        maxPerWallet   = maxPerWallet_;
        mintPrice      = mintPrice_;
        _baseTokenURI  = baseURI_;
    }

    function mint() external payable nonReentrant whenNotPaused {
        require(msg.value == mintPrice, "bad price");
        require(nextId <= maxSupply, "sold out");
        require(++mintedOf[msg.sender] <= maxPerWallet, "wallet cap");
        require(tx.origin == msg.sender, "no contract");

        uint256 tid = nextId++;
        _safeMint(msg.sender, tid);
        rewardToken.safeTransfer(msg.sender, rewardPerMint);

        emit Minted(msg.sender, tid, rewardPerMint);
    }

    function _baseURI() internal view override returns (string memory) { return _baseTokenURI; }

    // admin
    function setMintPrice(uint256 v) external onlyOwner { mintPrice = v; }
    function setBaseURI(string calldata v) external onlyOwner { _baseTokenURI = v; }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    function withdraw(address to) external onlyOwner {
        (bool ok,) = to.call{value: address(this).balance}("");
        require(ok, "withdraw fail");
    }
    function rescueReward(address to, uint256 amt) external onlyOwner {
        rewardToken.safeTransfer(to, amt);
    }
}
```

#### 2.1.4 部署脚本 —— `script/Deploy.s.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
import {RewardToken} from "../src/RewardToken.sol";
import {MintNFT}     from "../src/MintNFT.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address me = vm.addr(pk);
        vm.startBroadcast(pk);

        RewardToken rwt = new RewardToken(me);
        MintNFT nft = new MintNFT(
            me, rwt,
            100 ether,         // rewardPerMint
            10_000,            // maxSupply
            5,                 // maxPerWallet
            0.001 ether,       // mintPrice
            "ipfs://CID/"
        );
        // 把奖池打进 NFT 合约
        rwt.transfer(address(nft), 1_000_000 ether);

        vm.stopBroadcast();
        console.log("RWT", address(rwt));
        console.log("NFT", address(nft));
    }
}
```

#### 2.1.5 三链部署命令
```bash
# 共用环境变量
export PRIVATE_KEY=0x...
forge install OpenZeppelin/openzeppelin-contracts

# Ethereum mainnet
forge script script/Deploy.s.sol --rpc-url $ETH_RPC \
  --broadcast --verify --etherscan-api-key $ETHERSCAN_KEY

# BSC
forge script script/Deploy.s.sol --rpc-url https://bsc-dataseed.binance.org \
  --broadcast --verify --verifier-url https://api.bscscan.com/api \
  --etherscan-api-key $BSCSCAN_KEY

# Base
forge script script/Deploy.s.sol --rpc-url https://mainnet.base.org \
  --broadcast --verify --verifier-url https://api.basescan.org/api \
  --etherscan-api-key $BASESCAN_KEY
```

#### 2.1.6 用户调用（ethers v6）
```ts
import { ethers } from "ethers";
const nft = new ethers.Contract(NFT_ADDR, NFT_ABI, signer);
const tx = await nft.mint({ value: ethers.parseEther("0.001") });
await tx.wait();
```

---

### 2.2 Solana —— Anchor + Metaplex + SPL Token

#### 2.2.1 目录
```
solana/
├── Anchor.toml
├── programs/mint_nft/
│   ├── Cargo.toml
│   └── src/lib.rs
└── tests/mint_nft.ts
```

#### 2.2.2 Program —— `programs/mint_nft/src/lib.rs`
（用 mpl-token-metadata 和 spl-token 直接组合：mint NFT + 从奖池 transfer SPL）
```rust
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount, Transfer},
};
use mpl_token_metadata::instructions::CreateMetadataAccountV3CpiBuilder;
use mpl_token_metadata::types::DataV2;

declare_id!("Replace111111111111111111111111111111111111");

#[program]
pub mod mint_nft {
    use super::*;

    pub fn init_config(ctx: Context<InitConfig>, reward_per_mint: u64, price_lamports: u64) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.authority = ctx.accounts.authority.key();
        c.reward_mint = ctx.accounts.reward_mint.key();
        c.reward_vault = ctx.accounts.reward_vault.key();
        c.reward_per_mint = reward_per_mint;
        c.price_lamports = price_lamports;
        c.minted = 0;
        c.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn mint_one(ctx: Context<MintOne>, name: String, uri: String) -> Result<()> {
        // 1) 收取 SOL
        let cfg = &ctx.accounts.config;
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &cfg.authority,
            cfg.price_lamports,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[ctx.accounts.user.to_account_info(), ctx.accounts.treasury.to_account_info()],
        )?;

        // 2) Mint 1 个 NFT 到用户 ATA
        let cpi = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.nft_ata.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::mint_to(cpi, 1)?;

        // 3) 写 metadata
        CreateMetadataAccountV3CpiBuilder::new(&ctx.accounts.metadata_program.to_account_info())
            .metadata(&ctx.accounts.metadata.to_account_info())
            .mint(&ctx.accounts.nft_mint.to_account_info())
            .mint_authority(&ctx.accounts.user.to_account_info())
            .payer(&ctx.accounts.user.to_account_info())
            .update_authority(&ctx.accounts.user.to_account_info(), true)
            .system_program(&ctx.accounts.system_program.to_account_info())
            .data(DataV2 {
                name, symbol: "MNFT".into(), uri,
                seller_fee_basis_points: 500,
                creators: None, collection: None, uses: None,
            })
            .is_mutable(true).invoke()?;

        // 4) 从奖池 PDA 转奖励代币给用户
        let seeds: &[&[u8]] = &[b"config", &[cfg.bump]];
        let signer = &[seeds];
        let cpi2 = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.user_reward_ata.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi2, cfg.reward_per_mint)?;

        let cfg_mut = &mut ctx.accounts.config;
        cfg_mut.minted += 1;
        Ok(())
    }
}

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_vault: Pubkey,
    pub reward_per_mint: u64,
    pub price_lamports: u64,
    pub minted: u64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(init, payer=authority, space=8+32*3+8*3+1, seeds=[b"config"], bump)]
    pub config: Account<'info, Config>,
    pub reward_mint: Account<'info, Mint>,
    #[account(mut)] pub reward_vault: Account<'info, TokenAccount>,
    #[account(mut)] pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintOne<'info> {
    #[account(mut, seeds=[b"config"], bump=config.bump)]
    pub config: Account<'info, Config>,
    /// CHECK: 项目方收款
    #[account(mut)] pub treasury: AccountInfo<'info>,

    #[account(mut)] pub nft_mint: Account<'info, Mint>,
    #[account(mut)] pub nft_ata:  Account<'info, TokenAccount>,
    /// CHECK: metadata PDA
    #[account(mut)] pub metadata: AccountInfo<'info>,

    #[account(mut)] pub reward_vault:    Account<'info, TokenAccount>,
    #[account(mut)] pub user_reward_ata: Account<'info, TokenAccount>,

    #[account(mut)] pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    /// CHECK: mpl
    pub metadata_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
}
```

#### 2.2.3 部署
```bash
# 1) 创建奖励代币
spl-token create-token --decimals 9
spl-token create-account <REWARD_MINT>
spl-token mint <REWARD_MINT> 1000000000

# 2) build & deploy
anchor build
anchor deploy --provider.cluster mainnet-beta

# 3) 把奖池转给 config PDA
spl-token transfer <REWARD_MINT> 1000000 <CONFIG_PDA> --fund-recipient

# 4) init_config
anchor run init
```

#### 2.2.4 客户端调用（@solana/web3.js + Anchor）
```ts
const program = new anchor.Program(idl, programId, provider);
await program.methods
  .mintOne("MNFT #1", "https://arweave.net/xxx")
  .accounts({ config, treasury, nftMint, nftAta, metadata,
              rewardVault, userRewardAta, user: wallet.publicKey,
              metadataProgram: METADATA_PROGRAM_ID, ... })
  .rpc();
```

---

### 2.3 Sui —— Move

#### 2.3.1 目录
```
sui/
├── Move.toml
└── sources/
    ├── reward.move
    └── mint_nft.move
```

#### 2.3.2 奖励币 —— `sources/reward.move`
```move
module mintdrop::reward {
    use sui::coin::{Self, TreasuryCap};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    public struct REWARD has drop {}

    fun init(witness: REWARD, ctx: &mut TxContext) {
        let (cap, meta) = coin::create_currency<REWARD>(
            witness, 9, b"RWT", b"Reward", b"NFT mint reward", option::none(), ctx);
        transfer::public_freeze_object(meta);
        transfer::public_transfer(cap, tx_context::sender(ctx));
    }
}
```

#### 2.3.3 主合约 —— `sources/mint_nft.move`
```move
module mintdrop::mint_nft {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;
    use mintdrop::reward::REWARD;

    const E_SOLD_OUT: u64 = 1;
    const E_BAD_PRICE: u64 = 2;

    public struct AdminCap has key, store { id: UID }

    public struct Drop has key {
        id: UID,
        price: u64,
        reward_per_mint: u64,
        max_supply: u64,
        minted: u64,
        treasury: Balance<SUI>,
        reward_pool: Balance<REWARD>,
    }

    public struct MintNft has key, store {
        id: UID,
        serial: u64,
        url: vector<u8>,
    }

    public struct Minted has copy, drop { user: address, serial: u64, reward: u64 }

    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
    }

    public entry fun create_drop(
        _: &AdminCap, price: u64, reward_per_mint: u64, max_supply: u64,
        seed_reward: Coin<REWARD>, ctx: &mut TxContext,
    ) {
        let drop = Drop {
            id: object::new(ctx), price, reward_per_mint, max_supply, minted: 0,
            treasury: balance::zero<SUI>(),
            reward_pool: coin::into_balance(seed_reward),
        };
        transfer::share_object(drop);
    }

    public entry fun mint(
        d: &mut Drop, payment: Coin<SUI>, url: vector<u8>, ctx: &mut TxContext,
    ) {
        assert!(d.minted < d.max_supply, E_SOLD_OUT);
        assert!(coin::value(&payment) == d.price, E_BAD_PRICE);

        balance::join(&mut d.treasury, coin::into_balance(payment));
        d.minted = d.minted + 1;

        let nft = MintNft { id: object::new(ctx), serial: d.minted, url };
        transfer::transfer(nft, tx_context::sender(ctx));

        let reward_balance = balance::split(&mut d.reward_pool, d.reward_per_mint);
        let reward_coin = coin::from_balance(reward_balance, ctx);
        transfer::public_transfer(reward_coin, tx_context::sender(ctx));

        event::emit(Minted { user: tx_context::sender(ctx), serial: d.minted, reward: d.reward_per_mint });
    }

    public entry fun withdraw(_: &AdminCap, d: &mut Drop, to: address, ctx: &mut TxContext) {
        let amt = balance::value(&d.treasury);
        let bal = balance::split(&mut d.treasury, amt);
        transfer::public_transfer(coin::from_balance(bal, ctx), to);
    }
}
```

#### 2.3.4 部署 & 调用
```bash
sui client publish --gas-budget 300000000

# create_drop（先用 reward TreasuryCap mint 一笔 Coin<REWARD> 当奖池种子）
sui client call --package $PKG --module mint_nft --function create_drop \
  --args $ADMIN_CAP 1000000000 100000000000 10000 $SEED_REWARD_COIN \
  --gas-budget 100000000

# 用户 mint
sui client call --package $PKG --module mint_nft --function mint \
  --args $DROP_OBJ $PAYMENT_COIN '"ipfs://..."' \
  --gas-budget 50000000
```

---

## 3. 工具链矩阵

| 链 | 语言 | 框架 | 部署 | 浏览器 verify | RPC |
| --- | --- | --- | --- | --- | --- |
| Ethereum | Solidity | Foundry / Hardhat | `forge script --broadcast` | Etherscan | Alchemy / Infura |
| BSC | Solidity | Foundry | 同上 | BscScan | bsc-dataseed |
| Base | Solidity | Foundry | 同上 | BaseScan | mainnet.base.org |
| Solana | Rust | Anchor + Metaplex | `anchor deploy` | Solscan / Solana Explorer | Helius |
| Sui | Move | Sui CLI | `sui client publish` | SuiVision / SuiScan | fullnode.mainnet.sui.io |

---

## 4. 端到端验收清单

### 部署期
- [ ] 奖励代币 contract / mint / Coin 已发布
- [ ] NFT 合约 / Program / Module 已发布
- [ ] 奖池已注资（数量 ≥ `maxSupply * rewardPerMint`）
- [ ] 浏览器已 verify / 源码公开
- [ ] Owner / Admin / UpgradeAuthority 已确认（推荐多签）

### 测试期
- [ ] 单笔 mint：用户收到 1 个 NFT + N 个奖励代币
- [ ] 价格不对 → 失败
- [ ] 超过单地址上限 → 失败
- [ ] 售罄 → 失败
- [ ] Pause / setPrice / setURI 生效
- [ ] 提现 → 收款地址收到原生币

### 上线后
- [ ] 子图 / RPC 指标接入
- [ ] 前端 mint 按钮串通（钱包签名 → 交易上链 → 余额刷新）
- [ ] 失败回退提示（gas 不足 / 网络拥堵 / 已售罄）

---

## 5. 前端调用对照

| 链 | SDK | 关键函数 |
| --- | --- | --- |
| EVM | `ethers` v6 / `viem` | `contract.mint({ value })` |
| Solana | `@solana/web3.js` + `@coral-xyz/anchor` | `program.methods.mintOne(...).accounts(...).rpc()` |
| Sui | `@mysten/sui` | `tx.moveCall({ target: '${pkg}::mint_nft::mint', arguments: [...] })` |

---

## 6. 前端

`frontend/` 是 Next.js 14 (App Router) + Tailwind 的多链 mint 页：

| 生态 | SDK |
| --- | --- |
| EVM (ETH / BSC / Base) | `wagmi` + `viem` + RainbowKit |
| Solana | `@solana/wallet-adapter-*` |
| Sui | `@mysten/dapp-kit` |

```bash
cd frontend
cp .env.example .env.local      # 填入合约地址 + WalletConnect projectId
npm install
npm run dev                      # http://localhost:3000
```

部署合约后：
- EVM：把 `MintNFT` 地址填进 `NEXT_PUBLIC_NFT_ETH/BSC/BASE`
- Solana：`anchor build` → 把 program id 填进 `NEXT_PUBLIC_SOL_PROGRAM_ID`，并把 IDL 复制到 `frontend/lib/idl.ts`
- Sui：把 package id 和 shared `Drop` 对象 id 填进 `NEXT_PUBLIC_SUI_*`

## 7. 下一步建议
1. 先把 EVM 一份代码跑通（ETH testnet → BSC testnet → Base testnet），三链共用。
2. Solana 单独做一套，测试 Devnet。
3. Sui 单独做一套，测试 Testnet。
4. 把合约地址填进 `frontend/.env.local`，前端就能直接调。
