import { supabaseAdmin } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method-not-allowed" });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("hall_of_fame")
    .select("id, name, x_handle, display_order")
    .order("display_order", { ascending: true });

  if (error) return res.status(500).json({ error: "db-error", details: error });
  return res.status(200).json({ data });
}
