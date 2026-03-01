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

  // ── Telegram webhook ───────────────────────────────────────────────
  if (req.method === "POST") {
    const update = req.body;
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
        `📊 /pffstats\n` +
        `   $PFF price &amp; market cap\n` +
        `${SEP}\n` +
        `🌐 <a href="https://pumpfunfloki.com/swarm">pumpfunfloki.com/swarm</a>`
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
            `🌐 <a href="https://pumpfunfloki.com/swarm">pumpfunfloki.com/swarm</a>`
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
            `🌐 <a href="https://pumpfunfloki.com/swarm">pumpfunfloki.com/swarm</a>`
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
          `🌐 <a href="https://pumpfunfloki.com/swarm">pumpfunfloki.com/swarm</a>`
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
          `🌐 <a href="https://pumpfunfloki.com/swarm">pumpfunfloki.com/swarm</a>`
        );
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
