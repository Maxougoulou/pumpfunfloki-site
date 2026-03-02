import { supabaseAdmin } from "./_supabase.js";
import { verifyRecaptcha } from "./_recaptcha.js";

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
      .select("vote_count")
      .eq("id", String(submission_id))
      .single();

    const newCount = (Number(sub?.vote_count) || 0) + 1;
    await db.from("submissions").update({ vote_count: newCount }).eq("id", String(submission_id));

    return res.status(200).json({ ok: true, vote_count: newCount });
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

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("submissions")
      .insert([
        {
          quest_id: String(quest_id),
          quest_title: quest_title ? String(quest_title).slice(0, 140) : null,
          type: type ? String(type).slice(0, 40) : null,
          difficulty: difficulty ? String(difficulty).slice(0, 40) : null,
          handle: String(handle).slice(0, 80),
          proof: String(proof).slice(0, 2000),
          note: note ? String(note).slice(0, 300) : null,
          wallet_address: wallet_address ? String(wallet_address).slice(0, 44) : null,
          status: "pending",
          points_awarded: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "already-submitted", message: "You already submitted this quest with this handle." });
      }
      return res.status(500).json({ error: "db-error", details: error });
    }

    return res.status(200).json({ ok: true, submission: data });
  } catch (e) {
    return res.status(500).json({ error: "server-error", message: e?.message });
  }
}