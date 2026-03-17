import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../lib/supabase";

/**
 * PFF Swarm / Oracle — V2 Structured (Supabase-ready)
 */

const LS_KEY = "pff_swarm_submissions_v3";

/** ------------ DEFAULT DATA ------------- */
const DEFAULT_QUESTS = [
  {
    id: "Q-001",
    title: "Confess your jeet (Viking poem)",
    type: "lore",
    difficulty: "easy",
    reward: "Fixed drop",
    window: "This week",
    status: "LIVE",
    proofType: "text",
    desc: "Write a short Viking-style confession poem (no doxxing, no hate). Submit proof to the Horde.",
    points: 0,
  },
  {
    id: "Q-002",
    title: "Helmetify your PFP",
    type: "art",
    difficulty: "easy",
    reward: "Role + bonus vote",
    window: "This week",
    status: "LIVE",
    proofType: "image",
    desc: "Use the Viking helmet overlay and post your PFP. Submit link or image as proof.",
    points: 0,
  },
  {
    id: "Q-003",
    title: "Raid with discipline (10 replies)",
    type: "raid",
    difficulty: "medium",
    reward: "Milestone points",
    window: "48h sprint",
    status: "LIVE",
    proofType: "link",
    desc: "Reply to 10 relevant CT posts with clean lore (no spam). Submit thread links as proof.",
    points: 0,
  },
  {
    id: "Q-004",
    title: "Prophecy call (deterministic)",
    type: "oracle",
    difficulty: "medium",
    reward: "Bonus if verified",
    window: "Next week",
    status: "UPCOMING",
    proofType: "text",
    desc: "Write a short prophecy: what milestone hits next and why. Bonus only if verified by outcome.",
    points: 0,
  },
];

const DEFAULT_MILESTONES = [
  { id: "M-001", label: "Horde Awakening", metric: "Market Cap", target: 250000, current: 172000, unit: "$", reward: "Buyback #1 + Horde boost", detail: "First market milestone. When market cap hits $250K, a buyback is triggered and the Horde gets a score boost." },
  { id: "M-002", label: "Raid Season", metric: "24h Volume", target: 150000, current: 62000, unit: "$", reward: "Burn #1 (threshold)", detail: "When 24h volume reaches $150K, the Burn #1 threshold is triggered — tokens are permanently destroyed as a deflationary event." },
  { id: "M-003", label: "Saga Breakout", metric: "Holders", target: 2500, current: 1860, unit: "", reward: "Oracle Week + Quest pack", detail: "Reaching 2,500 holders unlocks Oracle Week — a special quest pack with exclusive rewards for the most active Horde members." },
];


/** ------------ HELPERS ------------- */
async function getRecaptchaToken(siteKey, action) {
  return new Promise((resolve, reject) => {
    if (!window.grecaptcha) return reject(new Error("reCAPTCHA not loaded"));
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(siteKey, { action }).then(resolve).catch(reject);
    });
  });
}

function cx(...c) {
  return c.filter(Boolean).join(" ");
}
function formatNumber(n) {
  if (typeof n !== "number") return String(n ?? "");
  return new Intl.NumberFormat("en-US").format(n);
}
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function loadSubmissions() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveSubmissions(items) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {}
}
function safeJson(x, fallback) {
  try {
    if (!x) return fallback;
    if (typeof x === "object") return x;
    return JSON.parse(x);
  } catch {
    return fallback;
  }
}

/** ------------ DEXSCREENER ------------- */
function pickBestPair(pairs = []) {
  const solPairs = pairs.filter((p) => (p.chainId || "").toLowerCase() === "solana");
  const list = solPairs.length ? solPairs : pairs;
  return (
    list
      .slice()
      .sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0] || null
  );
}

function useDexScreenerToken(contract, refreshMs = 30000) {
  const [state, setState] = useState({ loading: true, error: null, pair: null, updatedAt: null });

  useEffect(() => {
    if (!contract) return;

    let cancelled = false;
    let timer;

    async function run() {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const url = `https://api.dexscreener.com/latest/dex/tokens/${contract}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Dexscreener HTTP ${res.status}`);
        const json = await res.json();
        const pair = pickBestPair(json?.pairs || []);
        if (!cancelled) setState({ loading: false, error: null, pair, updatedAt: Date.now() });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: e?.message || "Dex fetch failed" }));
      }
    }

    run();
    timer = setInterval(run, refreshMs);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [contract, refreshMs]);

  return state;
}

/** ------------ SUPABASE PUBLIC READ HOOKS ------------- */
function usePffConfig(refreshMs = 60000) {
  const [state, setState] = useState({ loading: true, error: null, settings: null, rules: null, updatedAt: null });

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function run() {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const [{ data: settingsData, error: settingsError }, { data: rulesData, error: rulesError }] = await Promise.all([
          supabase.from("settings").select("*").order("updated_at", { ascending: false }).limit(1),
          supabase.from("scoring_rules").select("*").order("updated_at", { ascending: false }).limit(1),
        ]);

        if (settingsError) throw settingsError;
        if (rulesError) throw rulesError;

        if (!cancelled) setState({ loading: false, error: null, settings: settingsData?.[0] || null, rules: rulesData?.[0] || null, updatedAt: Date.now() });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: e?.message || "Config fetch failed" }));
      }
    }

    run();
    timer = setInterval(run, refreshMs);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [refreshMs]);

  return state;
}

function usePublicLeaderboard(refreshMs = 45000) {
  const [state, setState] = useState({ loading: true, error: null, rows: [], updatedAt: null });

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function run() {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const { data, error } = await supabase.from("leaderboard").select("pseudo, points, last_update").order("points", { ascending: false });
        if (error) throw error;
        if (!cancelled) setState({ loading: false, error: null, rows: data || [], updatedAt: Date.now() });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: e?.message || "Leaderboard fetch failed" }));
      }
    }

    run();
    timer = setInterval(run, refreshMs);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [refreshMs]);

  return state;
}

function useExecutionLogs(refreshMs = 60000) {
  const [state, setState] = useState({ loading: true, error: null, rows: [], updatedAt: null });

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function run() {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const { data, error } = await supabase.from("execution_logs").select("id, title, description, proof_link, type, created_at").order("created_at", { ascending: false }).limit(12);
        if (error) throw error;
        if (!cancelled) setState({ loading: false, error: null, rows: data || [], updatedAt: Date.now() });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: e?.message || "Logs fetch failed" }));
      }
    }

    run();
    timer = setInterval(run, refreshMs);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [refreshMs]);

  return state;
}

function useApprovedSubmissions(refreshMs = 45000) {
  const [state, setState] = useState({ loading: true, error: null, rows: [], updatedAt: null });

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function run() {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const { data, error } = await supabase
          .from("submissions")
          .select("id, quest_id, handle, proof, note, status, type, difficulty, points_awarded, vote_count, created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(12);

        if (error) throw error;
        if (!cancelled) setState({ loading: false, error: null, rows: data || [], updatedAt: Date.now() });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: e?.message || "Submissions fetch failed" }));
      }
    }

    run();
    timer = setInterval(run, refreshMs);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [refreshMs]);

  return state;
}

function usePublicMilestones(refreshMs = 60000) {
  const [state, setState] = useState({ loading: true, rows: [] });

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function run() {
      try {
        const r = await fetch("/api/admin-milestones");
        const j = await r.json();
        if (!cancelled) setState({ loading: false, rows: j?.data || [] });
      } catch {
        if (!cancelled) setState({ loading: false, rows: [] });
      }
    }

    run();
    timer = setInterval(run, refreshMs);
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [refreshMs]);

  return state;
}

function usePublicQuests(refreshMs = 45000) {
  const [state, setState] = useState({ loading: true, error: null, rows: [], updatedAt: null });

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function run() {
      try {
        const { data, error } = await supabase
          .from("quests")
          .select("id, title, description, type, difficulty, reward, proof_type, time_window, status, points, created_at, expires_at, milestone_id")
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) throw error;

        if (!cancelled) setState({ loading: false, error: null, rows: data || [], updatedAt: Date.now() });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e?.message || "Quests fetch failed", rows: [], updatedAt: Date.now() });
      }
    }

    run();
    timer = setInterval(run, refreshMs);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [refreshMs]);

  return state;
}

