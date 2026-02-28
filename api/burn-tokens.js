/**
 * POST /api/burn-tokens
 *
 * Burns $PFF SPL tokens from the rewards wallet.
 * Always requires admin auth + dry_run confirmation pattern.
 *
 * Body:
 *   amount:  number  — human-readable $PFF to burn (e.g. 500000)
 *   reason:  string  — label for the execution log (e.g. "Milestone 50 burn")
 *   dry_run: boolean — if true, preview only, no tx
 *
 * Returns (dry_run=false):
 *   { ok, tx_signature, solscan, amount_burned }
 *
 * Returns (dry_run=true):
 *   { ok, dry_run, amount_to_burn, raw_amount, wallet }
 */

import { requireAdmin } from "./_session.js";
import { supabaseAdmin } from "./_supabase.js";
import {
  getSolanaConnection,
  getRewardsKeypair,
  getPffMint,
  toRawAmount,
  BURN_MAX_PER_TX,
} from "./_solana.js";
import {
  getOrCreateAssociatedTokenAccount,
  createBurnInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "method-not-allowed" });

  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const { amount, reason, dry_run = false } = req.body || {};

  // ── Validation ─────────────────────────────────────────────────
  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0)
    return res.status(400).json({ error: "invalid-amount" });

  if (numAmount > BURN_MAX_PER_TX)
    return res.status(400).json({
      error: "amount-exceeds-cap",
      cap: BURN_MAX_PER_TX,
      message: `Max ${BURN_MAX_PER_TX.toLocaleString()} $PFF per burn`,
    });

  // ── Dry run ─────────────────────────────────────────────────────
  if (dry_run) {
    try {
      const payer = getRewardsKeypair();
      return res.status(200).json({
        ok: true,
        dry_run: true,
        amount_to_burn: numAmount,
        raw_amount: toRawAmount(numAmount).toString(),
        rewards_wallet: payer.publicKey.toBase58(),
      });
    } catch (e) {
      return res.status(500).json({ error: "config-error", message: e?.message });
    }
  }

  // ── Real burn ───────────────────────────────────────────────────
  try {
    const connection = getSolanaConnection();
    const payer = getRewardsKeypair();
    const mint = getPffMint();
    const rawAmount = toRawAmount(numAmount);

    // Get/create ATA for rewards wallet
    const sourceAta = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );

    const tx = new Transaction();
    tx.add(
      createBurnInstruction(
        sourceAta.address, // token account to burn from
        mint,              // mint
        payer.publicKey,   // owner/signer
        rawAmount,         // raw amount (with decimals)
        [],                // multisig signers (none)
        TOKEN_PROGRAM_ID
      )
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
      commitment: "confirmed",
    });

    const solscanUrl = `https://solscan.io/tx/${sig}`;

    // ── Auto-log to Execution Logs (public) ──────────────────────
    const db = supabaseAdmin();
    await db.from("execution_logs").insert([
      {
        title: `Burn: ${numAmount.toLocaleString()} $PFF`,
        description:
          reason
            ? `${reason}\n\nOracle burn executed: ${numAmount.toLocaleString()} $PFF permanently destroyed.`
            : `Oracle burn: ${numAmount.toLocaleString()} $PFF tokens permanently destroyed.`,
        type: "burn",
        proof_link: solscanUrl,
      },
    ]);

    return res.status(200).json({
      ok: true,
      tx_signature: sig,
      solscan: solscanUrl,
      amount_burned: numAmount,
    });
  } catch (e) {
    console.error("[burn-tokens]", e);
    return res.status(500).json({
      error: "solana-error",
      message: e?.message || "Unknown error",
    });
  }
}
