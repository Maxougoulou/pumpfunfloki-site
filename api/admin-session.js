import bcrypt from "bcryptjs";
import { verifyRecaptcha } from "./_recaptcha.js";
import { setSession, clearSession, readSession } from "./_session.js";

export default async function handler(req, res) {
  // GET — check session (formerly admin-me)
  if (req.method === "GET") {
    try {
      const s = readSession(req);
      return res.status(200).json({ admin: !!s?.admin });
    } catch (e) {
      return res.status(500).json({ error: "server-error", message: e?.message });
    }
  }

  // POST — login (formerly admin-login)
  if (req.method === "POST") {
    try {
      const { password, recaptchaToken } = req.body || {};

      const rc = await verifyRecaptcha(recaptchaToken, "admin_login");
      if (!rc.ok) return res.status(400).json({ error: "recaptcha-failed", details: rc.raw });

      const hash = process.env.ADMIN_PASSWORD_HASH;
      if (!hash) return res.status(500).json({ error: "missing-admin-hash" });

      const ok = await bcrypt.compare(String(password || ""), hash);
      if (!ok) return res.status(401).json({ error: "bad-credentials" });

      setSession(res, { admin: true, at: Date.now() });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: "server-error", message: e?.message });
    }
  }

  // DELETE — logout (formerly admin-logout)
  if (req.method === "DELETE") {
    clearSession(res);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "method-not-allowed" });
}
