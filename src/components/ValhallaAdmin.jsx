import { useEffect, useState } from "react";

async function getRecaptchaToken(siteKey, action) {
  return new Promise((resolve, reject) => {
    if (!window.grecaptcha) return reject(new Error("reCAPTCHA not loaded"));
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(siteKey, { action }).then(resolve).catch(reject);
    });
  });
}

function Card({ children }) {
  return <div className="glass rounded-2xl border border-neon-500/15 p-6">{children}</div>;
}

function Btn({ children, onClick, tone = "solid", disabled = false, className = "" }) {
  const base = "rounded-xl px-4 py-2 text-sm font-extrabold transition";
  const solid = "bg-neon-500 text-black shadow-neonStrong hover:bg-neon-400";
  const outline = "border border-neon-500/25 text-white/85 hover:border-neon-500/55";
  const danger = "bg-red-600 text-white hover:bg-red-500 shadow";
  const warn = "bg-amber-500 text-black hover:bg-amber-400 shadow";
  const map = { solid, outline, danger, warn };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${map[tone] ?? solid} ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Truncate tx signature for display ──────────────────────────────
function TxLink({ sig }) {
  if (!sig) return null;
  return (
    <a
      href={`https://solscan.io/tx/${sig}`}
      target="_blank"
      rel="noreferrer"
      className="text-neon-300 hover:underline text-xs break-all"
    >
      {sig.slice(0, 20)}…{sig.slice(-8)}
    </a>
  );
}

// ── Airdrop modal ──────────────────────────────────────────────────
function AirdropModal({ subs, selectedIds, onClose }) {
  const [amount, setAmount] = useState("50000");
  const [dryRun, setDryRun] = useState(null);
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const eligibleSubs = subs.filter(
    (s) => selectedIds.has(s.id) && s.wallet_address
  );
  const missingWallet = subs.filter(
    (s) => selectedIds.has(s.id) && !s.wallet_address
  );

  async function handleDryRun() {
    setErr("");
    setDryRun(null);
    const entries = eligibleSubs.map((s) => ({
      submission_id: s.id,
      wallet_address: s.wallet_address,
      handle: s.handle,
    }));
    const r = await fetch("/api/airdrop-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ entries, amount_per_wallet: Number(amount), dry_run: true }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(j?.message || j?.error || "error"); return; }
    setDryRun(j);
  }

  async function handleSend() {
    if (!dryRun) return;
    setSending(true);
    setErr("");
    const entries = eligibleSubs.map((s) => ({
      submission_id: s.id,
      wallet_address: s.wallet_address,
      handle: s.handle,
    }));
    const r = await fetch("/api/airdrop-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ entries, amount_per_wallet: Number(amount), dry_run: false }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(j?.message || j?.error || "error"); setSending(false); return; }
    setResult(j);
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl border border-neon-500/20 p-6 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-white font-extrabold text-xl">Distribute Airdrop</div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-black/30 p-3">
            <div className="text-white/50 text-xs">Valid wallets</div>
            <div className="text-neon-300 font-extrabold text-lg">{eligibleSubs.length}</div>
          </div>
          <div className="rounded-xl bg-black/30 p-3">
            <div className="text-white/50 text-xs">Missing wallet</div>
            <div className={`font-extrabold text-lg ${missingWallet.length > 0 ? "text-yellow-300" : "text-white/40"}`}>
              {missingWallet.length}
            </div>
          </div>
        </div>

        {missingWallet.length > 0 && (
          <div className="mt-3 rounded-xl bg-yellow-900/20 border border-yellow-500/20 p-3 text-xs text-yellow-200">
            {missingWallet.length} selected submission(s) have no wallet address and will be skipped:
            {" "}{missingWallet.map((s) => s.handle).join(", ")}
          </div>
        )}

        {/* Amount input */}
        {!result && (
          <div className="mt-5">
            <div className="text-xs text-white/60">Amount per wallet ($PFF)</div>
            <input
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setDryRun(null); }}
              type="number"
              min="1"
              className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
              placeholder="50000"
            />
            <div className="mt-1 text-[11px] text-white/40">
              Total: {(eligibleSubs.length * Number(amount || 0)).toLocaleString()} $PFF
            </div>
          </div>
        )}

        {/* Dry run preview */}
        {dryRun && !result && (
          <div className="mt-4 rounded-xl bg-black/30 border border-neon-500/10 p-4 text-sm">
            <div className="text-neon-300 font-extrabold mb-2">Preview</div>
            <div className="grid gap-1 text-white/80">
              <div>Valid wallets: <span className="text-white font-bold">{dryRun.valid_count}</span></div>
              <div>Total $PFF: <span className="text-white font-bold">{dryRun.total_pff?.toLocaleString()}</span></div>
              {dryRun.invalid_count > 0 && (
                <div className="text-yellow-200">Skipped (invalid pubkey): {dryRun.invalid_count}</div>
              )}
            </div>
            <div className="mt-3 text-xs text-white/40">
              Ensure rewards wallet has sufficient $PFF and SOL for rent/fees.
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-4 rounded-xl bg-green-900/20 border border-green-500/20 p-4">
            <div className="text-green-300 font-extrabold mb-2">Airdrop sent!</div>
            <div className="text-white/70 text-sm mb-3">
              {result.total_sent} wallets credited. Execution log auto-published.
            </div>
            <div className="grid gap-2">
              {result.results?.map((r, i) => (
                <div key={i} className="text-xs">
                  <span className="text-white/50">TX {i + 1} ({r.count} wallets): </span>
                  <TxLink sig={r.tx_signature} />
                </div>
              ))}
            </div>
            {result.errors?.length > 0 && (
              <div className="mt-3 text-yellow-200 text-xs">
                {result.errors.length} error(s): {result.errors.map((e) => e.wallet?.slice(0, 8)).join(", ")}
              </div>
            )}
          </div>
        )}

        {err && <div className="mt-3 text-sm text-red-300">{err}</div>}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-3">
          {!result && (
            <>
              <Btn
                tone="outline"
                onClick={handleDryRun}
                disabled={sending || !amount || eligibleSubs.length === 0}
              >
                Dry Run (Preview)
              </Btn>
              <Btn
                onClick={handleSend}
                disabled={sending || !dryRun || !amount || eligibleSubs.length === 0}
              >
                {sending ? "Sending…" : "Confirm & Send Airdrop"}
              </Btn>
            </>
          )}
          <Btn tone="outline" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Burn modal ─────────────────────────────────────────────────────
function BurnModal({ prefillAmount = "", prefillReason = "", onClose, onSuccess }) {
  const [amount, setAmount] = useState(String(prefillAmount));
  const [reason, setReason] = useState(prefillReason);
  const [dryRun, setDryRun] = useState(null);
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  async function handleDryRun() {
    setErr("");
    setDryRun(null);
    const r = await fetch("/api/burn-tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount: Number(amount), reason, dry_run: true }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(j?.message || j?.error || "error"); return; }
    setDryRun(j);
  }

  async function handleBurn() {
    if (!dryRun) return;
    setSending(true);
    setErr("");
    const r = await fetch("/api/burn-tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount: Number(amount), reason, dry_run: false }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(j?.message || j?.error || "error"); setSending(false); return; }
    setResult(j);
    setSending(false);
    onSuccess?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl border border-red-500/20 p-6 w-full max-w-md">
        <div className="flex items-center justify-between gap-4">
          <div className="text-white font-extrabold text-xl">🔥 Trigger Burn</div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none">✕</button>
        </div>

        {!result && (
          <div className="mt-5 grid gap-4">
            <div>
              <div className="text-xs text-white/60">Amount to burn ($PFF)</div>
              <input
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setDryRun(null); }}
                type="number"
                min="1"
                className="mt-2 w-full rounded-xl border border-red-500/20 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-red-500/40"
                placeholder="500000"
              />
            </div>
            <div>
              <div className="text-xs text-white/60">Reason (appears in Execution Log)</div>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                placeholder="Milestone 50 — Horde Awakens burn"
              />
            </div>
          </div>
        )}

        {dryRun && !result && (
          <div className="mt-4 rounded-xl bg-red-900/20 border border-red-500/15 p-4 text-sm">
            <div className="text-red-300 font-extrabold mb-2">Burn Preview</div>
            <div className="text-white/80">
              Amount: <span className="text-white font-bold">{Number(amount).toLocaleString()} $PFF</span>
            </div>
            <div className="text-white/80">
              Rewards wallet: <span className="text-white/60 text-xs font-mono">{dryRun.rewards_wallet}</span>
            </div>
            <div className="mt-2 text-xs text-red-300/70">
              This action is IRREVERSIBLE. Tokens will be permanently destroyed.
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-xl bg-red-900/20 border border-red-500/20 p-4">
            <div className="text-red-300 font-extrabold mb-2">Burn executed!</div>
            <div className="text-white/70 text-sm mb-2">
              {Number(result.amount_burned).toLocaleString()} $PFF permanently destroyed.
            </div>
            <TxLink sig={result.tx_signature} />
            <div className="mt-2 text-xs text-white/40">Execution log auto-published.</div>
          </div>
        )}

        {err && <div className="mt-3 text-sm text-red-300">{err}</div>}

        <div className="mt-5 flex flex-wrap gap-3">
          {!result && (
            <>
              <Btn tone="outline" onClick={handleDryRun} disabled={sending || !amount}>
                Dry Run (Preview)
              </Btn>
              <Btn tone="danger" onClick={handleBurn} disabled={sending || !dryRun || !amount}>
                {sending ? "Burning…" : "Confirm Burn"}
              </Btn>
            </>
          )}
          <Btn tone="outline" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Actions tab — Milestones + Burn ───────────────────────────────
function ActionsTab() {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [burnModal, setBurnModal] = useState(false);
  const [burnPrefill, setBurnPrefill] = useState({ amount: "", reason: "" });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/check-milestone", { credentials: "include" });
    const j = await r.json();
    setMilestones(j?.milestones || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openBurn(m) {
    setBurnPrefill({
      amount: m.burn_amount ? String(m.burn_amount) : "",
      reason: `${m.label}`,
    });
    setBurnModal(true);
  }

  const totalApproved = milestones[0]?.current_count ?? 0;

  return (
    <div className="mt-6 grid gap-5">
      {burnModal && (
        <BurnModal
          prefillAmount={burnPrefill.amount}
          prefillReason={burnPrefill.reason}
          onClose={() => setBurnModal(false)}
          onSuccess={() => { setBurnModal(false); load(); }}
        />
      )}

      {/* Milestone overview */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-white font-extrabold text-xl">Oracle Milestones</div>
            <div className="mt-1 text-xs text-white/55">
              Global approved submissions: <span className="text-neon-300 font-bold">{totalApproved}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn tone="outline" onClick={load}>Refresh</Btn>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-white/60">Loading…</div>
        ) : milestones.length === 0 ? (
          <div className="mt-4 text-white/60">No milestones configured.</div>
        ) : (
          <div className="mt-5 grid gap-4">
            {milestones.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl border p-4 ${
                  m.hit
                    ? "border-neon-500/40 bg-neon-500/5"
                    : "border-neon-500/10 bg-black/20"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {m.hit ? (
                        <span className="inline-flex items-center rounded-full bg-neon-500/20 border border-neon-500/40 px-2 py-0.5 text-xs text-neon-300 font-bold">
                          MILESTONE HIT
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-black/30 border border-white/10 px-2 py-0.5 text-xs text-white/50">
                          {m.remaining} remaining
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-black/30 border border-white/10 px-2 py-0.5 text-xs text-white/60">
                        {m.action}
                      </span>
                    </div>
                    <div className="mt-2 text-white font-extrabold">{m.label}</div>
                    <div className="text-white/55 text-xs mt-0.5">{m.description}</div>
                    {m.burn_amount && (
                      <div className="mt-1 text-xs text-red-300/80">
                        Burn: {m.burn_amount.toLocaleString()} $PFF
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* Progress bar */}
                    <div className="w-32">
                      <div className="text-xs text-white/50 text-right mb-1">
                        {m.current_count}/{m.threshold}
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${m.hit ? "bg-neon-500" : "bg-white/30"}`}
                          style={{ width: `${m.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/40 text-right mt-0.5">{m.progress}%</div>
                    </div>

                    {/* Action buttons — only when milestone hit */}
                    {m.hit && (
                      <div className="flex gap-2">
                        {m.action === "burn" && (
                          <Btn tone="danger" onClick={() => openBurn(m)}>
                            🔥 Trigger Burn
                          </Btn>
                        )}
                        {m.action === "buyback" && (
                          <Btn tone="warn" onClick={() => openBurn({ ...m, burn_amount: "" })}>
                            💰 Trigger Buyback
                          </Btn>
                        )}
                        {(m.action === "raid" || m.action === "custom") && (
                          <Btn tone="outline" onClick={() => openBurn({ ...m, burn_amount: "" })}>
                            ⚡ Custom Action
                          </Btn>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Manual burn — always available */}
      <Card>
        <div className="text-white font-extrabold">Manual Burn / Buyback</div>
        <div className="mt-1 text-xs text-white/55">
          Trigger a burn or log a buyback outside of milestone auto-detection.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Btn
            tone="danger"
            onClick={() => {
              setBurnPrefill({ amount: "", reason: "" });
              setBurnModal(true);
            }}
          >
            🔥 Trigger Burn
          </Btn>
          <Btn
            tone="warn"
            onClick={() => {
              setBurnPrefill({ amount: "", reason: "Manual buyback" });
              setBurnModal(true);
            }}
          >
            💰 Log Buyback
          </Btn>
        </div>
        <div className="mt-3 text-xs text-white/40">
          All burns are auto-logged to Execution Logs (public) with Solscan proof link.
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════
export default function ValhallaAdmin() {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const [me, setMe] = useState({ loading: true, admin: false });
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("submissions");

  // ── Submissions ────────────────────────────────────────────────
  const [subStatus, setSubStatus] = useState("pending");
  const [subs, setSubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [selectedSubs, setSelectedSubs] = useState(new Set());
  const [airdropModal, setAirdropModal] = useState(false);

  // ── Airdrop leaderboard ────────────────────────────────────────
  const [airdropRows, setAirdropRows] = useState([]);
  const [airdropLoading, setAirdropLoading] = useState(false);
  const [airdropSelected, setAirdropSelected] = useState(new Set());
  const [airdropAmount, setAirdropAmount] = useState("200000");
  const [airdropOnlyWallets, setAirdropOnlyWallets] = useState(false);
  const [airdropPreview, setAirdropPreview] = useState(null);
  const [airdropResult, setAirdropResult] = useState(null);
  const [airdropSending, setAirdropSending] = useState(false);
  const [airdropErr, setAirdropErr] = useState("");

  async function loadAirdropData() {
    setAirdropLoading(true);
    setAirdropPreview(null);
    setAirdropResult(null);
    setAirdropErr("");
    const r = await fetch("/api/admin-submissions?view=airdrop", { credentials: "include" });
    const j = await r.json();
    setAirdropRows(j.data || []);
    setAirdropLoading(false);
  }

  async function handleAirdropDryRun() {
    setAirdropErr("");
    setAirdropPreview(null);
    const entries = airdropRows
      .filter((r) => airdropSelected.has(r.handle) && r.wallet)
      .map((r) => ({ wallet_address: r.wallet, handle: r.handle }));
    if (!entries.length) { setAirdropErr("No valid wallets selected."); return; }
    const r = await fetch("/api/airdrop-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ entries, amount_per_wallet: Number(airdropAmount), dry_run: true }),
    });
    const j = await r.json();
    if (!r.ok) { setAirdropErr(j?.message || j?.error || "Error"); return; }
    setAirdropPreview(j);
  }

  async function handleAirdropExecute() {
    if (!airdropPreview) return;
    setAirdropSending(true);
    setAirdropErr("");
    const entries = airdropRows
      .filter((r) => airdropSelected.has(r.handle) && r.wallet)
      .map((r) => ({ wallet_address: r.wallet, handle: r.handle }));
    const r = await fetch("/api/airdrop-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ entries, amount_per_wallet: Number(airdropAmount), dry_run: false }),
    });
    const j = await r.json();
    if (!r.ok) { setAirdropErr(j?.message || j?.error || "Error"); setAirdropSending(false); return; }
    setAirdropResult(j);
    setAirdropSending(false);
  }

  // ── Logs ───────────────────────────────────────────────────────
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logForm, setLogForm] = useState({
    title: "",
    description: "",
    proof_link: "",
    type: "event",
  });

  // ── Quests ─────────────────────────────────────────────────────
  const [quests, setQuests] = useState([]);
  const [questsLoading, setQuestsLoading] = useState(false);
  const [questForm, setQuestForm] = useState({
    id: "",
    title: "",
    description: "",
    type: "raid",
    difficulty: "easy",
    reward: "",
    proof_type: "text",
    time_window: "",
    status: "LIVE",
    points: 0,
    expires_at: "",
  });
  const [questErr, setQuestErr] = useState("");

  // Auto-calculate points from type × difficulty
  const BASE_PTS = { raid: 10, art: 15, lore: 8, oracle: 12 };
  const DIFF_MULT = { easy: 1, medium: 1.5, hard: 2 };
  useEffect(() => {
    const base = BASE_PTS[questForm.type] ?? 10;
    const mult = DIFF_MULT[questForm.difficulty] ?? 1;
    setQuestForm((v) => ({ ...v, points: Math.round(base * mult) }));
  }, [questForm.type, questForm.difficulty]);

  // ── Auth ───────────────────────────────────────────────────────
  async function refreshMe() {
    setMe({ loading: true, admin: false });
    const r = await fetch("/api/admin-me", { credentials: "include" });
    const j = await r.json();
    setMe({ loading: false, admin: !!j.admin });
  }

  useEffect(() => { refreshMe(); }, []);

  async function login() {
    try {
      setErr("");
      const recaptchaToken = await getRecaptchaToken(siteKey, "admin_login");
      const r = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: pwd, recaptchaToken }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "login-failed");
      await refreshMe();
    } catch (e) {
      setErr(e?.message || "login-failed");
    }
  }

  async function logout() {
    await fetch("/api/admin-logout", { method: "POST", credentials: "include" });
    await refreshMe();
  }

  // ── Submissions ────────────────────────────────────────────────
  async function loadSubmissions() {
    setSubsLoading(true);
    setSelectedSubs(new Set());
    const r = await fetch(
      `/api/admin-submissions?status=${encodeURIComponent(subStatus)}`,
      { credentials: "include" }
    );
    const j = await r.json();
    setSubs(j?.data || []);
    setSubsLoading(false);
  }

  async function setSubmissionStatus(id, status) {
    await fetch("/api/admin-submissions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, status }),
    });
    await loadSubmissions();
  }

  function toggleSub(id) {
    setSelectedSubs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllSubs() {
    if (selectedSubs.size === subs.length) {
      setSelectedSubs(new Set());
    } else {
      setSelectedSubs(new Set(subs.map((s) => s.id)));
    }
  }

  // ── Logs ───────────────────────────────────────────────────────
  async function loadLogs() {
    setLogsLoading(true);
    const r = await fetch("/api/admin-execution-logs", { credentials: "include" });
    const j = await r.json();
    setLogs(j?.data || []);
    setLogsLoading(false);
  }

  async function createLog() {
    const r = await fetch("/api/admin-execution-logs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(logForm),
    });
    if (r.ok) {
      setLogForm({ title: "", description: "", proof_link: "", type: "event" });
      await loadLogs();
    }
  }

  // ── Quests ─────────────────────────────────────────────────────
  async function loadQuests() {
    setQuestsLoading(true);
    setQuestErr("");
    const r = await fetch("/api/admin-quests", { credentials: "include" });
    const j = await r.json();
    if (!r.ok) {
      setQuestErr(j?.error || "failed-to-load-quests");
      setQuests([]);
      setQuestsLoading(false);
      return;
    }
    setQuests(j?.data || []);
    setQuestsLoading(false);
  }

  async function createQuest() {
    setQuestErr("");
    const r = await fetch("/api/admin-quests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(questForm),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setQuestErr(j?.error || "failed-to-create-quest"); return; }
    setQuestForm({
      id: "", title: "", description: "", type: "raid", difficulty: "easy",
      reward: "", proof_type: "text", time_window: "", status: "LIVE", points: 0, expires_at: "",
    });
    await loadQuests();
  }

  async function deleteQuest(id) {
    setQuestErr("");
    const r = await fetch("/api/admin-quests", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setQuestErr(j?.error || "failed-to-delete-quest"); return; }
    await loadQuests();
  }

  useEffect(() => {
    if (!me.admin) return;
    if (tab === "submissions") loadSubmissions();
    if (tab === "logs") loadLogs();
    if (tab === "quests") loadQuests();
    // "actions" tab is self-loading via ActionsTab component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.admin, tab, subStatus]);

  // ── Loading / Login screens ────────────────────────────────────
  if (me.loading) {
    return (
      <main className="min-h-screen bg-[#05070A] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/50">
          <div className="w-5 h-5 rounded-full border-2 border-neon-500/40 border-t-neon-500 spin-slow" />
          <span className="text-sm">Loading Valhalla…</span>
        </div>
      </main>
    );
  }

  if (!me.admin) {
    return (
      <main className="min-h-screen bg-[#05070A] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,232,90,.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,232,90,.04)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#05070A]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-neon-500/[0.04] blur-[140px] pointer-events-none" />

        <div className="relative w-full max-w-md fade-in-up">
          {/* Outer glow ring */}
          <div className="absolute -inset-px rounded-[1.6rem] bg-gradient-to-b from-neon-500/30 to-neon-500/5 blur-sm opacity-70" />

          <div className="relative glass-strong rounded-[1.5rem] p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-xl bg-neon-500/12 border border-neon-500/30 flex items-center justify-center text-2xl">
                ⚔️
              </div>
              <div>
                <div className="text-white font-extrabold text-xl leading-tight">Valhalla Admin</div>
                <div className="text-xs text-white/40 mt-0.5">Command center for the Horde</div>
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Password</label>
              <input
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
                type="password"
                className="mt-2 w-full rounded-xl border border-neon-500/20 bg-black/40 px-4 py-3 text-sm text-white/90 outline-none focus:border-neon-500/50 focus:bg-black/60 transition placeholder:text-white/20"
                placeholder="••••••••••"
                autoFocus
              />
            </div>

            {err ? (
              <div className="mt-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-300">
                ⚠ {err}
              </div>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                onClick={login}
                disabled={!pwd || !siteKey}
                className="flex-1 rounded-xl bg-neon-500 text-black font-extrabold py-3 text-sm hover:bg-neon-400 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-neonStrong"
              >
                Enter Valhalla →
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="rounded-xl border border-neon-500/25 bg-white/[0.03] text-white/70 font-semibold px-4 py-3 text-sm hover:border-neon-500/45 hover:text-white transition"
              >
                ← Back
              </button>
            </div>

            {!siteKey ? (
              <div className="mt-4 text-xs text-yellow-300/60">⚠ Missing VITE_RECAPTCHA_SITE_KEY</div>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  // ── Main admin UI ──────────────────────────────────────────────
  const TABS = [
    ["submissions", "📋 Submissions"],
    ["logs", "📜 Exec Logs"],
    ["quests", "⚔️ Quests"],
    ["actions", "⚡ Actions"],
    ["airdrop", "💰 Airdrop"],
  ];

  return (
    <main className="min-h-screen bg-[#05070A]">
      {/* Airdrop modal */}
      {airdropModal && (
        <AirdropModal
          subs={subs}
          selectedIds={selectedSubs}
          onClose={() => setAirdropModal(false)}
        />
      )}

      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 border-b border-neon-500/12 bg-[#05070A]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-500/12 border border-neon-500/30 flex items-center justify-center text-base">
              ⚔️
            </div>
            <div>
              <div className="text-white font-extrabold text-sm leading-tight">Valhalla Admin</div>
              <div className="text-[10px] text-white/35 tracking-wide">Approve • Airdrop • Burn • Discipline</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn tone="outline" onClick={() => (window.location.href = "/")}>← Site</Btn>
            <Btn tone="danger" onClick={logout}>Logout</Btn>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 p-1.5 rounded-2xl bg-black/50 border border-neon-500/12 w-fit mb-8">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === k
                  ? "bg-neon-500 text-black shadow-neon"
                  : "text-white/55 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

      {/* ── Submissions tab ────────────────────────────────────── */}
      {tab === "submissions" && (
        <div className="mt-6 grid gap-5">
          <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-white font-extrabold">Submissions</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/60">Status</span>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none"
                >
                  <option className="bg-black" value="pending">pending</option>
                  <option className="bg-black" value="approved">approved</option>
                  <option className="bg-black" value="rejected">rejected</option>
                </select>
                <Btn tone="outline" onClick={loadSubmissions}>Refresh</Btn>

                {/* Airdrop button — only in approved view */}
                {subStatus === "approved" && selectedSubs.size > 0 && (
                  <Btn onClick={() => setAirdropModal(true)}>
                    🪂 Airdrop ({selectedSubs.size})
                  </Btn>
                )}
              </div>
            </div>

            {/* Select all row — only in approved view */}
            {subStatus === "approved" && !subsLoading && subs.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={toggleAllSubs}
                  className="text-xs text-neon-300 hover:text-neon-200"
                >
                  {selectedSubs.size === subs.length ? "Deselect all" : "Select all"}
                </button>
                {selectedSubs.size > 0 && (
                  <span className="text-xs text-white/50">
                    {selectedSubs.size}/{subs.length} selected •{" "}
                    {subs.filter((s) => selectedSubs.has(s.id) && s.wallet_address).length} have wallet
                  </span>
                )}
              </div>
            )}

            {subsLoading ? (
              <div className="mt-4 text-white/60">Loading…</div>
            ) : subs.length === 0 ? (
              <div className="mt-4 text-white/60">No rows.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {subs.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-2xl border p-4 transition ${
                      subStatus === "approved" && selectedSubs.has(s.id)
                        ? "border-neon-500/40 bg-neon-500/5"
                        : "border-neon-500/10 bg-black/20"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox — only in approved view */}
                        {subStatus === "approved" && (
                          <input
                            type="checkbox"
                            checked={selectedSubs.has(s.id)}
                            onChange={() => toggleSub(s.id)}
                            className="mt-1 h-4 w-4 accent-neon-500 shrink-0 cursor-pointer"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-white font-extrabold">
                            {s.handle}{" "}
                            <span className="text-white/50 text-xs">({s.quest_id})</span>
                          </div>
                          <div className="text-white/60 text-xs">
                            {new Date(s.created_at).toLocaleString()}
                          </div>
                          {/* Wallet address display */}
                          {s.wallet_address ? (
                            <div className="mt-1 text-xs font-mono text-neon-300/80">
                              {s.wallet_address}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-white/30 italic">no wallet address</div>
                          )}
                          {/* Airdrop status */}
                          {s.airdrop_tx && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-xs text-green-300/80">airdropped</span>
                              {s.airdrop_amount && (
                                <span className="text-xs text-white/40">
                                  {Number(s.airdrop_amount).toLocaleString()} $PFF
                                </span>
                              )}
                              <a
                                href={`https://solscan.io/tx/${s.airdrop_tx}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-neon-300 hover:underline"
                              >
                                tx
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* Status badge */}
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold badge-${s.status}`}>
                          {s.status === "approved" && "✓ "}
                          {s.status === "rejected" && "✕ "}
                          {s.status === "pending" && "⏳ "}
                          {s.status}
                        </span>
                        <div className="flex gap-1.5 flex-wrap items-center">
                          {s.status !== "approved" && (
                            <Btn tone="solid" onClick={() => setSubmissionStatus(s.id, "approved")}>
                              ✓ Approve
                            </Btn>
                          )}
                          {s.status !== "rejected" && (
                            <Btn tone="danger" onClick={() => setSubmissionStatus(s.id, "rejected")}>
                              ✕ Reject
                            </Btn>
                          )}
                          {s.status !== "pending" && (
                            <Btn tone="outline" onClick={() => setSubmissionStatus(s.id, "pending")}>
                              Reset
                            </Btn>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-white/85 text-sm whitespace-pre-wrap">{s.proof}</div>
                    {s.note ? (
                      <div className="mt-2 text-white/60 text-xs">Note: {s.note}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Execution Logs tab ─────────────────────────────────── */}
      {tab === "logs" && (
        <div className="mt-6 grid gap-5">
          <Card>
            <div className="text-white font-extrabold">Add execution log</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                value={logForm.title}
                onChange={(e) => setLogForm((v) => ({ ...v, title: e.target.value }))}
                className="rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none"
                placeholder="Title (ex: Buyback executed)"
              />
              <select
                value={logForm.type}
                onChange={(e) => setLogForm((v) => ({ ...v, type: e.target.value }))}
                className="rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none"
              >
                <option className="bg-black" value="event">event</option>
                <option className="bg-black" value="buyback">buyback</option>
                <option className="bg-black" value="burn">burn</option>
              </select>
              <input
                value={logForm.proof_link}
                onChange={(e) => setLogForm((v) => ({ ...v, proof_link: e.target.value }))}
                className="rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none md:col-span-2"
                placeholder="Proof link (tx / post / doc)"
              />
              <textarea
                value={logForm.description}
                onChange={(e) => setLogForm((v) => ({ ...v, description: e.target.value }))}
                rows={4}
                className="rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none md:col-span-2"
                placeholder="Description"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Btn onClick={createLog} disabled={!logForm.title}>Publish</Btn>
              <Btn tone="outline" onClick={loadLogs}>Refresh</Btn>
            </div>
          </Card>

          <Card>
            <div className="text-white font-extrabold">Latest logs</div>
            {logsLoading ? (
              <div className="mt-4 text-white/60">Loading…</div>
            ) : logs.length === 0 ? (
              <div className="mt-4 text-white/60">No logs yet.</div>
            ) : (
              <div className="mt-5 grid gap-3">
                {logs.map((l) => (
                  <div key={l.id} className="rounded-2xl border border-neon-500/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-white font-extrabold">
                          {l.title}{" "}
                          <span className="text-white/50 text-xs">({l.type})</span>
                        </div>
                        <div className="text-white/60 text-xs">
                          {new Date(l.created_at).toLocaleString()}
                        </div>
                      </div>
                      {l.proof_link ? (
                        <a
                          className="text-neon-300 text-sm hover:underline shrink-0"
                          href={l.proof_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Proof
                        </a>
                      ) : null}
                    </div>
                    {l.description ? (
                      <div className="mt-3 text-white/85 text-sm whitespace-pre-wrap">{l.description}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Quests tab ─────────────────────────────────────────── */}
      {tab === "quests" && (
        <div className="mt-6 grid gap-5">
          <Card>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="text-white font-extrabold text-xl">Quests</div>
                <div className="mt-1 text-xs text-white/60">
                  Create & manage quests shown on the Quest Board.
                </div>
              </div>
              <Btn tone="outline" onClick={loadQuests}>Refresh</Btn>
            </div>

            {questErr ? <div className="mt-4 text-sm text-red-200">{questErr}</div> : null}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Form */}
              <div className="rounded-2xl border border-neon-500/10 bg-black/20 p-5">
                <div className="text-white font-extrabold">Create a quest</div>
                <div className="mt-1 text-xs text-white/55">Fill the fields below.</div>

                <div className="mt-5 grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-white/60">Quest ID (ex: Q-0100)</div>
                      <input
                        value={questForm.id}
                        onChange={(e) => setQuestForm((v) => ({ ...v, id: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                        placeholder="Q-0100"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-white/60">Status</div>
                      <select
                        value={questForm.status}
                        onChange={(e) => setQuestForm((v) => ({ ...v, status: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none"
                      >
                        <option className="bg-black" value="LIVE">LIVE</option>
                        <option className="bg-black" value="UPCOMING">UPCOMING</option>
                        <option className="bg-black" value="ENDED">ENDED</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-white/60">Title</div>
                    <input
                      value={questForm.title}
                      onChange={(e) => setQuestForm((v) => ({ ...v, title: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      placeholder="Helmetify a FOG"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-white/60">Type</div>
                      <select
                        value={questForm.type}
                        onChange={(e) => setQuestForm((v) => ({ ...v, type: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none"
                      >
                        <option className="bg-black" value="lore">lore</option>
                        <option className="bg-black" value="art">art</option>
                        <option className="bg-black" value="raid">raid</option>
                        <option className="bg-black" value="oracle">oracle</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-white/60">Difficulty</div>
                      <select
                        value={questForm.difficulty}
                        onChange={(e) => setQuestForm((v) => ({ ...v, difficulty: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none"
                      >
                        <option className="bg-black" value="easy">easy</option>
                        <option className="bg-black" value="medium">medium</option>
                        <option className="bg-black" value="hard">hard</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-white/60">Proof type</div>
                      <select
                        value={questForm.proof_type}
                        onChange={(e) => setQuestForm((v) => ({ ...v, proof_type: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none"
                      >
                        <option className="bg-black" value="text">text</option>
                        <option className="bg-black" value="link">link</option>
                        <option className="bg-black" value="image">image</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-white/60">Time window</div>
                      <input
                        value={questForm.time_window}
                        onChange={(e) => setQuestForm((v) => ({ ...v, time_window: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                        placeholder="This week / 48h sprint"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-white/60">Expires at <span className="text-white/30">(optional — enables countdown)</span></div>
                      <input
                        type="datetime-local"
                        value={questForm.expires_at}
                        onChange={(e) => setQuestForm((v) => ({ ...v, expires_at: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-white/60">Reward label</div>
                    <input
                      value={questForm.reward}
                      onChange={(e) => setQuestForm((v) => ({ ...v, reward: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      placeholder="Role + bonus vote / Fixed drop"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-white/60">Points <span className="text-white/30">(auto-calculated — editable)</span></div>
                    <input
                      value={questForm.points}
                      onChange={(e) => setQuestForm((v) => ({ ...v, points: e.target.value }))}
                      type="number"
                      className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      placeholder="15"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-white/60">Description</div>
                    <textarea
                      value={questForm.description}
                      onChange={(e) => setQuestForm((v) => ({ ...v, description: e.target.value }))}
                      rows={5}
                      className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      placeholder="Explain the quest clearly (no doxxing / no hate)."
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Btn onClick={createQuest} disabled={!questForm.id || !questForm.title}>
                      Create quest
                    </Btn>
                    <Btn
                      tone="outline"
                      onClick={() =>
                        setQuestForm({
                          id: "", title: "", description: "", type: "raid",
                          difficulty: "easy", reward: "", proof_type: "text",
                          time_window: "", status: "LIVE", points: 0,
                        })
                      }
                    >
                      Clear
                    </Btn>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-2xl border border-neon-500/10 bg-black/20 p-5">
                <div className="text-white font-extrabold">Preview</div>
                <div className="mt-1 text-xs text-white/55">Quest Board preview</div>
                <div className="mt-5 glass rounded-2xl p-6 border border-neon-500/15">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white font-extrabold text-lg">
                        {questForm.title || "Quest title"}
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        {questForm.id || "Q-XXXX"} • {questForm.time_window || "time window"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex items-center rounded-full border bg-black/30 px-3 py-1 text-xs border-neon-500/35 text-neon-300 shadow-neon">
                        {questForm.status || "LIVE"}
                      </span>
                      <span className="inline-flex items-center rounded-full border bg-black/30 px-3 py-1 text-xs border-white/10 text-white/80">
                        {questForm.type || "type"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-white/80 leading-relaxed">
                    {questForm.description || "Quest description will appear here."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border bg-black/30 px-3 py-1 text-xs border-white/10 text-white/80">
                      {questForm.difficulty || "difficulty"}
                    </span>
                    <span className="inline-flex items-center rounded-full border bg-black/30 px-3 py-1 text-xs border-neon-500/35 text-neon-300 shadow-neon">
                      {questForm.reward || "reward"}
                    </span>
                    <span className="inline-flex items-center rounded-full border bg-black/30 px-3 py-1 text-xs border-white/10 text-white/80">
                      proof: {questForm.proof_type || "text"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-[11px] text-white/45">
                  Tip: keep title short, description clear, correct proof type.
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-white font-extrabold">Existing quests</div>
                <div className="mt-1 text-xs text-white/55">Delete to hide from Quest Board.</div>
              </div>
              <div className="text-xs text-white/55">
                {questsLoading ? "Loading…" : `${quests.length} quest(s)`}
              </div>
            </div>

            {questsLoading ? (
              <div className="mt-4 text-white/60">Loading…</div>
            ) : quests.length === 0 ? (
              <div className="mt-4 text-white/60">No quests yet.</div>
            ) : (
              <div className="mt-5 grid gap-3">
                {quests.map((q) => (
                  <div key={q.id} className="rounded-2xl border border-neon-500/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-extrabold truncate">
                          {q.title}{" "}
                          <span className="text-white/50 text-xs">({q.id})</span>
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          {q.status} • {q.type} • {q.difficulty} • proof:{q.proof_type} • {q.time_window}
                        </div>
                      </div>
                      <Btn tone="outline" onClick={() => deleteQuest(q.id)}>Delete</Btn>
                    </div>
                    {q.description ? (
                      <div className="mt-3 text-white/80 text-sm whitespace-pre-wrap">{q.description}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Actions tab ────────────────────────────────────────── */}
      {tab === "actions" && <ActionsTab />}

      {/* ── Airdrop tab ─────────────────────────────────────────── */}
      {tab === "airdrop" && (
        <div className="mt-6 grid gap-5">
          <Card>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="text-white font-extrabold">💰 Airdrop — Leaderboard</div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={airdropOnlyWallets}
                    onChange={(e) => setAirdropOnlyWallets(e.target.checked)}
                    className="accent-neon-500"
                  />
                  Wallets only
                </label>
                <Btn tone="outline" onClick={loadAirdropData} disabled={airdropLoading}>
                  {airdropLoading ? "Loading…" : "↻ Refresh"}
                </Btn>
              </div>
            </div>

            {airdropRows.length === 0 && !airdropLoading && (
              <div className="text-sm text-white/40 py-6 text-center">Click Refresh to load the leaderboard.</div>
            )}

            {airdropRows.length > 0 && (
              <>
                {/* Select all */}
                <div className="flex items-center gap-3 mb-2 text-xs text-white/50">
                  <button
                    onClick={() => {
                      const visible = airdropRows.filter((r) => !airdropOnlyWallets || r.wallet);
                      const allSelected = visible.every((r) => airdropSelected.has(r.handle));
                      setAirdropSelected(allSelected ? new Set() : new Set(visible.map((r) => r.handle)));
                    }}
                    className="text-neon-300 hover:underline font-semibold"
                  >
                    Toggle all
                  </button>
                  <span>{airdropSelected.size} selected</span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto overflow-y-auto max-h-[420px] rounded-xl border border-neon-500/10">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-[#0d1117]">
                      <tr className="border-b border-neon-500/10 text-left text-xs text-white/40">
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Handle</th>
                        <th className="px-3 py-2">Points</th>
                        <th className="px-3 py-2">Wallet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neon-500/5">
                      {airdropRows
                        .filter((r) => !airdropOnlyWallets || r.wallet)
                        .map((r) => (
                          <tr key={r.handle} className="hover:bg-white/[0.02] transition">
                            <td className="px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={airdropSelected.has(r.handle)}
                                onChange={(e) => {
                                  const next = new Set(airdropSelected);
                                  e.target.checked ? next.add(r.handle) : next.delete(r.handle);
                                  setAirdropSelected(next);
                                }}
                                className="accent-neon-500"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-white/40 font-mono text-xs">#{r.rank}</td>
                            <td className="px-3 py-2.5 text-white font-semibold">{r.handle}</td>
                            <td className="px-3 py-2.5 text-neon-300 font-bold">{r.points.toLocaleString()}</td>
                            <td className="px-3 py-2.5">
                              {r.wallet ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-white/70">
                                    {r.wallet.slice(0, 6)}…{r.wallet.slice(-4)}
                                  </span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(r.wallet)}
                                    title="Copy wallet address"
                                    className="text-white/30 hover:text-neon-300 transition text-base leading-none"
                                  >
                                    📋
                                  </button>
                                </div>
                              ) : (
                                <span className="text-white/25 text-xs italic">No wallet</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          {/* Airdrop controls */}
          {airdropRows.length > 0 && (
            <Card>
              <div className="text-white font-extrabold mb-4">🚀 Send Airdrop</div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-white/60 mb-1.5">Amount per wallet ($PFF)</div>
                  <input
                    type="number"
                    min="1"
                    value={airdropAmount}
                    onChange={(e) => { setAirdropAmount(e.target.value); setAirdropPreview(null); }}
                    className="w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                    placeholder="200000"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="text-xs text-white/40 mb-1.5">
                    {airdropSelected.size} selected ·{" "}
                    {airdropRows.filter((r) => airdropSelected.has(r.handle) && r.wallet).length} with wallet ·{" "}
                    <span className="text-neon-300 font-bold">
                      {(airdropRows.filter((r) => airdropSelected.has(r.handle) && r.wallet).length * Number(airdropAmount || 0)).toLocaleString()} $PFF total
                    </span>
                  </div>
                </div>
              </div>

              {airdropErr && (
                <div className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{airdropErr}</div>
              )}

              {/* Dry run preview */}
              {airdropPreview && !airdropResult && (
                <div className="mb-4 rounded-xl bg-black/30 border border-neon-500/15 p-4 text-sm">
                  <div className="text-neon-300 font-extrabold mb-2">Preview</div>
                  <div className="grid gap-1 text-white/80">
                    <div>Valid wallets: <span className="text-white font-bold">{airdropPreview.valid_count}</span></div>
                    <div>Total $PFF: <span className="text-neon-300 font-bold">{airdropPreview.total_pff?.toLocaleString()}</span></div>
                    {airdropPreview.invalid_count > 0 && (
                      <div className="text-yellow-300">⚠️ {airdropPreview.invalid_count} invalid wallet(s) will be skipped</div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-white/35">Ensure rewards wallet has sufficient $PFF and SOL for fees.</div>
                </div>
              )}

              {/* Success result */}
              {airdropResult && (
                <div className="mb-4 rounded-xl bg-neon-500/10 border border-neon-500/25 p-4 text-sm">
                  <div className="text-neon-300 font-extrabold mb-2">✅ Airdrop sent!</div>
                  <div className="text-white/80">Sent to <span className="text-white font-bold">{airdropResult.total_sent}</span> wallets.</div>
                  {airdropResult.results?.map((r, i) => (
                    <a key={i} href={r.solscan} target="_blank" rel="noreferrer"
                      className="block mt-1 text-xs text-neon-300 hover:underline font-mono truncate"
                    >
                      {r.tx_signature}
                    </a>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Btn tone="outline" onClick={handleAirdropDryRun} disabled={airdropSending || airdropSelected.size === 0}>
                  🔍 Dry Run
                </Btn>
                <Btn
                  tone="solid"
                  onClick={handleAirdropExecute}
                  disabled={!airdropPreview || airdropSending || !!airdropResult}
                >
                  {airdropSending ? "Sending…" : "🚀 Execute Airdrop"}
                </Btn>
              </div>
            </Card>
          )}
        </div>
      )}

      </div>{/* /max-w-6xl */}
    </main>
  );
}
