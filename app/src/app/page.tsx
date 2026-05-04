"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";
import { Navbar } from "@/components/Navbar";
import { Shield, Zap, Scale, ArrowRight, Globe, Lock, CheckCircle } from "lucide-react";

const STATS = [
  { key: "statsLocked", value: "$2.4M" },
  { key: "statsActive", value: "847" },
  { key: "statsCompleted", value: "12,400" },
  { key: "statsUsers", value: "3,200" },
] as const;

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-dim border border-primary/30 text-primary-light text-sm font-medium mb-8 animate-fade-in">
            <Zap size={14} />
            {t.landing.badge}
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-tight tracking-tight mb-6 animate-slide-up">
            <span className="text-text">{t.landing.headline1}</span>
            <br />
            <span className="text-gradient">{t.landing.headline2}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-text-muted text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.landing.subtitle}
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-base transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]"
            >
              {t.landing.ctaLaunch}
              <ArrowRight size={18} />
            </Link>
            <a
              href="https://github.com/your-repo/escrowfi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-bg-surface border border-border text-text-muted hover:text-text hover:border-primary/40 font-medium text-base transition-all duration-200"
            >
              {t.landing.ctaDocs}
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(({ key, value }) => (
            <div
              key={key}
              className="bg-bg-card border border-border rounded-2xl p-5 text-center"
            >
              <div className="text-2xl font-bold text-text mb-1">{value}</div>
              <div className="text-xs text-text-muted">{t.landing[key]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Privacy */}
          <div className="bg-bg-card border border-border rounded-2xl p-6 hover:border-privacy/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-privacy-dim flex items-center justify-center mb-5 group-hover:bg-privacy/20 transition-colors">
              <Lock size={22} className="text-privacy" />
            </div>
            <h3 className="font-semibold text-text text-base mb-2">
              {t.landing.featurePrivacyTitle}
            </h3>
            <p className="text-text-muted text-sm leading-relaxed">
              {t.landing.featurePrivacyDesc}
            </p>
          </div>

          {/* Speed */}
          <div className="bg-bg-card border border-border rounded-2xl p-6 hover:border-accent/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-accent-dim flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
              <Zap size={22} className="text-accent" />
            </div>
            <h3 className="font-semibold text-text text-base mb-2">
              {t.landing.featureSpeedTitle}
            </h3>
            <p className="text-text-muted text-sm leading-relaxed">
              {t.landing.featureSpeedDesc}
            </p>
          </div>

          {/* Arbitration */}
          <div className="bg-bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-primary-dim flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
              <Scale size={22} className="text-primary-light" />
            </div>
            <h3 className="font-semibold text-text text-base mb-2">
              {t.landing.featureArbitrationTitle}
            </h3>
            <p className="text-text-muted text-sm leading-relaxed">
              {t.landing.featureArbitrationDesc}
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-32">
        <h2 className="text-3xl font-bold text-text text-center mb-12">
          {t.landing.howTitle}
        </h2>
        <div className="relative">
          {/* Connector line */}
          <div className="absolute top-8 left-[calc(16.7%+16px)] right-[calc(16.7%+16px)] h-px bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 hidden md:block" />

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                title: t.landing.step1Title,
                desc: t.landing.step1Desc,
                color: "text-primary",
                bg: "bg-primary-dim",
                border: "border-primary/30",
              },
              {
                num: "02",
                title: t.landing.step2Title,
                desc: t.landing.step2Desc,
                color: "text-accent",
                bg: "bg-accent-dim",
                border: "border-accent/30",
              },
              {
                num: "03",
                title: t.landing.step3Title,
                desc: t.landing.step3Desc,
                color: "text-success",
                bg: "bg-success-dim",
                border: "border-success/30",
              },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-2xl ${step.bg} border ${step.border} flex items-center justify-center mb-5`}>
                  <span className={`font-bold text-lg ${step.color}`}>
                    {step.num}
                  </span>
                </div>
                <h3 className="font-semibold text-text mb-2">{step.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-faint">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-primary-light" />
            <span>EscrowFi · Built on Solana</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/your-repo/escrowfi"
              className="hover:text-text transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Devnet
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
