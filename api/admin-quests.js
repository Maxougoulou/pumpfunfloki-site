import { supabaseAdmin } from "./_supabase.js";
import { requireAdmin } from "./_session.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "unauthorized" });

  const db = supabaseAdmin();

  // LIST — or generate AI quest ideas
  if (req.method === "GET") {
    // ?action=generate — call OpenAI and return 5 quest suggestions
    if (req.query?.action === "generate") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "no-openai-key" });

      // Fetch existing quest titles so the AI avoids repeating them
      const { data: existingQuests } = await db.from("quests").select("title").limit(200);
      const existingTitles = (existingQuests || []).map((q) => `- ${q.title}`).join("\n");
      const avoidSection = existingTitles
        ? `\n\nALREADY EXISTING QUESTS (do NOT reproduce or closely paraphrase any of these):\n${existingTitles}`
        : "";

      const prompt = `Generate 5 varied $PFF community quests for the PumpFunFloki Viking meme coin on Solana. Mix difficulties and types. Each quest must be fun, on-brand (Viking spirit, $PFF, Solana, community energy), and motivate people to post on X or create content.

Return a JSON object: { "quests": [ ...5 items... ] }
Each item must have exactly these fields:
- title: string (max 80 chars, engaging and specific)
- description: string (150-280 chars, clear step-by-step instructions for the user)
- type: one of "raid" (X post/retweet activity), "art" (meme/creative), "lore" (narrative/writing), "oracle" (prediction/market analysis)
- difficulty: one of "easy", "medium", "hard"
- proof_type: one of "link" (X post URL), "image" (screenshot/image upload), "text" (text answer)
- reward: string (max 60 chars, ex: "PFF Raider badge + airdrop entry")
- points: integer (easy: 10-15, medium: 16-25, hard: 26-40)
- time_window: string (ex: "48h sprint", "This week", "3-day raid")

Make them varied: at least 1 art quest, 1 raid quest, 1 lore quest. Mix easy/medium/hard.${avoidSection}`;

      const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a quest designer for $PFF (PumpFunFloki), a Viking-themed meme coin community. You create short, fun, specific community quests. Always return valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 1800,
          temperature: 0.92,
        }),
      });

      if (!oaiRes.ok) {
        const txt = await oaiRes.text();
        return res.status(500).json({ error: "openai-error", details: txt });
      }

      const oaiData = await oaiRes.json();
      const raw = oaiData.choices?.[0]?.message?.content || "{}";
      let quests;
      try {
        quests = JSON.parse(raw).quests || [];
      } catch {
        return res.status(500).json({ error: "parse-error", raw });
      }

      return res.status(200).json({ quests });
    }

    const { data, error } = await db
      .from("quests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ data });
  }

  // CREATE
  if (req.method === "POST") {
    const {
      id,
      title,
      description,
      type,
      difficulty,
      reward,
      proof_type,
      time_window,
      status,
      points,
      expires_at,
      milestone_id,
    } = req.body || {};

    if (!id || !title) return res.status(400).json({ error: "missing-fields" });

    const { data, error } = await db
      .from("quests")
      .insert([
        {
          id: String(id).slice(0, 32),
          title: String(title).slice(0, 160),
          description: description ? String(description).slice(0, 800) : null,
          type: type ? String(type).slice(0, 40) : null,
          difficulty: difficulty ? String(difficulty).slice(0, 20) : null,
          reward: reward ? String(reward).slice(0, 120) : null,
          proof_type: proof_type ? String(proof_type).slice(0, 20) : null,
          time_window: time_window ? String(time_window).slice(0, 80) : null,
          status: status ? String(status).slice(0, 20) : "LIVE",
          points: Number.isFinite(Number(points)) ? Number(points) : 0,
          expires_at: expires_at ? new Date(expires_at).toISOString() : null,
          milestone_id: milestone_id ? String(milestone_id).slice(0, 32) : null,
        },
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, row: data });
  }

  // UPDATE
  if (req.method === "PATCH") {
    const {
      id,
      title,
      description,
      type,
      difficulty,
      reward,
      proof_type,
      time_window,
      status,
      points,
      expires_at,
    } = req.body || {};

    if (!id) return res.status(400).json({ error: "missing-id" });

    const patch = {};
    if (title !== undefined) patch.title = title ? String(title).slice(0, 160) : null;
    if (description !== undefined) patch.description = description ? String(description).slice(0, 800) : null;
    if (type !== undefined) patch.type = type ? String(type).slice(0, 40) : null;
    if (difficulty !== undefined) patch.difficulty = difficulty ? String(difficulty).slice(0, 20) : null;
    if (reward !== undefined) patch.reward = reward ? String(reward).slice(0, 120) : null;
    if (proof_type !== undefined) patch.proof_type = proof_type ? String(proof_type).slice(0, 20) : null;
    if (time_window !== undefined) patch.time_window = time_window ? String(time_window).slice(0, 80) : null;
    if (status !== undefined) patch.status = status ? String(status).slice(0, 20) : null;
    if (points !== undefined) patch.points = Number.isFinite(Number(points)) ? Number(points) : 0;
    if (expires_at !== undefined) patch.expires_at = expires_at ? new Date(expires_at).toISOString() : null;
    if (req.body?.milestone_id !== undefined) patch.milestone_id = req.body.milestone_id ? String(req.body.milestone_id).slice(0, 32) : null;

    const { data, error } = await db
      .from("quests")
      .update(patch)
      .eq("id", String(id))
      .select()
      .single();

    if (error) return res.status(500).json({ error: "db-error", details: error });
    return res.status(200).json({ ok: true, row: data });
  }

  // DELETE
  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "missing-id" });

    const { error } = await db.from("quests").delete().eq("id", String(id));
    if (error) return res.status(500).json({ error: "db-error", details: error });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "method-not-allowed" });
}