function useHordeStats(refreshMs = 60000) {
  const [stats, setStats] = useState({ vikings: null, quests: null, pts: null });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const [{ count: vikings }, { count: quests }, { data: ptsRows }] = await Promise.all([
          supabase.from("leaderboard").select("*", { count: "exact", head: true }),
          supabase.from("submissions").select("*", { count: "exact", head: true }).eq("status", "approved"),
          supabase.from("leaderboard").select("points"),
        ]);
        const pts = (ptsRows || []).reduce((acc, r) => acc + Number(r.points || 0), 0);
        if (!cancelled) setStats({ vikings: vikings ?? 0, quests: quests ?? 0, pts });
      } catch {
        // silently ignore stats errors
      }
    }

    run();
    const t = setInterval(run, refreshMs);
    return () => { cancelled = true; clearInterval(t); };
  }, [refreshMs]);

  return stats;
}

/** ------------ UI PRIMITIVES ------------- */
function PffSectionTitle({ kicker, title, desc, right }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        {kicker ? (
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-400 shadow-neon" />
            <span className="text-sm font-extrabold tracking-widest uppercase text-neon-400 text-glow drop-shadow-[0_0_14px_rgba(0,232,90,.45)]">{kicker}</span>
          </div>
        ) : null}

        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-white text-glow drop-shadow-[0_0_18px_rgba(0,232,90,.25)]">{title}</h2>

        {desc ? <p className="mt-3 text-base text-white/90 drop-shadow-[0_0_10px_rgba(0,0,0,.6)] max-w-3xl">{desc}</p> : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  const cls =
    tone === "good" ? "border-neon-500/40 bg-neon-500/10 text-neon-300 shadow-neon" :
    tone === "warn" ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-200" :
    tone === "bad"  ? "border-red-400/40 bg-red-400/10 text-red-200" :
    "border-white/15 bg-white/[0.06] text-white/80";

  return <span className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium drop-shadow-[0_0_10px_rgba(0,0,0,.6)]", cls)}>{children}</span>;
}

function PffCard({ children, className = "" }) {
  return <div className={cx("glass rounded-2xl", className)}>{children}</div>;
}

function ProgressBar({ value01 }) {
  const pct = Math.round(clamp01(value01) * 100);
  return (
    <div className="w-full">
      <div className="h-2 rounded-full bg-black/40 overflow-hidden border border-neon-500/15">
        <div className="h-full bg-neon-500/80 shadow-neon" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-xs text-white/60">{pct}%</div>
    </div>
  );
}

/** ------------ TOAST ------------- */
function HordeSurgeToast({ hits }) {
  return (
    <AnimatePresence>
      {hits?.length ? (
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.25 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] w-[92vw] max-w-xl"
        >
          <div className="glass rounded-2xl border border-neon-500/30 shadow-[0_0_80px_rgba(0,232,90,.25)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-white font-extrabold text-lg">🟢 Horde Surge — Milestone Triggered</div>
                <div className="mt-1 text-sm text-white/80">{hits.map((h) => h.label).join(" • ")}</div>
                <div className="mt-1 text-xs text-white/60">Rewards: {hits.map((h) => h.reward).join(" • ")}</div>
              </div>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold bg-neon-500 text-black shadow-neonStrong">LIVE</span>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** ------------ NEW QUEST TOAST ------------- */
function NewQuestToast({ quest, onDismiss }) {
  return (
    <AnimatePresence>
      {quest ? (
        <motion.div
          key={quest.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] w-[92vw] max-w-sm"
        >
          <div className="glass rounded-2xl border border-neon-500/30 shadow-[0_0_60px_rgba(0,232,90,.22)] p-4 flex items-start gap-3">
            <span className="text-xl shrink-0">⚔️</span>
            <div className="min-w-0 flex-1">
              <div className="text-white font-extrabold text-sm">New quest available!</div>
              <div className="text-neon-300 text-xs mt-0.5 truncate">{quest.title}</div>
            </div>
            <button
              onClick={onDismiss}
              className="shrink-0 text-white/40 hover:text-white text-lg leading-none"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** ------------ REALTIME BAR ------------- */
function RealtimeSwarmBar({ dexStatus, swarmScore01, weights, configLoading }) {
  const scorePct = Math.round(clamp01(swarmScore01) * 100);

  return (
    <PffCard className="p-3 md:p-4 border border-neon-500/15 shadow-[0_0_80px_rgba(0,232,90,.12)]">

        {/* ── Mobile compact single row ── */}
        <div className="flex md:hidden items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge tone={dexStatus?.error ? "warn" : dexStatus?.loading ? "neutral" : "good"} className="flex-shrink-0">
              {dexStatus?.loading ? "…" : dexStatus?.error ? "offline" : "live"}
            </Badge>
            <span className="text-white/80 text-xs font-medium truncate">
              {dexStatus?.priceUsd ? `$${dexStatus.priceUsd.toFixed(8)}` : "—"}
            </span>
            <span className="text-white/50 text-xs whitespace-nowrap hidden xs:inline">
              {dexStatus?.mcapUsd ? `MC $${formatNumber(Math.round(dexStatus.mcapUsd))}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right leading-none">
              <div className="text-[10px] text-white/50 uppercase tracking-wider">Score</div>
              <div className="text-white font-extrabold text-sm">
                {scorePct}<span className="text-white/40 text-[10px]">/100</span>
              </div>
            </div>
            <div className="w-16 h-1.5 rounded-full bg-black/40 overflow-hidden border border-neon-500/15">
              <div className="h-full bg-neon-500/80 rounded-full shadow-neon" style={{ width: `${scorePct}%` }} />
            </div>
          </div>
        </div>

        {/* ── Desktop full row ── */}
        <div className="hidden md:flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={dexStatus?.error ? "warn" : dexStatus?.loading ? "neutral" : "good"}>Dex: {dexStatus?.loading ? "loading…" : dexStatus?.error ? "offline" : "live"}</Badge>
            <Badge>Price: <span className="text-white/90">{dexStatus?.priceUsd ? `$${dexStatus.priceUsd.toFixed(8)}` : "—"}</span></Badge>
            <Badge>MCAP: <span className="text-white/90">{dexStatus?.mcapUsd ? `$${formatNumber(Math.round(dexStatus.mcapUsd))}` : "—"}</span></Badge>
            <Badge>Vol 24h: <span className="text-white/90">{dexStatus?.vol24Usd ? `$${formatNumber(Math.round(dexStatus.vol24Usd))}` : "—"}</span></Badge>
            <Badge>Liq: <span className="text-white/90">{dexStatus?.liquidityUsd ? `$${formatNumber(Math.round(dexStatus.liquidityUsd))}` : "—"}</span></Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-white/60">Horde Score</div>
              <div className="text-white font-extrabold text-lg">
                {scorePct}<span className="text-white/50">/100</span>
              </div>
              <div className="text-[11px] text-white/55">
                {configLoading ? "Loading weights…" : `Milestones ${(weights.milestones * 100).toFixed(0)}% • Activity ${(weights.activity * 100).toFixed(0)}%`}
              </div>
            </div>
            <div className="w-44">
              <div className="h-2 rounded-full bg-black/40 overflow-hidden border border-neon-500/15">
                <div className="h-full bg-neon-500/80 shadow-neon" style={{ width: `${scorePct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-white/50">Live composite score</div>
            </div>
          </div>
        </div>

      </PffCard>
  );
}

/** ------------ EXPORT ------------- */
export default function PFFSwarmOracleHub({
  contract,
  quests = DEFAULT_QUESTS,
  milestones = DEFAULT_MILESTONES,
}) {
  const dex = useDexScreenerToken(contract, 30000);
  const pair = dex.pair;

  // milestones from DB — fallback to hardcoded defaults if DB is empty
  const publicMilestones = usePublicMilestones(60000);
  const hordeStats = useHordeStats(60000);
  const milestonesToUse = publicMilestones.rows.length > 0 ? publicMilestones.rows : milestones;

  const cfg = usePffConfig(60000);
  const leaderboard = usePublicLeaderboard(45000);
  const logs = useExecutionLogs(60000);
  const approved = useApprovedSubmissions(45000);

  // ✅ quests from DB (public) — poll every 30s for new quest toast
  const publicQuests = usePublicQuests(30000);

  // new quest toast detection
  const prevQuestIdsRef = useRef(null);
  const [newQuestToast, setNewQuestToast] = useState(null);
  useEffect(() => {
    if (!publicQuests.rows?.length) return;
    const currentIds = new Set(publicQuests.rows.map((q) => q.id));
    if (prevQuestIdsRef.current === null) {
      prevQuestIdsRef.current = currentIds;
      return;
    }
    const freshQuests = publicQuests.rows.filter((q) => !prevQuestIdsRef.current.has(q.id));
    if (freshQuests.length) {
      setNewQuestToast(freshQuests[0]);
      setTimeout(() => setNewQuestToast(null), 8000);
    }
    prevQuestIdsRef.current = currentIds;
  }, [publicQuests.rows]);

  const settings = cfg.settings || null;
  const rules = cfg.rules || null;

  const basePoints = useMemo(() => safeJson(rules?.base_points, { raid: 10, art: 15, lore: 8, oracle: 12 }), [rules]);
  const multipliers = useMemo(() => safeJson(rules?.difficulty_multipliers, { easy: 1, medium: 1.5, hard: 2 }), [rules]);

  const weights = useMemo(() => {
    const w = safeJson(settings?.swarm_score_weights, { milestones: 0.6, activity: 0.4 });
    const milestonesW = typeof w?.milestones === "number" ? w.milestones : 0.6;
    const activityW = typeof w?.activity === "number" ? w.activity : 0.4;
    const sum = milestonesW + activityW;
    if (sum <= 0) return { milestones: 0.6, activity: 0.4, activityTargetPoints: 1000 };
    const norm = { milestones: milestonesW / sum, activity: activityW / sum };
    const activityTargetPoints = typeof w?.activity_target_points === "number" ? w.activity_target_points : 1000;
    return { ...norm, activityTargetPoints };
  }, [settings]);


  // map DB quests -> UI quests (filter expired ones out)
  const questsFromDb = useMemo(() => {
    const now = Date.now();
    return (publicQuests.rows || [])
      .filter((q) => !q.expires_at || new Date(q.expires_at).getTime() > now)
      .map((q) => ({
      id: q.id,
      title: q.title,
      type: q.type,
      difficulty: q.difficulty,
      reward: q.reward,
      window: q.time_window,
      status: q.status,
      proofType: q.proof_type,
      desc: q.description,
      points: typeof q.points === "number" ? q.points : Number(q.points || 0),
      expires_at: q.expires_at || null,
      milestone_id: q.milestone_id || null,
      fixed_reward_amount: Number(q.fixed_reward_amount || 0),
      fixed_reward_token: q.fixed_reward_token || "pff",
      vote_threshold: Number(q.vote_threshold || 0),
      vote_bonus_amount: Number(q.vote_bonus_amount || 0),
      vote_bonus_token: q.vote_bonus_token || "pff",
    }));
  }, [publicQuests.rows]);

  const questsToShow = useMemo(() => (questsFromDb.length ? questsFromDb : quests), [questsFromDb, quests]);

  // live stats (dex)
  const liveMcap = Number(pair?.marketCap || pair?.fdv || 0);
  const liveVol24h = Number(pair?.volume?.h24 || 0);
  const liveLiq = Number(pair?.liquidity?.usd || 0);
  const livePrice = Number(pair?.priceUsd || 0);

  const liveMilestones = useMemo(() => {
    return milestonesToUse.map((m) => {
      if (m.metric === "Market Cap") return { ...m, current: liveMcap || m.current };
      if (m.metric === "24h Volume") return { ...m, current: liveVol24h || m.current };
      if (m.metric === "Submission Count") return { ...m, current: hordeStats.quests ?? m.current };
      return m;
    });
  }, [milestonesToUse, liveMcap, liveVol24h, hordeStats.quests]);

  const dexStatus = useMemo(
    () => ({
      loading: dex.loading,
      error: dex.error,
      updatedAt: dex.updatedAt,
      dexId: pair?.dexId || null,
      liquidityUsd: liveLiq,
      priceUsd: livePrice,
      mcapUsd: liveMcap,
      vol24Usd: liveVol24h,
    }),
    [dex.loading, dex.error, dex.updatedAt, pair, liveLiq, livePrice, liveMcap, liveVol24h]
  );

  // milestone hit toast
  const prevCompletedRef = useRef(new Set());
  const [justHit, setJustHit] = useState([]);

  useEffect(() => {
    const completedNow = new Set(liveMilestones.filter((m) => Number(m.current ?? 0) >= Number(m.target ?? 0)).map((m) => m.id));
    const newly = liveMilestones.filter((m) => completedNow.has(m.id) && !prevCompletedRef.current.has(m.id));

    if (newly.length) {
      setJustHit(newly.map(({ id, label, metric, reward }) => ({ id, label, metric, reward })));
      setTimeout(() => setJustHit([]), 6000);
    }
    prevCompletedRef.current = completedNow;
  }, [liveMilestones]);



  // swarm score
  const milestonesProgress01 = useMemo(() => {
    if (!liveMilestones?.length) return 0;
    const vals = liveMilestones.map((m) => {
      const cur = Number(m.current ?? 0);
      const tgt = Number(m.target ?? 0);
      if (!tgt || tgt <= 0) return 0;
      return clamp01(cur / tgt);
    });
    return clamp01(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [liveMilestones]);

  const activityProgress01 = useMemo(() => {
    const top = Number(leaderboard.rows?.[0]?.points || 0);
    const target = Number(weights.activityTargetPoints || 1000);
    if (!target || target <= 0) return 0;
    return clamp01(top / target);
  }, [leaderboard.rows, weights.activityTargetPoints]);

  const swarmScore01 = useMemo(() => clamp01(weights.milestones * milestonesProgress01 + weights.activity * activityProgress01), [
    weights,
    milestonesProgress01,
    activityProgress01,
  ]);

  return (
    <>
      <HordeSurgeToast hits={justHit} />
      <NewQuestToast quest={newQuestToast} onDismiss={() => setNewQuestToast(null)} />

      {/* ── Stats bar: fixed below the fixed header ── */}
      <div className="fixed top-[76px] left-0 right-0 z-[49] bg-[#05070A] px-4 pb-2">
        <div className="mx-auto max-w-6xl">
          <RealtimeSwarmBar dexStatus={dexStatus} swarmScore01={swarmScore01} weights={weights} configLoading={cfg.loading} />
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 md:pt-20 md:pb-16">
      <div className="space-y-12">

        <TheOracleSection />

        <MilestonesCounter milestones={liveMilestones} dexStatus={dexStatus} justHit={justHit} />

        <ExecutionTimeline logs={logs} />

        <TheSwarmSection basePoints={basePoints} multipliers={multipliers} />

        <QuestBoard
          quests={questsToShow}
          milestones={liveMilestones}
          backendEnabled={Boolean(safeJson(settings?.feature_toggles, { use_backend: false })?.use_backend)}
        />

        <VotingSection submissions={approved.rows} loading={approved.loading} quests={questsToShow} />

        <div className="grid gap-5 md:grid-cols-2">
          <LeaderboardPanel leaderboard={leaderboard} />
          <HordeLookupSection />
        </div>

      </div>
    </section>
    </>
  );
}

/** ------------ VOTING SECTION ------------- */
function VotingSection({ submissions = [], loading, quests = [] }) {
  // Persistent anonymous voter fingerprint (UUID stored in localStorage)
  const [voterId] = useState(() => {
    try {
      let id = localStorage.getItem("pff_voter_id");
      if (!id) { id = crypto.randomUUID(); localStorage.setItem("pff_voter_id", id); }
      return id;
    } catch { return crypto.randomUUID(); }
  });

  // Track which submissions this browser has already voted on
  const [votedIds, setVotedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("pff_voted_ids") || "[]")); }
    catch { return new Set(); }
  });

  const [localVotes, setLocalVotes] = useState({});
  const [casting, setCasting] = useState(null); // submission_id being cast, or null
  const [voteSuccess, setVoteSuccess] = useState(null);

  async function castVote(submissionId) {
    if (casting || votedIds.has(submissionId)) return;
    setCasting(submissionId);
    try {
      const res = await fetch("/api/submit-quest?action=vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId, voter_handle: voterId }),
      });
      const json = await res.json();
      // Mark as voted locally regardless (409 = already voted server-side)
      const next = new Set(votedIds);
      next.add(submissionId);
      setVotedIds(next);
      try { localStorage.setItem("pff_voted_ids", JSON.stringify([...next])); } catch {}
      if (res.ok) {
        setLocalVotes((v) => ({ ...v, [submissionId]: json.vote_count }));
        setVoteSuccess("⚔️ Vote cast!");
        setTimeout(() => setVoteSuccess(null), 3000);
      }
    } catch {}
    setCasting(null);
  }

  if (!loading && submissions.length === 0) return null;

  const SWARM_URL = "https://pumpfunfloki.com/horde-engine";

  return (
    <div id="community-feed" className="scroll-mt-24">
      <PffSectionTitle
        kicker="Community"
        title="Horde Feed"
        desc="Vote on approved quest submissions. One vote per browser, no account needed."
      />

      {voteSuccess && (
        <div className="mb-4 rounded-xl border border-neon-500/30 bg-neon-500/10 px-4 py-2 text-sm text-neon-300">
          {voteSuccess}
        </div>
      )}

      {loading ? (
        <div className="text-white/50 text-sm">Loading submissions…</div>
      ) : (
        <div className="mt-6 max-h-[540px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neon-500/20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {submissions.map((sub) => {
            const voteCount = localVotes[sub.id] ?? (sub.vote_count || 0);
            const hasVoted = votedIds.has(sub.id);
            const isCasting = casting === sub.id;
            const quest = quests.find((q) => q.id === sub.quest_id);
            const threshold = Number(quest?.vote_threshold || 0);
            const bonusAmount = Number(quest?.vote_bonus_amount || 0);
            const bonusToken = (quest?.vote_bonus_token || "pff").toUpperCase();
            const thresholdPct = threshold > 0 ? Math.min(100, Math.round((voteCount / threshold) * 100)) : 0;
            const bonusReached = threshold > 0 && voteCount >= threshold;

            const shareText = `${sub.handle} just completed the "${quest?.title || sub.quest_id}" quest on @PumpFunFloki!\n⚔️ Vote for their submission! 🗡️`;
            const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(SWARM_URL)}`;
            const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(SWARM_URL)}&text=${encodeURIComponent(shareText)}`;

            return (
              <div key={sub.id} className="glass rounded-2xl border border-neon-500/15 p-4 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-white/50 truncate">{quest?.title || sub.quest_id}</div>
                    <div className="text-sm font-bold text-white truncate">{sub.handle}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge>{sub.type || "quest"}</Badge>
                  </div>
                </div>

                {/* Proof */}
                <div className="text-xs text-white/70 leading-relaxed flex flex-col gap-1">
                  {sub.proof.split(/\s+/).map((token, i) =>
                    /^https?:\/\//i.test(token)
                      ? <a key={i} href={token} target="_blank" rel="noopener noreferrer" className="text-neon-400 underline underline-offset-2 hover:text-neon-300 break-all">{token}</a>
                      : token ? <span key={i} className="break-words">{token}</span> : null
                  )}
                </div>

                {/* Vote threshold progress */}
                {threshold > 0 && bonusAmount > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-purple-300/80">
                        {bonusReached ? `✅ Bonus unlocked!` : `🗳️ ${voteCount}/${threshold} → ${bonusAmount.toLocaleString()} $${bonusToken}`}
                      </span>
                      <span className="text-[11px] text-white/40">{thresholdPct}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${bonusReached ? "bg-yellow-400" : "bg-purple-500/70"}`}
                        style={{ width: `${thresholdPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Footer: vote count + vote button + share */}
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-xs text-white/40">{voteCount} vote{voteCount !== 1 ? "s" : ""}</span>

                  <div className="flex items-center gap-1.5">
                    {/* Share on X */}
                    <a
                      href={xUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Share on X"
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/50 hover:text-white/80 hover:border-white/25 transition-colors"
                    >
                      𝕏
                    </a>
                    {/* Share on Telegram */}
                    <a
                      href={tgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Share on Telegram"
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/50 hover:text-white/80 hover:border-white/25 transition-colors"
                    >
                      ✈️
                    </a>
                    {/* Vote button */}
                    {hasVoted ? (
                      <span className="rounded-lg border border-neon-500/20 px-3 py-1 text-xs text-neon-500/50">
                        ✓ Voted
                      </span>
                    ) : (
                      <button
                        onClick={() => castVote(sub.id)}
                        disabled={!!casting}
                        className="rounded-lg border border-neon-500/25 bg-neon-500/[0.07] px-3 py-1 text-xs text-neon-400 hover:border-neon-500/50 hover:bg-neon-500/15 transition-colors disabled:opacity-40"
                      >
                        {isCasting ? "…" : "⚔️ Vote"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}

/** ------------ SECTIONS ------------- */
function TheSwarmSection({ basePoints, multipliers }) {
  return (
    <div id="swarm" className="scroll-mt-24">
      <PffSectionTitle
        kicker="Protocol"
        title="The Horde Engine"
        desc="A predictable quest engine. No RNG. No glitches. Fixed rewards, optional community-voted bonuses. Discipline > noise."
        right={
          <div className="flex flex-wrap gap-2 justify-start md:justify-end">
            <Badge tone="good">Deterministic</Badge>
            <Badge>Community-voted bonuses</Badge>
            <Badge tone="warn">No RNG</Badge>
          </div>
        }
      />

      <div className="mt-6">
        <PffCard className="p-4 border border-neon-500/15">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-white font-extrabold">Quest Points</div>
              <div className="mt-1 text-sm text-white/70">Points per type × difficulty multiplier.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(basePoints || {}).map(([k, v]) => (
                <Badge key={k} tone="good">{k}: {v} pts</Badge>
              ))}
              {Object.entries(multipliers || {}).map(([k, v]) => (
                <Badge key={k}>{k}: ×{v}</Badge>
              ))}
            </div>
          </div>
        </PffCard>
      </div>
    </div>
  );
}

function TheOracleSection() {
  return (
    <div id="oracle" className="scroll-mt-24">
      <PffSectionTitle
        kicker="Myth Engine"
        title="The Oracle"
        desc="Prophecies are milestones. Milestones are triggers. Triggers are deterministic actions — buybacks, burns, raid budgets."
        right={<Badge tone="good">Threshold-driven</Badge>}
      />
    </div>
  );
}

/** ------------ MILESTONE DETAIL MODAL ------------- */
function MilestoneDetailModal({ milestone, onClose }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md glass rounded-2xl border border-neon-500/30 shadow-[0_0_90px_rgba(0,232,90,.22)] p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold tracking-widest uppercase text-neon-400 mb-1">Milestone</div>
            <div className="text-white font-extrabold text-xl">{milestone.label}</div>
            <div className="mt-1 text-xs text-white/55">{milestone.metric} • Target {milestone.unit}{formatNumber(Number(milestone.target ?? 0))}</div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none shrink-0">✕</button>
        </div>
        <div className="mt-5 space-y-3">
          <div className="rounded-xl bg-neon-500/[0.06] border border-neon-500/20 p-4">
            <div className="text-xs text-white/50 mb-1">Reward when triggered</div>
            <div className="text-neon-300 font-bold">{milestone.reward}</div>
          </div>
          {milestone.detail && (
            <div className="rounded-xl bg-black/30 border border-white/10 p-4">
              <div className="text-xs text-white/50 mb-1">What happens</div>
              <div className="text-white/80 text-sm leading-relaxed">{milestone.detail}</div>
            </div>
          )}
          <div className="text-xs text-white/35 text-center">All milestones are deterministic — no discretion, no delays.</div>
        </div>
      </div>
    </div>
  );
}

/** ------------ MILESTONES ------------- */
function MilestonesCounter({ milestones, dexStatus, justHit = [] }) {
  const total = milestones.length;
  const completed = milestones.filter((m) => (m.current ?? 0) >= (m.target ?? 0)).length;
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  return (
    <div id="milestones" className="scroll-mt-24">
      {selectedMilestone && (
        <MilestoneDetailModal milestone={selectedMilestone} onClose={() => setSelectedMilestone(null)} />
      )}
      <PffSectionTitle
        kicker="Tracking"
        title="Milestones"
        desc="Live progress toward deterministic triggers. Click any card for details."
        right={
          <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
            <Badge tone={completed === total ? "good" : "neutral"}>
              {completed}/{total} completed
            </Badge>
            {dexStatus?.loading ? <Badge>Dex: loading…</Badge> : dexStatus?.error ? <Badge tone="warn">Dex: offline</Badge> : <Badge tone="good">Dex: live</Badge>}
          </div>
        }
      />

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {milestones.map((m) => {
          const current = Number(m.current ?? 0);
          const target = Number(m.target ?? 0);
          const done = current >= target && target > 0;
          const v = target > 0 ? current / target : 0;
          const isJustHit = justHit.some((h) => h.id === m.id);

          return (
            <motion.div
              key={m.id}
              initial={false}
              animate={isJustHit ? { scale: [1, 1.02, 1], boxShadow: "0 0 90px rgba(0,232,90,.28)" } : { scale: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" }}
              transition={{ duration: 0.7 }}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setSelectedMilestone(m)}
              >
                <PffCard className="p-6 border border-neon-500/15 hover:border-neon-500/45 hover:shadow-[0_0_40px_rgba(0,232,90,.12)] transition cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-extrabold text-lg">{m.label}</div>
                      <div className="mt-1 text-xs text-white/60">
                        {m.metric} • Target {m.unit}
                        {formatNumber(target)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {done ? <Badge tone="good">DONE</Badge> : <Badge tone="neutral">IN PROGRESS</Badge>}
                      <span className="text-[10px] text-white/30 font-medium">click for details →</span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <ProgressBar value01={v} />
                    <div className="mt-3 text-sm text-white/80">
                      Current:{" "}
                      <span className="font-extrabold text-neon-300 text-glow">
                        {m.unit}
                        {formatNumber(current)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-white/70">
                      Reward: <span className="text-white/85">{m.reward}</span>
                    </div>
                  </div>
                </PffCard>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** ------------ LEADERBOARD ------------- */
function LeaderboardPanel({ leaderboard }) {
  const [hovered, setHovered] = useState(null); // { r, tier, rect, questCount }

  async function handleRowEnter(r, e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const tier = getTier(Number(r.points || 0));
    setHovered({ r, tier, rect, questCount: null });
    const { count } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .ilike("handle", r.pseudo)
      .eq("status", "approved");
    setHovered((prev) =>
      prev?.r.pseudo === r.pseudo ? { ...prev, questCount: count ?? 0 } : prev
    );
  }

  return (
    <div id="leaderboard" className="scroll-mt-24">
      <PffSectionTitle kicker="Ranking" title="Leaderboard" desc="Top Vikings by verified points." right={<span className="inline-flex items-center rounded-full
          px-4 py-1.5 text-sm font-semibold
          bg-black/40
          border border-neon-500/40
          text-neon-300
          shadow-[0_0_18px_rgba(0,232,90,.35)]
          backdrop-blur-sm">
            {leaderboard.rows?.length ? `Top ${leaderboard.rows.length}` : "Top 5"}
        </span>} />

      <PffCard className="mt-8 overflow-hidden border border-neon-500/15">
        <div className="p-4 border-b border-neon-500/10 flex items-center justify-between">
          <div className="text-white font-extrabold">Horde Champions</div>
          <div className="text-xs text-white/55">{leaderboard.loading ? "Loading…" : leaderboard.error ? "Offline" : "Live"}</div>
        </div>

        <div className="divide-y divide-neon-500/10 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neon-500/20">
          {(leaderboard.rows || []).length ? (
            leaderboard.rows.map((r, idx) => {
              const tier = getTier(Number(r.points || 0));
              const rankStyle = [
                "border-yellow-400/70 bg-yellow-400/20 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,.4)]",
                "border-slate-300/60 bg-slate-300/10 text-slate-300 shadow-[0_0_8px_rgba(203,213,225,.25)]",
                "border-orange-400/60 bg-orange-400/10 text-orange-300 shadow-[0_0_8px_rgba(251,146,60,.25)]",
              ][idx] ?? "border-neon-500/15 bg-black/20 text-white/60";
              return (
                <div key={r.pseudo}
                  className={cx(
                    "px-4 py-3 flex items-center justify-between transition",
                    idx === 0 && "border-l-2 border-l-neon-500/60 bg-neon-500/5"
                  )}
                  onMouseEnter={(e) => handleRowEnter(r, e)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cx("w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold border shrink-0", rankStyle)}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-white font-bold truncate">{r.pseudo}</div>
                      <div className={cx("text-xs font-semibold", tier.color)}>{tier.emoji} {tier.label}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={cx("font-extrabold", idx < 3 ? tier.color : "text-white")}>{formatNumber(Number(r.points || 0))}</div>
                    <div className="text-xs text-white/40">pts</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-sm text-white/60">No data yet.</div>
          )}
        </div>

        {/* Tier legend */}
        <div className="border-t border-neon-500/10 px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2.5 font-semibold">Viking Ranks</div>
          <div className="grid grid-cols-4 gap-2">
            {[...TIER_THRESHOLDS].reverse().map((t, i) => (
              <div key={t.label} className={cx(
                "flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 border",
                i === 3
                  ? "border-yellow-400/30 bg-yellow-400/5"
                  : "border-white/5 bg-black/20"
              )}>
                <span className="text-lg leading-none">{t.emoji}</span>
                <span className={cx("text-[11px] font-bold leading-tight text-center", t.color)}>{t.label}</span>
                <span className="text-[10px] text-white/35 font-mono">{t.min === 0 ? "0 pts" : `${t.min}+ pts`}</span>
              </div>
            ))}
          </div>
        </div>
      </PffCard>

      {/* Hover popup card — fixed position, outside PffCard to avoid overflow clipping */}
      <AnimatePresence>
        {hovered && (() => {
          const CARD_W = 240;
          const cenX = hovered.rect.left + hovered.rect.width / 2;
          const left = Math.max(10, Math.min(cenX - CARD_W / 2, window.innerWidth - CARD_W - 10));
          const showAbove = hovered.rect.bottom + 200 > window.innerHeight;
          const top = showAbove ? hovered.rect.top - 8 : hovered.rect.bottom + 8;
          return (
            <motion.div
              key={hovered.r.pseudo}
              initial={{ opacity: 0, y: showAbove ? 6 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ position: "fixed", left, top, width: CARD_W, zIndex: 200, transform: showAbove ? "translateY(-100%)" : "none" }}
              className="pointer-events-none"
            >
              <div className="glass rounded-2xl border border-neon-500/25 shadow-[0_0_40px_rgba(0,232,90,.22)] p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-2xl">{hovered.tier.emoji}</span>
                  <div>
                    <div className="text-white font-extrabold leading-tight truncate max-w-[160px]">{hovered.r.pseudo}</div>
                    <div className={cx("text-xs font-semibold", hovered.tier.color)}>{hovered.tier.label}</div>
                  </div>
                </div>
                <div className="border-t border-neon-500/10 pt-3 flex gap-3">
                  <div className="flex-1 text-center">
                    <div className={cx("text-xl font-extrabold", hovered.tier.color)}>{formatNumber(Number(hovered.r.points || 0))}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">pts</div>
                  </div>
                  <div className="w-px bg-neon-500/10" />
                  <div className="flex-1 text-center">
                    <div className="text-xl font-extrabold text-white">{hovered.questCount === null ? "…" : hovered.questCount}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">quests</div>
                  </div>
                </div>
                {(() => {
                  const next = hovered.tier.next;
                  if (!next) return <div className="mt-3 text-[10px] text-yellow-400 font-bold text-center">👑 Max tier reached</div>;
                  const pct = Math.min(100, Math.round(((Number(hovered.r.points) - hovered.tier.min) / (next.min - hovered.tier.min)) * 100));
                  return (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
                        <span>{hovered.tier.emoji} {hovered.tier.label}</span>
                        <span className="text-neon-300">{next.min - Number(hovered.r.points)} pts → {next.label}</span>
                      </div>
                      <div className="h-1 rounded-full bg-black/40 overflow-hidden border border-neon-500/10">
                        <div className="h-full bg-neon-500/70 shadow-neon" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

/** ------------ EXECUTION LOGS ------------- */
function ExecutionTimeline({ logs }) {
  return (
    <div id="execution" className="scroll-mt-24">
      <PffSectionTitle kicker="Transparency" title="Execution Logs" desc="Every action is logged with proof — buybacks, burns, events." right={<span className="inline-flex items-center rounded-full
          px-4 py-1.5 text-sm font-semibold
          bg-black/40
          border border-neon-500/40
          text-neon-300
          shadow-[0_0_18px_rgba(0,232,90,.35)]
          backdrop-blur-sm">
            Public
        </span>} />

      <PffCard className="mt-8 p-5 border border-neon-500/15">
        {logs.loading ? (
          <div className="text-sm text-white/60">Loading logs…</div>
        ) : logs.error ? (
          <div className="text-sm text-yellow-200">Logs offline: {logs.error}</div>
        ) : (logs.rows || []).length ? (
          <div className="space-y-4">
            {logs.rows.map((x) => (
              <div key={x.id} className="relative pl-5">
                <div className="absolute left-0 top-2 h-full w-px bg-neon-500/15" />
                <div className="absolute left-[-4px] top-2 h-2 w-2 rounded-full bg-neon-500 shadow-neon" />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-white font-extrabold truncate">{x.title}</div>
                      <Badge tone={String(x.type).toLowerCase() === "burn" ? "warn" : String(x.type).toLowerCase() === "buyback" ? "good" : "neutral"}>{x.type}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-white/75 leading-relaxed">{x.description}</div>
                    {x.proof_link ? (
                      <a href={x.proof_link} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm text-neon-300 hover:underline">
                        Proof link →
                      </a>
                    ) : null}
                  </div>

                  <div className="text-xs text-white/55 shrink-0">{x.created_at ? new Date(x.created_at).toLocaleDateString() : ""}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-white/60">No logs yet.</div>
        )}
      </PffCard>
    </div>
  );
}

/** ------------ QUEST BOARD ------------- */
/** ------------ QUEST COUNTDOWN ------------- */
function QuestCountdown({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!expiresAt) return;
    function calc() {
      const diff = new Date(expiresAt) - Date.now();
      if (diff <= 0) { setTimeLeft({ expired: true }); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ d, h, m, s, expired: false });
    }
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (!expiresAt) return null;
  if (!timeLeft || timeLeft.expired) return <Badge tone="bad">EXPIRED</Badge>;

  const { d, h, m, s } = timeLeft;
  const str = d > 0
    ? `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`
    : `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200 drop-shadow-[0_0_10px_rgba(0,0,0,.6)]">
      ⏳ {str}
    </span>
  );
}

/** ------------ TIER HELPER ------------- */
const TIER_THRESHOLDS = [
  { min: 1000, label: "War Chief",     emoji: "👑", color: "text-yellow-400" },
  { min: 500,  label: "Berserker",     emoji: "⚔️", color: "text-red-400"   },
  { min: 100,  label: "Shield Bearer", emoji: "🛡️", color: "text-blue-400"  },
  { min: 0,    label: "Recruit",       emoji: "🪖", color: "text-white/60"   },
];
function getTier(points) {
  const tier = TIER_THRESHOLDS.find((t) => Number(points) >= t.min) || TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1];
  const idx  = TIER_THRESHOLDS.indexOf(tier);
  const next = idx > 0 ? TIER_THRESHOLDS[idx - 1] : null;
  return { ...tier, next };
}

/** ------------ HALL OF FAME ------------- */
/** ------------ HORDE LOOKUP + PFF PASSPORT ------------- */
function HordeLookupSection() {
  const hordeStats = useHordeStats(60000);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  async function lookup() {
    const handle = input.trim();
    if (!handle) return;
    setLoading(true);
    setSearched(true);
    setResult(null);

    try {
      // Run user lookup + submissions count in parallel
      const [{ data: userRows }, { count: subsCount }] = await Promise.all([
        supabase.from("leaderboard").select("pseudo, points").ilike("pseudo", handle),
        supabase.from("submissions").select("id", { count: "exact", head: true }).ilike("handle", handle).eq("status", "approved"),
      ]);

      if (!userRows || userRows.length === 0) {
        setResult({ found: false, handle });
        setLoading(false);
        return;
      }

      const user = userRows[0];
      // Count how many users have strictly more points → rank = that count + 1
      const { count: above } = await supabase
        .from("leaderboard")
        .select("*", { count: "exact", head: true })
        .gt("points", user.points);

      const rank = (above || 0) + 1;

      setResult({ found: true, handle: user.pseudo, rank, points: user.points, quests: subsCount || 0 });
    } catch {
      setResult({ found: false, handle });
    }

    setLoading(false);
  }

  const tier = result?.found ? getTier(result.points) : null;
  const shareText = result?.found
    ? `I'm a ${tier.emoji} ${tier.label} in the $PFF Horde\nRank #${result.rank} | ${Number(result.points).toLocaleString()} pts | ${result.quests} quests\n\nJoin the Horde 👇\npumpfunfloki.com\n\n#PFF #PumpFunFloki $PFF`
    : "";
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div id="horde-lookup" className="scroll-mt-24">
      <PffSectionTitle
        kicker="Your Rank"
        title="Horde Lookup"
        desc="Enter your handle to see your rank, points, and tier in the Horde."
      />

      {/* Horde stats bar */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm drop-shadow-[0_0_10px_rgba(0,0,0,.7)]">
        <span className="text-white/80">🛡️ <span className="font-extrabold text-white">{hordeStats.vikings !== null ? formatNumber(hordeStats.vikings) : "—"}</span> <span className="text-white/60">Vikings</span></span>
        <span className="text-white/30">·</span>
        <span className="text-white/80">⚔️ <span className="font-extrabold text-white">{hordeStats.quests !== null ? formatNumber(hordeStats.quests) : "—"}</span> <span className="text-white/60">quests completed</span></span>
        <span className="text-white/30">·</span>
        <span className="text-white/80">🪙 <span className="font-extrabold text-neon-300 drop-shadow-[0_0_8px_rgba(0,232,90,.5)]">{hordeStats.pts !== null ? formatNumber(hordeStats.pts) : "—"}</span> <span className="text-white/60">pts distributed</span></span>
      </div>

      <div className="mt-6 flex gap-3 max-w-lg">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="Your handle (e.g. VikingX)"
          className="flex-1 rounded-xl border border-neon-500/40 bg-white/[0.06] px-4 py-3 text-sm font-medium text-white drop-shadow-[0_0_10px_rgba(0,0,0,.6)] placeholder-white/40 outline-none focus:border-neon-500/80 focus:bg-white/[0.09] transition"
        />
        <button
          onClick={lookup}
          disabled={loading || !input.trim()}
          className="rounded-xl bg-neon-500 px-5 py-3 text-sm font-extrabold text-black drop-shadow-[0_0_14px_rgba(0,232,90,.5)] hover:bg-neon-400 hover:drop-shadow-[0_0_20px_rgba(0,232,90,.75)] transition disabled:opacity-50"
        >
          {loading ? "…" : "Search"}
        </button>
      </div>

      {searched && loading && (
        <div className="mt-6 max-w-lg">
          <PffCard className="p-5 border border-neon-500/15 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-neon-500 border-t-transparent animate-spin shrink-0" />
            <div className="text-white/60 text-sm">Searching the Horde…</div>
          </PffCard>
        </div>
      )}

      {searched && !loading && (
        <div className="mt-6 max-w-lg space-y-4">
          {!result?.found ? (
            <PffCard className="p-5 border border-neon-500/15">
              <div className="text-white/60 text-sm">Not in the Horde yet — complete a quest to earn your rank!</div>
            </PffCard>
          ) : (
              <PffCard className="p-6 border border-neon-500/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-neon-500/[0.05] to-transparent pointer-events-none" />
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-500/60 to-transparent" />
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <img src="/assets/logo.png" alt="$PFF" className="w-10 h-10 rounded-xl object-contain drop-shadow-[0_0_12px_rgba(0,232,90,.4)]" />
                    <div>
                      <div className="text-xs font-bold tracking-widest uppercase text-neon-400">⚔️ PFF Passport</div>
                      <div className="text-white font-extrabold text-xl leading-tight mt-0.5">{result.handle}</div>
                      <div className={`text-sm font-bold ${tier.color}`}>{tier.emoji} {tier.label}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-white/50 text-xs uppercase tracking-widest">Rank</div>
                    <div className="text-neon-400 font-extrabold text-4xl text-glow">#{result.rank}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="glass-inner rounded-xl p-3">
                    <div className="text-white/50 text-xs">Total Points</div>
                    <div className="text-neon-300 font-extrabold text-xl">{Number(result.points).toLocaleString()}</div>
                  </div>
                  <div className="glass-inner rounded-xl p-3">
                    <div className="text-white/50 text-xs">Quests Done</div>
                    <div className="text-white font-extrabold text-xl">{result.quests}</div>
                  </div>
                </div>
                {/* Next Tier progress bar */}
                {tier.next ? (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5 text-xs">
                      <span className={tier.color}>{tier.emoji} {tier.label}</span>
                      <span className="text-white/50">{tier.next.emoji} {tier.next.label} — <span className="text-neon-300 font-bold">{tier.next.min - result.points} pts to go</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/40 overflow-hidden border border-neon-500/15">
                      <div
                        className="h-full bg-neon-500/80 shadow-neon transition-all"
                        style={{ width: `${Math.round(((result.points - tier.min) / (tier.next.min - tier.min)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-xs font-bold text-yellow-400">👑 Max tier — War Chief</div>
                )}
                <div className="text-xs text-white/40 mb-4">
                  {new Date().toLocaleString("en", { month: "long", year: "numeric" })}
                </div>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black px-4 py-2.5 text-sm font-bold text-white hover:border-white/40 hover:bg-white/[0.05] transition"
                >
                  <img src="/assets/footer/X.png" alt="X" className="w-3.5 h-3.5 object-contain" />
                  Share on X
                </a>
              </PffCard>
          )}
        </div>
      )}
    </div>
  );
}

function QuestBoard({ quests, milestones = [], backendEnabled }) {
  const [localSubmissions, setLocalSubmissions] = useState([]);
  const [filter, setFilter] = useState({ status: "ALL", type: "ALL", difficulty: "ALL" });
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [toast, setToast] = useState(null);
  const [approvedCount, setApprovedCount] = useState(null);
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    setLocalSubmissions(loadSubmissions());
  }, []);

  const submittedQuestCounts = useMemo(() => {
    const map = new Map();
    for (const s of localSubmissions) {
      map.set(s.questId, (map.get(s.questId) || 0) + 1);
    }
    return map;
  }, [localSubmissions]);

  useEffect(() => {
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .then(({ count }) => { if (count !== null) setApprovedCount(count); });
  }, []);

  const MILESTONES = [10, 30, 50, 100, 200, 500, 1000];
  const prevMilestone = approvedCount !== null ? (MILESTONES.filter((m) => m <= approvedCount).pop() ?? 0) : 0;
  const nextMilestone = approvedCount !== null ? MILESTONES.find((m) => m > approvedCount) : MILESTONES[0];
  const milestonePct = nextMilestone
    ? Math.round(((approvedCount - prevMilestone) / (nextMilestone - prevMilestone)) * 100)
    : 100;

  const filtered = useMemo(() => {
    return (quests || []).filter((q) => {
      const okStatus = filter.status === "ALL" ? true : q.status === filter.status;
      const okType = filter.type === "ALL" ? true : q.type === filter.type;
      const okDiff = filter.difficulty === "ALL" ? true : q.difficulty === filter.difficulty;
      return okStatus && okType && okDiff;
    });
  }, [quests, filter]);


  async function submit(payload) {
    if (backendEnabled) {
      try {
        if (!siteKey) throw new Error("Missing VITE_RECAPTCHA_SITE_KEY");
        const recaptchaToken = await getRecaptchaToken(siteKey, "submit_quest");

        const res = await fetch("/api/submit-quest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, recaptchaToken }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

        setToast({ tone: "good", msg: "Submitted ✅ (pending review)" });
        setTimeout(() => setToast(null), 2500);
        return true;
      } catch (e) {
        if (e.message === "max-submissions") throw e; // re-throw → modal affiche l'erreur
        setToast({ tone: "warn", msg: `Backend not ready (${e.message}). Saved locally.` });
        setTimeout(() => setToast(null), 3200);
      }
    }

    const next = [
      {
        id: `S-${Date.now()}`,
        questId: payload.quest_id,
        questTitle: payload.quest_title,
        createdAt: new Date().toISOString(),
        handle: payload.handle,
        proof: payload.proof,
        note: payload.note,
        type: payload.type,
        difficulty: payload.difficulty,
        status: "pending(local)",
      },
      ...localSubmissions,
    ];
    setLocalSubmissions(next);
    saveSubmissions(next);
    return true;
  }

  return (
    <div id="quests" className="scroll-mt-24">
      <PffSectionTitle
        kicker="Engagement"
        title="Quest Board"
        desc="Pick a quest, submit proof, and earn your place in the Horde."
      />

      {toast ? (
        <div className="mt-4">
          <PffCard className={cx("p-3 border", toast.tone === "good" ? "border-neon-500/25" : "border-yellow-400/25")}>
            <div className={cx("text-sm", toast.tone === "good" ? "text-neon-300" : "text-yellow-200")}>{toast.msg}</div>
          </PffCard>
        </div>
      ) : null}

      <PffCard className="mt-8 p-5 border border-neon-500/15">
        {/* Horde progress bar */}
        {approvedCount !== null && (
          <div className="mb-5 p-4 rounded-xl bg-black/20 border border-neon-500/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/60 font-semibold text-xs">⚔️ Horde Progress</span>
              <span className="text-xs">
                <span className="text-neon-300 font-extrabold">{approvedCount}</span>
                <span className="text-white/40"> approved submissions</span>
              </span>
            </div>

            {/* Milestone chain */}
            <div className="flex items-start">
              {MILESTONES.map((m, i) => {
                const done = approvedCount >= m;
                const isNext = !done && (i === 0 || approvedCount >= MILESTONES[i - 1]);
                const connectorDone = i < MILESTONES.length - 1 && approvedCount >= MILESTONES[i + 1];
                const connectorPartial = i < MILESTONES.length - 1 && !connectorDone && approvedCount >= m;
                return (
                  <React.Fragment key={m}>
                    <div className="flex flex-col items-center shrink-0">
                      <div className={cx(
                        "relative w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold border-2 transition",
                        done
                          ? "border-neon-500 bg-neon-500/25 text-neon-300 shadow-[0_0_12px_rgba(0,232,90,.45)]"
                          : isNext
                          ? "border-neon-500/50 bg-black/30 text-neon-300/70"
                          : "border-white/10 bg-black/20 text-white/20"
                      )}>
                        {done
                          ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <span>{m >= 1000 ? "1k" : m}</span>
                        }
                        {isNext && <span className="absolute inset-0 rounded-full border border-neon-500/40 animate-ping" />}
                      </div>
                      <span className={cx("text-[9px] font-mono mt-1", done ? "text-neon-300/60" : isNext ? "text-white/45" : "text-white/15")}>
                        {m >= 1000 ? "1k" : m}
                      </span>
                    </div>

                    {i < MILESTONES.length - 1 && (
                      <div className="flex-1 relative mt-4 h-0.5 mx-0.5">
                        <div className="absolute inset-0 rounded-full bg-white/8" />
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full bg-neon-500/70 shadow-[0_0_6px_rgba(0,232,90,.5)]"
                          initial={{ width: 0 }}
                          animate={{ width: connectorDone ? "100%" : connectorPartial ? `${milestonePct}%` : "0%" }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {nextMilestone && (
              <div className="mt-3 text-center text-[11px] text-white/35">
                <span className="text-neon-300 font-extrabold">{approvedCount}</span>
                <span className="text-white/40"> approved submissions — </span>
                <span className="text-white/55 font-semibold">{nextMilestone - approvedCount} more to reach {nextMilestone}</span>
              </div>
            )}
          </div>
        )}
        {/* Type quick-filter pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {["ALL", "raid", "art", "lore", "oracle"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter((f) => ({ ...f, type: t }))}
              className={cx(
                "rounded-full border px-4 py-1.5 text-xs font-bold transition",
                filter.type === t
                  ? "border-neon-500/60 bg-neon-500/20 text-neon-300 shadow-neon"
                  : "border-white/15 bg-black/20 text-white/60 hover:border-neon-500/30 hover:text-white/85"
              )}
            >
              {t === "ALL" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {/* Status + Difficulty selects */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select label="Status" value={filter.status} onChange={(v) => setFilter((f) => ({ ...f, status: v }))} options={["ALL", "LIVE", "UPCOMING", "ENDED"]} />
          <Select label="Difficulty" value={filter.difficulty} onChange={(v) => setFilter((f) => ({ ...f, difficulty: v }))} options={["ALL", "easy", "medium", "hard"]} />
        </div>

        <div className="mt-5 max-h-[720px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neon-500/20">
        <div className="grid gap-4 md:grid-cols-3">
          {filtered.map((q) => (
            <div key={q.id} role="button" tabIndex={0} className="text-left h-full cursor-pointer"
              onClick={() => setSelectedQuest(q)}
              onKeyDown={(e) => e.key === "Enter" && setSelectedQuest(q)}
            >
              <div className="glass rounded-2xl p-6 border border-neon-500/15 hover:border-neon-500/45 hover:shadow-[0_0_60px_rgba(0,232,90,.18)] transition h-full flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-extrabold text-lg">{q.title}</div>
                    <div className="mt-1 text-xs text-white/60">
                      {q.id} • {q.window}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {submittedQuestCounts.has(q.id) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-neon-500/40 bg-neon-500/10 text-neon-300">
                          ✓ {submittedQuestCounts.get(q.id)}{q.max_submissions_per_user > 0 ? `/${q.max_submissions_per_user}` : ""}
                        </span>
                      )}
                      <button
                        type="button"
                        title="Share on X"
                        onClick={(e) => {
                          e.stopPropagation();
                          const text = encodeURIComponent(
                            `⚔️ New quest on $PFF!\n\n"${q.title}"\nEarn ${q.points > 0 ? `${q.points} pts` : "rewards"} 🪙\n\nComplete it here 👇\npumpfunfloki.com/#quests\n\n#PFF #PumpFunFloki $PFF`
                          );
                          window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded-full border border-white/20 bg-black/30 text-white/50 hover:border-neon-500/50 hover:text-neon-300 hover:bg-neon-500/10 transition"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.261 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </button>
                      <Badge tone={q.status === "LIVE" ? "good" : q.status === "UPCOMING" ? "warn" : "neutral"}>{q.status}</Badge>
                    </div>
                    <Badge>{q.type}</Badge>
                    <QuestCountdown expiresAt={q.expires_at} />
                  </div>
                </div>

                <p className="mt-3 text-sm text-white/75 leading-relaxed whitespace-pre-line">{q.desc}</p>

                {/* Reward highlight block */}
                {(q.reward || q.fixed_reward_amount > 0 || (q.vote_threshold > 0 && q.vote_bonus_amount > 0)) && (
                  <div className="mt-4 rounded-xl border border-yellow-400/25 bg-yellow-400/[0.06] px-4 py-3 flex flex-col gap-2">
                    {q.reward && (
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-300 text-base">🎁</span>
                        <div className="text-yellow-200 font-bold text-sm leading-snug">{q.reward}</div>
                      </div>
                    )}
                    {q.fixed_reward_amount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-300 text-base">💰</span>
                        <div>
                          <div className="text-yellow-200 font-extrabold text-sm leading-tight">
                            {Number(q.fixed_reward_amount).toLocaleString()} ${(q.fixed_reward_token || "pff").toUpperCase()}
                          </div>
                          <div className="text-yellow-400/60 text-[10px]">fixed reward per submission</div>
                        </div>
                      </div>
                    )}
                    {q.vote_threshold > 0 && q.vote_bonus_amount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300 text-base">🗳️</span>
                        <div>
                          <div className="text-purple-200 font-extrabold text-sm leading-tight">
                            {Number(q.vote_bonus_amount).toLocaleString()} ${(q.vote_bonus_token || "pff").toUpperCase()}
                          </div>
                          <div className="text-purple-400/60 text-[10px]">bonus unlocked at {q.vote_threshold} votes</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-4 flex flex-wrap gap-2">
                  <Badge>{q.difficulty}</Badge>
                  <Badge>proof: {q.proofType}</Badge>
                  {q.points > 0 && <Badge tone="good">{q.points} pts</Badge>}
                  {q.milestone_id && (() => {
                    const ms = milestones.find((m) => m.id === q.milestone_id);
                    return ms ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-neon-500/25 bg-neon-500/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-neon-400/80">
                        → {ms.label}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </PffCard>

      {selectedQuest ? (
        <SubmitProofModal
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          onSubmit={async (payload) => {
            await submit({
              quest_id: selectedQuest.id,
              quest_title: selectedQuest.title,
              type: selectedQuest.type,
              difficulty: selectedQuest.difficulty,
              handle: payload.handle,
              proof: payload.proof,
              note: payload.note,
              wallet_address: payload.wallet_address,
            });
            setSelectedQuest(null);
          }}
        />
      ) : null}

      <LocalPendingPanel localSubmissions={localSubmissions} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2">
      <span className="text-xs text-white/60">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-sm text-white/90 outline-none">
        {options.map((o) => (
          <option key={o} value={o} className="bg-black">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitProofModal({ quest, onClose, onSubmit }) {
  const [handle, setHandle] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [proof, setProof] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const placeholder =
    quest.proofType === "image" ? "Paste an image link (upload later)" :
    quest.proofType === "link" ? "Paste the link(s) to your post/thread)" :
    "Paste your text proof here";

  const canSubmit = handle.trim().length > 0 && proof.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setErrMsg("");
    setSubmitting(true);

    try {
      await onSubmit({ handle: handle.trim(), proof: proof.trim(), note: note.trim(), wallet_address: walletAddress.trim() });
    } catch (e) {
      const msg = e?.message === "max-submissions"
        ? "⚠️ Max 3 submissions per quest reached."
        : e?.message || "Submission failed. Please try again.";
      setErrMsg(msg);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => !submitting && onClose?.()} />

      <div className="relative w-full max-w-lg glass rounded-2xl border border-neon-500/20 shadow-[0_0_90px_rgba(0,232,90,.22)]">
        <div className="p-5 border-b border-neon-500/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-white font-extrabold text-lg">Submit Proof</div>
              <div className="mt-1 text-xs text-white/60 break-words">
                {quest.id} • {quest.title}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{quest.type}</Badge>
                <Badge>{quest.difficulty}</Badge>
                {quest.points > 0 && <Badge tone="good">{quest.points} pts</Badge>}
              </div>
            </div>

            <button
              className="rounded-xl border border-neon-500/15 px-3 py-2 text-white/80 hover:text-white hover:border-neon-500/40 disabled:opacity-50"
              onClick={() => !submitting && onClose?.()}
              type="button"
              disabled={submitting}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {errMsg ? <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{errMsg}</div> : null}

          <div>
            <div className="text-xs text-white/60">Your handle (X / TG)</div>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
              placeholder="@yourhandle"
              autoFocus
              disabled={submitting}
            />
          </div>

          <div>
            <div className="text-xs text-white/60">Solana wallet address <span className="text-white/40">(optional — for $PFF airdrops)</span></div>
            <input
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40 font-mono"
              placeholder="Your Solana address (e.g. 9zJc...tV2v)"
              disabled={submitting}
            />
            <div className="mt-1 text-[11px] text-white/45">Used to receive $PFF rewards if your proof is approved.</div>
          </div>

          <div>
            <div className="text-xs text-white/60">Proof</div>
            <textarea
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
              placeholder={placeholder}
              disabled={submitting}
            />
            <div className="mt-1 text-[11px] text-white/45">Tip: put a direct link to your tweet / thread or a short text proof.</div>
          </div>

          <div>
            <div className="text-xs text-white/60">Note (optional)</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
              placeholder="Anything the Horde should know?"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="p-5 border-t border-neon-500/10 flex items-center justify-between gap-3">
          <div className="text-xs text-white/55">No spam / no hate / no doxxing.</div>
          <button
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-extrabold bg-neon-500 text-black shadow-neonStrong hover:bg-neon-400 transition disabled:opacity-40"
            disabled={!canSubmit}
            onClick={handleSubmit}
            type="button"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}



function LocalPendingPanel({ localSubmissions }) {
  if (!localSubmissions?.length) return null;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_0_12px_rgba(0,232,90,.25)]">Pending Proofs — Awaiting Judgment</div>
        <span className="inline-flex items-center rounded-full 
          px-4 py-1.5 text-sm font-semibold
          bg-black/40 
          border border-neon-500/40 
          text-neon-300 
          shadow-[0_0_18px_rgba(0,232,90,.35)] 
          backdrop-blur-sm">
            Awaiting Judgment
        </span>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {localSubmissions.slice(0, 6).map((s) => (
          <PffCard key={s.id} className="p-5 border border-neon-500/15">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white font-extrabold truncate">{s.handle}</div>
                <div className="text-xs text-white/60">{new Date(s.createdAt).toLocaleString()}</div>
              </div>
              <Badge tone="good">{s.questId}</Badge>
            </div>
            <div className="mt-4 text-sm text-white/85 leading-relaxed line-clamp-4">{s.proof}</div>
            {s.note ? <div className="mt-2 text-xs text-white/60">Note: {s.note}</div> : null}
          </PffCard>
        ))}
      </div>

      <div className="mt-4 text-sm text-white/85 drop-shadow-[0_0_6px_rgba(0,232,90,.2)]">Awaiting judgment. The Council will review your proof.</div>
    </div>
  );
}

