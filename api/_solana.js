/**
 * _solana.js — Solana helpers for $PFF on-chain actions
 *
 * ENV VARS required (Vercel dashboard or .env.local):
 *   SOLANA_RPC_URL              — Helius / QuickNode RPC endpoint
 *   REWARDS_WALLET_PRIVATE_KEY  — JSON array "[1,2,…,64]" of the rewards keypair
 *                                  (use Solana CLI: `solana-keygen new -o rewards.json`)
 *   PFF_TOKEN_MINT              — $PFF SPL token mint address
 *
 * Install: npm install @solana/web3.js @solana/spl-token
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";

// ------------------------------------------------------------------
// RPC Connection
// ------------------------------------------------------------------
export function getSolanaConnection() {
  const rpc = process.env.SOLANA_RPC_URL;
  if (!rpc) throw new Error("Missing env: SOLANA_RPC_URL");
  return new Connection(rpc, "confirmed");
}

// ------------------------------------------------------------------
// Rewards Keypair
// Accepts JSON array format: "[1,2,3,...,64]"
// Generate with: solana-keygen new --outfile rewards-wallet.json
// Then set env: REWARDS_WALLET_PRIVATE_KEY=$(cat rewards-wallet.json)
// ------------------------------------------------------------------
export function getRewardsKeypair() {
  const raw = process.env.REWARDS_WALLET_PRIVATE_KEY;
  if (!raw) throw new Error("Missing env: REWARDS_WALLET_PRIVATE_KEY");

  let secret;
  try {
    secret = Uint8Array.from(JSON.parse(raw.trim()));
  } catch {
    throw new Error(
      "REWARDS_WALLET_PRIVATE_KEY must be a JSON byte array. " +
        'Example: [1,2,3,...,64]. Generate with: solana-keygen new -o wallet.json'
    );
  }

  return Keypair.fromSecretKey(secret);
}

// ------------------------------------------------------------------
// $PFF Mint address
// ------------------------------------------------------------------
export function getPffMint() {
  const mint = process.env.PFF_TOKEN_MINT;
  if (!mint) throw new Error("Missing env: PFF_TOKEN_MINT");
  return new PublicKey(mint);
}

// ------------------------------------------------------------------
// Amount helpers — pump.fun tokens use 6 decimals
// ------------------------------------------------------------------
export const PFF_DECIMALS = 6;

/** Convert human-readable $PFF (e.g. 50000) to raw lamports (bigint) */
export function toRawAmount(humanAmount) {
  return BigInt(Math.round(Number(humanAmount) * Math.pow(10, PFF_DECIMALS)));
}

/** Convert raw lamports back to human-readable */
export function toHumanAmount(rawAmount) {
  return Number(rawAmount) / Math.pow(10, PFF_DECIMALS);
}

// ------------------------------------------------------------------
// Safety caps — edit to match your budget strategy
// ------------------------------------------------------------------
export const AIRDROP_MAX_PER_WALLET = 10_000_000;  // 10M $PFF/wallet/drop
export const BURN_MAX_PER_TX = 500_000_000;         // 500M $PFF per burn
