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
function AirdropModal({ subs, selectedIds, quests = [], onClose }) {
  // Pre-fill from quest if all selected subs share the same quest with a fixed reward
  const selectedList = subs.filter((s) => selectedIds.has(s.id));
  const firstQuestId = selectedList[0]?.quest_id;
  const allSameQuest = selectedList.length > 0 && selectedList.every((s) => s.quest_id === firstQuestId);
  const matchedQuest = allSameQuest ? quests.find((q) => q.id === firstQuestId) : null;
  const initAmount = matchedQuest?.fixed_reward_amount > 0 ? String(matchedQuest.fixed_reward_amount) : "50000";
  const initToken = matchedQuest?.fixed_reward_token || "pff";

  const [amount, setAmount] = useState(initAmount);
  const [token, setToken] = useState(initToken);
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
      body: JSON.stringify({ entries, amount_per_wallet: Number(amount), dry_run: true, token_type: token }),
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
      body: JSON.stringify({ entries, amount_per_wallet: Number(amount), dry_run: false, token_type: token }),
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

        {/* Amount + token input */}
        {!result && (
          <div className="mt-5">
            <div className="text-xs text-white/60">Amount per wallet</div>
            <div className="mt-2 flex gap-2">
              <input
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setDryRun(null); }}
                type="number"
                min="1"
                step={token === "sol" ? "0.001" : "1"}
                className="flex-1 rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                placeholder={token === "sol" ? "0.01" : "50000"}
              />
              <select
                value={token}
                onChange={(e) => { setToken(e.target.value); setAmount(e.target.value === "sol" ? "0.01" : "50000"); setDryRun(null); }}
                className="rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
              >
                <option value="pff">$PFF</option>
                <option value="sol">SOL</option>
              </select>
            </div>
            <div className="mt-1 text-[11px] text-white/40">
              Total: {(eligibleSubs.length * Number(amount || 0)).toLocaleString()} {token === "sol" ? "SOL" : "$PFF"}
            </div>
          </div>
        )}

        {/* Dry run preview */}
        {dryRun && !result && (
          <div className="mt-4 rounded-xl bg-black/30 border border-neon-500/10 p-4 text-sm">
            <div className="text-neon-300 font-extrabold mb-2">Preview</div>
            <div className="grid gap-1 text-white/80">
              <div>Valid wallets: <span className="text-white font-bold">{dryRun.valid_count}</span></div>
              {token === "sol"
                ? <div>Total SOL: <span className="text-white font-bold">{dryRun.total_sol ?? (dryRun.valid_count * Number(amount)).toFixed(4)}</span></div>
                : <div>Total $PFF: <span className="text-white font-bold">{dryRun.total_pff?.toLocaleString()}</span></div>
              }
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
                Preview
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
                Preview
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

// ── Post Leaderboard card ─────────────────────────────────────────
function PostLeaderboardCard() {
  const [status, setStatus] = useState(null); // null | "loading" | "ok" | "error"

  async function handlePost() {
    setStatus("loading");
    try {
      const r = await fetch("/api/post-leaderboard", { method: "GET" });
      const j = await r.json();
      setStatus(j.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus(null), 4000);
  }

  return (
    <Card>
      <div className="text-white font-extrabold">Post Leaderboard to Telegram</div>
      <div className="mt-1 text-xs text-white/55">
        Sends the current top 10 leaderboard to the Telegram group immediately.
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Btn tone="outline" onClick={handlePost} disabled={status === "loading"}>
          {status === "loading" ? "Posting…" : "📊 Post Leaderboard"}
        </Btn>
        {status === "ok" && <span className="text-xs text-neon-400">✓ Posted to Telegram</span>}
        {status === "error" && <span className="text-xs text-red-400">✗ Error — check logs</span>}
      </div>
    </Card>
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

      {/* Post Leaderboard to Telegram */}
      <PostLeaderboardCard />

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
  const [airdropTokenType, setAirdropTokenType] = useState("pff");
  const [airdropOnlyWallets, setAirdropOnlyWallets] = useState(false);
  const [airdropPreview, setAirdropPreview] = useState(null);
  const [airdropResult, setAirdropResult] = useState(null);
  const [airdropSending, setAirdropSending] = useState(false);
  const [airdropErr, setAirdropErr] = useState("");
  const [rewardLogs, setRewardLogs] = useState([]);
  const [rewardLogsLoading, setRewardLogsLoading] = useState(false);

  async function loadRewardLogs() {
    setRewardLogsLoading(true);
    const r = await fetch("/api/admin-submissions?view=rewards", { credentials: "include" });
    const j = await r.json();
    setRewardLogs(j.data || []);
    setRewardLogsLoading(false);
  }

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
      body: JSON.stringify({ entries, amount_per_wallet: Number(airdropAmount), dry_run: true, token_type: airdropTokenType }),
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
      body: JSON.stringify({ entries, amount_per_wallet: Number(airdropAmount), dry_run: false, token_type: airdropTokenType }),
    });
    const j = await r.json();
    if (!r.ok) { setAirdropErr(j?.message || j?.error || "Error"); setAirdropSending(false); return; }
    setAirdropResult(j);
    setAirdropSending(false);
  }

  function exportAirdropCSV() {
    const rows = airdropRows.filter((r) => !airdropOnlyWallets || r.wallet);
    const lines = ["Rank,Handle,Points,Wallet", ...rows.map((r) => `${r.rank},${r.handle},${r.points},${r.wallet || ""}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pff-airdrop-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  // ── Milestones ─────────────────────────────────────────────────
  const [milestones, setMilestones] = useState([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    label: "", description: "", detail: "", metric: "Market Cap", target: "", current: "", unit: "$", reward: "",
    action: "custom", burn_amount: "", airdrop_amount_per_wallet: "", airdrop_top_n: "0", sort_order: "0",
  });
  const [milestoneAirdropPreview, setMilestoneAirdropPreview] = useState(null); // { milestone, entries }
  const [milestoneErr, setMilestoneErr] = useState("");
  const [milestoneSuccess, setMilestoneSuccess] = useState("");

  // ── Quests ─────────────────────────────────────────────────────
  const [quests, setQuests] = useState([]);
  const [questsLoading, setQuestsLoading] = useState(false);
  const [questForm, setQuestForm] = useState({
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
    milestone_id: "",
    fixed_reward_amount: "0",
    fixed_reward_token: "pff",
    vote_threshold: "0",
    vote_bonus_amount: "0",
    vote_bonus_token: "pff",
  });
  const [questErr, setQuestErr] = useState("");
  const [questSuccess, setQuestSuccess] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [editingQuestId, setEditingQuestId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

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
    const r = await fetch("/api/admin-session", { credentials: "include" });
    const j = await r.json();
    setMe({ loading: false, admin: !!j.admin });
  }

  useEffect(() => { refreshMe(); }, []);

  async function login() {
    try {
      setErr("");
      const recaptchaToken = await getRecaptchaToken(siteKey, "admin_login");
      const r = await fetch("/api/admin-session", {
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
    await fetch("/api/admin-session", { method: "DELETE", credentials: "include" });
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

  // ── Milestones ─────────────────────────────────────────────────
  async function loadMilestones() {
    setMilestonesLoading(true);
    const r = await fetch("/api/admin-milestones", { credentials: "include" });
    const j = await r.json().catch(() => ({}));
    setMilestones(j?.data || []);
    setMilestonesLoading(false);
  }

  const BLANK_MILESTONE_FORM = {
    label: "", description: "", detail: "", metric: "Market Cap", target: "", current: "", unit: "$", reward: "",
    action: "custom", burn_amount: "", airdrop_amount_per_wallet: "", airdrop_top_n: "0", sort_order: "0",
  };

  async function createMilestone() {
    setMilestoneErr("");
    const autoId = "M-" + Date.now().toString(36).toUpperCase().slice(-5);
    const r = await fetch("/api/admin-milestones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...milestoneForm, id: autoId }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMilestoneErr(j?.error || "failed"); return; }
    setMilestoneForm(BLANK_MILESTONE_FORM);
    setMilestoneSuccess(`Milestone ${autoId} created ✓`);
    setTimeout(() => setMilestoneSuccess(""), 5000);
    await loadMilestones();
  }

  async function deleteMilestone(id) {
    await fetch("/api/admin-milestones", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    await loadMilestones();
  }

  async function notifyMilestone(id) {
    const r = await fetch("/api/admin-milestones?action=notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    if (r.ok) {
      setMilestoneSuccess("TG notification sent ✓");
      setTimeout(() => setMilestoneSuccess(""), 4000);
    }
  }

  async function executeMilestoneAirdrop(m, confirmed = false) {
    // Fetch top N from leaderboard with wallets
    const r = await fetch("/api/admin-submissions?view=airdrop", { credentials: "include" });
    const j = await r.json().catch(() => ({}));
    const topN = (j?.data || []).filter(e => e.wallet).slice(0, Number(m.airdrop_top_n) || 10);
    const entries = topN.map(e => ({ wallet_address: e.wallet, handle: e.handle }));

    if (!confirmed) {
      setMilestoneAirdropPreview({ milestone: m, entries });
      return;
    }

    // Execute airdrop
    const res = await fetch("/api/airdrop-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        entries,
        amount_per_wallet: Number(m.airdrop_amount_per_wallet),
        dry_run: false,
      }),
    });
    const result = await res.json().catch(() => ({}));
    setMilestoneAirdropPreview(null);
    if (res.ok) {
      setMilestoneSuccess(`Airdrop executed — ${result.total_sent} wallets ✓`);
      setTimeout(() => setMilestoneSuccess(""), 6000);
    } else {
      setMilestoneErr(result?.message || result?.error || "Airdrop failed");
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

  async function generateQuestIdeas() {
    setAiLoading(true);
    setAiErr("");
    setAiSuggestions([]);
    const r = await fetch("/api/admin-quests?action=generate", { credentials: "include" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setAiErr(j?.error || "generation-failed"); setAiLoading(false); return; }
    setAiSuggestions(j.quests || []);
    setAiLoading(false);
  }

  async function createQuest() {
    setQuestErr("");
    setQuestSuccess("");
    const autoId = "Q-" + Date.now().toString(36).toUpperCase().slice(-5);
    const r = await fetch("/api/admin-quests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...questForm, id: autoId }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setQuestErr(j?.error || "failed-to-create-quest"); return; }
    setQuestForm({
      title: "", description: "", type: "raid", difficulty: "easy",
      reward: "", proof_type: "text", time_window: "", status: "LIVE", points: 0, expires_at: "", milestone_id: "",
      fixed_reward_amount: "0", fixed_reward_token: "pff",
      vote_threshold: "0", vote_bonus_amount: "0", vote_bonus_token: "pff",
    });
    setQuestSuccess(`Quest ${autoId} created ✓`);
    setTimeout(() => setQuestSuccess(""), 5000);
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

  function startEditQuest(q) {
    setEditingQuestId(q.id);
    setEditForm({
      title: q.title || "",
      description: q.description || "",
      type: q.type || "raid",
      difficulty: q.difficulty || "easy",
      reward: q.reward || "",
      proof_type: q.proof_type || "text",
      time_window: q.time_window || "",
      status: q.status || "LIVE",
      points: String(q.points ?? 0),
      fixed_reward_amount: String(q.fixed_reward_amount ?? 0),
      fixed_reward_token: q.fixed_reward_token || "pff",
      vote_threshold: String(q.vote_threshold ?? 0),
      vote_bonus_amount: String(q.vote_bonus_amount ?? 0),
      vote_bonus_token: q.vote_bonus_token || "pff",
    });
  }

  async function saveEditQuest() {
    setEditSaving(true);
    const r = await fetch("/api/admin-quests", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: editingQuestId, ...editForm }),
    });
    const j = await r.json().catch(() => ({}));
    setEditSaving(false);
    if (!r.ok) { setQuestErr(j?.error || "failed-to-update-quest"); return; }
    setEditingQuestId(null);
    setEditForm({});
    await loadQuests();
  }

  useEffect(() => {
    if (!me.admin) return;
    if (tab === "submissions") { loadSubmissions(); loadQuests(); }
    if (tab === "logs") loadLogs();
    if (tab === "quests") { loadQuests(); loadMilestones(); }
    if (tab === "milestones") loadMilestones();
    if (tab === "airdrop") loadRewardLogs();
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
    ["milestones", "🏆 Milestones"],
    ["telegram", "📣 Telegram"],
    ["oracle", "🔮 Oracle"],
  ];

  return (
    <main className="min-h-screen bg-[#05070A]">
      {/* Airdrop modal */}
      {airdropModal && (
        <AirdropModal
          subs={subs}
          selectedIds={selectedSubs}
          quests={quests}
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
                            <span className="text-white/50 text-xs">
                              ({quests.find(q => q.id === s.quest_id)?.title || s.quest_id})
                            </span>
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

                    <div className="mt-3 text-sm flex flex-col gap-1">
                      {s.proof.split(/\s+/).map((token, i) =>
                        /^https?:\/\//i.test(token)
                          ? <a key={i} href={token} target="_blank" rel="noreferrer" className="text-neon-400 hover:underline break-all">{token}</a>
                          : token ? <span key={i} className="text-white/85 break-words">{token}</span> : null
                      )}
                    </div>
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

            {/* AI Quest Generator */}
            <div className="mt-6 rounded-2xl border border-neon-500/20 bg-neon-500/[0.04] p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-white font-extrabold flex items-center gap-2">
                    <span>🤖</span> AI Quest Generator
                  </div>
                  <div className="mt-1 text-xs text-white/55">Generate 5 quest ideas — click one to pre-fill the form.</div>
                </div>
                <Btn onClick={generateQuestIdeas} disabled={aiLoading} tone="outline">
                  {aiLoading ? "Generating…" : "✨ Generate Ideas"}
                </Btn>
              </div>

              {aiErr ? <div className="mt-3 text-sm text-red-300">{aiErr}</div> : null}

              {aiSuggestions.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {aiSuggestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const diffMap = { easy: 1, medium: 1.5, hard: 2 };
                        const baseMap = { raid: 10, art: 15, lore: 8, oracle: 12 };
                        const pts = q.points ?? Math.round((baseMap[q.type] ?? 10) * (diffMap[q.difficulty] ?? 1));
                        const autoId = "Q-" + Date.now().toString(36).toUpperCase().slice(-5);
                        setQuestForm((v) => ({
                          ...v,
                          id: autoId,
                          title: q.title || "",
                          description: q.description || "",
                          type: q.type || "raid",
                          difficulty: q.difficulty || "easy",
                          proof_type: q.proof_type || "link",
                          reward: q.reward || "",
                          time_window: q.time_window || "",
                          points: pts,
                        }));
                      }}
                      className="text-left rounded-xl border border-neon-500/15 bg-black/25 p-4 hover:border-neon-500/45 hover:bg-neon-500/[0.06] transition group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          q.difficulty === "hard" ? "text-red-300 border-red-500/30 bg-red-500/10" :
                          q.difficulty === "medium" ? "text-amber-300 border-amber-500/30 bg-amber-500/10" :
                          "text-neon-400 border-neon-500/30 bg-neon-500/10"
                        }`}>{q.difficulty}</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">{q.type}</span>
                      </div>
                      <div className="text-sm font-bold text-white group-hover:text-neon-300 transition leading-snug">{q.title}</div>
                      <div className="mt-1.5 text-xs text-white/55 leading-relaxed line-clamp-3">{q.description}</div>
                      <div className="mt-2 text-xs text-neon-400 font-semibold">{q.points} pts</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Form */}
              <div className="rounded-2xl border border-neon-500/10 bg-black/20 p-5">
                <div className="text-white font-extrabold">Create a quest</div>
                <div className="mt-1 text-xs text-white/55">Fill the fields below or click a suggestion above.</div>

                {questSuccess && (
                  <div className="mt-4 rounded-xl bg-neon-500/10 border border-neon-500/30 px-4 py-2.5 text-sm text-neon-300 font-semibold">
                    ✓ {questSuccess}
                  </div>
                )}

                <div className="mt-5 grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
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

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-xs text-white/60">Fixed reward amount <span className="text-white/30">(0 = none)</span></div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={questForm.fixed_reward_amount}
                        onChange={(e) => setQuestForm((v) => ({ ...v, fixed_reward_amount: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-white/60">Token</div>
                      <select
                        value={questForm.fixed_reward_token}
                        onChange={(e) => setQuestForm((v) => ({ ...v, fixed_reward_token: e.target.value }))}
                        className="mt-2 rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none"
                      >
                        <option className="bg-black" value="pff">$PFF</option>
                        <option className="bg-black" value="sol">SOL</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-xs text-white/60">Vote threshold <span className="text-white/30">(0 = no bonus)</span></div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={questForm.vote_threshold}
                        onChange={(e) => setQuestForm((v) => ({ ...v, vote_threshold: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-white/60">Bonus amount</div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={questForm.vote_bonus_amount}
                        onChange={(e) => setQuestForm((v) => ({ ...v, vote_bonus_amount: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-white/60">Token</div>
                      <select
                        value={questForm.vote_bonus_token}
                        onChange={(e) => setQuestForm((v) => ({ ...v, vote_bonus_token: e.target.value }))}
                        className="mt-2 rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none"
                      >
                        <option className="bg-black" value="pff">$PFF</option>
                        <option className="bg-black" value="sol">SOL</option>
                      </select>
                    </div>
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

                  <div>
                    <div className="text-xs text-white/60">Linked milestone <span className="text-white/30">(optional)</span></div>
                    <select
                      value={questForm.milestone_id}
                      onChange={(e) => setQuestForm((v) => ({ ...v, milestone_id: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none"
                    >
                      <option className="bg-black" value="">— None —</option>
                      {milestones.map((m) => (
                        <option key={m.id} className="bg-black" value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Btn onClick={createQuest} disabled={!questForm.title}>
                      Create quest
                    </Btn>
                    <Btn
                      tone="outline"
                      onClick={() =>
                        setQuestForm({
                          title: "", description: "", type: "raid",
                          difficulty: "easy", reward: "", proof_type: "text",
                          time_window: "", status: "LIVE", points: 0, expires_at: "", milestone_id: "",
                          fixed_reward_amount: "0", fixed_reward_token: "pff",
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
                    {Number(questForm.fixed_reward_amount) > 0 && (
                      <span className="inline-flex items-center rounded-full border bg-black/30 px-3 py-1 text-xs border-yellow-400/40 text-yellow-300">
                        {Number(questForm.fixed_reward_amount).toLocaleString()} ${questForm.fixed_reward_token.toUpperCase()}
                      </span>
                    )}
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
                {quests.map((q) => {
                  const isEditing = editingQuestId === q.id;
                  const iCls = "w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40 placeholder:text-white/25";
                  const sCls = `${iCls} appearance-none`;
                  return (
                    <div key={q.id} className="rounded-2xl border border-neon-500/10 bg-black/20 p-4">
                      {/* Header row */}
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
                        <div className="flex gap-2 shrink-0">
                          <Btn tone="outline" onClick={() => isEditing ? setEditingQuestId(null) : startEditQuest(q)}>
                            {isEditing ? "Cancel" : "Edit"}
                          </Btn>
                          <Btn tone="outline" onClick={() => deleteQuest(q.id)}>Delete</Btn>
                        </div>
                      </div>

                      {!isEditing && q.description && (
                        <div className="mt-3 text-white/80 text-sm whitespace-pre-wrap">{q.description}</div>
                      )}

                      {/* Inline edit form */}
                      {isEditing && (
                        <div className="mt-4 grid gap-3 border-t border-white/5 pt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-white/50 mb-1">Title</div>
                              <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className={iCls} />
                            </div>
                            <div>
                              <div className="text-xs text-white/50 mb-1">Reward label</div>
                              <input value={editForm.reward} onChange={e => setEditForm(f => ({ ...f, reward: e.target.value }))} className={iCls} />
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-white/50 mb-1">Description</div>
                            <textarea rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className={iCls} />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <div className="text-xs text-white/50 mb-1">Type</div>
                              <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className={sCls}>
                                {["raid","art","lore","oracle"].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <div className="text-xs text-white/50 mb-1">Difficulty</div>
                              <select value={editForm.difficulty} onChange={e => setEditForm(f => ({ ...f, difficulty: e.target.value }))} className={sCls}>
                                {["easy","medium","hard"].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <div className="text-xs text-white/50 mb-1">Proof type</div>
                              <select value={editForm.proof_type} onChange={e => setEditForm(f => ({ ...f, proof_type: e.target.value }))} className={sCls}>
                                {["text","link","image"].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <div className="text-xs text-white/50 mb-1">Status</div>
                              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className={sCls}>
                                {["LIVE","HIDDEN"].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <div className="text-xs text-white/50 mb-1">Time window</div>
                              <input value={editForm.time_window} onChange={e => setEditForm(f => ({ ...f, time_window: e.target.value }))} className={iCls} />
                            </div>
                            <div>
                              <div className="text-xs text-white/50 mb-1">Points</div>
                              <input type="number" value={editForm.points} onChange={e => setEditForm(f => ({ ...f, points: e.target.value }))} className={iCls} />
                            </div>
                            <div>
                              <div className="text-xs text-white/50 mb-1">Fixed reward</div>
                              <input type="number" value={editForm.fixed_reward_amount} onChange={e => setEditForm(f => ({ ...f, fixed_reward_amount: e.target.value }))} className={iCls} />
                            </div>
                            <div>
                              <div className="text-xs text-white/50 mb-1">Token</div>
                              <select value={editForm.fixed_reward_token} onChange={e => setEditForm(f => ({ ...f, fixed_reward_token: e.target.value }))} className={sCls}>
                                <option value="pff">PFF</option>
                                <option value="sol">SOL</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <div className="text-xs text-white/50 mb-1">Vote threshold</div>
                              <input type="number" value={editForm.vote_threshold} onChange={e => setEditForm(f => ({ ...f, vote_threshold: e.target.value }))} className={iCls} />
                            </div>
                            <div>
                              <div className="text-xs text-white/50 mb-1">Vote bonus</div>
                              <input type="number" value={editForm.vote_bonus_amount} onChange={e => setEditForm(f => ({ ...f, vote_bonus_amount: e.target.value }))} className={iCls} />
                            </div>
                            <div>
                              <div className="text-xs text-white/50 mb-1">Bonus token</div>
                              <select value={editForm.vote_bonus_token} onChange={e => setEditForm(f => ({ ...f, vote_bonus_token: e.target.value }))} className={sCls}>
                                <option value="pff">PFF</option>
                                <option value="sol">SOL</option>
                              </select>
                            </div>
                          </div>

                          <Btn onClick={saveEditQuest} disabled={editSaving} className="w-full mt-1">
                            {editSaving ? "Saving…" : "💾 Save changes"}
                          </Btn>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                {airdropRows.length > 0 && (
                  <Btn tone="outline" onClick={exportAirdropCSV}>📥 CSV</Btn>
                )}
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

              {/* Token type toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setAirdropTokenType("pff"); setAirdropPreview(null); setAirdropAmount("200000"); }}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition border ${airdropTokenType === "pff" ? "bg-neon-500 text-black border-neon-500" : "border-neon-500/25 text-white/60 hover:border-neon-500/50"}`}
                >
                  $PFF
                </button>
                <button
                  onClick={() => { setAirdropTokenType("sol"); setAirdropPreview(null); setAirdropAmount("0.05"); }}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition border ${airdropTokenType === "sol" ? "bg-amber-400 text-black border-amber-400" : "border-white/20 text-white/60 hover:border-white/40"}`}
                >
                  SOL
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-white/60 mb-1.5">
                    Amount per wallet ({airdropTokenType === "sol" ? "SOL" : "$PFF"})
                  </div>
                  <input
                    type="number"
                    min="0"
                    step={airdropTokenType === "sol" ? "0.001" : "1"}
                    value={airdropAmount}
                    onChange={(e) => { setAirdropAmount(e.target.value); setAirdropPreview(null); }}
                    className="w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                    placeholder={airdropTokenType === "sol" ? "0.05" : "200000"}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="text-xs text-white/40 mb-1.5">
                    {airdropSelected.size} selected ·{" "}
                    {airdropRows.filter((r) => airdropSelected.has(r.handle) && r.wallet).length} with wallet ·{" "}
                    <span className="text-neon-300 font-bold">
                      {(airdropRows.filter((r) => airdropSelected.has(r.handle) && r.wallet).length * Number(airdropAmount || 0)).toLocaleString()} {airdropTokenType === "sol" ? "SOL" : "$PFF"} total
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
                    {airdropTokenType === "sol"
                      ? <div>Total SOL: <span className="text-amber-300 font-bold">{airdropPreview.total_sol?.toFixed(4) ?? (airdropPreview.valid_count * Number(airdropAmount)).toFixed(4)}</span></div>
                      : <div>Total $PFF: <span className="text-neon-300 font-bold">{airdropPreview.total_pff?.toLocaleString()}</span></div>
                    }
                    {airdropPreview.invalid_count > 0 && (
                      <div className="text-yellow-300">⚠️ {airdropPreview.invalid_count} invalid wallet(s) will be skipped</div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-white/35">Ensure rewards wallet has sufficient {airdropTokenType === "sol" ? "SOL" : "$PFF and SOL for fees"}.</div>
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
                  🔍 Preview
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

          {/* ── Reward History ──────────────────────────────────── */}
          <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-white font-extrabold">💸 Reward History</div>
                <div className="text-xs text-white/45 mt-0.5">Auto-rewards sent on submission approval.</div>
              </div>
              <Btn tone="outline" onClick={loadRewardLogs} disabled={rewardLogsLoading}>
                {rewardLogsLoading ? "Loading…" : "↻ Refresh"}
              </Btn>
            </div>

            {rewardLogsLoading && <div className="text-white/50 text-sm">Loading…</div>}

            {!rewardLogsLoading && rewardLogs.length === 0 && (
              <div className="text-white/35 text-sm text-center py-6">No rewards sent yet.</div>
            )}

            {rewardLogs.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-neon-500/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                      <th className="px-3 py-2.5 text-left">Date</th>
                      <th className="px-3 py-2.5 text-left">Handle</th>
                      <th className="px-3 py-2.5 text-left">Quest</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                      <th className="px-3 py-2.5 text-center">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewardLogs.map((r) => (
                      <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                        <td className="px-3 py-2.5 text-white/40 text-xs whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2.5 text-white font-semibold">{r.handle}</td>
                        <td className="px-3 py-2.5 text-white/60 text-xs">
                          {quests.find(q => q.id === r.quest_id)?.title || r.quest_id}
                        </td>
                        <td className="px-3 py-2.5 text-right text-neon-300 font-bold whitespace-nowrap">
                          {Number(r.airdrop_amount).toLocaleString()} $PFF
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <a
                            href={`https://solscan.io/tx/${r.airdrop_tx}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-sky-400 hover:underline font-mono"
                          >
                            {r.airdrop_tx.slice(0, 8)}…
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Milestones tab ─────────────────────────────────────── */}
      {tab === "milestones" && (
        <div className="mt-6 grid gap-5">
          {/* Airdrop preview modal */}
          {milestoneAirdropPreview && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70">
              <div className="glass-strong rounded-2xl p-6 max-w-md w-full">
                <div className="text-white font-extrabold text-lg mb-1">⚡ Confirm Airdrop</div>
                <div className="text-xs text-white/55 mb-4">
                  {Number(milestoneAirdropPreview.milestone.airdrop_amount_per_wallet).toLocaleString()} $PFF × {milestoneAirdropPreview.entries.length} wallets
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl bg-black/30 border border-neon-500/10 p-3 text-xs text-white/70 space-y-1">
                  {milestoneAirdropPreview.entries.length === 0
                    ? <div className="text-red-300">No wallets found in leaderboard.</div>
                    : milestoneAirdropPreview.entries.map((e, i) => (
                        <div key={i}><span className="text-neon-400">#{i + 1}</span> {e.handle} — <span className="text-white/40 font-mono text-[10px]">{e.wallet_address?.slice(0, 12)}…</span></div>
                      ))
                  }
                </div>
                <div className="mt-4 flex gap-3">
                  <Btn onClick={() => executeMilestoneAirdrop(milestoneAirdropPreview.milestone, true)} disabled={milestoneAirdropPreview.entries.length === 0}>
                    ✓ Confirm & Send
                  </Btn>
                  <Btn tone="outline" onClick={() => setMilestoneAirdropPreview(null)}>Cancel</Btn>
                </div>
              </div>
            </div>
          )}

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-white font-extrabold text-xl">🏆 Public Milestones</div>
                <div className="mt-1 text-xs text-white/55">
                  Displayed on the Horde Engine page. Clickable cards with details.
                </div>
              </div>
              <Btn tone="outline" onClick={loadMilestones}>Refresh</Btn>
            </div>

            {milestoneSuccess && (
              <div className="mt-3 rounded-xl bg-neon-500/10 border border-neon-500/30 px-4 py-2.5 text-sm text-neon-300 font-semibold">✓ {milestoneSuccess}</div>
            )}
            {milestoneErr && (
              <div className="mt-3 rounded-xl bg-red-500/10 border border-red-400/25 px-4 py-2.5 text-sm text-red-200">{milestoneErr}</div>
            )}

            {/* Create form */}
            <div className="mt-5 rounded-2xl border border-neon-500/10 bg-black/20 p-5">
              <div className="text-white font-extrabold mb-4">Add Milestone</div>
              <div className="grid gap-3 md:grid-cols-2">
                {/* Label */}
                <div>
                  <div className="text-xs text-white/60">Label</div>
                  <input value={milestoneForm.label} onChange={(e) => setMilestoneForm(v => ({ ...v, label: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                    placeholder="Horde Awakening" />
                </div>
                {/* Metric */}
                <div>
                  <div className="text-xs text-white/60">Metric</div>
                  <select
                    value={milestoneForm.metric}
                    onChange={(e) => {
                      const metric = e.target.value;
                      const unit = metric === "Market Cap" || metric === "24h Volume" ? "$" : "";
                      setMilestoneForm(v => ({ ...v, metric, unit }));
                    }}
                    className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                  >
                    <option value="Market Cap">Market Cap</option>
                    <option value="24h Volume">24h Volume</option>
                    <option value="Holders">Holders</option>
                    <option value="Submission Count">Submission Count</option>
                  </select>
                </div>
                {/* Target */}
                <div>
                  <div className="text-xs text-white/60">Target value</div>
                  <input type="number" value={milestoneForm.target} onChange={(e) => setMilestoneForm(v => ({ ...v, target: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                    placeholder={milestoneForm.metric === "Market Cap" ? "250000" : milestoneForm.metric === "Holders" ? "2500" : "50"} />
                </div>
                {/* Current — only for Holders (manual) */}
                {milestoneForm.metric === "Holders" && (
                  <div>
                    <div className="text-xs text-white/60">Current value <span className="text-white/30">(manual update)</span></div>
                    <input type="number" value={milestoneForm.current} onChange={(e) => setMilestoneForm(v => ({ ...v, current: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      placeholder="1860" />
                  </div>
                )}
                {/* Reward */}
                <div>
                  <div className="text-xs text-white/60">Reward label</div>
                  <input value={milestoneForm.reward} onChange={(e) => setMilestoneForm(v => ({ ...v, reward: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                    placeholder="Buyback #1 + Horde boost" />
                </div>
                {/* Sort order */}
                <div>
                  <div className="text-xs text-white/60">Sort order (0 = first)</div>
                  <input type="number" value={milestoneForm.sort_order} onChange={(e) => setMilestoneForm(v => ({ ...v, sort_order: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                    placeholder="0" />
                </div>
                {/* Action */}
                <div>
                  <div className="text-xs text-white/60">Action when triggered</div>
                  <select
                    value={milestoneForm.action}
                    onChange={(e) => setMilestoneForm(v => ({ ...v, action: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                  >
                    <option value="custom">Custom (announce only)</option>
                    <option value="burn">Burn $PFF</option>
                    <option value="airdrop">Airdrop $PFF</option>
                    <option value="buyback">Buyback</option>
                  </select>
                </div>
                {/* Burn amount */}
                {milestoneForm.action === "burn" && (
                  <div>
                    <div className="text-xs text-white/60">Burn amount ($PFF)</div>
                    <input type="number" value={milestoneForm.burn_amount} onChange={(e) => setMilestoneForm(v => ({ ...v, burn_amount: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      placeholder="500000" />
                  </div>
                )}
                {/* Airdrop config */}
                {milestoneForm.action === "airdrop" && (<>
                  <div>
                    <div className="text-xs text-white/60">Amount per wallet ($PFF)</div>
                    <input type="number" value={milestoneForm.airdrop_amount_per_wallet} onChange={(e) => setMilestoneForm(v => ({ ...v, airdrop_amount_per_wallet: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      placeholder="50000" />
                  </div>
                  <div>
                    <div className="text-xs text-white/60">Top N recipients (leaderboard)</div>
                    <input type="number" value={milestoneForm.airdrop_top_n} onChange={(e) => setMilestoneForm(v => ({ ...v, airdrop_top_n: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                      placeholder="10" />
                  </div>
                </>)}
                {/* Description */}
                <div className="md:col-span-2">
                  <div className="text-xs text-white/60">Short description (shown in card)</div>
                  <input value={milestoneForm.description} onChange={(e) => setMilestoneForm(v => ({ ...v, description: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                    placeholder="Short description" />
                </div>
                {/* Detail */}
                <div className="md:col-span-2">
                  <div className="text-xs text-white/60">Detail (shown in modal when card clicked)</div>
                  <textarea value={milestoneForm.detail} onChange={(e) => setMilestoneForm(v => ({ ...v, detail: e.target.value }))}
                    rows={3}
                    className="mt-1.5 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
                    placeholder="Full explanation of what happens when this milestone is triggered…" />
                </div>
              </div>
              <div className="mt-4">
                <Btn onClick={createMilestone} disabled={!milestoneForm.label || milestonesLoading}>
                  + Add Milestone
                </Btn>
              </div>
            </div>

            {/* Existing milestones */}
            {milestonesLoading ? (
              <div className="mt-4 text-white/60">Loading…</div>
            ) : milestones.length === 0 ? (
              <div className="mt-4 text-white/60 text-sm">
                No milestones in DB yet. Add one above, or{" "}
                <span className="text-neon-300">the site falls back to the hardcoded defaults.</span>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {milestones.map((m) => {
                  const actionColor = m.action === "burn" ? "text-red-300 border-red-400/30 bg-red-500/10"
                    : m.action === "airdrop" ? "text-neon-300 border-neon-500/30 bg-neon-500/10"
                    : m.action === "buyback" ? "text-yellow-300 border-yellow-400/30 bg-yellow-500/10"
                    : "text-white/50 border-white/10 bg-white/5";
                  return (
                    <div key={m.id} className="rounded-2xl border border-neon-500/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-extrabold">{m.label}</span>
                            <span className="text-white/40 text-xs font-normal">({m.id})</span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${actionColor}`}>
                              {m.action || "custom"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-white/55">
                            {m.metric} • Target: {m.unit}{Number(m.target).toLocaleString()}
                            {m.metric === "Holders" && m.current ? ` • Current: ${Number(m.current).toLocaleString()}` : ""}
                            {" "}• Reward: {m.reward}
                          </div>
                          {m.action === "burn" && m.burn_amount && (
                            <div className="mt-1 text-xs text-red-300/70">🔥 Burn {Number(m.burn_amount).toLocaleString()} $PFF</div>
                          )}
                          {m.action === "airdrop" && m.airdrop_amount_per_wallet && (
                            <div className="mt-1 text-xs text-neon-300/70">🪓 {Number(m.airdrop_amount_per_wallet).toLocaleString()} $PFF × top {m.airdrop_top_n || "?"}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Btn tone="outline" onClick={() => notifyMilestone(m.id)}>🔔 Notify TG</Btn>
                          {m.action === "airdrop" && (
                            <Btn onClick={() => executeMilestoneAirdrop(m)}>⚡ Execute Airdrop</Btn>
                          )}
                          <Btn tone="danger" onClick={() => deleteMilestone(m.id)}>Delete</Btn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </Card>
        </div>
      )}

      {/* ── Telegram tab ────────────────────────────────────────── */}
      {tab === "telegram" && <TelegramTab />}

      {/* ── Oracle tab ───────────────────────────────────────────── */}
      {tab === "oracle" && <OracleTab />}

      </div>{/* /max-w-6xl */}
    </main>
  );
}

// ── Telegram announce tab ──────────────────────────────────────────
function TelegramTab() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null); // null | "sending" | "ok" | "err"

  const QUICK = [
    { label: "🗡️ New Quest", text: "⚔️ <b>New quest available!</b>\n\nA new quest has just been added to the Horde Engine.\n\nComplete it and earn points 👇\nhttps://pumpfunfloki.com/horde-engine" },
    { label: "🔥 Burn", text: "🔥 <b>$PFF Burn incoming.</b>\n\nThe treasury feeds the fire.\n\nWatch the supply drop → https://pumpfunfloki.com" },
    { label: "🏆 Leaderboard", text: "🏆 <b>Leaderboard update!</b>\n\nThe Horde rankings have shifted. Check your position 👇\nhttps://pumpfunfloki.com/horde-engine" },
    { label: "💰 Airdrop", text: "💰 <b>Airdrop incoming for the Horde!</b>\n\nApproved Vikings — rewards are on their way.\n\nKeep grinding → https://pumpfunfloki.com/horde-engine" },
  ];

  async function send() {
    if (!text.trim()) return;
    setStatus("sending");
    try {
      const r = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "announce", text: text.trim() }),
        credentials: "include",
      });
      setStatus(r.ok ? "ok" : "err");
    } catch {
      setStatus("err");
    }
    setTimeout(() => setStatus(null), 3000);
  }

  return (
    <div className="mt-6 grid gap-5">
      <div className="glass rounded-2xl border border-neon-500/15 p-6 grid gap-4">
        <div className="flex items-center gap-2">
          <span className="text-neon-400 text-lg">📣</span>
          <h3 className="font-extrabold text-white">Send to Telegram Group</h3>
          <span className="ml-auto text-xs text-white/30">Supports HTML tags: &lt;b&gt; &lt;i&gt; &lt;a&gt;</span>
        </div>

        {/* Quick templates */}
        <div>
          <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Quick Templates</div>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q.label}
                onClick={() => setText(q.text)}
                className="rounded-xl border border-neon-500/20 bg-neon-500/[0.06] px-3 py-1.5 text-xs text-neon-400 hover:bg-neon-500/12 hover:border-neon-500/40 transition"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={"Write your message here...\nSupports HTML: <b>bold</b>, <i>italic</i>, <a href='...'>link</a>"}
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-neon-500/40 resize-none font-mono"
        />

        {/* Preview */}
        {text.trim() && (
          <div>
            <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Preview</div>
            <div
              className="rounded-xl bg-[#17212b] border border-white/10 px-4 py-3 text-sm text-white leading-relaxed"
              dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, "<br/>") }}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={send}
            disabled={!text.trim() || status === "sending"}
            className="rounded-xl bg-neon-500 text-black px-5 py-2 text-sm font-extrabold shadow-neon hover:bg-neon-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === "sending" ? "Sending…" : "📣 Send to Group"}
          </button>
          {status === "ok" && <span className="text-neon-400 text-sm">✓ Sent!</span>}
          {status === "err" && <span className="text-red-400 text-sm">✗ Error — check token/chat ID</span>}
          <button
            onClick={() => setText("")}
            className="ml-auto text-xs text-white/30 hover:text-white/60 transition"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PFF Oracle tab ─────────────────────────────────────────────────
function OracleTab() {
  const MODES = [
    { id: "PROPHECY",    label: "🔮 Prophecy",    desc: "Cryptic oracle tweet" },
    { id: "VIKING DROP", label: "⚡ Viking Drop",  desc: "Drop announcement to a member" },
    { id: "BURN RITUAL", label: "🔥 Burn Ritual",  desc: "Token burn announcement" },
    { id: "RAID REPLY",  label: "🗡️ Raid Reply",   desc: "Reply to a viral tweet" },
  ];

  // Step 1 — Grok scan
  const [scanning, setScanning] = useState(false);
  const [scanData, setScanData] = useState(null);
  const [scanErr, setScanErr] = useState("");

  // Step 2 — Claude generate
  const [mode, setMode] = useState("PROPHECY");
  const [targetTweet, setTargetTweet] = useState("");
  const [signal, setSignal] = useState("");
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState([]);
  const [liveCtx, setLiveCtx] = useState([]);
  const [genErr, setGenErr] = useState("");
  const [copied, setCopied] = useState(null);

  async function scan() {
    setScanning(true);
    setScanErr("");
    setScanData(null);
    const r = await fetch("/api/telegram", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "oracle-scan" }),
    });
    const j = await r.json();
    setScanning(false);
    if (!r.ok) { setScanErr(j?.detail || j?.error || "scan-error"); return; }
    setScanData(j);
  }

  function raidTweet(tweet) {
    setMode("RAID REPLY");
    setTargetTweet(`@${tweet.author}: ${tweet.text}`);
    setVariants([]);
    setGenErr("");
  }

  async function generate() {
    setGenerating(true);
    setGenErr("");
    setVariants([]);
    setLiveCtx([]);
    const r = await fetch("/api/telegram", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "oracle",
        mode,
        target_tweet: targetTweet || undefined,
        signal: signal || undefined,
      }),
    });
    const j = await r.json();
    setGenerating(false);
    if (!r.ok) { setGenErr(j?.error || j?.detail || "error"); return; }
    setVariants(j.variants || []);
    setLiveCtx(j.live_context || []);
  }

  function copy(text, idx) {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  const inputCls = "w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40 placeholder:text-white/25 resize-none";

  const sentimentColor = {
    bullish: "text-green-400",
    bearish: "text-red-400",
    neutral: "text-yellow-400",
  }[scanData?.sentiment?.toLowerCase()] || "text-white/60";

  const sentimentIcon = scanData?.sentiment?.toLowerCase() === "bullish" ? "📈"
    : scanData?.sentiment?.toLowerCase() === "bearish" ? "📉" : "➡️";

  return (
    <div className="mt-6 flex flex-col gap-6">

      {/* ── Step 1: Grok X Scanner ─────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-white font-extrabold text-lg">📡 X Trend Scanner</div>
            <div className="text-white/40 text-xs mt-0.5">Grok scans Crypto Twitter in real time → viral tweets + CT sentiment</div>
          </div>
          <Btn onClick={scan} disabled={scanning} className="text-xs px-4 py-1.5 shrink-0 ml-4">
            {scanning ? "⚡ Scanning…" : "📡 Scan X"}
          </Btn>
        </div>

        {scanErr && (
          <div className="mt-3 text-sm text-red-300">
            {scanErr === "missing-xai-key"
              ? "❌ XAI_API_KEY missing in Vercel → Settings → Environment Variables"
              : `❌ ${scanErr}`}
          </div>
        )}

        {scanning && (
          <div className="mt-4 rounded-xl border border-neon-500/15 bg-black/10 p-6 text-center text-neon-400/60 text-sm animate-pulse">
            Grok scanning Crypto Twitter…
          </div>
        )}

        {scanData && !scanning && (
          <div className="mt-4 flex flex-col gap-4">
            {/* Sentiment */}
            <div className="flex items-center gap-3">
              <span className={`font-bold text-base ${sentimentColor}`}>
                {sentimentIcon} {scanData.sentiment?.toUpperCase()}
              </span>
              <span className="text-xs text-white/40">{scanData.sentiment_reason}</span>
            </div>

            {/* Trending topics */}
            {scanData.trending_topics?.length > 0 && (
              <div>
                <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">Trending on CT</div>
                <div className="flex flex-wrap gap-2">
                  {scanData.trending_topics.map((t, i) => (
                    <span key={i} className="rounded-full border border-neon-500/20 bg-neon-500/[0.07] px-2.5 py-0.5 text-xs text-neon-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Viral tweets */}
            {scanData.viral_tweets?.length > 0 && (
              <div>
                <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">Viral Tweets — Raid Targets</div>
                <div className="flex flex-col gap-2">
                  {scanData.viral_tweets.map((tw, i) => (
                    <div key={i} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-neon-400/80 font-bold mb-1">@{tw.author}</div>
                        <div className="text-xs text-white/70 leading-relaxed mb-1">{tw.text}</div>
                        <div className="text-[10px] text-white/30 italic">{tw.why}</div>
                      </div>
                      <button
                        onClick={() => raidTweet(tw)}
                        className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20 transition"
                      >
                        🗡️ Raid
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!scanData && !scanning && !scanErr && (
          <div className="mt-4 rounded-xl border border-white/5 bg-black/10 p-6 text-center text-white/20 text-sm">
            Run a scan to see Crypto Twitter trends in real time
          </div>
        )}
      </Card>

      {/* ── Step 2: Claude Viking Generator ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="text-white font-extrabold text-lg mb-1">⚔️ Viking Generator</div>
          <div className="text-white/40 text-xs mb-4">Claude Opus generates Viking content calibrated to the current market energy.</div>

          {/* Mode selector */}
          <div className="text-xs text-white/60 mb-2">Mode</div>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  mode === m.id
                    ? "border-neon-500/60 bg-neon-500/10 text-neon-300"
                    : "border-white/10 bg-black/20 text-white/60 hover:border-white/25"
                }`}
              >
                <div className="text-sm font-bold">{m.label}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* Raid reply: target tweet */}
          {mode === "RAID REPLY" && (
            <div className="mb-4">
              <div className="text-xs text-white/60 mb-1">Target tweet *</div>
              <textarea
                rows={3}
                value={targetTweet}
                onChange={(e) => setTargetTweet(e.target.value)}
                placeholder="Paste the tweet here or click 🗡️ Raid above…"
                className={inputCls}
              />
            </div>
          )}

          {mode === "VIKING DROP" && (
            <div className="mb-4 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.05] px-3 py-2 text-xs text-yellow-200/70">
              [TAG_USER] will be placed automatically — replace it before posting.
            </div>
          )}

          <div>
            <div className="text-xs text-white/60 mb-1">Hidden signal <span className="text-white/30">(optional)</span></div>
            <input
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
              placeholder="Ex: burn in 48h, milestone reached, airdrop incoming…"
              className={inputCls}
            />
          </div>

          {genErr && (
            <div className="mt-3 text-sm text-red-300">
              {genErr === "missing-anthropic-key"
                ? "❌ ANTHROPIC_API_KEY missing in Vercel → Settings → Environment Variables"
                : `❌ ${genErr}`}
            </div>
          )}

          <Btn className="mt-5 w-full" onClick={generate} disabled={generating}>
            {generating ? "⚡ Oracle is forging the text…" : "⚔️ Generate 3 variants"}
          </Btn>
        </Card>

        {/* Right — results */}
        <div className="flex flex-col gap-4">
          {liveCtx.length > 0 && (
            <div className="rounded-xl border border-neon-500/10 bg-neon-500/[0.03] px-4 py-3">
              <div className="text-[10px] text-neon-400/50 font-bold uppercase tracking-widest mb-2">Live intelligence analysed</div>
              {liveCtx.map((line, i) => (
                <div key={i} className="text-[11px] text-white/40 leading-relaxed">{line}</div>
              ))}
            </div>
          )}

          {variants.length === 0 && !generating && (
            <div className="rounded-2xl border border-white/5 bg-black/10 p-8 text-center text-white/25 text-sm">
              Variants will appear here
            </div>
          )}
          {generating && (
            <div className="rounded-2xl border border-neon-500/15 bg-black/10 p-8 text-center text-neon-400/60 text-sm animate-pulse">
              Claude is forging your Viking variants…
            </div>
          )}
          {variants.map((v, i) => (
            <div key={i} className="glass rounded-2xl border border-neon-500/15 p-4 flex flex-col gap-3">
              <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Variant {i + 1}</div>
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{v}</p>
              <div className="flex gap-2 self-end">
                <button
                  onClick={() => copy(v, i)}
                  className="rounded-lg border border-neon-500/20 bg-neon-500/[0.06] px-3 py-1 text-xs text-neon-400 hover:bg-neon-500/15 transition"
                >
                  {copied === i ? "✓ Copied" : "Copy"}
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(v)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-sky-500/30 bg-sky-500/[0.08] px-3 py-1 text-xs text-sky-400 hover:bg-sky-500/20 transition"
                >
                  𝕏 Share
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
