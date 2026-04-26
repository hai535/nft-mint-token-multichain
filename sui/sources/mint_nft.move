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

    public struct Minted has copy, drop {
        user: address,
        serial: u64,
        reward: u64,
    }

    fun init(ctx: &mut TxContext) {
        transfer::transfer(
            AdminCap { id: object::new(ctx) },
            tx_context::sender(ctx),
        );
    }

    public entry fun create_drop(
        _: &AdminCap,
        price: u64,
        reward_per_mint: u64,
        max_supply: u64,
        seed_reward: Coin<REWARD>,
        ctx: &mut TxContext,
    ) {
        let drop = Drop {
            id: object::new(ctx),
            price,
            reward_per_mint,
            max_supply,
            minted: 0,
            treasury: balance::zero<SUI>(),
            reward_pool: coin::into_balance(seed_reward),
        };
        transfer::share_object(drop);
    }

    public entry fun mint(
        d: &mut Drop,
        payment: Coin<SUI>,
        url: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert!(d.minted < d.max_supply, E_SOLD_OUT);
        assert!(coin::value(&payment) == d.price, E_BAD_PRICE);

        balance::join(&mut d.treasury, coin::into_balance(payment));
        d.minted = d.minted + 1;

        let nft = MintNft {
            id: object::new(ctx),
            serial: d.minted,
            url,
        };
        transfer::transfer(nft, tx_context::sender(ctx));

        let reward_balance = balance::split(&mut d.reward_pool, d.reward_per_mint);
        let reward_coin = coin::from_balance(reward_balance, ctx);
        transfer::public_transfer(reward_coin, tx_context::sender(ctx));

        event::emit(Minted {
            user: tx_context::sender(ctx),
            serial: d.minted,
            reward: d.reward_per_mint,
        });
    }

    public entry fun withdraw(
        _: &AdminCap,
        d: &mut Drop,
        to: address,
        ctx: &mut TxContext,
    ) {
        let amt = balance::value(&d.treasury);
        let bal = balance::split(&mut d.treasury, amt);
        transfer::public_transfer(coin::from_balance(bal, ctx), to);
    }
}
