/**
 * Sanity-check env vars for mentor booking-request WhatsApp (Zixflow).
 * Loads `.env` then `.env.local` like `scripts/db-ping.cjs`. Prints booleans only — never prints secrets.
 *
 * Usage: `npm run booking:whatsapp-check`
 */
const fs = require("fs");
const path = require("path");

function stripQuotes(v) {
  let s = String(v).trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    val = stripQuotes(val);
    out[key] = val;
  }
  return out;
}

function loadEnv() {
  const root = path.resolve(__dirname, "..");
  const base = parseEnvFile(path.join(root, ".env"));
  const local = parseEnvFile(path.join(root, ".env.local"));
  for (const [k, v] of Object.entries(base)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  for (const [k, v] of Object.entries(local)) {
    process.env[k] = v;
  }
}

function has(name) {
  return Boolean((process.env[name] ?? "").trim());
}

loadEnv();

/** @type {{ key: string; critical: boolean; hint?: string }[]} */
const checks = [
  { key: "BOOKING_ACTION_SECRET", critical: true, hint: "signs Accept/Reject URLs embedded in Meta template" },
  { key: "ZIXFLOW_API_KEY", critical: true },
  { key: "ZIXFLOW_WHATSAPP_PHONE_ID", critical: true },
  { key: "ZIXFLOW_BOOKING_REQUEST_TEMPLATE", critical: true, hint: "Meta/Zixflow template name for session request" },
  { key: "AUTH_URL", critical: false, hint: "defaults to http://localhost:3000 if unset" },
  {
    key: "ZIXFLOW_BOOKING_BODY_VARS_ORDER",
    critical: false,
    hint: "optional; defaults map {{1}}–{{6}} to mentor, student, college, year, profile URL, time",
  },
  { key: "ZIXFLOW_DEFAULT_COUNTRY_CODE", critical: false, hint: "e.g. 91 when mentors save 10-digit local numbers" },
  { key: "ZIXFLOW_FALLBACK_TO_DIGITS", critical: false, hint: "testing only — if mentor profile has no WhatsApp" },
];

console.log("Booking-request WhatsApp — env check (values never shown)\n");

let failed = false;
for (const c of checks) {
  const ok = has(c.key);
  const tag = ok ? "ok " : c.critical ? "NO " : "-- ";
  const extra = c.hint ? ` — ${c.hint}` : "";
  console.log(`  [${tag}] ${c.key}${extra}`);
  if (c.critical && !ok) failed = true;
}

console.log("");
if (failed) {
  console.error("Missing one or more critical variables — WhatsApp will not send from POST /api/booking-requests.");
  process.exit(1);
}

console.log(
  "Critical vars OK. Still ensure mentor profile `whatsappUrl` or `phone` yields enough digits for Zixflow `to`.",
);
process.exit(0);
