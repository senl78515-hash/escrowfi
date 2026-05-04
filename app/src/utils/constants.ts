import { PublicKey } from "@solana/web3.js";

// Update this after `anchor build && anchor keys list`
export const PROGRAM_ID = new PublicKey(
  "2DRJSTtmFh3KhbBGmJpYvGugeUaLiumcmYZtcTqKeWRd"
);

// Circle's devnet USDC mint
export const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

// Default EscrowFi arbitrator (replace with your devnet keypair pubkey)
export const DEFAULT_ARBITRATOR = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);

export const USDC_DECIMALS = 6;

export const EXPLORER_BASE = "https://explorer.solana.com";
export const CLUSTER_PARAM = "?cluster=devnet";

export function explorerUrl(signature: string, type: "tx" | "address" = "tx") {
  return `${EXPLORER_BASE}/${type}/${signature}${CLUSTER_PARAM}`;
}
