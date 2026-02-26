import { supabaseAdmin } from "./_supabase.js";
import { requireAdmin } from "./_session.js";

function computePoints(type, difficulty) {
  const base = { raid: 10, art: 15, lore: 8, oracle: 12 };
  const mult = { easy: 1, medium: 1.5, hard: 2 };

  const b = Number(base[String(type || "").toLowerCase()] ?? 0);
  const m = Number(mult[String(difficulty || "").toLowerCase()] ?? 1);

  return Math.round(b * m);
}

export default async function handler(req, res) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const db = supabaseAdmin();

  if (req.method === "GET") {
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

    // Always fetch current row first (needed to compute points & prevent double-credit)
    const { data: existing, error: e1 } = await db
      .from("submissions")
      .select("id, status, handle, type, difficulty, points_awarded")
      .eq("id", id)
      .single();

    if (e1) return res.status(500).json({ error: "db-error", details: e1 });
    if (!existing) return res.status(404).json({ error: "not-found" });

    // If already approved and we're approving again, do nothing (avoid double points)
    if (existing.status === "approved" && status === "approved") {
      return res.status(200).json({ ok: true, row: existing, note: "already-approved" });
    }

    // If approving: compute points and credit leaderboard
    if (status === "approved") {
      const pts = computePoints(existing.type, existing.difficulty);

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

      return res.status(200).json({ ok: true, row: updated, points_awarded: pts });
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