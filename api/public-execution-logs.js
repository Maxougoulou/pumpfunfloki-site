import { supabaseAdmin } from "./_supabase.js";

export default async function handler(req, res) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("execution_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: "db-error", details: error });
  return res.status(200).json({ data });
}