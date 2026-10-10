use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};
use anchor_lang::system_program;

declare_id!("6ai9t1gagRGj8gYjGc2PHfQUAeQjzQgssWoAEGa2k1V2");

pub const CONFIG_SEED: &[u8] = b"config";
pub const TREASURY_SEED: &[u8] = b"treasury";
pub const CITIZEN_SEED: &[u8] = b"citizen";

pub const MIN_PACKS: u16 = 1;
pub const MAX_PACKS: u16 = 100;

#[program]
pub mod thalassa {
    use super::*;

    /// Creates the global Config. The signer becomes the authority.
    pub fn initialize(
        ctx: Context<Initialize>,
        price_lamports_per_pack: u64,
        ambrosia_per_pack: u64,
    ) -> Result<()> {
        require!(price_lamports_per_pack > 0, ThalassaError::InvalidPrice);
        require!(ambrosia_per_pack > 0, ThalassaError::InvalidAmbrosiaPerPack);

        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.price_lamports_per_pack = price_lamports_per_pack;
        config.ambrosia_per_pack = ambrosia_per_pack;
        config.total_packs_sold = 0;
        config.bump = ctx.bumps.config;
        config.treasury_bump = ctx.bumps.treasury;
        Ok(())
    }

    /// Buys `packs` packs of ambrosia, paying SOL into the treasury.
    pub fn buy_ambrosia(ctx: Context<BuyAmbrosia>, packs: u16) -> Result<()> {
        require!(
            (MIN_PACKS..=MAX_PACKS).contains(&packs),
            ThalassaError::InvalidPackCount
        );

        let config = &mut ctx.accounts.config;
        let lamports = config
            .price_lamports_per_pack
            .checked_mul(packs as u64)
            .ok_or(ThalassaError::MathOverflow)?;
        let ambrosia = config
            .ambrosia_per_pack
            .checked_mul(packs as u64)
            .ok_or(ThalassaError::MathOverflow)?;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            lamports,
        )?;

        let citizen = &mut ctx.accounts.citizen;
        if citizen.owner == Pubkey::default() {
            citizen.owner = ctx.accounts.buyer.key();
            citizen.created_at = Clock::get()?.unix_timestamp;
            citizen.bump = ctx.bumps.citizen;
        }
        citizen.ambrosia_total = citizen
            .ambrosia_total
            .checked_add(ambrosia)
            .ok_or(ThalassaError::MathOverflow)?;
        citizen.lamports_spent = citizen
            .lamports_spent
            .checked_add(lamports)
            .ok_or(ThalassaError::MathOverflow)?;
        citizen.purchases = citizen
            .purchases
            .checked_add(1)
            .ok_or(ThalassaError::MathOverflow)?;

        config.total_packs_sold = config
            .total_packs_sold
            .checked_add(packs as u64)
            .ok_or(ThalassaError::MathOverflow)?;

        emit!(AmbrosiaPurchased {
            buyer: ctx.accounts.buyer.key(),
            packs,
            ambrosia,
            lamports,
            ambrosia_total: citizen.ambrosia_total,
        });
        Ok(())
    }

    /// Moves `amount` lamports from the treasury to the authority.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, ThalassaError::InvalidAmount);
        let treasury = &ctx.accounts.treasury;
        let remaining = treasury
            .lamports()
            .checked_sub(amount)
            .ok_or(ThalassaError::InsufficientTreasury)?;
        // The runtime only allows a system account to end at 0 lamports or
        // rent exempt, so reject the in-between with a clear error.
        require!(
            remaining == 0 || remaining >= Rent::get()?.minimum_balance(0),
            ThalassaError::TreasuryBelowRent
        );

        let bump = [ctx.accounts.config.treasury_bump];
        let signer_seeds: &[&[&[u8]]] = &[&[TREASURY_SEED, &bump]];
        invoke_signed(
            &system_instruction::transfer(
                &treasury.key(),
                &ctx.accounts.authority.key(),
                amount,
            ),
            &[
                treasury.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;
        Ok(())
    }

    /// Updates the pack price and the ambrosia per pack.
    pub fn set_price(
        ctx: Context<SetPrice>,
        price_lamports_per_pack: u64,
        ambrosia_per_pack: u64,
    ) -> Result<()> {
        require!(price_lamports_per_pack > 0, ThalassaError::InvalidPrice);
        require!(ambrosia_per_pack > 0, ThalassaError::InvalidAmbrosiaPerPack);
        let config = &mut ctx.accounts.config;
        config.price_lamports_per_pack = price_lamports_per_pack;
        config.ambrosia_per_pack = ambrosia_per_pack;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(seeds = [TREASURY_SEED], bump)]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyAmbrosia<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + Citizen::INIT_SPACE,
        seeds = [CITIZEN_SEED, buyer.key().as_ref()],
        bump
    )]
    pub citizen: Account<'info, Citizen>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [TREASURY_SEED], bump = config.treasury_bump)]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority @ ThalassaError::Unauthorized
    )]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [TREASURY_SEED], bump = config.treasury_bump)]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPrice<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority @ ThalassaError::Unauthorized
    )]
    pub config: Account<'info, Config>,
}

/// Layout (after the 8-byte discriminator):
/// authority 0..32, price_lamports_per_pack 32..40, ambrosia_per_pack 40..48,
/// total_packs_sold 48..56, bump 56, treasury_bump 57. Total 8 + 58 = 66 bytes.
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub price_lamports_per_pack: u64,
    pub ambrosia_per_pack: u64,
    pub total_packs_sold: u64,
    pub bump: u8,
    pub treasury_bump: u8,
}

/// Layout (after the 8-byte discriminator):
/// owner 0..32, ambrosia_total 32..40, lamports_spent 40..48,
/// purchases 48..52, created_at 52..60, bump 60. Total 8 + 61 = 69 bytes.
#[account]
#[derive(InitSpace)]
pub struct Citizen {
    pub owner: Pubkey,
    pub ambrosia_total: u64,
    pub lamports_spent: u64,
    pub purchases: u32,
    pub created_at: i64,
    pub bump: u8,
}

#[event]
pub struct AmbrosiaPurchased {
    pub buyer: Pubkey,
    pub packs: u16,
    pub ambrosia: u64,
    pub lamports: u64,
    pub ambrosia_total: u64,
}

#[error_code]
pub enum ThalassaError {
    #[msg("Packs must be between 1 and 100")]
    InvalidPackCount,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Only the config authority can do this")]
    Unauthorized,
    #[msg("Treasury does not have enough lamports")]
    InsufficientTreasury,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Price per pack must be greater than zero")]
    InvalidPrice,
    #[msg("Ambrosia per pack must be greater than zero")]
    InvalidAmbrosiaPerPack,
    #[msg("Treasury must be left empty or above the rent exempt minimum")]
    TreasuryBelowRent,
}
