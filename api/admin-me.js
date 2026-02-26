import { readSession } from "./_session.js";

export default async function handler(req, res) {
  try {
    const s = readSession(req);
    return res.status(200).json({ admin: !!s?.admin });
  } catch (e) {
    return res.status(500).json({ error: "server-error", message: e?.message });
  }
}