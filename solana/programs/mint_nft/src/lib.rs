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

    pub fn init_config(
        ctx: Context<InitConfig>,
        reward_per_mint: u64,
        price_lamports: u64,
    ) -> Result<()> {
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
        let cfg = &ctx.accounts.config;

        let pay_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.treasury.key(),
            cfg.price_lamports,
        );
        anchor_lang::solana_program::program::invoke(
            &pay_ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let mint_cpi = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.nft_ata.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::mint_to(mint_cpi, 1)?;

        CreateMetadataAccountV3CpiBuilder::new(&ctx.accounts.metadata_program.to_account_info())
            .metadata(&ctx.accounts.metadata.to_account_info())
            .mint(&ctx.accounts.nft_mint.to_account_info())
            .mint_authority(&ctx.accounts.user.to_account_info())
            .payer(&ctx.accounts.user.to_account_info())
            .update_authority(&ctx.accounts.user.to_account_info(), true)
            .system_program(&ctx.accounts.system_program.to_account_info())
            .data(DataV2 {
                name,
                symbol: "MNFT".into(),
                uri,
                seller_fee_basis_points: 500,
                creators: None,
                collection: None,
                uses: None,
            })
            .is_mutable(true)
            .invoke()?;

        let bump = cfg.bump;
        let seeds: &[&[u8]] = &[b"config", &[bump]];
        let signer = &[seeds];
        let reward_cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.user_reward_ata.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            signer,
        );
        token::transfer(reward_cpi, cfg.reward_per_mint)?;

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
    #[account(
        init,
        payer = authority,
        space = 8 + 32 * 3 + 8 * 3 + 1,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    pub reward_mint: Account<'info, Mint>,
    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintOne<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// CHECK: project treasury wallet
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,
    #[account(mut)]
    pub nft_ata: Account<'info, TokenAccount>,
    /// CHECK: metaplex metadata PDA
    #[account(mut)]
    pub metadata: AccountInfo<'info>,

    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_reward_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    /// CHECK: mpl token metadata program
    pub metadata_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
}
