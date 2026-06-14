#!/usr/bin/env node
/**
 * Smoke-test conversation integration APIs (no auth session required).
 * Usage: node scripts/verify-conversations-api.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const baseUrl = process.argv[2] ?? "http://localhost:3000";

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...process.env, ...loadEnvLocal() };
const secret = env.WEBSITE_LEADS_API_SECRET?.trim();

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await check("sync rejects missing auth", async () => {
  const res = await fetch(`${baseUrl}/api/integrations/conversations/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: "test", channel: "whatsapp", inbound_message: "hi", next_action: "continue" }),
  });
  assert(res.status === 401 || res.status === 503, `expected 401/503 got ${res.status}`);
});

await check("sync rejects invalid body", async () => {
  if (!secret) {
    console.log("  (skip detail: no WEBSITE_LEADS_API_SECRET in .env.local)");
    return;
  }
  const res = await fetch(`${baseUrl}/api/integrations/conversations/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-website-secret": secret,
    },
    body: JSON.stringify({
      session_id: "verify-smoke-session",
      channel: "whatsapp",
      outbound_only: true,
      next_action: "book_call",
    }),
  });
  assert(res.status === 400, `expected 400 got ${res.status}`);
  const body = await res.json();
  assert(body.error === "Validation failed", "expected validation error");
});

await check("sync accepts outbound_only with ai_reply", async () => {
  if (!secret) {
    console.log("  (skip detail: no WEBSITE_LEADS_API_SECRET in .env.local)");
    return;
  }
  const sessionId = `verify_${Date.now()}`;
  const res = await fetch(`${baseUrl}/api/integrations/conversations/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-website-secret": secret,
    },
    body: JSON.stringify({
      session_id: sessionId,
      channel: "whatsapp",
      phone_number: "15551234567",
      name: "Verify Smoke",
      outbound_only: true,
      ai_reply: "Test slot list message",
      next_action: "book_call",
      qualification: { name: "Verify Smoke" },
    }),
  });
  const body = await res.json();
  if (res.status === 500 && /conversations|schema cache|could not find/i.test(body.error ?? "")) {
    throw new Error(`DB migration 066 required: ${body.error}`);
  }
  assert(res.status === 200, `expected 200 got ${res.status}: ${JSON.stringify(body)}`);
  assert(body.conversation_id, "expected conversation_id");
});

await check("session-state requires auth", async () => {
  const res = await fetch(`${baseUrl}/api/integrations/conversations/session-state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: "x", channel: "whatsapp" }),
  });
  assert(res.status === 401 || res.status === 503, `expected 401/503 got ${res.status}`);
});

await check("human review sync creates notification path", async () => {
  if (!secret) {
    console.log("  (skip detail: no WEBSITE_LEADS_API_SECRET in .env.local)");
    return;
  }
  const sessionId = `verify_review_${Date.now()}`;
  const res = await fetch(`${baseUrl}/api/integrations/conversations/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-website-secret": secret,
    },
    body: JSON.stringify({
      session_id: sessionId,
      channel: "webchat",
      name: "Review Test",
      inbound_message: "I need a human",
      ai_reply: "Connecting you with the team.",
      next_action: "human_review",
      human_review_requested: true,
      qualification: { name: "Review Test", temperature: "hot" },
    }),
  });
  const body = await res.json();
  if (res.status === 500 && /conversations|schema cache|could not find/i.test(body.error ?? "")) {
    throw new Error(`DB migration 066 required: ${body.error}`);
  }
  assert(res.status === 200, `expected 200 got ${res.status}: ${JSON.stringify(body)}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
