import { supabaseAdmin } from "./_supabase.js";
import { verifyRecaptcha } from "./_recaptcha.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });

  try {
    const {
      quest_id,
      quest_title,
      type,
      difficulty,
      handle,
      proof,
      note,
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
          status: "pending",
          points_awarded: 0,
        },
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: "db-error", details: error });

    return res.status(200).json({ ok: true, submission: data });
  } catch (e) {
    return res.status(500).json({ error: "server-error", message: e?.message });
  }
}