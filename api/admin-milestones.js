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
 *     airdrop_amount_per_wallet NUMERIC,
 *     airdrop_top_n INT DEFAULT 0,
 *     sort_order INT DEFAULT 0,
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE milestones ADD COLUMN IF NOT EXISTS airdrop_amount_per_wallet NUMERIC;
 *   ALTER TABLE milestones ADD COLUMN IF NOT EXISTS airdrop_top_n INT DEFAULT 0;
 *   ALTER TABLE quests ADD COLUMN IF NOT EXISTS milestone_id TEXT;
 */

import { requireAdmin } from "./_session.js";
import { supabaseAdmin } from "./_supabase.js";
import { tgNotify } from "./_telegram.js";

export default async function handler(req, res) {
  const db = supabaseAdmin();

  // ── GET — public read (no auth required) ───────────────────────
  if (req.method === "GET") {
    const { data, error } = await db
      .from("milestones")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ data });
  }

  // All write operations require admin
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  // ── POST ?action=notify — send TG announcement ──────────────────
  if (req.method === "POST" && req.query?.action === "notify") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "missing-id" });

    const { data: m, error } = await db.from("milestones").select("*").eq("id", String(id)).single();
    if (error || !m) return res.status(404).json({ error: "not-found" });

    const SEP = "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄";
    let actionLine = "";
    if (m.action === "burn" && m.burn_amount) {
      actionLine = `🔥 Burn: <b>${Number(m.burn_amount).toLocaleString()} $PFF</b>\n`;
    } else if (m.action === "airdrop" && m.airdrop_amount_per_wallet) {
      actionLine = `🪓 Airdrop: <b>${Number(m.airdrop_amount_per_wallet).toLocaleString()} $PFF</b> × top <b>${m.airdrop_top_n || "?"}</b> Vikings\n`;
    }

    await tgNotify(
      `🏆 <b>Milestone Reached!</b>\n` +
      `${SEP}\n` +
      `⚔️ <b>${m.label}</b>\n` +
      (m.description ? `<i>${m.description}</i>\n` : ``) +
      `${SEP}\n` +
      `🎯 Reward: <b>${m.reward || "TBD"}</b>\n` +
      actionLine +
      `${SEP}\n` +
      `🌐 <a href="https://pumpfunfloki.com/swarm">pumpfunfloki.com/swarm</a>`
    );

    return res.status(200).json({ ok: true });
  }

  // ── POST — create ───────────────────────────────────────────────
  if (req.method === "POST") {
    const {
      id, label, description, detail, metric, target, current, unit,
      reward, action, burn_amount, airdrop_amount_per_wallet, airdrop_top_n, sort_order,
    } = req.body || {};
    if (!id || !label) return res.status(400).json({ error: "missing-fields" });

    const { data, error } = await db.from("milestones").insert([{
      id: String(id).slice(0, 32),
      label: String(label).slice(0, 120),
      description: description ? String(description).slice(0, 400) : null,
      detail: detail ? String(detail).slice(0, 1000) : null,
      metric: metric ? String(metric).slice(0, 60) : null,
      target: Number(target) || 0,
      current: Number(current) || 0,
      unit: unit !== undefined ? String(unit).slice(0, 20) : "",
      reward: reward ? String(reward).slice(0, 120) : null,
      action: action ? String(action).slice(0, 30) : "custom",
      burn_amount: burn_amount ? Number(burn_amount) : null,
      airdrop_amount_per_wallet: airdrop_amount_per_wallet ? Number(airdrop_amount_per_wallet) : null,
      airdrop_top_n: airdrop_top_n ? Number(airdrop_top_n) : 0,
      sort_order: Number(sort_order) || 0,
    }]).select().single();

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, row: data });
  }

  // ── PATCH — update ──────────────────────────────────────────────
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
    if (fields.airdrop_amount_per_wallet !== undefined) patch.airdrop_amount_per_wallet = fields.airdrop_amount_per_wallet ? Number(fields.airdrop_amount_per_wallet) : null;
    if (fields.airdrop_top_n !== undefined) patch.airdrop_top_n = fields.airdrop_top_n ? Number(fields.airdrop_top_n) : 0;
    if (fields.sort_order !== undefined) patch.sort_order = Number(fields.sort_order) || 0;

    const { data, error } = await db.from("milestones").update(patch).eq("id", String(id)).select().single();
    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, row: data });
  }

  // ── DELETE ──────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "missing-id" });
    const { error } = await db.from("milestones").delete().eq("id", String(id));
    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "method-not-allowed" });
}
