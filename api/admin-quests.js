import { supabaseAdmin } from "./_supabase.js";
import { requireAdmin } from "./_session.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const db = supabaseAdmin();

  // LIST
  if (req.method === "GET") {
    const { data, error } = await db
      .from("quests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ data });
  }

  // CREATE
  if (req.method === "POST") {
    const {
      id,
      title,
      description,
      type,
      difficulty,
      reward,
      proof_type,
      time_window,
      status,
      points,
      expires_at,
    } = req.body || {};

    if (!id || !title) return res.status(400).json({ error: "missing-fields" });

    const { data, error } = await db
      .from("quests")
      .insert([
        {
          id: String(id).slice(0, 32),
          title: String(title).slice(0, 160),
          description: description ? String(description).slice(0, 800) : null,
          type: type ? String(type).slice(0, 40) : null,
          difficulty: difficulty ? String(difficulty).slice(0, 20) : null,
          reward: reward ? String(reward).slice(0, 120) : null,
          proof_type: proof_type ? String(proof_type).slice(0, 20) : null,
          time_window: time_window ? String(time_window).slice(0, 80) : null,
          status: status ? String(status).slice(0, 20) : "LIVE",
          points: Number.isFinite(Number(points)) ? Number(points) : 0,
          expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        },
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, row: data });
  }

  // UPDATE
  if (req.method === "PATCH") {
    const {
      id,
      title,
      description,
      type,
      difficulty,
      reward,
      proof_type,
      time_window,
      status,
      points,
      expires_at,
    } = req.body || {};

    if (!id) return res.status(400).json({ error: "missing-id" });

    const patch = {};
    if (title !== undefined) patch.title = title ? String(title).slice(0, 160) : null;
    if (description !== undefined) patch.description = description ? String(description).slice(0, 800) : null;
    if (type !== undefined) patch.type = type ? String(type).slice(0, 40) : null;
    if (difficulty !== undefined) patch.difficulty = difficulty ? String(difficulty).slice(0, 20) : null;
    if (reward !== undefined) patch.reward = reward ? String(reward).slice(0, 120) : null;
    if (proof_type !== undefined) patch.proof_type = proof_type ? String(proof_type).slice(0, 20) : null;
    if (time_window !== undefined) patch.time_window = time_window ? String(time_window).slice(0, 80) : null;
    if (status !== undefined) patch.status = status ? String(status).slice(0, 20) : null;
    if (points !== undefined) patch.points = Number.isFinite(Number(points)) ? Number(points) : 0;
    if (expires_at !== undefined) patch.expires_at = expires_at ? new Date(expires_at).toISOString() : null;

    const { data, error } = await db
      .from("quests")
      .update(patch)
      .eq("id", String(id))
      .select()
      .single();

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, row: data });
  }

  // DELETE
  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "missing-id" });

    const { error } = await db.from("quests").delete().eq("id", String(id));
    if (error) return res.status(500).json({ error: "db-error", details: error });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "method-not-allowed" });
}