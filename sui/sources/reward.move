module mintdrop::reward {
    use std::option;
    use sui::coin;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    public struct REWARD has drop {}

    fun init(witness: REWARD, ctx: &mut TxContext) {
        let (cap, meta) = coin::create_currency<REWARD>(
            witness,
            9,
            b"RWT",
            b"Reward",
            b"NFT mint reward",
            option::none(),
            ctx,
        );
        transfer::public_freeze_object(meta);
        transfer::public_transfer(cap, tx_context::sender(ctx));
    }
}
