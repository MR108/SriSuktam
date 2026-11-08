// /api/push — subscribe, update, test and unsubscribe for reminder notifications.
import { getStore } from "@netlify/blobs";
import { getVapid, subId, cleanTimes, cleanTz, send, isGone, messageFor, localNow } from "../lib/push-core.mjs";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async (req) => {
  const store = getStore("sri-suktam-push");

  if (req.method === "GET") {
    const { publicKey } = await getVapid(store);
    return json({ publicKey });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const sub = body.subscription;
  if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys) return json({ error: "no subscription" }, 400);
  const key = "sub/" + subId(sub);
  const existing = (await store.get(key, { type: "json" })) || null;

  switch (body.action) {
    case "subscribe": {
      const rec = {
        subscription: { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh || ""), auth: String(sub.keys.auth || "") } },
        times: cleanTimes(body.times),
        tz: cleanTz(body.tz),
        start: DATE.test(body.start || "") ? body.start : existing?.start || null,
        status: existing?.status || null,
        lastSent: existing?.lastSent || {},
        created: existing?.created || new Date().toISOString(),
      };
      await store.setJSON(key, rec);
      return json({ ok: true, times: rec.times });
    }
    case "status": {
      if (!existing) return json({ ok: false, error: "not subscribed" }, 404);
      const s = body.status || {};
      if (!DATE.test(s.date || "")) return json({ error: "bad status" }, 400);
      existing.status = { date: s.date, m: !!s.m, e: !!s.e, done: !!s.done };
      if (DATE.test(body.start || "")) existing.start = body.start;
      await store.setJSON(key, existing);
      return json({ ok: true });
    }
    case "test": {
      const rec = existing || { start: body.start, tz: body.tz };
      const msg = messageFor("m", rec, localNow(cleanTz(rec.tz)).date);
      try {
        await send(store, sub, { title: "🔔 Test — reminders are on", body: msg.body, tag: "srisuktam-test" });
        return json({ ok: true });
      } catch (err) {
        if (isGone(err)) await store.delete(key);
        return json({ ok: false, error: String(err?.body || err?.message || err) }, 502);
      }
    }
    case "unsubscribe": {
      await store.delete(key);
      return json({ ok: true });
    }
    default:
      return json({ error: "unknown action" }, 400);
  }
};

export const config = { path: "/api/push" };
