export async function verifyRecaptcha(token, expectedAction) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) throw new Error("Missing RECAPTCHA_SECRET_KEY");
  if (!token) return { ok: false, reason: "missing-token" };

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);

  const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const j = await r.json();

  // v3: success + score + action
  const ok =
    j?.success === true &&
    (typeof j?.score !== "number" || j.score >= 0.5) &&
    (!expectedAction || j.action === expectedAction);

  return { ok, raw: j };
}