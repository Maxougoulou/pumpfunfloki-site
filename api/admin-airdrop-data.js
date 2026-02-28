import { supabaseAdmin } from "./_supabase.js";
import { requireAdmin } from "./_session.js";

/**
 * GET /api/admin-airdrop-data
 * Returns leaderboard ranked by points, with latest wallet_address per handle.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method-not-allowed" });

  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const db = supabaseAdmin();

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

  // Latest wallet per handle (case-insensitive)
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
