/**
 * /api/admin-milestones — CRUD for public milestone cards
 *
 * SQL to run in Supabase:
 *   CREATE TABLE IF NOT EXISTS milestones (
 *     id TEXT PRIMARY KEY,
 *     label TEXT NOT NULL,
 *     description TEXT,
 *     detail TEXT,
 *     metric TEXT,
 *     target NUMERIC DEFAULT 0,
 *     current NUMERIC DEFAULT 0,
 *     unit TEXT DEFAULT '',
 *     reward TEXT,
 *     action TEXT DEFAULT 'custom',
 *     burn_amount NUMERIC,
 *     sort_order INT DEFAULT 0,
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE quests ADD COLUMN IF NOT EXISTS milestone_id TEXT;
 */

import { requireAdmin } from "./_session.js";
import { supabaseAdmin } from "./_supabase.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const db = supabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await db
      .from("milestones")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ data });
  }

  if (req.method === "POST") {
    const { id, label, description, detail, metric, target, current, unit, reward, action, burn_amount, sort_order } = req.body || {};
    if (!id || !label) return res.status(400).json({ error: "missing-fields" });

    const { data, error } = await db.from("milestones").insert([{
      id: String(id).slice(0, 32),
      label: String(label).slice(0, 120),
      description: description ? String(description).slice(0, 400) : null,
      detail: detail ? String(detail).slice(0, 1000) : null,
      metric: metric ? String(metric).slice(0, 60) : null,
      target: Number(target) || 0,
      current: Number(current) || 0,
      unit: unit ? String(unit).slice(0, 20) : "",
      reward: reward ? String(reward).slice(0, 120) : null,
      action: action ? String(action).slice(0, 30) : "custom",
      burn_amount: burn_amount ? Number(burn_amount) : null,
      sort_order: Number(sort_order) || 0,
    }]).select().single();

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, row: data });
  }

  if (req.method === "PATCH") {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ error: "missing-id" });

    const patch = {};
    if (fields.label !== undefined) patch.label = String(fields.label).slice(0, 120);
    if (fields.description !== undefined) patch.description = fields.description ? String(fields.description).slice(0, 400) : null;
    if (fields.detail !== undefined) patch.detail = fields.detail ? String(fields.detail).slice(0, 1000) : null;
    if (fields.metric !== undefined) patch.metric = fields.metric ? String(fields.metric).slice(0, 60) : null;
    if (fields.target !== undefined) patch.target = Number(fields.target) || 0;
    if (fields.current !== undefined) patch.current = Number(fields.current) || 0;
    if (fields.unit !== undefined) patch.unit = String(fields.unit || "").slice(0, 20);
    if (fields.reward !== undefined) patch.reward = fields.reward ? String(fields.reward).slice(0, 120) : null;
    if (fields.action !== undefined) patch.action = String(fields.action).slice(0, 30);
    if (fields.burn_amount !== undefined) patch.burn_amount = fields.burn_amount ? Number(fields.burn_amount) : null;
    if (fields.sort_order !== undefined) patch.sort_order = Number(fields.sort_order) || 0;

    const { data, error } = await db.from("milestones").update(patch).eq("id", String(id)).select().single();
    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, row: data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "missing-id" });
    const { error } = await db.from("milestones").delete().eq("id", String(id));
    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "method-not-allowed" });
}
