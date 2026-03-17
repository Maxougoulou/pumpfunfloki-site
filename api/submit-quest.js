import { supabaseAdmin } from "./_supabase.js";
import { verifyRecaptcha } from "./_recaptcha.js";
import { tgNotify } from "./_telegram.js";
import { getSolanaConnection, getRewardsKeypair, getPffMint, toRawAmount } from "./_solana.js";
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });

  // ── Vote on an approved submission ─────────────────────────────
  if (req.query?.action === "vote") {
    const { submission_id, voter_handle } = req.body || {};
    if (!submission_id || !voter_handle)
      return res.status(400).json({ error: "missing-fields" });

    const db = supabaseAdmin();

    const { error: voteErr } = await db
      .from("votes")
      .insert([{ submission_id: String(submission_id), voter_handle: String(voter_handle).slice(0, 80) }]);

    if (voteErr) {
      if (voteErr.code === "23505")
        return res.status(409).json({ error: "already-voted" });
      return res.status(500).json({ error: "db-error", details: voteErr });
    }

    const { data: sub } = await db
      .from("submissions")
      .select("vote_count, wallet_address, vote_bonus_sent, quest_id")
      .eq("id", String(submission_id))
      .single();

    const newCount = (Number(sub?.vote_count) || 0) + 1;
    await db.from("submissions").update({ vote_count: newCount }).eq("id", String(submission_id));

    // ── Check vote threshold bonus ──────────────────────────────
    let bonusTx = null;
    if (sub && !sub.vote_bonus_sent && sub.wallet_address && sub.quest_id) {
      const { data: quest } = await db
        .from("quests")
        .select("vote_threshold, vote_bonus_amount, vote_bonus_token, title")
        .eq("id", sub.quest_id)
        .maybeSingle();

      const threshold = Number(quest?.vote_threshold || 0);
      const bonusAmount = Number(quest?.vote_bonus_amount || 0);

      if (threshold > 0 && bonusAmount > 0 && newCount >= threshold) {
        // Optimistic lock: only proceed if we are the one to flip vote_bonus_sent to true
        const { data: claimed } = await db
          .from("submissions")
          .update({ vote_bonus_sent: true })
          .eq("id", String(submission_id))
          .eq("vote_bonus_sent", false)
          .select("id");

        if (claimed && claimed.length > 0) {
          try {
            const bonusToken = quest.vote_bonus_token === "sol" ? "sol" : "pff";
            const connection = getSolanaConnection();
            const payer = getRewardsKeypair();
            const recipientPubkey = new PublicKey(sub.wallet_address);

            if (bonusToken === "sol") {
              const lamports = Math.round(bonusAmount * 1e9);
              const tx = new Transaction().add(
                SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipientPubkey, lamports })
              );
              bonusTx = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "processed" });
            } else {
              const mint = getPffMint();
              const rawAmount = toRawAmount(bonusAmount);
              const sourceAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
              const recipientAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipientPubkey);
              const tx = new Transaction().add(
                createTransferInstruction(sourceAta.address, recipientAta.address, payer.publicKey, rawAmount, [], TOKEN_PROGRAM_ID)
              );
              bonusTx = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "processed" });
            }

            if (bonusTx) {
              await db.from("submissions").update({ vote_bonus_tx: bonusTx }).eq("id", String(submission_id));
              await tgNotify(
                `🗳️ <b>Vote Milestone!</b>\n` +
                `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
                `⚔️ <b>${threshold} votes</b> reached on a submission\n` +
                (quest.title ? `📜 Quest: <i>${quest.title}</i>\n` : ``) +
                `💰 Bonus: <b>${bonusAmount.toLocaleString()} $${(quest.vote_bonus_token || "pff").toUpperCase()}</b> sent\n` +
                `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
                `🌐 <a href="https://pumpfunfloki.com/horde-engine">pumpfunfloki.com/horde-engine</a>`
              );
            }
          } catch (bonusErr) {
            console.error("[vote-bonus]", bonusErr?.message);
          }
        }
      }
    }

    return res.status(200).json({ ok: true, vote_count: newCount, bonus_triggered: !!bonusTx });
  }

  try {
    const {
      quest_id,
      quest_title,
      type,
      difficulty,
      handle,
      proof,
      note,
      wallet_address,
      recaptchaToken,
    } = req.body || {};

    const rc = await verifyRecaptcha(recaptchaToken, "submit_quest");
    if (!rc.ok) return res.status(400).json({ error: "recaptcha-failed", details: rc.raw });

    if (!quest_id || !handle || !proof) {
      return res.status(400).json({ error: "missing-fields" });
    }

    const normalizedHandle = String(handle).toLowerCase().trim().slice(0, 80);

    const db = supabaseAdmin();

    // Fetch quest to get max_submissions limit
    const { data: quest } = await db
      .from("quests")
      .select("max_submissions")
      .eq("id", String(quest_id))
      .maybeSingle();

    const maxSubs = Number(quest?.max_submissions ?? 3);

    if (maxSubs > 0) {
      const { count: existingCount } = await db
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("quest_id", String(quest_id))
        .eq("handle", normalizedHandle);

      if ((existingCount ?? 0) >= maxSubs) {
        return res.status(409).json({ error: "max-submissions", message: `Max ${maxSubs} submission${maxSubs > 1 ? "s" : ""} per quest reached.` });
      }
    }

    const { data, error } = await db
      .from("submissions")
      .insert([
        {
          quest_id: String(quest_id),
          quest_title: quest_title ? String(quest_title).slice(0, 140) : null,
          type: type ? String(type).slice(0, 40) : null,
          difficulty: difficulty ? String(difficulty).slice(0, 40) : null,
          handle: normalizedHandle,
          proof: String(proof).slice(0, 2000),
          note: note ? String(note).slice(0, 300) : null,
          wallet_address: wallet_address ? String(wallet_address).slice(0, 44) : null,
          status: "pending",
          points_awarded: 0,
        },
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: "db-error", details: error });

    return res.status(200).json({ ok: true, submission: data, submissions_count: (existingCount ?? 0) + 1 });
  } catch (e) {
    return res.status(500).json({ error: "server-error", message: e?.message });
  }
}