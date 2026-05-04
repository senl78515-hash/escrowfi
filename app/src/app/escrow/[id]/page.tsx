"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import toast from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { useI18n } from "@/i18n/context";
import { USDC_MINT_DEVNET, USDC_DECIMALS, explorerUrl } from "@/utils/constants";
import { escrowPda, vaultPda, shortAddress } from "@/utils/pda";
import { Copy, ExternalLink, Shield, ChevronLeft, Clock, CheckCircle, AlertTriangle, XCircle, Package, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";
import type { Escrowfi } from "@/idl/escrowfi";
import IDL from "@/idl/escrowfi";
import BnModule from "bn.js";
import type { ArbitrateResponse } from "@/types/arbitrate";

// ── Mock data (replace with real program.account.escrowAccount.fetch(id)) ───
const MOCK: Record<string, any> = {
  EscrowXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1: {
    publicKey: "EscrowXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1",
    escrowId: "1",
    buyer: "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5",
    seller: "3mNkPFp7SbRZK1nJHM9tBbQXeXdaGX5wvUX2vWgJk8qR",
    arbitrator: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
    amount: new BnModule(500_000_000),
    description: "MacBook Pro 16-inch, M3 chip, excellent condition",
    status: "delivered",
    createdAt: Math.floor(Date.now() / 1000) - 3600 * 24,
    updatedAt: Math.floor(Date.now() / 1000) - 3600 * 2,
    disputedAt: 0,
    disputeReason: "",
    privacyEnabled: true,
  },
  // Demo disputed escrow — showcases AI Arbitrator panel
  disputed: {
    publicKey: "EscrowDISPUTEDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX2",
    escrowId: "2",
    buyer: "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5",
    seller: "3mNkPFp7SbRZK1nJHM9tBbQXeXdaGX5wvUX2vWgJk8qR",
    arbitrator: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
    amount: new BnModule(200_000_000),
    description: "iPhone 15 Pro, 256GB, Space Black",
    status: "disputed",
    createdAt: Math.floor(Date.now() / 1000) - 3600 * 72,
    updatedAt: Math.floor(Date.now() / 1000) - 3600 * 5,
    disputedAt: Math.floor(Date.now() / 1000) - 3600 * 5,
    disputeReason: "Item received but description does not match — box was empty.",
    privacyEnabled: false,
  },
};

type Status = "active" | "delivered" | "completed" | "disputed" | "cancelled";

export default function EscrowDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  const id = params.id as string;
  const escrow = MOCK[id] ?? MOCK["EscrowXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1"];

  const [disputeText, setDisputeText] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // AI Arbitrator state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [buyerEvidence, setBuyerEvidence] = useState("");
  const [sellerEvidence, setSellerEvidence] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiVerdict, setAiVerdict] = useState<ArbitrateResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const walletAddr = publicKey?.toBase58() ?? "";
  const isBuyer = walletAddr === escrow.buyer;
  const isSeller = walletAddr === escrow.seller;
  const isArbitrator = walletAddr === escrow.arbitrator;
  const status = escrow.status as Status;
  const usdcAmount = (escrow.amount.toNumber() / 10 ** USDC_DECIMALS).toFixed(2);

  function copy(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function getProvider() {
    return new AnchorProvider(
      connection,
      { publicKey: publicKey!, signTransaction: signTransaction!, signAllTransactions: signAllTransactions! },
      { commitment: "confirmed" }
    );
  }

  async function handleConfirmReceipt() {
    if (!publicKey) return;
    setLoading(true);
    const tid = toast.loading("Confirming receipt...");
    try {
      const program = new Program<Escrowfi>(IDL as any, getProvider());
      const escrowId = new BN(escrow.escrowId);
      const escrowKey = escrowPda(publicKey, escrowId);
      const vaultKey = vaultPda(escrowKey);
      const sellerPk = new PublicKey(escrow.seller);
      const sellerTA = await getAssociatedTokenAddress(USDC_MINT_DEVNET, sellerPk);

      await program.methods
        .confirmReceipt()
        .accounts({
          buyer: publicKey,
          escrow: escrowKey,
          vault: vaultKey,
          sellerTokenAccount: sellerTA,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      toast.success("Receipt confirmed — funds released!", { id: tid });
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message ?? "Transaction failed", { id: tid });
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkDelivered() {
    if (!publicKey) return;
    setLoading(true);
    const tid = toast.loading("Marking as delivered...");
    try {
      const program = new Program<Escrowfi>(IDL as any, getProvider());
      const buyerPk = new PublicKey(escrow.buyer);
      const escrowId = new BN(escrow.escrowId);
      const escrowKey = escrowPda(buyerPk, escrowId);

      await program.methods
        .markDelivered()
        .accounts({ seller: publicKey, escrow: escrowKey } as any)
        .rpc();

      toast.success("Marked as delivered!", { id: tid });
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Transaction failed", { id: tid });
    } finally {
      setLoading(false);
    }
  }

  async function handleRaiseDispute() {
    if (!publicKey || !disputeText.trim()) return;
    setLoading(true);
    const tid = toast.loading("Raising dispute...");
    try {
      const program = new Program<Escrowfi>(IDL as any, getProvider());
      const buyerPk = new PublicKey(escrow.buyer);
      const escrowId = new BN(escrow.escrowId);
      const escrowKey = escrowPda(buyerPk, escrowId);

      await program.methods
        .raiseDispute(disputeText)
        .accounts({ initiator: publicKey, escrow: escrowKey } as any)
        .rpc();

      toast.success("Dispute raised", { id: tid });
      setShowDisputeForm(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Transaction failed", { id: tid });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!publicKey) return;
    setLoading(true);
    const tid = toast.loading("Cancelling escrow...");
    try {
      const program = new Program<Escrowfi>(IDL as any, getProvider());
      const escrowId = new BN(escrow.escrowId);
      const escrowKey = escrowPda(publicKey, escrowId);
      const vaultKey = vaultPda(escrowKey);
      const buyerTA = await getAssociatedTokenAddress(USDC_MINT_DEVNET, publicKey);

      await program.methods
        .cancelEscrow()
        .accounts({
          buyer: publicKey,
          escrow: escrowKey,
          vault: vaultKey,
          buyerTokenAccount: buyerTA,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      toast.success("Escrow cancelled — funds returned", { id: tid });
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message ?? "Transaction failed", { id: tid });
    } finally {
      setLoading(false);
    }
  }

  async function handleAiArbitrate() {
    setAiLoading(true);
    setAiError(null);
    setAiVerdict(null);
    try {
      const res = await fetch("/api/arbitrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escrowId: escrow.escrowId,
          amount: usdcAmount,
          description: escrow.description,
          buyerEvidence,
          sellerEvidence,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "AI analysis failed");
      }
      const verdict: ArbitrateResponse = await res.json();
      setAiVerdict(verdict);
    } catch (err: any) {
      setAiError(err?.message ?? t.detail.aiError);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleResolve(toSeller: boolean) {
    if (!publicKey) return;
    setLoading(true);
    const tid = toast.loading("Resolving dispute...");
    try {
      const program = new Program<Escrowfi>(IDL as any, getProvider());
      const buyerPk = new PublicKey(escrow.buyer);
      const sellerPk = new PublicKey(escrow.seller);
      const escrowId = new BN(escrow.escrowId);
      const escrowKey = escrowPda(buyerPk, escrowId);
      const vaultKey = vaultPda(escrowKey);
      const buyerTA = await getAssociatedTokenAddress(USDC_MINT_DEVNET, buyerPk);
      const sellerTA = await getAssociatedTokenAddress(USDC_MINT_DEVNET, sellerPk);

      await program.methods
        .resolveDispute(toSeller)
        .accounts({
          arbitrator: publicKey,
          escrow: escrowKey,
          vault: vaultKey,
          buyerTokenAccount: buyerTA,
          sellerTokenAccount: sellerTA,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      toast.success(`Dispute resolved — funds sent to ${toSeller ? "seller" : "buyer"}`, { id: tid });
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message ?? "Transaction failed", { id: tid });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-muted hover:text-text text-sm mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          {t.common.back}
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-text">{t.detail.title} #{escrow.escrowId}</h1>
              {escrow.privacyEnabled && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-privacy-dim border border-privacy/25 text-privacy text-xs font-medium">
                  <Shield size={12} />
                  {t.detail.privacyEnabled}
                </span>
              )}
            </div>
            <p className="text-text-muted text-sm">{escrow.description}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-6">
          {/* Info card */}
          <div className="md:col-span-2 bg-bg-card border border-border rounded-2xl p-5 space-y-4">
            {/* Amount */}
            <div className="pb-4 border-b border-border-subtle">
              <p className="text-xs text-text-faint mb-1">{t.detail.amount}</p>
              {escrow.privacyEnabled ? (
                <div className="flex items-center gap-2 text-privacy font-bold text-2xl">
                  <Shield size={20} />
                  ••• USDC
                </div>
              ) : (
                <p className="text-2xl font-bold text-text">{usdcAmount} USDC</p>
              )}
            </div>

            {/* Participants */}
            {[
              { label: t.detail.buyer, value: escrow.buyer, key: "buyer" },
              { label: t.detail.seller, value: escrow.seller, key: "seller" },
              { label: t.detail.arbitrator, value: escrow.arbitrator, key: "arb" },
            ].map((row) => (
              <div key={row.key} className="flex justify-between items-center gap-2">
                <span className="text-xs text-text-faint w-20 shrink-0">{row.label}</span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="font-mono text-sm text-text-muted truncate">
                    {shortAddress(row.value)}
                  </span>
                  <button
                    onClick={() => copy(row.value, row.key)}
                    className="text-text-faint hover:text-text transition-colors shrink-0"
                    title={t.detail.copyAddress}
                  >
                    {copiedKey === row.key ? (
                      <CheckCircle size={13} className="text-success" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                  <a
                    href={explorerUrl(row.value, "address")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-faint hover:text-accent transition-colors shrink-0"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            ))}

            {/* Timestamps */}
            <div className="pt-3 border-t border-border-subtle grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-text-faint mb-0.5">{t.detail.createdAt}</p>
                <p className="text-text-muted">
                  {new Date(escrow.createdAt * 1000).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-text-faint mb-0.5">{t.detail.updatedAt}</p>
                <p className="text-text-muted">
                  {new Date(escrow.updatedAt * 1000).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Dispute reason */}
            {status === "disputed" && escrow.disputeReason && (
              <div className="p-3 rounded-xl bg-danger-dim border border-danger/20">
                <p className="text-xs text-danger font-medium mb-1">{t.detail.disputeReason}</p>
                <p className="text-sm text-text-muted">{escrow.disputeReason}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <p className="text-xs text-text-faint uppercase tracking-widest mb-4 font-medium">
              {t.detail.timeline}
            </p>
            <div className="space-y-4">
              <TimelineItem icon={<Clock size={14} />} label={t.detail.timelineCreated} active />
              {["delivered", "completed", "disputed", "cancelled"].includes(status) && (
                <TimelineItem
                  icon={<Package size={14} />}
                  label={
                    status === "cancelled"
                      ? t.detail.timelineCancelled
                      : t.detail.timelineDelivered
                  }
                  active
                  color={status === "cancelled" ? "text-text-faint" : "text-warning"}
                />
              )}
              {status === "disputed" && (
                <TimelineItem
                  icon={<AlertTriangle size={14} />}
                  label={t.detail.timelineDisputed}
                  active
                  color="text-danger"
                />
              )}
              {status === "completed" && (
                <TimelineItem
                  icon={<CheckCircle size={14} />}
                  label={t.detail.timelineCompleted}
                  active
                  color="text-success"
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Action Panel ── */}
        {publicKey && (
          <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-3">
            {/* Buyer: confirm receipt */}
            {isBuyer && status === "delivered" && (
              <ActionButton
                label={t.detail.actionConfirm}
                desc={t.detail.actionConfirmDesc}
                color="bg-success hover:bg-success/80"
                icon={<CheckCircle size={16} />}
                onClick={handleConfirmReceipt}
                loading={loading}
              />
            )}

            {/* Buyer: cancel */}
            {isBuyer && status === "active" && (
              <ActionButton
                label={t.detail.actionCancel}
                desc={t.detail.actionCancelDesc}
                color="bg-bg-surface hover:bg-border border border-border text-text"
                icon={<XCircle size={16} />}
                onClick={handleCancel}
                loading={loading}
              />
            )}

            {/* Seller: mark delivered */}
            {isSeller && status === "active" && (
              <ActionButton
                label={t.detail.actionDeliver}
                desc={t.detail.actionDeliverDesc}
                color="bg-accent hover:bg-accent/80"
                icon={<Package size={16} />}
                onClick={handleMarkDelivered}
                loading={loading}
              />
            )}

            {/* Buyer/Seller: raise dispute */}
            {(isBuyer || isSeller) &&
              (status === "active" || status === "delivered") && (
                <>
                  {showDisputeForm ? (
                    <div className="space-y-3">
                      <textarea
                        value={disputeText}
                        onChange={(e) => setDisputeText(e.target.value)}
                        placeholder={t.detail.actionDisputePlaceholder}
                        rows={3}
                        maxLength={500}
                        className="w-full p-3 rounded-xl bg-bg-surface border border-border text-text text-sm placeholder:text-text-faint focus:outline-none focus:border-danger/50 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleRaiseDispute}
                          disabled={!disputeText.trim() || loading}
                          className="flex-1 py-2.5 rounded-xl bg-danger hover:bg-danger/80 text-white text-sm font-medium transition-all disabled:opacity-50"
                        >
                          {t.detail.actionDisputeSubmit}
                        </button>
                        <button
                          onClick={() => setShowDisputeForm(false)}
                          className="px-4 py-2.5 rounded-xl bg-bg-surface border border-border text-text-muted text-sm transition-all hover:text-text"
                        >
                          {t.common.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDisputeForm(true)}
                      className="w-full flex items-center gap-2 justify-center py-2.5 rounded-xl bg-danger-dim border border-danger/25 text-danger text-sm font-medium hover:bg-danger/20 transition-all"
                    >
                      <AlertTriangle size={15} />
                      {t.detail.actionDispute}
                    </button>
                  )}
                </>
              )}

            {/* Arbitrator: resolve */}
            {isArbitrator && status === "disputed" && (
              <div className="space-y-2">
                <p className="text-xs text-text-faint text-center">{t.detail.actionResolve}</p>
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton
                    label={t.detail.actionResolveToSeller}
                    color="bg-success hover:bg-success/80"
                    icon={<CheckCircle size={15} />}
                    onClick={() => handleResolve(true)}
                    loading={loading}
                    compact
                  />
                  <ActionButton
                    label={t.detail.actionResolveToBuyer}
                    color="bg-warning hover:bg-warning/80"
                    icon={<CheckCircle size={15} />}
                    onClick={() => handleResolve(false)}
                    loading={loading}
                    compact
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {/* ── AI Arbitrator Panel (shown only when disputed) ── */}
        {status === "disputed" && (
          <div className="mt-4 bg-bg-card border border-accent/30 rounded-2xl overflow-hidden">
            {/* Header toggle */}
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Sparkles size={14} className="text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-text">{t.detail.aiArbitratorTitle}</p>
                  <p className="text-xs text-text-faint">{t.detail.aiArbitratorDesc}</p>
                </div>
              </div>
              {showAiPanel ? (
                <ChevronUp size={16} className="text-text-faint shrink-0" />
              ) : (
                <ChevronDown size={16} className="text-text-faint shrink-0" />
              )}
            </button>

            {showAiPanel && (
              <div className="px-5 pb-5 space-y-4 border-t border-border-subtle">
                {/* Evidence inputs */}
                <div className="pt-4 space-y-3">
                  <div>
                    <label className="block text-xs text-text-faint mb-1.5 font-medium">
                      {t.detail.aiEvidenceBuyer}
                    </label>
                    <textarea
                      value={buyerEvidence}
                      onChange={(e) => setBuyerEvidence(e.target.value)}
                      placeholder={t.detail.aiEvidenceBuyerPlaceholder}
                      rows={3}
                      className="w-full p-3 rounded-xl bg-bg-surface border border-border text-text text-sm placeholder:text-text-faint focus:outline-none focus:border-accent/50 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-faint mb-1.5 font-medium">
                      {t.detail.aiEvidenceSeller}
                    </label>
                    <textarea
                      value={sellerEvidence}
                      onChange={(e) => setSellerEvidence(e.target.value)}
                      placeholder={t.detail.aiEvidenceSellerPlaceholder}
                      rows={3}
                      className="w-full p-3 rounded-xl bg-bg-surface border border-border text-text text-sm placeholder:text-text-faint focus:outline-none focus:border-accent/50 resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAiArbitrate}
                  disabled={aiLoading || (!buyerEvidence.trim() && !sellerEvidence.trim())}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent hover:bg-accent/85 text-white text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.detail.aiAnalyzing}
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      {t.detail.aiAnalyzeBtn}
                    </>
                  )}
                </button>

                {/* Error */}
                {aiError && (
                  <div className="p-3 rounded-xl bg-danger-dim border border-danger/20 text-danger text-sm">
                    {aiError}
                  </div>
                )}

                {/* Verdict */}
                {aiVerdict && (
                  <div className="space-y-3">
                    {/* Verdict badge */}
                    <div
                      className={clsx(
                        "flex items-center justify-between p-4 rounded-xl border",
                        aiVerdict.verdict === "buyer"
                          ? "bg-warning-dim border-warning/30"
                          : aiVerdict.verdict === "seller"
                          ? "bg-success-dim border-success/30"
                          : "bg-bg-surface border-border"
                      )}
                    >
                      <div>
                        <p className="text-xs text-text-faint mb-0.5">{t.detail.aiVerdictTitle}</p>
                        <p
                          className={clsx(
                            "text-lg font-bold",
                            aiVerdict.verdict === "buyer"
                              ? "text-warning"
                              : aiVerdict.verdict === "seller"
                              ? "text-success"
                              : "text-text-muted"
                          )}
                        >
                          {aiVerdict.verdict === "buyer"
                            ? t.detail.aiVerdictBuyer
                            : aiVerdict.verdict === "seller"
                            ? t.detail.aiVerdictSeller
                            : t.detail.aiVerdictNeither}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-text-faint mb-0.5">{t.detail.aiConfidence}</p>
                        <span
                          className={clsx(
                            "px-2.5 py-1 rounded-lg text-xs font-medium",
                            aiVerdict.confidence === "high"
                              ? "bg-success/15 text-success"
                              : aiVerdict.confidence === "medium"
                              ? "bg-warning/15 text-warning"
                              : "bg-text-faint/15 text-text-faint"
                          )}
                        >
                          {aiVerdict.confidence.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle space-y-2">
                      <p className="text-xs text-text-faint font-medium">{t.detail.aiReasoning}</p>
                      <p className="text-sm text-text-muted leading-relaxed">{aiVerdict.reasoning}</p>
                    </div>

                    {/* Key factors */}
                    {aiVerdict.keyFactors?.length > 0 && (
                      <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle space-y-2">
                        <p className="text-xs text-text-faint font-medium">{t.detail.aiKeyFactors}</p>
                        <ul className="space-y-1">
                          {aiVerdict.keyFactors.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                              <span className="text-accent mt-0.5">•</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended action */}
                    <div className="p-3 rounded-xl bg-accent/8 border border-accent/20">
                      <p className="text-xs text-text-faint font-medium mb-1">{t.detail.aiRecommendedAction}</p>
                      <p className="text-sm text-text">{aiVerdict.recommendedAction}</p>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-xs text-text-faint text-center italic">{t.detail.aiDisclaimer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function TimelineItem({
  icon,
  label,
  active,
  color = "text-primary-light",
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  color?: string;
}) {
  return (
    <div className={clsx("flex items-center gap-3", active ? color : "text-text-faint")}>
      <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center", active ? "bg-current/10" : "bg-bg-surface")}>
        {icon}
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function ActionButton({
  label,
  desc,
  color,
  icon,
  onClick,
  loading,
  compact,
}: {
  label: string;
  desc?: string;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading: boolean;
  compact?: boolean;
}) {
  return (
    <div>
      <button
        onClick={onClick}
        disabled={loading}
        className={clsx(
          "w-full flex items-center gap-2 font-semibold transition-all disabled:opacity-50",
          compact
            ? "justify-center py-2.5 rounded-xl text-white text-sm"
            : "justify-start px-4 py-3 rounded-xl text-white text-sm",
          color
        )}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          icon
        )}
        {label}
      </button>
      {desc && <p className="text-xs text-text-faint mt-1.5 px-1">{desc}</p>}
    </div>
  );
}
