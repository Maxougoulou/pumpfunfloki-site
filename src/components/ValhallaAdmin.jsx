import { useEffect, useMemo, useState } from "react";

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

function Btn({ children, onClick, tone="solid", disabled=false }) {
  const base = "rounded-xl px-4 py-2 text-sm font-extrabold transition";
  const solid = "bg-neon-500 text-black shadow-neonStrong hover:bg-neon-400";
  const outline = "border border-neon-500/25 text-white/85 hover:border-neon-500/55";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${tone==="solid"?solid:outline} ${disabled?"opacity-40 cursor-not-allowed":""}`}
    >
      {children}
    </button>
  );
}

export default function ValhallaAdmin() {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const [me, setMe] = useState({ loading: true, admin: false });
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  const [tab, setTab] = useState("submissions");

  // submissions
  const [subStatus, setSubStatus] = useState("pending");
  const [subs, setSubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);

  // logs
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logForm, setLogForm] = useState({ title: "", description: "", proof_link: "", type: "event" });

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

  async function loadSubmissions() {
    setSubsLoading(true);
    const r = await fetch(`/api/admin-submissions?status=${encodeURIComponent(subStatus)}`, { credentials: "include" });
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

  useEffect(() => {
    if (!me.admin) return;
    if (tab === "submissions") loadSubmissions();
    if (tab === "logs") loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.admin, tab, subStatus]);

  if (me.loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Card><div className="text-white/80">Loading Valhalla…</div></Card>
      </main>
    );
  }

  if (!me.admin) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <div className="text-white font-extrabold text-2xl">Valhalla Admin</div>
          <div className="mt-2 text-white/70 text-sm">Login (protected by reCAPTCHA v3 + bcrypt hash).</div>

          <div className="mt-5">
            <div className="text-xs text-white/60">Admin password</div>
            <input
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              type="password"
              className="mt-2 w-full rounded-xl border border-neon-500/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-neon-500/40"
              placeholder="••••••••••"
            />
          </div>

          {err ? <div className="mt-4 text-sm text-red-200">{err}</div> : null}

          <div className="mt-6 flex gap-3">
            <Btn onClick={login} disabled={!pwd || !siteKey}>Login</Btn>
            <Btn tone="outline" onClick={() => (window.location.href = "/")}>Back site</Btn>
          </div>

          {!siteKey ? (
            <div className="mt-4 text-xs text-yellow-200">
              Missing VITE_RECAPTCHA_SITE_KEY in env.
            </div>
          ) : null}
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-white font-extrabold text-3xl">Valhalla Admin</div>
          <div className="mt-1 text-white/60 text-sm">Approve quests • Post execution proofs • Run discipline.</div>
        </div>
        <div className="flex gap-3">
          <Btn tone="outline" onClick={() => (window.location.href = "/")}>Back site</Btn>
          <Btn onClick={logout}>Logout</Btn>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {[
          ["submissions", "Submissions"],
          ["logs", "Execution Logs"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-2 text-sm font-extrabold border ${
              tab === k ? "bg-neon-500 text-black border-neon-500" : "border-neon-500/20 text-white/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "submissions" ? (
        <div className="mt-6 grid gap-5">
          <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-white font-extrabold">Submissions</div>
              <div className="flex items-center gap-2">
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
              </div>
            </div>

            {subsLoading ? (
              <div className="mt-4 text-white/60">Loading…</div>
            ) : subs.length === 0 ? (
              <div className="mt-4 text-white/60">No rows.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {subs.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-neon-500/10 bg-black/20 p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <div className="text-white font-extrabold">{s.handle} <span className="text-white/50 text-xs">({s.quest_id})</span></div>
                        <div className="text-white/60 text-xs">{new Date(s.created_at).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <Btn tone="outline" onClick={() => setSubmissionStatus(s.id, "approved")}>Approve</Btn>
                        <Btn tone="outline" onClick={() => setSubmissionStatus(s.id, "rejected")}>Reject</Btn>
                      </div>
                    </div>
                    <div className="mt-3 text-white/85 text-sm whitespace-pre-wrap">{s.proof}</div>
                    {s.note ? <div className="mt-2 text-white/60 text-xs">Note: {s.note}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "logs" ? (
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
                        <div className="text-white font-extrabold">{l.title} <span className="text-white/50 text-xs">({l.type})</span></div>
                        <div className="text-white/60 text-xs">{new Date(l.created_at).toLocaleString()}</div>
                      </div>
                      {l.proof_link ? (
                        <a className="text-neon-300 text-sm hover:underline" href={l.proof_link} target="_blank" rel="noreferrer">Proof</a>
                      ) : null}
                    </div>
                    {l.description ? <div className="mt-3 text-white/85 text-sm whitespace-pre-wrap">{l.description}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </main>
  );
}