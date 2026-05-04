"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navbar } from "@/components/Navbar";
import { EscrowCard, type EscrowData } from "@/components/EscrowCard";
import { useI18n } from "@/i18n/context";
import { Plus, Search, TrendingUp, Activity, CheckCircle, AlertTriangle } from "lucide-react";
import BN from "bn.js";
import clsx from "clsx";

// Mock data — replace with on-chain fetch via Program.account.escrowAccount.all()
const MOCK_ESCROWS: EscrowData[] = [
  {
    publicKey: "EscrowXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1",
    escrowId: "1",
    buyer: "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5",
    seller: "3mNkPFp7SbRZK1nJHM9tBbQXeXdaGX5wvUX2vWgJk8qR",
    arbitrator: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
    amount: new BN(500_000_000),
    description: "MacBook Pro 16-inch, M3 chip, excellent condition",
    status: "delivered",
    createdAt: Math.floor(Date.now() / 1000) - 3600 * 24,
    privacyEnabled: true,
  },
  {
    publicKey: "EscrowXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX2",
    escrowId: "2",
    buyer: "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5",
    seller: "9pQxrZaLmN4vTkJhC2yEfUsBpWq6dXeR7tVgKnLm5hYZ",
    arbitrator: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
    amount: new BN(200_000_000),
    description: "Freelance UI/UX design — mobile app redesign",
    status: "active",
    createdAt: Math.floor(Date.now() / 1000) - 3600 * 2,
  },
  {
    publicKey: "EscrowXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX3",
    escrowId: "3",
    buyer: "AbcDefGhiJklMnoPqrStuVwxYz123456789abcdefghi1",
    seller: "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5",
    arbitrator: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
    amount: new BN(1_000_000_000),
    description: "Smart contract audit — 3 programs",
    status: "completed",
    createdAt: Math.floor(Date.now() / 1000) - 3600 * 72,
  },
  {
    publicKey: "EscrowXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX4",
    escrowId: "4",
    buyer: "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5",
    seller: "KmNpQrStUvWxYzAbCdEfGhIjLmNpQrStUvWxYzAbCd12",
    arbitrator: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
    amount: new BN(150_000_000),
    description: "Domain name transfer — premium .sol handle",
    status: "disputed",
    createdAt: Math.floor(Date.now() / 1000) - 3600 * 48,
    privacyEnabled: true,
  },
];

type Tab = "all" | "buyer" | "seller";

export default function DashboardPage() {
  const { t } = useI18n();
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const walletAddr = publicKey?.toBase58() ?? "";

  // In production: filter by wallet address from on-chain accounts
  const filtered = MOCK_ESCROWS.filter((e) => {
    const matchTab =
      tab === "all" ||
      (tab === "buyer" && e.buyer === walletAddr) ||
      (tab === "seller" && e.seller === walletAddr);
    const matchSearch =
      !search ||
      e.escrowId.includes(search) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.seller.toLowerCase().includes(search.toLowerCase()) ||
      e.buyer.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const stats = {
    tvl: MOCK_ESCROWS.filter((e) =>
      ["active", "delivered", "disputed"].includes(e.status)
    ).reduce((sum, e) => sum + e.amount.toNumber(), 0),
    active: MOCK_ESCROWS.filter((e) => e.status === "active").length,
    completed: MOCK_ESCROWS.filter((e) => e.status === "completed").length,
    disputed: MOCK_ESCROWS.filter((e) => e.status === "disputed").length,
  };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-28 pb-20">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text">{t.dashboard.title}</h1>
            <p className="text-text-muted mt-1">{t.dashboard.subtitle}</p>
          </div>
          <Link
            href="/create"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all shadow-lg shadow-primary/20 hover:scale-[1.02]"
          >
            <Plus size={16} />
            {t.dashboard.newEscrow}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<TrendingUp size={18} className="text-primary-light" />}
            label={t.dashboard.tvl}
            value={`$${(stats.tvl / 1e6).toFixed(0)}`}
            bg="bg-primary-dim"
          />
          <StatCard
            icon={<Activity size={18} className="text-accent" />}
            label={t.dashboard.activeCount}
            value={String(stats.active)}
            bg="bg-accent-dim"
          />
          <StatCard
            icon={<CheckCircle size={18} className="text-success" />}
            label={t.dashboard.completedCount}
            value={String(stats.completed)}
            bg="bg-success-dim"
          />
          <StatCard
            icon={<AlertTriangle size={18} className="text-danger" />}
            label={t.dashboard.disputedCount}
            value={String(stats.disputed)}
            bg="bg-danger-dim"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Tabs */}
          <div className="flex rounded-xl bg-bg-card border border-border p-1 gap-1">
            {(["all", "buyer", "seller"] as Tab[]).map((t_) => (
              <button
                key={t_}
                onClick={() => setTab(t_)}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  tab === t_
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:text-text"
                )}
              >
                {t_  === "all"
                  ? t.dashboard.tabAll
                  : t_ === "buyer"
                  ? t.dashboard.tabAsBuyer
                  : t.dashboard.tabAsSeller}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.dashboard.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-card border border-border text-text text-sm placeholder:text-text-faint focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-bg-card border border-border flex items-center justify-center mb-4">
              <Activity size={24} className="text-text-faint" />
            </div>
            <p className="text-text-muted font-medium">{t.dashboard.noEscrows}</p>
            <p className="text-text-faint text-sm mt-1">
              {t.dashboard.noEscrowsHint}
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all"
            >
              <Plus size={15} />
              {t.dashboard.newEscrow}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((e) => (
              <EscrowCard key={e.publicKey} escrow={e} walletAddress={walletAddr} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-4">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-xl font-bold text-text">{value}</div>
      <div className="text-xs text-text-muted mt-0.5">{label}</div>
    </div>
  );
}
