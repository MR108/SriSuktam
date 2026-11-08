// Shared logic for the Sri Suktam reminder push functions.
import webpush from "web-push";
import { createHash } from "node:crypto";

export const DEFAULT_TIMES = { m: "07:00", e: "18:00", n: "22:00" };
const WINDOW_MIN = 25; // send if we are within this many minutes after the reminder time

export async function getVapid(store) {
  let keys = await store.get("vapid", { type: "json" });
  if (!keys) {
    await store.setJSON("vapid", webpush.generateVAPIDKeys());
    keys = await store.get("vapid", { type: "json" }); // re-read so concurrent first calls agree
  }
  return keys;
}

export function subId(subscription) {
  return createHash("sha256").update(String(subscription?.endpoint || "")).digest("hex").slice(0, 32);
}

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
export function cleanTimes(t = {}) {
  const out = { ...DEFAULT_TIMES };
  for (const k of Object.keys(DEFAULT_TIMES)) if (typeof t[k] === "string" && HM.test(t[k])) out[k] = t[k];
  return out;
}
export function cleanTz(tz) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz; } catch { return "Asia/Kolkata"; }
}

// Local date (YYYY-MM-DD) and minutes-since-midnight for a timezone.
export function localNow(tz, now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now).map(x => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

function dayNumber(start, date) {
  if (!start) return null;
  const a = Date.UTC(...start.split("-").map((v, i) => i === 1 ? v - 1 : +v));
  const b = Date.UTC(...date.split("-").map((v, i) => i === 1 ? v - 1 : +v));
  const n = Math.round((b - a) / 86400000) + 1;
  return n >= 1 && n <= 960 ? n : null;
}

export function messageFor(kind, rec, date) {
  const n = dayNumber(rec.start, date);
  const day = n ? `Day ${n} · ` : "";
  if (kind === "m") return { title: "☀️ శ్రీసూక్తం — Morning", body: `${day}Bath, lamp, tilak · Sri Suktam ×11 · 5-min meditation`, tag: "srisuktam-m" };
  if (kind === "e") return { title: "🪔 శ్రీసూక్తం — Evening", body: `${day}Evening lamp · Sri Suktam ×5`, tag: "srisuktam-e" };
  return { title: "🌙 Meditate & check in", body: `${day}5-min meditation on Sri & Vishnu, then mark today complete`, tag: "srisuktam-n" };
}

// Which reminders are due for this subscriber right now?
export function dueReminders(rec, now = new Date()) {
  const tz = cleanTz(rec.tz);
  const { date, minutes } = localNow(tz, now);
  const times = cleanTimes(rec.times);
  const st = rec.status && rec.status.date === date ? rec.status : {};
  const due = [];
  for (const kind of ["m", "e", "n"]) {
    const [h, m] = times[kind].split(":").map(Number);
    const t = h * 60 + m;
    if (minutes < t || minutes >= t + WINDOW_MIN) continue;
    if (rec.lastSent?.[kind] === date) continue;
    if (kind === "m" && st.m) continue;      // morning already done
    if (kind === "e" && st.e) continue;      // evening chanting already done
    if (kind === "n" && st.done) continue;   // whole day already complete
    due.push(kind);
  }
  return { due, date };
}

export async function send(store, subscription, payload) {
  const keys = await getVapid(store);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || process.env.URL || "mailto:reminders@sri-suktam.app", keys.publicKey, keys.privateKey);
  return webpush.sendNotification(subscription, JSON.stringify({ ...payload, url: "/" }), { TTL: 60 * 60, urgency: "high" });
}

export function isGone(err) {
  return err && (err.statusCode === 404 || err.statusCode === 410);
}
