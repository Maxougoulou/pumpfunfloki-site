import crypto from "crypto";
import { parse, serialize } from "cookie";

const COOKIE_NAME = "pff_admin_session";

function hmac(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function setSession(res, data) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Missing ADMIN_SESSION_SECRET");

  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = hmac(payload, secret);
  const value = `${payload}.${sig}`;

  res.setHeader(
    "Set-Cookie",
    serialize(COOKIE_NAME, value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  );
}

export function clearSession(res) {
  res.setHeader(
    "Set-Cookie",
    serialize(COOKIE_NAME, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })
  );
}

export function readSession(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Missing ADMIN_SESSION_SECRET");

  const cookies = parse(req.headers.cookie || "");
  const raw = cookies[COOKIE_NAME];
  if (!raw) return null;

  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;

  const expected = hmac(payload, secret);
  if (sig !== expected) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function requireAdmin(req) {
  const s = readSession(req);
  if (!s?.admin) return null;
  return s;
}