use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

// NOTE: Run `anchor build` then `anchor keys list` and replace this ID.
declare_id!("2DRJSTtmFh3KhbBGmJpYvGugeUaLiumcmYZtcTqKeWRd");

// ─── Constants ───────────────────────────────────────────────────────────────

pub const MAX_DESCRIPTION_LEN: usize = 200;
pub const MAX_REASON_LEN: usize = 500;

// ─── Program ─────────────────────────────────────────────────────────────────

#[program]
pub mod escrowfi {
    use super::*;

    /// Buyer creates an escrow and locks USDC into a PDA vault.
    ///
    /// Seeds: ["escrow", buyer, escrow_id_le_bytes]
    /// Vault:  ["vault",  escrow_key]
    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        escrow_id: u64,
        amount: u64,
        description: String,
    ) -> Result<()> {
        require!(amount > 0, EscrowError::InvalidAmount);
        require!(
            description.len() <= MAX_DESCRIPTION_LEN,
            EscrowError::DescriptionTooLong
        );
        require!(
            ctx.accounts.buyer.key() != ctx.accounts.seller.key(),
            EscrowError::BuyerSellerSame
        );

        let clock = Clock::get()?;
        let escrow = &mut ctx.accounts.escrow;

        escrow.buyer = ctx.accounts.buyer.key();
        escrow.seller = ctx.accounts.seller.key();
        escrow.arbitrator = ctx.accounts.arbitrator.key();
        escrow.mint = ctx.accounts.mint.key();
        escrow.amount = amount;
        escrow.escrow_id = escrow_id;
        escrow.description = description;
        escrow.status = EscrowStatus::Active;
        escrow.bump = ctx.bumps.escrow;
        escrow.vault_bump = ctx.bumps.vault;
        escrow.created_at = clock.unix_timestamp;
        escrow.updated_at = clock.unix_timestamp;
        escrow.disputed_at = 0;
        escrow.dispute_reason = String::new();

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(EscrowCreatedEvent {
            escrow_id,
            buyer: ctx.accounts.buyer.key(),
            seller: ctx.accounts.seller.key(),
            arbitrator: ctx.accounts.arbitrator.key(),
            amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Seller marks the order as delivered, awaiting buyer confirmation.
    pub fn mark_delivered(ctx: Context<MarkDelivered>) -> Result<()> {
        require!(
            ctx.accounts.escrow.status == EscrowStatus::Active,
            EscrowError::InvalidStatus
        );

        ctx.accounts.escrow.status = EscrowStatus::Delivered;
        ctx.accounts.escrow.updated_at = Clock::get()?.unix_timestamp;

        emit!(EscrowDeliveredEvent {
            escrow_id: ctx.accounts.escrow.escrow_id,
            seller: ctx.accounts.escrow.seller,
        });

        Ok(())
    }

    /// Buyer confirms receipt — releases vault funds to the seller.
    pub fn confirm_receipt(ctx: Context<ConfirmReceipt>) -> Result<()> {
        require!(
            ctx.accounts.escrow.status == EscrowStatus::Delivered,
            EscrowError::InvalidStatus
        );

        // Snapshot values before mutating (Pubkey is Copy, u64/u8 are Copy)
        let amount = ctx.accounts.escrow.amount;
        let buyer_key = ctx.accounts.escrow.buyer;
        let seller_key = ctx.accounts.escrow.seller;
        let escrow_id = ctx.accounts.escrow.escrow_id;
        let bump = ctx.accounts.escrow.bump;
        let escrow_id_bytes = escrow_id.to_le_bytes();

        ctx.accounts.escrow.status = EscrowStatus::Completed;
        ctx.accounts.escrow.updated_at = Clock::get()?.unix_timestamp;

        let escrow_seeds: &[&[u8]] = &[
            b"escrow",
            buyer_key.as_ref(),
            &escrow_id_bytes,
            &[bump],
        ];
        let signer_seeds = &[escrow_seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        emit!(EscrowCompletedEvent {
            escrow_id,
            buyer: buyer_key,
            seller: seller_key,
            amount,
        });

        Ok(())
    }

    /// Either party raises a dispute, locking funds until arbitration.
    pub fn raise_dispute(ctx: Context<RaiseDispute>, reason: String) -> Result<()> {
        require!(
            ctx.accounts.escrow.status == EscrowStatus::Active
                || ctx.accounts.escrow.status == EscrowStatus::Delivered,
            EscrowError::InvalidStatus
        );
        require!(reason.len() <= MAX_REASON_LEN, EscrowError::ReasonTooLong);

        let clock = Clock::get()?;
        let signer_key = ctx.accounts.initiator.key();

        ctx.accounts.escrow.status = EscrowStatus::Disputed;
        ctx.accounts.escrow.dispute_reason = reason.clone();
        ctx.accounts.escrow.disputed_at = clock.unix_timestamp;
        ctx.accounts.escrow.updated_at = clock.unix_timestamp;

        emit!(EscrowDisputedEvent {
            escrow_id: ctx.accounts.escrow.escrow_id,
            raised_by: signer_key,
            reason,
        });

        Ok(())
    }

    /// Arbitrator resolves the dispute — sends funds to seller or refunds buyer.
    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        release_to_seller: bool,
    ) -> Result<()> {
        require!(
            ctx.accounts.escrow.status == EscrowStatus::Disputed,
            EscrowError::InvalidStatus
        );

        let amount = ctx.accounts.escrow.amount;
        let buyer_key = ctx.accounts.escrow.buyer;
        let escrow_id = ctx.accounts.escrow.escrow_id;
        let bump = ctx.accounts.escrow.bump;
        let escrow_id_bytes = escrow_id.to_le_bytes();

        ctx.accounts.escrow.status = EscrowStatus::Completed;
        ctx.accounts.escrow.updated_at = Clock::get()?.unix_timestamp;

        let escrow_seeds: &[&[u8]] = &[
            b"escrow",
            buyer_key.as_ref(),
            &escrow_id_bytes,
            &[bump],
        ];
        let signer_seeds = &[escrow_seeds];

        let destination = if release_to_seller {
            ctx.accounts.seller_token_account.to_account_info()
        } else {
            ctx.accounts.buyer_token_account.to_account_info()
        };

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: destination,
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        emit!(DisputeResolvedEvent {
            escrow_id,
            released_to_seller: release_to_seller,
            arbitrator: ctx.accounts.arbitrator.key(),
        });

        Ok(())
    }

    /// Buyer cancels the escrow (only allowed while status is Active).
    /// Refunds the full amount back to the buyer.
    pub fn cancel_escrow(ctx: Context<CancelEscrow>) -> Result<()> {
        require!(
            ctx.accounts.escrow.status == EscrowStatus::Active,
            EscrowError::InvalidStatus
        );

        let amount = ctx.accounts.escrow.amount;
        let buyer_key = ctx.accounts.escrow.buyer;
        let escrow_id = ctx.accounts.escrow.escrow_id;
        let bump = ctx.accounts.escrow.bump;
        let escrow_id_bytes = escrow_id.to_le_bytes();

        ctx.accounts.escrow.status = EscrowStatus::Cancelled;
        ctx.accounts.escrow.updated_at = Clock::get()?.unix_timestamp;

        let escrow_seeds: &[&[u8]] = &[
            b"escrow",
            buyer_key.as_ref(),
            &escrow_id_bytes,
            &[bump],
        ];
        let signer_seeds = &[escrow_seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        emit!(EscrowCancelledEvent {
            escrow_id,
            buyer: buyer_key,
        });

        Ok(())
    }
}

// ─── Account Structs ─────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(escrow_id: u64)]
pub struct CreateEscrow<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: seller is validated not equal to buyer in instruction body
    pub seller: UncheckedAccount<'info>,

    /// CHECK: arbitrator is a trusted address set at creation time
    pub arbitrator: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = buyer,
        space = EscrowAccount::SPACE,
        seeds = [b"escrow", buyer.key().as_ref(), &escrow_id.to_le_bytes()],
        bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,

    /// Vault token account — authority is the escrow PDA
    #[account(
        init,
        payer = buyer,
        token::mint = mint,
        token::authority = escrow,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key() @ EscrowError::InvalidTokenAccount,
        constraint = buyer_token_account.mint == mint.key() @ EscrowError::InvalidTokenAccount,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MarkDelivered<'info> {
    pub seller: Signer<'info>,

    #[account(
        mut,
        constraint = escrow.seller == seller.key() @ EscrowError::Unauthorized,
        seeds = [b"escrow", escrow.buyer.as_ref(), &escrow.escrow_id.to_le_bytes()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

#[derive(Accounts)]
pub struct ConfirmReceipt<'info> {
    pub buyer: Signer<'info>,

    #[account(
        mut,
        constraint = escrow.buyer == buyer.key() @ EscrowError::Unauthorized,
        seeds = [b"escrow", buyer.key().as_ref(), &escrow.escrow_id.to_le_bytes()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,

    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump = escrow.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = seller_token_account.owner == escrow.seller @ EscrowError::InvalidTokenAccount,
        constraint = seller_token_account.mint == escrow.mint @ EscrowError::InvalidTokenAccount,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RaiseDispute<'info> {
    pub initiator: Signer<'info>,

    #[account(
        mut,
        constraint = (
            escrow.buyer == initiator.key() || escrow.seller == initiator.key()
        ) @ EscrowError::Unauthorized,
        seeds = [b"escrow", escrow.buyer.as_ref(), &escrow.escrow_id.to_le_bytes()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    pub arbitrator: Signer<'info>,

    #[account(
        mut,
        constraint = escrow.arbitrator == arbitrator.key() @ EscrowError::Unauthorized,
        seeds = [b"escrow", escrow.buyer.as_ref(), &escrow.escrow_id.to_le_bytes()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,

    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump = escrow.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == escrow.buyer @ EscrowError::InvalidTokenAccount,
        constraint = buyer_token_account.mint == escrow.mint @ EscrowError::InvalidTokenAccount,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = seller_token_account.owner == escrow.seller @ EscrowError::InvalidTokenAccount,
        constraint = seller_token_account.mint == escrow.mint @ EscrowError::InvalidTokenAccount,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelEscrow<'info> {
    pub buyer: Signer<'info>,

    #[account(
        mut,
        constraint = escrow.buyer == buyer.key() @ EscrowError::Unauthorized,
        seeds = [b"escrow", buyer.key().as_ref(), &escrow.escrow_id.to_le_bytes()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,

    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump = escrow.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key() @ EscrowError::InvalidTokenAccount,
        constraint = buyer_token_account.mint == escrow.mint @ EscrowError::InvalidTokenAccount,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ─── State ───────────────────────────────────────────────────────────────────

#[account]
pub struct EscrowAccount {
    pub buyer: Pubkey,         // 32
    pub seller: Pubkey,        // 32
    pub arbitrator: Pubkey,    // 32
    pub mint: Pubkey,          // 32
    pub amount: u64,           // 8
    pub escrow_id: u64,        // 8
    pub description: String,   // 4 + 200
    pub status: EscrowStatus,  // 1
    pub bump: u8,              // 1
    pub vault_bump: u8,        // 1
    pub created_at: i64,       // 8
    pub updated_at: i64,       // 8
    pub disputed_at: i64,      // 8  (0 = not disputed)
    pub dispute_reason: String, // 4 + 500
}

impl EscrowAccount {
    // discriminator(8) + fixed fields + string prefixes + max string lengths
    pub const SPACE: usize = 8
        + 32 + 32 + 32 + 32  // pubkeys
        + 8 + 8              // amount, escrow_id
        + (4 + 200)          // description
        + 1 + 1 + 1          // status, bump, vault_bump
        + 8 + 8 + 8          // timestamps
        + (4 + 500);         // dispute_reason
                             // Total = 889
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    Active,     // funds locked, awaiting delivery
    Delivered,  // seller marked delivered, awaiting buyer confirmation
    Completed,  // funds released (confirmed or arbitrated)
    Disputed,   // under arbitration
    Cancelled,  // buyer cancelled before delivery
}

// ─── Events ──────────────────────────────────────────────────────────────────

#[event]
pub struct EscrowCreatedEvent {
    pub escrow_id: u64,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub arbitrator: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct EscrowDeliveredEvent {
    pub escrow_id: u64,
    pub seller: Pubkey,
}

#[event]
pub struct EscrowCompletedEvent {
    pub escrow_id: u64,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EscrowDisputedEvent {
    pub escrow_id: u64,
    pub raised_by: Pubkey,
    pub reason: String,
}

#[event]
pub struct DisputeResolvedEvent {
    pub escrow_id: u64,
    pub released_to_seller: bool,
    pub arbitrator: Pubkey,
}

#[event]
pub struct EscrowCancelledEvent {
    pub escrow_id: u64,
    pub buyer: Pubkey,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum EscrowError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Description exceeds 200 characters")]
    DescriptionTooLong,
    #[msg("Dispute reason exceeds 500 characters")]
    ReasonTooLong,
    #[msg("Buyer and seller cannot be the same wallet")]
    BuyerSellerSame,
    #[msg("Not authorized to perform this action")]
    Unauthorized,
    #[msg("Escrow is not in the correct state for this action")]
    InvalidStatus,
    #[msg("Token account has incorrect owner or mint")]
    InvalidTokenAccount,
}
