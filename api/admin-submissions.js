import { supabaseAdmin } from "./_supabase.js";
import { requireAdmin } from "./_session.js";
import { tgNotify } from "./_telegram.js";
import { getSolanaConnection, getRewardsKeypair, getPffMint, toRawAmount } from "./_solana.js";
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";


export default async function handler(req, res) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const db = supabaseAdmin();

  if (req.method === "GET") {
    // ?view=airdrop — leaderboard + latest wallet per handle
    if (req.query?.view === "airdrop") {
      const [{ data: lb, error: e1 }, { data: subs, error: e2 }] = await Promise.all([
        db.from("leaderboard").select("pseudo, points").order("points", { ascending: false }),
        db
          .from("submissions")
          .select("handle, wallet_address, created_at")
          .not("wallet_address", "is", null)
          .neq("wallet_address", "")
          .eq("status", "approved")
          .order("created_at", { ascending: false }),
      ]);
      if (e1 || e2) return res.status(500).json({ error: "db-error", details: e1 || e2 });
      const walletMap = {};
      for (const s of subs || []) {
        const key = s.handle.toLowerCase();
        if (!walletMap[key]) walletMap[key] = s.wallet_address;
      }
      const data = (lb || []).map((r, i) => ({
        rank: i + 1,
        handle: r.pseudo,
        points: Number(r.points || 0),
        wallet: walletMap[r.pseudo.toLowerCase()] || null,
      }));
      return res.status(200).json({ data });
    }

    const status = (req.query?.status || "pending").toString();
    const { data, error } = await db
      .from("submissions")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ data });
  }

  if (req.method === "PATCH") {
    const { id, status } = req.body || {};
    if (!id || !["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "bad-payload" });
    }

    // Fetch current submission (needed to get quest_id, handle, prevent double-credit)
    const { data: existing, error: e1 } = await db
      .from("submissions")
      .select("id, status, handle, quest_id, points_awarded, wallet_address")
      .eq("id", id)
      .single();

    if (e1) return res.status(500).json({ error: "db-error", details: e1 });
    if (!existing) return res.status(404).json({ error: "not-found" });

    // If already approved and we're approving again, do nothing (avoid double points)
    if (existing.status === "approved" && status === "approved") {
      return res.status(200).json({ ok: true, row: existing, note: "already-approved" });
    }

    // If approving: fetch quest points and credit leaderboard
    if (status === "approved") {
      // Get points from the quest definition
      const { data: quest } = await db
        .from("quests")
        .select("points, fixed_reward_amount, fixed_reward_token")
        .eq("id", existing.quest_id)
        .maybeSingle();
      const pts = Math.max(0, Math.round(Number(quest?.points) || 0));

      // 1) update submission (status + points_awarded)
      const { data: updated, error: e2 } = await db
        .from("submissions")
        .update({ status: "approved", points_awarded: pts })
        .eq("id", id)
        .select()
        .single();

      if (e2) return res.status(500).json({ error: "db-error", details: e2 });

      // 2) credit leaderboard
      const pseudo = String(existing.handle || "").slice(0, 80);
      if (pseudo) {
        const { data: lb, error: e3 } = await db
          .from("leaderboard")
          .select("id, pseudo, points")
          .eq("pseudo", pseudo)
          .maybeSingle();

        if (e3) return res.status(500).json({ error: "db-error", details: e3 });

        if (!lb) {
          const { error: e4 } = await db
            .from("leaderboard")
            .insert([{ pseudo, points: pts, last_update: new Date().toISOString() }]);
          if (e4) return res.status(500).json({ error: "db-error", details: e4 });
        } else {
          const nextPoints = Number(lb.points || 0) + pts;
          const { error: e5 } = await db
            .from("leaderboard")
            .update({ points: nextPoints, last_update: new Date().toISOString() })
            .eq("id", lb.id);
          if (e5) return res.status(500).json({ error: "db-error", details: e5 });
        }
      }

      // Check if a milestone was just reached (reads from DB milestones with metric="Submission Count")
      const [{ count: newCount }, { data: dbMilestones }] = await Promise.all([
        db.from("submissions").select("id", { count: "exact", head: true }).eq("status", "approved"),
        db.from("milestones").select("*").eq("metric", "Submission Count"),
      ]);
      const milestone = (dbMilestones || []).find((m) => Number(m.target) === newCount);
      if (milestone) {
        const SEP = "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄";
        let actionLine = "";
        if (milestone.action === "burn" && milestone.burn_amount) {
          actionLine = `🔥 Trigger: Burn <b>${Number(milestone.burn_amount).toLocaleString()} $PFF</b>\n`;
        } else if (milestone.action === "airdrop" && milestone.airdrop_amount_per_wallet) {
          actionLine = `🪓 Trigger: Airdrop <b>${Number(milestone.airdrop_amount_per_wallet).toLocaleString()} $PFF</b> × top <b>${milestone.airdrop_top_n || "?"}</b>\n`;
        }
        await tgNotify(
          `🏆 <b>Milestone Reached!</b>\n` +
          `${SEP}\n` +
          `⚔️ <b>${milestone.label}</b>\n` +
          (milestone.description ? `<i>${milestone.description}</i>\n` : ``) +
          `📊 <b>${newCount} quests</b> completed by the Horde\n` +
          `🎯 Reward: <b>${milestone.reward || "TBD"}</b>\n` +
          actionLine +
          `${SEP}\n` +
          `🌐 <a href="https://pumpfunfloki.com/horde-engine">pumpfunfloki.com/horde-engine</a>`
        );
      }

      // 4) Auto-send fixed reward if quest defines one and submission has a wallet
      const rewardAmount = Number(quest?.fixed_reward_amount || 0);
      const rewardToken = quest?.fixed_reward_token === "sol" ? "sol" : "pff";
      const recipientWallet = existing.wallet_address;

      let rewardTx = null;
      if (rewardAmount > 0 && recipientWallet) {
        try {
          const connection = getSolanaConnection();
          const payer = getRewardsKeypair();
          const recipientPubkey = new PublicKey(recipientWallet);

          if (rewardToken === "sol") {
            const lamports = Math.round(rewardAmount * 1e9);
            const tx = new Transaction().add(
              SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipientPubkey, lamports })
            );
            rewardTx = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "processed" });
          } else {
            const mint = getPffMint();
            const rawAmount = toRawAmount(rewardAmount);
            const sourceAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
            const recipientAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipientPubkey);
            const tx = new Transaction().add(
              createTransferInstruction(sourceAta.address, recipientAta.address, payer.publicKey, rawAmount, [], TOKEN_PROGRAM_ID)
            );
            rewardTx = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "processed" });
          }

          if (rewardTx) {
            await db.from("submissions").update({ airdrop_tx: rewardTx, airdrop_amount: rewardAmount }).eq("id", id);
          }
        } catch (rewardErr) {
          console.error("[auto-reward]", rewardErr?.message);
          // Don't block approval — log and continue
        }
      }

      // 5) Notify TG group to vote for this submission
      const SEP = "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄";
      await tgNotify(
        `✅ <b>Submission Approved!</b>\n` +
        `${SEP}\n` +
        `🗡️ <b>${existing.handle}</b>\n` +
        (updated.quest_title ? `📜 ${updated.quest_title}\n` : ``) +
        `⚡ +${pts} pts\n` +
        `${SEP}\n` +
        `🌐 <a href="https://pumpfunfloki.com/horde-engine">pumpfunfloki.com/horde-engine</a>`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: "🗡️ Vote", callback_data: `vote:${updated.id}` },
            ]],
          },
        }
      );

      return res.status(200).json({ ok: true, row: updated, points_awarded: pts, reward_tx: rewardTx });
    }

    // If NOT approving: just update status (and keep points_awarded as-is)
    const { data: row, error: e6 } = await db
      .from("submissions")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (e6) return res.status(500).json({ error: "db-error", details: e6 });
    return res.status(200).json({ ok: true, row });
  }

  return res.status(405).json({ error: "method-not-allowed" });
}