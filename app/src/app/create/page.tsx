"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import toast from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { useI18n } from "@/i18n/context";
import { USDC_MINT_DEVNET, DEFAULT_ARBITRATOR, USDC_DECIMALS, explorerUrl } from "@/utils/constants";
import { escrowPda, vaultPda } from "@/utils/pda";
import { Shield, Info, ArrowRight, Lock } from "lucide-react";
import clsx from "clsx";
import type { Escrowfi } from "@/idl/escrowfi";
import IDL from "@/idl/escrowfi";

export default function CreatePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  const [seller, setSeller] = useState("");
  const [arbitrator, setArbitrator] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [privacyEnabled, setPrivacyEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const descLen = description.length;
  const isValid =
    seller.length > 30 &&
    parseFloat(amount) > 0 &&
    description.length > 0 &&
    description.length <= 200;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) {
      toast.error(t.create.walletRequired);
      return;
    }
    if (!isValid) return;

    setLoading(true);
    const toastId = toast.loading("Sending transaction...");

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction: signTransaction!, signAllTransactions: signAllTransactions! },
        { commitment: "confirmed" }
      );
      const program = new Program<Escrowfi>(IDL as any, provider);

      const escrowId = new BN(Date.now()); // unique ID from timestamp
      const amountLamports = new BN(parseFloat(amount) * 10 ** USDC_DECIMALS);
      const sellerPk = new PublicKey(seller);
      const arbitratorPk = arbitrator
        ? new PublicKey(arbitrator)
        : DEFAULT_ARBITRATOR;

      const escrowKey = escrowPda(publicKey, escrowId);
      const vaultKey = vaultPda(escrowKey);
      const buyerTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT_DEVNET,
        publicKey
      );

      const tx = await program.methods
        .createEscrow(escrowId, amountLamports, description)
        .accounts({
          buyer: publicKey,
          seller: sellerPk,
          arbitrator: arbitratorPk,
          mint: USDC_MINT_DEVNET,
          escrow: escrowKey,
          vault: vaultKey,
          buyerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        } as any)
        .rpc();

      toast.success(
        <span>
          {t.create.successTitle}{" "}
          <a
            href={explorerUrl(tx)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View tx
          </a>
        </span>,
        { id: toastId, duration: 6000 }
      );

      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: any) {
      console.error(err);
      toast.error(`${t.create.errorTitle}: ${err?.message ?? "Unknown error"}`, {
        id: toastId,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-28 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">{t.create.title}</h1>
          <p className="text-text-muted mt-1">{t.create.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* ── Form ── */}
          <form
            onSubmit={handleSubmit}
            className="md:col-span-3 space-y-5"
          >
            {/* Seller */}
            <Field label={t.create.sellerAddress} required>
              <input
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                placeholder={t.create.sellerAddressPlaceholder}
                className="input"
                disabled={loading}
              />
            </Field>

            {/* Amount */}
            <Field label={t.create.amount} required>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t.create.amountPlaceholder}
                  className="input pr-16"
                  disabled={loading}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-faint text-sm font-mono">
                  USDC
                </span>
              </div>
            </Field>

            {/* Description */}
            <Field label={t.create.description} required hint={`${descLen}/200`}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.create.descriptionPlaceholder}
                rows={3}
                maxLength={200}
                className={clsx(
                  "input resize-none",
                  descLen > 190 && "border-warning/60"
                )}
                disabled={loading}
              />
            </Field>

            {/* Arbitrator (optional) */}
            <Field label={t.create.arbitratorAddress}>
              <input
                value={arbitrator}
                onChange={(e) => setArbitrator(e.target.value)}
                placeholder={t.create.arbitratorAddressHint}
                className="input"
                disabled={loading}
              />
              <p className="text-xs text-text-faint mt-1.5 flex items-center gap-1">
                <Info size={11} />
                {t.create.arbitratorAddressHint}
              </p>
            </Field>

            {/* Privacy toggle */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-privacy-dim border border-privacy/25">
              <button
                type="button"
                onClick={() => setPrivacyEnabled((v) => !v)}
                className={clsx(
                  "mt-0.5 w-10 h-6 rounded-full transition-all relative shrink-0",
                  privacyEnabled ? "bg-primary" : "bg-bg-surface border border-border"
                )}
              >
                <span
                  className={clsx(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                    privacyEnabled ? "left-5" : "left-1"
                  )}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-text flex items-center gap-1.5">
                  <Shield size={14} className="text-privacy" />
                  {t.create.privacyToggle}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{t.create.privacyHint}</p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || loading || !publicKey}
              className={clsx(
                "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all",
                isValid && !loading && publicKey
                  ? "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20 hover:scale-[1.01]"
                  : "bg-bg-surface text-text-faint cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.create.submitting}
                </>
              ) : (
                <>
                  <Lock size={15} />
                  {t.create.submit}
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {!publicKey && (
              <p className="text-center text-xs text-danger">
                {t.create.walletRequired}
              </p>
            )}
          </form>

          {/* ── Preview card ── */}
          <div className="md:col-span-2">
            <div className="sticky top-28">
              <p className="text-xs text-text-muted uppercase tracking-widest mb-3 font-medium">
                {t.create.preview}
              </p>
              <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
                <PreviewRow
                  label={t.create.previewYou}
                  value={
                    publicKey
                      ? `${publicKey.toBase58().slice(0, 6)}...`
                      : "—"
                  }
                  mono
                />
                <Divider />
                <PreviewRow
                  label={t.create.previewSeller}
                  value={seller ? `${seller.slice(0, 6)}...` : "—"}
                  mono
                />
                <Divider />
                <PreviewRow
                  label={t.create.previewAmount}
                  value={
                    privacyEnabled
                      ? "••• USDC 🛡"
                      : amount
                      ? `${amount} USDC`
                      : "—"
                  }
                  highlight={!!amount}
                />
                <Divider />
                <PreviewRow
                  label={t.create.previewArbitrator}
                  value={
                    arbitrator
                      ? `${arbitrator.slice(0, 6)}...`
                      : "EscrowFi Default"
                  }
                  mono
                />
                <Divider />
                <PreviewRow label={t.create.previewStatus} value="Active" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 10px 14px;
          background: #1a1430;
          border: 1px solid #2d2550;
          border-radius: 10px;
          color: #f1edff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus { border-color: rgba(139,92,246,0.5); }
        .input::placeholder { color: #5b5280; }
        .input:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="text-sm font-medium text-text-muted">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs text-text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PreviewRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-xs text-text-faint">{label}</span>
      <span
        className={clsx(
          "text-sm truncate max-w-[140px]",
          mono ? "font-mono text-text-muted" : "text-text",
          highlight && "text-success font-semibold"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border-subtle" />;
}
