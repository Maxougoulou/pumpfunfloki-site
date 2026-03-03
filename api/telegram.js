import { supabaseAdmin } from "./_supabase.js";
import { requireAdmin } from "./_session.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CONTRACT = "DPgo26tLZXdNfB24ahP2LTXsxSPxvxPq7takvavppump";

async function tgSend(chatId, text, extra = {}) {
  if (!TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra }),
  });
}

function tier(pts) {
  if (pts >= 1000) return "⚔️ War Chief";
  if (pts >= 500)  return "🛡️ Berserker";
  if (pts >= 100)  return "🪖 Shield Bearer";
  return "🪓 Recruit";
}

export default async function handler(req, res) {
  if (!TOKEN) return res.status(500).json({ error: "missing-token" });

  // ── Admin: broadcast announcement ─────────────────────────────────
  if (req.method === "POST" && req.body?.action === "announce") {
    if (!requireAdmin(req)) return res.status(401).json({ error: "unauthorized" });
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "missing-text" });
    await tgSend(CHAT_ID, text.trim());
    return res.status(200).json({ ok: true });
  }

  // ── Admin: Oracle scan — Grok searches X live ─────────────────────
  if (req.method === "POST" && req.body?.action === "oracle-scan") {
    if (!requireAdmin(req)) return res.status(401).json({ error: "unauthorized" });

    const xaiKey = process.env.XAI_API_KEY;
    if (!xaiKey) return res.status(500).json({ error: "missing-xai-key" });

    const r = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${xaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3-beta",
        stream: false,
        search_parameters: {
          mode: "on",
          sources: [{ type: "x" }],
          return_citations: true,
        },
        messages: [
          {
            role: "system",
            content: "You are a Crypto Twitter intelligence agent. Your job is to scan X (Twitter) right now and identify high-value engagement opportunities for a Solana meme coin account. Return ONLY valid JSON, no explanation.",
          },
          {
            role: "user",
            content: `Search X right now and return a JSON object with this exact structure:
{
  "sentiment": "bullish" | "bearish" | "chaotic",
  "sentiment_reason": "one sentence explaining CT vibe right now",
  "trending_topics": ["topic1", "topic2", "topic3"],
  "viral_tweets": [
    {
      "author": "@handle",
      "text": "exact tweet text",
      "why": "why this is a good raid target (chaotic, viral, relevant to meme coins/Solana/CT culture)",
      "url": "tweet URL if available"
    }
  ]
}

Focus on: Solana ecosystem, meme coins, crypto culture tweets, viral CT drama, big KOL posts. Find 4-5 viral tweets worth replying to. Only return the JSON object.`,
          },
        ],
      }),
    });

    const j = await r.json();
    if (!r.ok) return res.status(500).json({ error: "grok-error", detail: j?.error?.message || j });

    const raw = j?.choices?.[0]?.message?.content || "";
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "grok-parse-error", raw });

    try {
      const data = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ ok: true, ...data });
    } catch {
      return res.status(500).json({ error: "grok-parse-error", raw });
    }
  }

  // ── Admin: PFF Oracle — generate X content via Claude ─────────────
  if (req.method === "POST" && req.body?.action === "oracle") {
    if (!requireAdmin(req)) return res.status(401).json({ error: "unauthorized" });
    const { mode, target_tweet, signal } = req.body;
    if (!mode) return res.status(400).json({ error: "missing-mode" });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "missing-anthropic-key" });

    // ── 1. Fetch live market intelligence in parallel ──────────────
    const to = (ms) => AbortSignal.timeout(ms);
    const [dexRes, geckoRes, globalRes] = await Promise.allSettled([
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${CONTRACT}`, { signal: to(4000) }).then(r => r.json()),
      fetch("https://api.coingecko.com/api/v3/search/trending", { signal: to(4000) }).then(r => r.json()),
      fetch("https://api.coingecko.com/api/v3/global", { signal: to(4000) }).then(r => r.json()),
    ]);

    const liveLines = [];

    // $PFF market
    try {
      const pair = dexRes.value?.pairs?.[0];
      if (pair) {
        const ch = Number(pair.priceChange?.h24 || 0);
        const dir = ch > 5 ? "strong bullish surge" : ch > 0 ? "slight upward drift" : ch < -10 ? "heavy sell pressure" : ch < 0 ? "slight dip" : "flat";
        liveLines.push(`$PFF market energy right now: ${dir} (${ch > 0 ? "+" : ""}${ch.toFixed(1)}% 24h), vol $${Math.round(pair.volume?.h24 || 0).toLocaleString()}`);
      }
    } catch {}

    // CoinGecko trending coins
    try {
      const trending = geckoRes.value?.coins?.slice(0, 6).map(c => c.item?.name).filter(Boolean) || [];
      if (trending.length) liveLines.push(`Trending coins on crypto Twitter right now: ${trending.join(", ")}`);
    } catch {}

    // Global market sentiment
    try {
      const g = globalRes.value?.data;
      if (g) {
        const btcDom = Number(g.market_cap_percentage?.btc || 0).toFixed(1);
        const totalMcap = g.total_market_cap?.usd ? `$${(g.total_market_cap.usd / 1e12).toFixed(2)}T` : null;
        const chg = Number(g.market_cap_change_percentage_24h_usd || 0);
        liveLines.push(`Global crypto: ${totalMcap ? `total mcap ${totalMcap}, ` : ""}${chg > 0 ? "+" : ""}${chg.toFixed(1)}% 24h, BTC dominance ${btcDom}%`);
      }
    } catch {}

    const liveContext = liveLines.length
      ? `\n\nLIVE MARKET INTELLIGENCE (fetched right now — use to calibrate tone and energy, never cite numbers directly):\n${liveLines.join("\n")}`
      : "";

    const userContext = [];
    if (target_tweet) userContext.push(`Tweet cible à répondre : "${target_tweet}"`);
    if (signal) userContext.push(`Signal caché à infuser subtilement : ${signal}`);
    const manualCtx = userContext.length ? `\n\nCONTEXTE ADMIN :\n${userContext.join("\n")}` : "";

    // ── 2. Build system prompt ──────────────────────────────────────
    const SYSTEM = `Tu es le PFF Oracle — la voix officielle de $PFF (PumpFunFloki) sur X (Twitter).
Tu reçois des données de marché live. Tu les analyses, tu ressens l'énergie du moment, et tu génères du contenu qui résonne avec ce qui se passe MAINTENANT dans le marché crypto — sans jamais citer de chiffres ni de prix.

LOIS DE VOIX — INVIOLABLES :
1. JAMAIS mention du prix, market cap, ou conseil financier
2. JAMAIS sonner comme un compte marketing ou un bot
3. 1 à 3 lignes MAXIMUM par tweet — moins c'est plus
4. Parler en métaphore Viking, imagerie de bataille, prophétie ancienne — jamais de littéral
5. Ton : féroce, malicieux, intrépide, cryptique, occasionnellement chaotique
6. Maximum 1 hashtag si vraiment essentiel. Ne pas mettre $PFF dans chaque post.
7. Le Viking est éternel. PFF est un raid, un mouvement, une Horde — pas juste un token.
8. Pas de ponctuation excessive. Pas d'emojis forcés. Chaque mot compte.
9. Utilise l'énergie du marché pour calibrer le ton — marché rouge = combativité et résilience, vert = conquête et momentum. Jamais de façon littérale.

MODES :
- PROPHECY : Tweet oraculaire cryptique. Ex: "The tide does not ask permission. Neither does the Horde."
- VIKING DROP : Annonce d'un drop à un membre. Utiliser [TAG_USER] comme placeholder. Ex: "This warrior spoke the old tongue. The blessing finds its mark. [TAG_USER]"
- BURN RITUAL : Annonce de burn. Offrande sacrée Viking, pas un événement tokenomics. Ex: "Another offering to the fire. The cycle does not negotiate."
- RAID REPLY : Réponse percutante à un tweet spécifique. Un fantôme Viking surgit dans un thread moderne.

FORMAT : Génère exactement 3 variantes séparées par ---
Sans label, sans guillemets, sans préambule. Juste les 3 variantes brutes.`;

    const userMsg = `MODE : ${mode}${liveContext}${manualCtx}

Analyse l'énergie du marché et génère 3 variantes adaptées au moment présent.`;

    // ── 3. Call Claude ──────────────────────────────────────────────
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    const j = await r.json();
    if (!r.ok) return res.status(500).json({ error: "claude-error", detail: j?.error?.message || j });

    const raw = j?.content?.[0]?.text || "";
    const variants = raw.split(/\n?---\n?/).map((v) => v.trim()).filter(Boolean).slice(0, 3);
    return res.status(200).json({ ok: true, variants, live_context: liveLines });
  }

  // ── Telegram webhook ───────────────────────────────────────────────
  if (req.method === "POST") {
    const update = req.body;

    // ── Inline button callback (vote) ────────────────────────────────
    const cbq = update?.callback_query;
    if (cbq) {
      const data = cbq.data || "";
      const db = supabaseAdmin();

      if (data.startsWith("vote:")) {
        const submissionId = data.slice(5);
        const voterHandle = `tg_${cbq.from.id}`;

        const { error: voteErr } = await db
          .from("votes")
          .insert([{ submission_id: submissionId, voter_handle: voterHandle }]);

        let toast;
        if (voteErr?.code === "23505") {
          toast = "⚠️ Already voted!";
        } else if (voteErr) {
          toast = "❌ Vote failed, try again.";
        } else {
          const { data: sub } = await db
            .from("submissions")
            .select("vote_count, handle")
            .eq("id", submissionId)
            .single();
          const newCount = (Number(sub?.vote_count) || 0) + 1;
          await db.from("submissions").update({ vote_count: newCount }).eq("id", submissionId);
          toast = `🗡️ Voted for ${sub?.handle}! (${newCount} vote${newCount !== 1 ? "s" : ""})`;
        }

        await fetch(`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cbq.id, text: toast, show_alert: true }),
        });
      }

      return res.status(200).json({ ok: true });
    }

    const msg = update?.message || update?.edited_message;
    if (!msg?.text) return res.status(200).json({ ok: true });

    const chatId = msg.chat.id;
    const raw = msg.text.trim();
    // Strip @PFFHordeBot suffix if present
    const full = raw.replace(/@\w+/g, "").trim();
    const [cmd, ...args] = full.split(/\s+/);
    const command = cmd.toLowerCase();
    const db = supabaseAdmin();

    const SEP = "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄";

    // /start  /pffhelp
    if (command === "/start" || command === "/pffhelp") {
      await tgSend(chatId,
        `⚔️ <b>PFF Horde Oracle</b>\n` +
        `<i>The Viking watches. The Horde grows.</i>\n` +
        `${SEP}\n` +
        `🪓 /pffrank &lt;handle&gt;\n` +
        `   Your rank, points &amp; tier\n\n` +
        `🏆 /pfftop\n` +
        `   Top 5 Vikings of the Horde\n\n` +
        `📜 /pffquests\n` +
        `   Active quests &amp; rewards\n\n` +
        `🗳️ /pffvotes\n` +
        `   Community submissions feed\n\n` +
        `🗡️ /pffvote &lt;handle&gt;\n` +
        `   Vote for a submission\n\n` +
        `📊 /pffstats\n` +
        `   $PFF price &amp; market cap\n` +
        `${SEP}\n` +
        `🌐 <a href="https://pumpfunfloki.com/horde-engine">pumpfunfloki.com/horde-engine</a>`
      );
    }

    // /pffrank <handle>
    else if (command === "/pffrank") {
      const handle = args[0]?.replace(/^@/, "");
      if (!handle) {
        await tgSend(chatId,
          `⚔️ Usage: <code>/pffrank YourHandle</code>\n` +
          `Example: <code>/pffrank Leszibs</code>`
        );
      } else {
        const { data: lb } = await db
          .from("leaderboard")
          .select("pseudo, points")
          .order("points", { ascending: false });

        const idx = (lb || []).findIndex(
          (r) => r.pseudo.toLowerCase() === handle.toLowerCase()
        );

        if (idx === -1) {
          await tgSend(chatId,
            `❓ <b>${handle}</b> is not in the Horde yet.\n\n` +
            `Complete a quest to claim your rank 👇\n` +
            `🌐 <a href="https://pumpfunfloki.com/horde-engine">pumpfunfloki.com/horde-engine</a>`
          );
        } else {
          const row = lb[idx];
          const rank = idx + 1;
          const t = tier(Number(row.points));
          const total = lb.length;
          await tgSend(chatId,
            `${t}\n` +
            `<b>${row.pseudo}</b>\n` +
            `${SEP}\n` +
            `🏅 Rank  <b>#${rank}</b> / ${total}\n` +
            `⚡ Points  <b>${Number(row.points).toLocaleString()}</b>\n` +
            `${SEP}\n` +
            `🌐 <a href="https://pumpfunfloki.com/horde-engine">pumpfunfloki.com/horde-engine</a>`
          );
        }
      }
    }

    // /pfftop
    else if (command === "/pfftop") {
      const { data: lb } = await db
        .from("leaderboard")
        .select("pseudo, points")
        .order("points", { ascending: false })
        .limit(5);

      if (!lb?.length) {
        await tgSend(chatId, "No Vikings in the Horde yet. Be the first ⚔️");
      } else {
        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
        const lines = lb.map((r, i) =>
          `${medals[i]} <b>${r.pseudo}</b>\n` +
          `    ${Number(r.points).toLocaleString()} pts · ${tier(Number(r.points))}`
        );
        await tgSend(chatId,
          `⚔️ <b>Top Vikings of the Horde</b>\n` +
          `${SEP}\n` +
          `${lines.join("\n\n")}\n` +
          `${SEP}\n` +
          `🌐 <a href="https://pumpfunfloki.com/horde-engine">pumpfunfloki.com/horde-engine</a>`
        );
      }
    }

    // /pffquests
    else if (command === "/pffquests") {
      const { data: quests } = await db
        .from("quests")
        .select("title, points, type")
        .order("points", { ascending: false })
        .limit(8);

      if (!quests?.length) {
        await tgSend(chatId,
          `📜 <b>No active quests right now.</b>\n\nCheck back soon — the Oracle is preparing new missions ⚔️`
        );
      } else {
        const lines = quests.map((q) =>
          `⚡ <b>${q.title}</b>\n    🎯 ${q.points} pts`
        );
        await tgSend(chatId,
          `📜 <b>Active Quests</b>\n` +
          `${SEP}\n` +
          `${lines.join("\n\n")}\n` +
          `${SEP}\n` +
          `Complete them at 👇\n` +
          `🌐 <a href="https://pumpfunfloki.com/horde-engine">pumpfunfloki.com/horde-engine</a>`
        );
      }
    }

    // /pffvotes — feed des submissions approuvées avec leurs votes
    else if (command === "/pffvotes") {
      const { data: subs } = await db
        .from("submissions")
        .select("id, handle, quest_title, vote_count")
        .eq("status", "approved")
        .order("vote_count", { ascending: false })
        .limit(8);

      if (!subs?.length) {
        await tgSend(chatId,
          `🗳️ No approved submissions yet.\nComplete a quest to be the first ⚔️\n` +
          `🌐 <a href="https://pumpfunfloki.com/horde-engine">pumpfunfloki.com/horde-engine</a>`
        );
      } else {
        const lines = subs.map((s, i) =>
          `${i + 1}. <b>${s.handle}</b> — ${s.quest_title || "Quest"}\n` +
          `   🗳️ ${s.vote_count || 0} vote${(s.vote_count || 0) !== 1 ? "s" : ""}`
        );
        await tgSend(chatId,
          `🗳️ <b>Horde Feed — Top Submissions</b>\n` +
          `${SEP}\n` +
          `${lines.join("\n\n")}\n` +
          `${SEP}\n` +
          `Vote with: <code>/pffvote &lt;handle&gt;</code>\n` +
          `🌐 <a href="https://pumpfunfloki.com/horde-engine">pumpfunfloki.com/horde-engine</a>`
        );
      }
    }

    // /pffvote <handle> — vote pour la dernière submission approuvée de ce handle
    else if (command === "/pffvote") {
      const targetHandle = args[0]?.replace(/^@/, "");
      if (!targetHandle) {
        await tgSend(chatId,
          `⚔️ Usage: <code>/pffvote &lt;handle&gt;</code>\n` +
          `Example: <code>/pffvote Leszibs</code>\n\n` +
          `See submissions: /pffvotes`
        );
      } else {
        const { data: sub } = await db
          .from("submissions")
          .select("id, handle, quest_title, vote_count")
          .eq("status", "approved")
          .ilike("handle", targetHandle)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!sub) {
          await tgSend(chatId,
            `❓ No approved submission found for <b>${targetHandle}</b>.\n\n` +
            `Check the feed: /pffvotes`
          );
        } else {
          const voterHandle = `tg_${msg.from.id}`;
          const { error: voteErr } = await db
            .from("votes")
            .insert([{ submission_id: sub.id, voter_handle: voterHandle }]);

          if (voteErr) {
            if (voteErr.code === "23505") {
              await tgSend(chatId,
                `⚠️ You already voted for <b>${sub.handle}</b>'s submission!`
              );
            } else {
              await tgSend(chatId, `❌ Vote failed. Try again later.`);
            }
          } else {
            const newCount = (Number(sub.vote_count) || 0) + 1;
            await db.from("submissions").update({ vote_count: newCount }).eq("id", sub.id);
            await tgSend(chatId,
              `🗡️ <b>Vote cast!</b>\n` +
              `${SEP}\n` +
              `You voted for <b>${sub.handle}</b>\n` +
              `📜 ${sub.quest_title || "Quest"}\n` +
              `🗳️ Now at <b>${newCount} vote${newCount !== 1 ? "s" : ""}</b>\n` +
              `${SEP}\n` +
              `🌐 <a href="https://pumpfunfloki.com/horde-engine">pumpfunfloki.com/horde-engine</a>`
            );
          }
        }
      }
    }

    // /pffstats
    else if (command === "/pffstats") {
      try {
        const r = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${CONTRACT}`,
          { headers: { "Accept": "application/json" } }
        );
        const j = await r.json();
        const pair = j?.pairs?.[0];
        if (!pair) throw new Error("no pair");

        const price = Number(pair.priceUsd || 0).toFixed(8);
        const mcap  = pair.fdv          ? `$${(pair.fdv / 1_000).toFixed(1)}K`          : "N/A";
        const vol   = pair.volume?.h24  ? `$${(pair.volume.h24 / 1_000).toFixed(1)}K`   : "N/A";
        const ch24  = pair.priceChange?.h24;
        const chStr = ch24 !== undefined ? `${ch24 > 0 ? "+" : ""}${Number(ch24).toFixed(2)}%` : "N/A";
        const arrow = ch24 > 0 ? "📈" : ch24 < 0 ? "📉" : "➡️";

        await tgSend(chatId,
          `📊 <b>$PFF — Live Stats</b>\n` +
          `${SEP}\n` +
          `💰 Price       <b>$${price}</b>\n` +
          `🏦 Market Cap  <b>${mcap}</b>\n` +
          `📦 Vol 24h     <b>${vol}</b>\n` +
          `${arrow} Change 24h  <b>${chStr}</b>\n` +
          `${SEP}\n` +
          `<a href="https://dexscreener.com/solana/${CONTRACT}">📈 DexScreener</a>  ·  <a href="https://pumpfunfloki.com">🌐 Site</a>`
        );
      } catch {
        await tgSend(chatId, "⚠️ Stats unavailable right now. Try again in a moment.");
      }
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "method-not-allowed" });
}
