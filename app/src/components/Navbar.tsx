"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useI18n } from "@/i18n/context";
import { shortAddress } from "@/utils/pda";
import { Shield, Globe } from "lucide-react";
import clsx from "clsx";

export function Navbar() {
  const { t, locale, toggle } = useI18n();
  const { publicKey } = useWallet();
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: t.nav.dashboard },
    { href: "/create", label: t.nav.create },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary-dim flex items-center justify-center ring-1 ring-primary/30">
              <Shield size={16} className="text-primary-light" />
            </div>
            <span className="font-bold text-lg text-text tracking-tight">
              Escrow<span className="text-gradient">Fi</span>
            </span>
          </Link>

          {/* Nav links — only show when wallet connected */}
          {publicKey && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-bg-surface text-text"
                      : "text-text-muted hover:text-text hover:bg-bg-surface/50"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Network badge */}
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              {t.common.network}
            </span>

            {/* Language toggle */}
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-surface border border-border text-text-muted hover:text-text hover:border-primary/40 transition-all text-sm font-medium"
              title="Switch language"
            >
              <Globe size={14} />
              {locale === "en" ? "中文" : "EN"}
            </button>

            {/* Wallet button */}
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
