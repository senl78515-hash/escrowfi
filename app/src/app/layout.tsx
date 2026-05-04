import type { Metadata } from "next";
import "./globals.css";
import { WalletContextProvider } from "@/contexts/WalletContextProvider";
import { I18nProvider } from "@/i18n/context";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "EscrowFi — Private Smart Escrow on Solana",
  description:
    "Secure, private, decentralized escrow payments powered by USDC on Solana.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <I18nProvider>
          <WalletContextProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#1a1430",
                  color: "#f1edff",
                  border: "1px solid #2d2550",
                  borderRadius: "12px",
                  fontSize: "14px",
                },
                success: {
                  iconTheme: { primary: "#10b981", secondary: "#1a1430" },
                },
                error: {
                  iconTheme: { primary: "#ef4444", secondary: "#1a1430" },
                },
              }}
            />
          </WalletContextProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
