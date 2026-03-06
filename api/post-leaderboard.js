import { supabaseAdmin } from "./_supabase.js";
import { tgNotify } from "./_telegram.js";

const MEDALS = ["🥇", "🥈", "🥉"];
const TIER_EMOJI = (pts) => {
  if (pts >= 1000) return "👑";
  if (pts >= 500) return "⚔️";
  if (pts >= 100) return "🛡️";
  return "🪖";
};

export default async function handler(req, res) {
  const auth = req.headers["authorization"] || "";
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const db = supabaseAdmin();
  const { data: rows, error } = await db
    .from("leaderboard")
    .select("pseudo, points")
    .order("points", { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: "db-error", details: error });
  if (!rows?.length) return res.status(200).json({ ok: true, skipped: "empty leaderboard" });

  const lines = rows.map((r, i) => {
    const medal = MEDALS[i] ?? `${i + 1}.`;
    const pts = Number(r.points || 0);
    const tier = TIER_EMOJI(pts);
    return `${medal} ${tier} <b>${r.pseudo}</b> — ${pts} pts`;
  });

  const text = [
    `⚔️ <b>HORDE LEADERBOARD</b> ⚔️`,
    ``,
    ...lines,
    ``,
    `🏹 Complete quests to climb the ranks!`,
    `👉 pumpfunfloki.com/horde-engine`,
  ].join("\n");

  await tgNotify(text);

  console.log(`[post-leaderboard] Posted leaderboard (${rows.length} rows)`);
  return res.status(200).json({ ok: true, posted: rows.length });
}
