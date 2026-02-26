import { supabaseAdmin } from "./_supabase.js";
import { requireAdmin } from "./_session.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const db = supabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await db
      .from("execution_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ data });
  }

  if (req.method === "POST") {
    const { title, description, proof_link, type } = req.body || {};
    if (!title) return res.status(400).json({ error: "missing-title" });

    const { data, error } = await db
      .from("execution_logs")
      .insert([
        {
          title: String(title).slice(0, 120),
          description: description ? String(description).slice(0, 2000) : null,
          proof_link: proof_link ? String(proof_link).slice(0, 300) : null,
          type: ["buyback", "burn", "event"].includes(type) ? type : "event",
        },
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, row: data });
  }

  return res.status(405).json({ error: "method-not-allowed" });
}