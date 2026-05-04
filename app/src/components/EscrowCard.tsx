"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";
import { StatusBadge } from "./StatusBadge";
import { shortAddress } from "@/utils/pda";
import { USDC_DECIMALS } from "@/utils/constants";
import { Shield, ChevronRight } from "lucide-react";
import BN from "bn.js";

export interface EscrowData {
  publicKey: string;
  escrowId: string;
  buyer: string;
  seller: string;
  arbitrator: string;
  amount: BN;
  description: string;
  status: "active" | "delivered" | "completed" | "disputed" | "cancelled";
  createdAt: number;
  privacyEnabled?: boolean;
}

interface Props {
  escrow: EscrowData;
  walletAddress?: string;
}

export function EscrowCard({ escrow, walletAddress }: Props) {
  const { t } = useI18n();
  const isBuyer = walletAddress === escrow.buyer;
  const usdcAmount = escrow.amount
    .div(new BN(10 ** USDC_DECIMALS))
    .toString();

  const date = new Date(escrow.createdAt * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/escrow/${escrow.publicKey}`}
      className="group block bg-bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:bg-bg-surface/50 transition-all duration-200 card-glow"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: amount + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {escrow.privacyEnabled ? (
              <div className="flex items-center gap-1.5 text-privacy font-bold text-xl">
                <Shield size={18} className="shrink-0" />
                <span>••• USDC</span>
              </div>
            ) : (
              <span className="font-bold text-xl text-text">
                {usdcAmount} USDC
              </span>
            )}
            {escrow.privacyEnabled && (
              <span className="px-2 py-0.5 rounded-md bg-privacy-dim text-privacy text-xs border border-privacy/20 font-medium">
                🛡 Private
              </span>
            )}
          </div>
          <p className="text-text-muted text-sm truncate mb-3">
            {escrow.description || "—"}
          </p>
          <div className="flex items-center gap-4 text-xs text-text-faint font-mono">
            <span>
              {isBuyer ? "→ " : "← "}
              {shortAddress(isBuyer ? escrow.seller : escrow.buyer)}
            </span>
            <span>{date}</span>
          </div>
        </div>

        {/* Right: status + chevron */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <StatusBadge status={escrow.status} />
          <ChevronRight
            size={16}
            className="text-text-faint group-hover:text-primary transition-colors"
          />
        </div>
      </div>
    </Link>
  );
}
