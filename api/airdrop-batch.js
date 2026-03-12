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
import { tgNotify } from "./_telegram.js";
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
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const CHUNK_SIZE = 6; // transfers per transaction (conservative)

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "method-not-allowed" });

  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const { entries, amount_per_wallet, dry_run = false, token_type = "pff" } = req.body || {};
  const isSol = token_type === "sol";

  // ── Validation ─────────────────────────────────────────────────
  if (!Array.isArray(entries) || entries.length === 0)
    return res.status(400).json({ error: "missing-entries" });

  const amount = Number(amount_per_wallet);
  if (!amount || isNaN(amount) || amount <= 0)
    return res.status(400).json({ error: "invalid-amount" });

  if (!isSol && amount > AIRDROP_MAX_PER_WALLET)
    return res.status(400).json({
      error: "amount-exceeds-cap",
      cap: AIRDROP_MAX_PER_WALLET,
      message: `Max ${AIRDROP_MAX_PER_WALLET.toLocaleString()} $PFF per wallet per drop`,
    });
  if (isSol && amount > 1)
    return res.status(400).json({ error: "amount-exceeds-cap", message: "Max 1 SOL per wallet per drop" });

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
      token_type,
      valid_count: validEntries.length,
      invalid_count: invalidEntries.length,
      total_pff: isSol ? undefined : validEntries.length * amount,
      total_sol: isSol ? validEntries.length * amount : undefined,
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

    const results = [];
    const errors = [];

    if (isSol) {
      // ── SOL transfer ─────────────────────────────────────────────
      const lamports = Math.round(amount * 1e9);
      for (let i = 0; i < validEntries.length; i += CHUNK_SIZE) {
        const chunk = validEntries.slice(i, i + CHUNK_SIZE);
        const tx = new Transaction();
        const chunkMeta = [];
        for (const entry of chunk) {
          try {
            const recipientPubkey = new PublicKey(entry.wallet_address);
            tx.add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipientPubkey, lamports }));
            chunkMeta.push(entry);
          } catch (e) {
            errors.push({ wallet: entry.wallet_address, error: e?.message });
          }
        }
        if (tx.instructions.length === 0) continue;
        const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
        const db = supabaseAdmin();
        for (const meta of chunkMeta) {
          if (meta.submission_id) {
            await db.from("submissions").update({ airdrop_tx: sig, airdrop_amount: amount, airdrop_token_type: "sol" }).eq("id", meta.submission_id);
          }
        }
        results.push({ tx_signature: sig, solscan: `https://solscan.io/tx/${sig}`, wallets: chunkMeta.map(m => m.wallet_address), count: chunkMeta.length });
      }
    } else {
      // ── PFF SPL transfer ─────────────────────────────────────────
      const mint = getPffMint();
      const rawAmount = toRawAmount(amount);
      const sourceAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
      for (let i = 0; i < validEntries.length; i += CHUNK_SIZE) {
        const chunk = validEntries.slice(i, i + CHUNK_SIZE);
        const tx = new Transaction();
        const chunkMeta = [];

        for (const entry of chunk) {
          try {
            const recipientPubkey = new PublicKey(entry.wallet_address);
            const recipientAta = await getOrCreateAssociatedTokenAccount(
              connection,
              payer,
              mint,
              recipientPubkey
            );
            tx.add(
              createTransferInstruction(sourceAta.address, recipientAta.address, payer.publicKey, rawAmount, [], TOKEN_PROGRAM_ID)
            );
            chunkMeta.push({ ...entry, recipientAta: recipientAta.address.toBase58() });
          } catch (e) {
            errors.push({ wallet: entry.wallet_address, error: e?.message });
          }
        }

        if (tx.instructions.length === 0) continue;

        const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
        const db = supabaseAdmin();
        for (const meta of chunkMeta) {
          if (meta.submission_id) {
            await db.from("submissions").update({ airdrop_tx: sig, airdrop_amount: amount, airdrop_token_type: "pff" }).eq("id", meta.submission_id);
          }
        }
        results.push({ tx_signature: sig, solscan: `https://solscan.io/tx/${sig}`, wallets: chunkMeta.map(m => m.wallet_address), count: chunkMeta.length });
      }
    } // end PFF branch

    // ── Auto-log to Execution Logs (public) ────────────────────────
    const db = supabaseAdmin();
    if (results.length > 0) {
      const totalSent = results.reduce((acc, r) => acc + r.count, 0);
      const tokenLabel = isSol ? `${amount} SOL` : `${amount.toLocaleString()} $PFF`;
      await db.from("execution_logs").insert([
        {
          title: `Airdrop: ${totalSent} × ${tokenLabel}`,
          description:
            `Batch ${isSol ? "SOL" : "$PFF"} airdrop distributed to ${totalSent} community members.\n` +
            `Transactions: ${results.map((r) => r.tx_signature).join(", ")}`,
          type: "event",
          proof_link: results[0]?.solscan || null,
        },
      ]);
      await tgNotify(
        `🪓 <b>Airdrop Executed!</b>\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `⚡ <b>${totalSent}</b> Vikings received <b>${tokenLabel}</b> each\n` +
        `💰 Total: <b>${(totalSent * amount).toLocaleString()} ${isSol ? "SOL" : "$PFF"}</b>\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `<a href="${results[0].solscan}">🔗 View on Solscan</a>`
      );
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
