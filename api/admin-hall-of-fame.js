import { supabaseAdmin } from "./_supabase.js";
import { requireAdmin } from "./_session.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const db = supabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await db
      .from("hall_of_fame")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ data });
  }

  if (req.method === "POST") {
    const { name, x_handle, display_order } = req.body || {};
    if (!name) return res.status(400).json({ error: "missing-name" });
    const { data, error } = await db
      .from("hall_of_fame")
      .insert([{ name: String(name).slice(0, 80), x_handle: x_handle ? String(x_handle).replace(/^@/, "").slice(0, 80) : null, display_order: Number(display_order) || 0 }])
      .select().single();
    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, data });
  }

  if (req.method === "PATCH") {
    const { id, name, x_handle, display_order } = req.body || {};
    if (!id) return res.status(400).json({ error: "missing-id" });
    const patch = {};
    if (name !== undefined) patch.name = String(name).slice(0, 80);
    if (x_handle !== undefined) patch.x_handle = String(x_handle).replace(/^@/, "").slice(0, 80);
    if (display_order !== undefined) patch.display_order = Number(display_order);
    const { data, error } = await db.from("hall_of_fame").update(patch).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "missing-id" });
    const { error } = await db.from("hall_of_fame").delete().eq("id", id);
    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "method-not-allowed" });
}
