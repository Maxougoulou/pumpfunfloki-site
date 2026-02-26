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
  { id: "M-001", label: "Horde Awakening", metric: "Market Cap", target: 250000, current: 172000, unit: "$", reward: "Buyback #1 + Swarm boost" },
  { id: "M-002", label: "Raid Season", metric: "24h Volume", target: 150000, current: 62000, unit: "$", reward: "Burn #1 (threshold)" },
  { id: "M-003", label: "Saga Breakout", metric: "Holders", target: 2500, current: 1860, unit: "", reward: "Oracle Week + Quest pack" },
];

const DEFAULT_BUYBACK_THRESHOLDS = [
  { id: "B-001", trigger: "Market Cap ≥ $250k", action: "Buyback", amount: "X% of fees wallet", execution: "Deterministic (manual proof on-chain)", status: "Standby" },
  { id: "B-002", trigger: "24h Volume ≥ $150k", action: "Burn", amount: "Y tokens", execution: "Deterministic (threshold)", status: "Standby" },
  { id: "B-003", trigger: "Holders ≥ 2,500", action: "Buyback + Raid Budget", amount: "Z% split", execution: "Deterministic (announced schedule)", status: "Standby" },
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
        const { data, error } = await supabase.from("leaderboard").select("pseudo, points, last_update").order("points", { ascending: false }).limit(10);
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
          .select("id, quest_id, handle, proof, note, status, type, difficulty, points_awarded, created_at")
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

function usePublicQuests(refreshMs = 45000) {
  const [state, setState] = useState({ loading: true, error: null, rows: [], updatedAt: null });

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function run() {
      try {
        const { data, error } = await supabase
          .from("quests")
          .select("id, title, description, type, difficulty, reward, proof_type, time_window, status, points, created_at")
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

        {desc ? <p className="mt-3 text-base text-white/80 drop-shadow-[0_0_10px_rgba(0,0,0,.6)] max-w-3xl leading-relaxed">{desc}</p> : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  const cls =
    tone === "good" ? "border-neon-500/35 text-neon-300 shadow-neon" :
    tone === "warn" ? "border-yellow-400/30 text-yellow-200" :
    tone === "bad" ? "border-red-400/30 text-red-200" :
    "border-white/10 text-white/80";

  return <span className={cx("inline-flex items-center gap-2 rounded-full border bg-black/30 px-3 py-1 text-xs", cls)}>{children}</span>;
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

/** ------------ REALTIME BAR ------------- */
function RealtimeSwarmBar({ dexStatus, swarmScore01, weights, configLoading }) {
  const scorePct = Math.round(clamp01(swarmScore01) * 100);

  return (
    <div className="sticky top-4 z-[50]">
      <PffCard className="p-4 border border-neon-500/15 shadow-[0_0_80px_rgba(0,232,90,.12)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={dexStatus?.error ? "warn" : dexStatus?.loading ? "neutral" : "good"}>Dex: {dexStatus?.loading ? "loading…" : dexStatus?.error ? "offline" : "live"}</Badge>
            <Badge>Price: <span className="text-white/90">{dexStatus?.priceUsd ? `$${dexStatus.priceUsd.toFixed(8)}` : "—"}</span></Badge>
            <Badge>MCAP: <span className="text-white/90">{dexStatus?.mcapUsd ? `$${formatNumber(Math.round(dexStatus.mcapUsd))}` : "—"}</span></Badge>
            <Badge>Vol 24h: <span className="text-white/90">{dexStatus?.vol24Usd ? `$${formatNumber(Math.round(dexStatus.vol24Usd))}` : "—"}</span></Badge>
            <Badge>Liq: <span className="text-white/90">{dexStatus?.liquidityUsd ? `$${formatNumber(Math.round(dexStatus.liquidityUsd))}` : "—"}</span></Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-white/60">Swarm Score</div>
              <div className="text-white font-extrabold text-lg">
                {scorePct}
                <span className="text-white/50">/100</span>
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
    </div>
  );
}

/** ------------ EXPORT ------------- */
export default function PFFSwarmOracleHub({
  contract,
  quests = DEFAULT_QUESTS,
  milestones = DEFAULT_MILESTONES,
  buybackThresholds = DEFAULT_BUYBACK_THRESHOLDS,
}) {
  const dex = useDexScreenerToken(contract, 30000);
  const pair = dex.pair;

  const cfg = usePffConfig(60000);
  const leaderboard = usePublicLeaderboard(45000);
  const logs = useExecutionLogs(60000);
  const approved = useApprovedSubmissions(45000);

  // ✅ quests from DB (public)
  const publicQuests = usePublicQuests(45000);

  const settings = cfg.settings || null;
  const rules = cfg.rules || null;

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

  const basePoints = useMemo(() => safeJson(rules?.base_points, { raid: 10, art: 15, lore: 8, oracle: 12 }), [rules]);
  const multipliers = useMemo(() => safeJson(rules?.difficulty_multipliers, { easy: 1, medium: 1.5, hard: 2 }), [rules]);

  // map DB quests -> UI quests
  const questsFromDb = useMemo(() => {
    return (publicQuests.rows || []).map((q) => ({
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
    }));
  }, [publicQuests.rows]);

  const questsToShow = useMemo(() => (questsFromDb.length ? questsFromDb : quests), [questsFromDb, quests]);

  // live stats (dex)
  const liveMcap = Number(pair?.marketCap || pair?.fdv || 0);
  const liveVol24h = Number(pair?.volume?.h24 || 0);
  const liveLiq = Number(pair?.liquidity?.usd || 0);
  const livePrice = Number(pair?.priceUsd || 0);

  const liveMilestones = useMemo(() => {
    return milestones.map((m) => {
      if (m.metric === "Market Cap") return { ...m, current: liveMcap || m.current };
      if (m.metric === "24h Volume") return { ...m, current: liveVol24h || m.current };
      return m;
    });
  }, [milestones, liveMcap, liveVol24h]);

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

  // dynamic thresholds
  const liveStats = useMemo(() => {
    const mcap = Number(pair?.marketCap || pair?.fdv || 0);
    const vol24 = Number(pair?.volume?.h24 || 0);
    const holders = Number((liveMilestones.find((m) => m.metric === "Holders")?.current) ?? 0);
    return { mcap, vol24, holders };
  }, [pair, liveMilestones]);

  const dynamicThresholds = useMemo(() => {
    return buybackThresholds.map((row) => {
      const trig = (row.trigger || "").toLowerCase();
      const mcapReady = liveStats.mcap >= 250000;
      const volReady = liveStats.vol24 >= 150000;
      const holdersReady = liveStats.holders >= 2500;

      let ready = false;
      if (trig.includes("market cap")) ready = mcapReady;
      else if (trig.includes("24h volume")) ready = volReady;
      else if (trig.includes("holders")) ready = holdersReady;

      return { ...row, status: ready ? "Ready" : "Standby" };
    });
  }, [buybackThresholds, liveStats]);

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
    <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <HordeSurgeToast hits={justHit} />

      <div className="space-y-12">
        <RealtimeSwarmBar dexStatus={dexStatus} swarmScore01={swarmScore01} weights={weights} configLoading={cfg.loading} />

        <TheSwarmSection basePoints={basePoints} multipliers={multipliers} />
        <TheOracleSection />

        <MilestonesCounter milestones={liveMilestones} dexStatus={dexStatus} justHit={justHit} />

        <div className="grid gap-5 md:grid-cols-2">
          <LeaderboardPanel leaderboard={leaderboard} />
          <ExecutionTimeline logs={logs} />
        </div>

        <QuestBoard
          quests={questsToShow}
          basePoints={basePoints}
          multipliers={multipliers}
          backendEnabled={Boolean(safeJson(settings?.feature_toggles, { use_backend: false })?.use_backend)}
        />

        <BuybackThresholdsTable rows={dynamicThresholds} />
      </div>
    </section>
  );
}

/** ------------ SECTIONS ------------- */
function TheSwarmSection({ basePoints, multipliers }) {
  return (
    <div id="swarm" className="scroll-mt-24">
      <PffSectionTitle
        kicker="Protocol"
        title="The Swarm"
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
              <div className="text-white font-extrabold">Scoring (live rules)</div>
              <div className="mt-1 text-sm text-white/70">base(type) × multiplier(difficulty) + bonus (admin). Fully configurable.</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(basePoints || {}).map(([k, v]) => (
                <Badge key={k} tone="good">
                  {k}: {v} pts
                </Badge>
              ))}
              {Object.entries(multipliers || {}).map(([k, v]) => (
                <Badge key={k}>
                  {k}: ×{v}
                </Badge>
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

/** ------------ MILESTONES ------------- */
function MilestonesCounter({ milestones, dexStatus, justHit = [] }) {
  const total = milestones.length;
  const completed = milestones.filter((m) => (m.current ?? 0) >= (m.target ?? 0)).length;

  return (
    <div id="milestones" className="scroll-mt-24">
      <PffSectionTitle
        kicker="Tracking"
        title="Milestones"
        desc="Live progress toward deterministic triggers."
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
              <PffCard className="p-6 border border-neon-500/15 hover:border-neon-500/35 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-extrabold text-lg">{m.label}</div>
                    <div className="mt-1 text-xs text-white/60">
                      {m.metric} • Target {m.unit}
                      {formatNumber(target)}
                    </div>
                  </div>
                  {done ? <Badge tone="good">DONE</Badge> : <Badge tone="neutral">IN PROGRESS</Badge>}
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** ------------ LEADERBOARD ------------- */
function LeaderboardPanel({ leaderboard }) {
  return (
    <div id="leaderboard" className="scroll-mt-24">
      <PffSectionTitle kicker="Ranking" title="Leaderboard" desc="Top Vikings by verified points." right={<Badge tone="good">Top 10</Badge>} />

      <PffCard className="mt-8 overflow-hidden border border-neon-500/15">
        <div className="p-4 border-b border-neon-500/10 flex items-center justify-between">
          <div className="text-white font-extrabold">Horde Champions</div>
          <div className="text-xs text-white/55">{leaderboard.loading ? "Loading…" : leaderboard.error ? "Offline" : "Live"}</div>
        </div>

        <div className="divide-y divide-neon-500/10">
          {(leaderboard.rows || []).length ? (
            leaderboard.rows.map((r, idx) => (
              <div key={r.pseudo} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cx(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold border",
                      idx === 0 ? "border-neon-500/50 bg-neon-500 text-black" : "border-neon-500/15 bg-black/20 text-white/80"
                    )}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-white font-bold truncate">{r.pseudo}</div>
                    <div className="text-xs text-white/55">{r.last_update ? new Date(r.last_update).toLocaleDateString() : ""}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-white font-extrabold">{formatNumber(Number(r.points || 0))}</div>
                  <div className="text-xs text-white/55">points</div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-white/60">No data yet.</div>
          )}
        </div>
      </PffCard>
    </div>
  );
}

/** ------------ EXECUTION LOGS ------------- */
function ExecutionTimeline({ logs }) {
  return (
    <div id="execution" className="scroll-mt-24">
      <PffSectionTitle kicker="Transparency" title="Execution Logs" desc="Every action is logged with proof — buybacks, burns, events." right={<Badge tone="good">Public</Badge>} />

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
function QuestBoard({ quests, basePoints, multipliers, backendEnabled }) {
  const [localSubmissions, setLocalSubmissions] = useState([]);
  const [filter, setFilter] = useState({ status: "ALL", type: "ALL", difficulty: "ALL" });
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [toast, setToast] = useState(null);
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    setLocalSubmissions(loadSubmissions());
  }, []);

  const filtered = useMemo(() => {
    return (quests || []).filter((q) => {
      const okStatus = filter.status === "ALL" ? true : q.status === filter.status;
      const okType = filter.type === "ALL" ? true : q.type === filter.type;
      const okDiff = filter.difficulty === "ALL" ? true : q.difficulty === filter.difficulty;
      return okStatus && okType && okDiff;
    });
  }, [quests, filter]);

  function calcScorePreview(type, difficulty) {
    const b = Number(basePoints?.[type] ?? 0);
    const m = Number(multipliers?.[difficulty] ?? 1);
    return Math.round(b * m);
  }

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

        setToast({ tone: "good", msg: "Submitted to backend ✅ (pending review)" });
        setTimeout(() => setToast(null), 2500);
        return true;
      } catch (e) {
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
        right={
          <div className="flex items-center gap-2">
            <Badge>Public proofs: OFF</Badge>
            <Badge>{backendEnabled ? "Backend: ON" : "Backend: OFF"}</Badge>
          </div>
        }
      />

      {toast ? (
        <div className="mt-4">
          <PffCard className={cx("p-3 border", toast.tone === "good" ? "border-neon-500/25" : "border-yellow-400/25")}>
            <div className={cx("text-sm", toast.tone === "good" ? "text-neon-300" : "text-yellow-200")}>{toast.msg}</div>
          </PffCard>
        </div>
      ) : null}

      <PffCard className="mt-8 p-5 border border-neon-500/15">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
          <div className="text-white font-extrabold">Filters</div>
          <div className="flex flex-wrap gap-3">
            <Select label="Status" value={filter.status} onChange={(v) => setFilter((f) => ({ ...f, status: v }))} options={["ALL", "LIVE", "UPCOMING", "ENDED"]} />
            <Select label="Type" value={filter.type} onChange={(v) => setFilter((f) => ({ ...f, type: v }))} options={["ALL", "lore", "art", "raid", "oracle"]} />
            <Select label="Difficulty" value={filter.difficulty} onChange={(v) => setFilter((f) => ({ ...f, difficulty: v }))} options={["ALL", "easy", "medium", "hard"]} />
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {filtered.map((q) => (
            <button key={q.id} type="button" className="text-left" onClick={() => setSelectedQuest(q)}>
              <div className="glass rounded-2xl p-6 border border-neon-500/15 hover:border-neon-500/45 hover:shadow-[0_0_60px_rgba(0,232,90,.18)] transition cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-extrabold text-lg">{q.title}</div>
                    <div className="mt-1 text-xs text-white/60">
                      {q.id} • {q.window}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={q.status === "LIVE" ? "good" : q.status === "UPCOMING" ? "warn" : "neutral"}>{q.status}</Badge>
                    <Badge>{q.type}</Badge>
                  </div>
                </div>

                <p className="mt-3 text-sm text-white/80 leading-relaxed">{q.desc}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge>{q.difficulty}</Badge>
                  <Badge tone="good">{q.reward}</Badge>
                  <Badge>proof: {q.proofType}</Badge>
                  <Badge tone="good">
                    score: {typeof q.points === "number" && q.points > 0 ? q.points : calcScorePreview(q.type, q.difficulty)} pts
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PffCard>

      {selectedQuest ? (
        <SubmitProofModal
          quest={selectedQuest}
          calcScorePreview={calcScorePreview}
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

function SubmitProofModal({ quest, onClose, onSubmit, calcScorePreview }) {
  const [handle, setHandle] = useState("");
  const [proof, setProof] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const placeholder =
    quest.proofType === "image" ? "Paste an image link (upload later)" :
    quest.proofType === "link" ? "Paste the link(s) to your post/thread)" :
    "Paste your text proof here";

  const scorePreview = typeof calcScorePreview === "function" ? calcScorePreview(quest.type, quest.difficulty) : null;
  const canSubmit = handle.trim().length > 0 && proof.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setErrMsg("");
    setSubmitting(true);

    try {
      await onSubmit({ handle: handle.trim(), proof: proof.trim(), note: note.trim() });
    } catch (e) {
      setErrMsg(e?.message || "Submission failed. Please try again.");
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
                {scorePreview !== null ? <Badge tone="good">score: {scorePreview} pts</Badge> : null}
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
        <div className="text-white font-extrabold text-lg">Pending Proofs — Awaiting Judgment</div>
        <Badge>Awaiting Judgment</Badge>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {localSubmissions.slice(0, 6).map((s) => (
          <PffCard key={s.id} className="p-5 border border-neon-500/15">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white font-extrabold truncate">{s.handle}</div>
                <div className="text-xs text-white/60">{new Date(s.createdAt).toLocaleString()}</div>
              </div>
              <Badge>{s.questId}</Badge>
            </div>
            <div className="mt-4 text-sm text-white/85 leading-relaxed line-clamp-4">{s.proof}</div>
            {s.note ? <div className="mt-2 text-xs text-white/60">Note: {s.note}</div> : null}
          </PffCard>
        ))}
      </div>

      <div className="mt-3 text-xs text-white/50">Awaiting judgment. The Council will review your proof.</div>
    </div>
  );
}

/** ------------ BUYBACK TABLE ------------- */
function BuybackThresholdsTable({ rows }) {
  return (
    <div id="thresholds" className="scroll-mt-24">
      <PffSectionTitle kicker="Rules" title="Buyback Thresholds" desc="Transparent triggers. Deterministic actions. Proof-based execution." />

      <PffCard className="mt-8 overflow-hidden border border-neon-500/15">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/30">
              <tr className="text-left text-white/75">
                <th className="px-4 py-3 font-extrabold">Trigger</th>
                <th className="px-4 py-3 font-extrabold">Action</th>
                <th className="px-4 py-3 font-extrabold">Amount</th>
                <th className="px-4 py-3 font-extrabold">Execution</th>
                <th className="px-4 py-3 font-extrabold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neon-500/10">
              {rows.map((r) => (
                <tr key={r.id} className="text-white/85">
                  <td className="px-4 py-3">{r.trigger}</td>
                  <td className="px-4 py-3">
                    <Badge tone={String(r.action).toLowerCase().includes("burn") ? "warn" : "good"}>{r.action}</Badge>
                  </td>
                  <td className="px-4 py-3">{r.amount}</td>
                  <td className="px-4 py-3 text-white/70">{r.execution}</td>
                  <td className="px-4 py-3">
                    <Badge tone={r.status === "Ready" ? "good" : "neutral"}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PffCard>
    </div>
  );
}