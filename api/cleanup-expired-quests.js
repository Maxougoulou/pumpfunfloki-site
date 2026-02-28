import { supabaseAdmin } from "./_supabase.js";

/**
 * Vercel Cron Job — runs hourly (see vercel.json)
 * Deletes quests whose expires_at is in the past.
 *
 * Protected by CRON_SECRET env var — Vercel sets Authorization header automatically.
 */
export default async function handler(req, res) {
  // Allow only Vercel cron calls (or local tests with the secret)
  const auth = req.headers["authorization"] || "";
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("quests")
    .delete()
    .lt("expires_at", now)
    .not("expires_at", "is", null)
    .select("id, title");

  if (error) return res.status(500).json({ error: "db-error", details: error });

  const deleted = data?.length ?? 0;
  console.log(`[cleanup-expired-quests] Deleted ${deleted} expired quests at ${now}`);
  return res.status(200).json({ ok: true, deleted, quests: data });
}
