import { jsonResponse } from "./signals.js";

const AUTH_CODE_TTL_MINUTES = 10;
const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export async function handleAuthRequest(request, env, now = new Date(), services = {}) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405, { allow: "POST, OPTIONS" });
  }

  if (url.pathname === "/api/auth/request-code") {
    return requestAuthCode(request, env, now, services);
  }

  if (url.pathname === "/api/auth/verify-code") {
    return verifyAuthCode(request, env, now);
  }

  return jsonResponse({ error: "not found" }, 404);
}

async function requestAuthCode(request, env, now, services) {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonResponse({ error: body.error }, 400);
  }

  const email = normalizeEmail(body.value.email);
  if (!email) {
    return jsonResponse({ error: "valid email is required" }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return jsonResponse({ error: "email service is not configured" }, 500);
  }

  const code = generateAuthCode(env);
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + AUTH_CODE_TTL_MINUTES * 60 * 1000).toISOString();
  const codeHash = await hashAuthCode(email, code);

  await env.DB.prepare(
    `INSERT INTO auth_codes (email, code_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(email, codeHash, expiresAt, createdAt)
    .run();

  const sent = await sendAuthCodeEmail(email, code, env, services.fetch ?? fetch);
  if (!sent.ok) {
    return jsonResponse({ error: "email could not be sent" }, 502);
  }

  return jsonResponse({ ok: true });
}

async function verifyAuthCode(request, env, now) {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonResponse({ error: body.error }, 400);
  }

  const email = normalizeEmail(body.value.email);
  const code = normalizeCode(body.value.code);
  if (!email || !code) {
    return jsonResponse({ error: "valid email and code are required" }, 400);
  }

  const stored = await env.DB.prepare(
    `SELECT id, code_hash, expires_at
     FROM auth_codes
     WHERE email = ? AND used_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
  )
    .bind(email)
    .first();

  if (!stored || new Date(stored.expires_at).getTime() < now.getTime()) {
    return jsonResponse({ error: "invalid or expired code" }, 400);
  }

  const codeHash = await hashAuthCode(email, code);
  if (stored.code_hash !== codeHash) {
    return jsonResponse({ error: "invalid or expired code" }, 400);
  }

  await env.DB.prepare("UPDATE auth_codes SET used_at = ? WHERE id = ?")
    .bind(now.toISOString(), stored.id)
    .run();

  return jsonResponse({ ok: true, email });
}

async function readJsonBody(request) {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "body must be a JSON object" };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: "invalid JSON body" };
  }
}

function normalizeEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email || email.length > 254 || /\s/.test(email)) {
    return "";
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeCode(value) {
  const code = String(value ?? "").trim();
  return /^\d{6}$/.test(code) ? code : "";
}

function generateAuthCode(env) {
  if (/^\d{6}$/.test(env.AUTH_DEV_CODE ?? "")) {
    return env.AUTH_DEV_CODE;
  }

  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1000000).padStart(6, "0");
}

async function hashAuthCode(email, code) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${email}:${code}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sendAuthCodeEmail(email, code, env, fetchImpl) {
  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.AUTH_FROM_EMAIL || "onboarding@resend.dev",
      to: [email],
      subject: ".alomat verification code",
      text: `Your .alomat verification code is ${code}. It expires in ${AUTH_CODE_TTL_MINUTES} minutes.`,
      html: `<p>Your .alomat verification code is <strong>${code}</strong>.</p><p>It expires in ${AUTH_CODE_TTL_MINUTES} minutes.</p>`,
    }),
  });

  return { ok: response.ok };
}
