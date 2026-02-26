import { clearSession } from "./_session.js";

export default async function handler(req, res) {
  clearSession(res);
  return res.status(200).json({ ok: true });
}