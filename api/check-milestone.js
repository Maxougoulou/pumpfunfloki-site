/**
 * GET /api/check-milestone
 *
 * Returns current approved submission count and milestone status.
 * Milestones are defined in MILESTONES below — edit to match your roadmap.
 *
 * Query params:
 *   quest_id (optional) — filter count to a specific quest
 *
 * Returns:
 *   { ok, count, milestones: [{ id, label, threshold, action, hit, progress, current_count, burn_amount }] }
 */

import { requireAdmin } from "./_session.js";
import { supabaseAdmin } from "./_supabase.js";

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE DEFINITIONS
// Edit this array to define your milestones.
//   threshold:   number of approved submissions needed to trigger
//   action:      "burn" | "buyback" | "raid" | "custom"
//   burn_amount: for "burn" actions — $PFF to destroy (human-readable)
//   quest_id:    null = global count; "Q-0001" = only that quest's count
// ─────────────────────────────────────────────────────────────────────────────
const MILESTONES = [
  {
    id: "m25",
    label: "25 Approved — First Strike",
    threshold: 25,
    quest_id: null,
    action: "burn",
    burn_amount: 100_000,
    description: "First oracle trigger. Burn 100K $PFF.",
  },
  {
    id: "m50",
    label: "50 Approved — Horde Awakens",
    threshold: 50,
    quest_id: null,
    action: "burn",
    burn_amount: 500_000,
    description: "Mass validation achieved. Burn 500K $PFF + community lore post.",
  },
  {
    id: "m100",
    label: "100 Approved — Valhalla Gate",
    threshold: 100,
    quest_id: null,
    action: "buyback",
    burn_amount: null,
    description: "100 valid submissions — trigger buyback. Budget: admin-determined.",
  },
  {
    id: "m200",
    label: "200 Approved — Ragnarok",
    threshold: 200,
    quest_id: null,
    action: "burn",
    burn_amount: 2_000_000,
    description: "Full mobilization. Burn 2M $PFF. Massive raid.",
  },
];

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "method-not-allowed" });

  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const db = supabaseAdmin();
  const questId = req.query?.quest_id || null;

  // ── Count approved submissions ──────────────────────────────────
  let query = db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  if (questId) query = query.eq("quest_id", questId);

  const { count, error } = await query;
  if (error) return res.status(500).json({ error: "db-error", details: error });

  // ── Map milestones against current count ───────────────────────
  const enriched = MILESTONES
    .filter((m) => (questId ? m.quest_id === questId || m.quest_id === null : true))
    .map((m) => ({
      ...m,
      hit: (count ?? 0) >= m.threshold,
      progress: Math.min(100, Math.round(((count ?? 0) / m.threshold) * 100)),
      current_count: count ?? 0,
      remaining: Math.max(0, m.threshold - (count ?? 0)),
    }));

  return res.status(200).json({
    ok: true,
    count: count ?? 0,
    quest_id: questId,
    milestones: enriched,
  });
}
