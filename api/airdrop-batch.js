/**
 * POST /api/airdrop-batch
 *
 * Sends $PFF SPL tokens from the rewards wallet to a list of approved wallets.
 * Supports dry_run mode (preview only, no tx) for admin confirmation step.
 *
 * Body:
 *   entries:           Array<{ submission_id?: string, wallet_address: string, handle?: string }>
 *   amount_per_wallet: number  — human-readable $PFF (e.g. 50000)
 *   dry_run:           boolean — if true, validate & preview without sending
 *
 * Returns (dry_run=false):
 *   { ok, results: [{ tx_signature, wallets[], count }], total_sent }
 *
 * Returns (dry_run=true):
 *   { ok, dry_run, valid_count, invalid_count, total_pff, entries }
 *
 * Notes:
 *   - Rewards wallet must hold enough $PFF and enough SOL for rent + fees
 *   - ATA creation costs ~0.002 SOL per new recipient — keep rewards wallet funded
 *   - Chunk size: 6 transfers/tx (conservative, stays under tx size limit)
 *   - Vercel Pro recommended for batches > 30 wallets (timeout safety)
 */

import { requireAdmin } from "./_session.js";
import { supabaseAdmin } from "./_supabase.js";
import {
  getSolanaConnection,
  getRewardsKeypair,
  getPffMint,
  toRawAmount,
  AIRDROP_MAX_PER_WALLET,
} from "./_solana.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const CHUNK_SIZE = 6; // transfers per transaction (conservative)

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "method-not-allowed" });

  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const { entries, amount_per_wallet, dry_run = false } = req.body || {};

  // ── Validation ─────────────────────────────────────────────────
  if (!Array.isArray(entries) || entries.length === 0)
    return res.status(400).json({ error: "missing-entries" });

  const amount = Number(amount_per_wallet);
  if (!amount || isNaN(amount) || amount <= 0)
    return res.status(400).json({ error: "invalid-amount" });

  if (amount > AIRDROP_MAX_PER_WALLET)
    return res.status(400).json({
      error: "amount-exceeds-cap",
      cap: AIRDROP_MAX_PER_WALLET,
      message: `Max ${AIRDROP_MAX_PER_WALLET.toLocaleString()} $PFF per wallet per drop`,
    });

  // ── Validate wallet addresses ───────────────────────────────────
  const validEntries = [];
  const invalidEntries = [];

  for (const e of entries) {
    if (!e.wallet_address) {
      invalidEntries.push({ ...e, reason: "missing-wallet" });
      continue;
    }
    try {
      new PublicKey(e.wallet_address); // throws if invalid base58/length
      validEntries.push(e);
    } catch {
      invalidEntries.push({ ...e, reason: "invalid-pubkey" });
    }
  }

  // ── Dry run — preview only ──────────────────────────────────────
  if (dry_run) {
    return res.status(200).json({
      ok: true,
      dry_run: true,
      valid_count: validEntries.length,
      invalid_count: invalidEntries.length,
      total_pff: validEntries.length * amount,
      invalid_entries: invalidEntries,
      entries: validEntries,
    });
  }

  if (validEntries.length === 0)
    return res.status(400).json({ error: "no-valid-wallets" });

  // ── Real send ───────────────────────────────────────────────────
  try {
    const connection = getSolanaConnection();
    const payer = getRewardsKeypair();
    const mint = getPffMint();
    const rawAmount = toRawAmount(amount);

    // Source ATA (rewards wallet)
    const sourceAta = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );

    const results = [];
    const errors = [];

    // Split into chunks
    for (let i = 0; i < validEntries.length; i += CHUNK_SIZE) {
      const chunk = validEntries.slice(i, i + CHUNK_SIZE);
      const tx = new Transaction();
      const chunkMeta = [];

      for (const entry of chunk) {
        try {
          const recipientPubkey = new PublicKey(entry.wallet_address);
          const recipientAta = await getOrCreateAssociatedTokenAccount(
            connection,
            payer, // payer for ATA creation (costs ~0.002 SOL if new)
            mint,
            recipientPubkey
          );

          tx.add(
            createTransferInstruction(
              sourceAta.address,
              recipientAta.address,
              payer.publicKey,
              rawAmount,
              [],
              TOKEN_PROGRAM_ID
            )
          );

          chunkMeta.push({
            ...entry,
            recipientAta: recipientAta.address.toBase58(),
          });
        } catch (e) {
          errors.push({ wallet: entry.wallet_address, error: e?.message });
        }
      }

      if (tx.instructions.length === 0) continue;

      const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: "confirmed",
      });

      // ── Mark submissions as airdropped in DB ───────────────────
      const db = supabaseAdmin();
      for (const meta of chunkMeta) {
        if (meta.submission_id) {
          await db
            .from("submissions")
            .update({
              airdrop_tx: sig,
              airdrop_amount: amount,
            })
            .eq("id", meta.submission_id);
        }
      }

      results.push({
        tx_signature: sig,
        solscan: `https://solscan.io/tx/${sig}`,
        wallets: chunkMeta.map((m) => m.wallet_address),
        count: chunkMeta.length,
      });
    }

    // ── Auto-log to Execution Logs (public) ────────────────────────
    const db = supabaseAdmin();
    if (results.length > 0) {
      const totalSent = results.reduce((acc, r) => acc + r.count, 0);
      await db.from("execution_logs").insert([
        {
          title: `Airdrop: ${totalSent} × ${amount.toLocaleString()} $PFF`,
          description:
            `Batch airdrop distributed to ${totalSent} approved community members.\n` +
            `Transactions: ${results.map((r) => r.tx_signature).join(", ")}`,
          type: "event",
          proof_link: results[0]?.solscan || null,
        },
      ]);
    }

    return res.status(200).json({
      ok: true,
      results,
      errors,
      total_sent: results.reduce((acc, r) => acc + r.count, 0),
    });
  } catch (e) {
    console.error("[airdrop-batch]", e);
    return res.status(500).json({
      error: "solana-error",
      message: e?.message || "Unknown error",
    });
  }
}
