import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { PROGRAM_ID } from "./constants";

export function escrowPda(buyer: PublicKey, escrowId: BN): PublicKey {
  const idBytes = Buffer.alloc(8);
  // little-endian u64
  idBytes.writeBigUInt64LE(BigInt(escrowId.toString()));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), buyer.toBuffer(), idBytes],
    PROGRAM_ID
  );
  return pda;
}

export function vaultPda(escrowKey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrowKey.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export function shortAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
