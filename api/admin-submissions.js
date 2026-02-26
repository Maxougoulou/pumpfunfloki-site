import { supabaseAdmin } from "./_supabase.js";
import { requireAdmin } from "./_session.js";

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

    const { data, error } = await db
      .from("submissions")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, row: data });
  }

  return res.status(405).json({ error: "method-not-allowed" });
}