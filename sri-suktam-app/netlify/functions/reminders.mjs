// Scheduled every 5 minutes: sends the morning / evening / night reminders that are due.
import { getStore } from "@netlify/blobs";
import { dueReminders, messageFor, send, isGone } from "../lib/push-core.mjs";

export default async () => {
  const store = getStore("sri-suktam-push");
  const { blobs } = await store.list({ prefix: "sub/" });
  let sent = 0;

  for (const { key } of blobs) {
    const rec = await store.get(key, { type: "json" });
    if (!rec?.subscription) continue;
    const { due, date } = dueReminders(rec);
    if (!due.length) continue;

    // Only the latest due reminder is sent (avoids two at once if times are close together).
    const kind = due[due.length - 1];
    try {
      await send(store, rec.subscription, messageFor(kind, rec, date));
      sent++;
    } catch (err) {
      if (isGone(err)) { await store.delete(key); continue; }
      console.error("push failed", key, err?.statusCode, err?.body || err?.message);
      continue; // retry on the next run while still inside the window
    }
    rec.lastSent = { ...(rec.lastSent || {}) };
    for (const k of due) rec.lastSent[k] = date;
    await store.setJSON(key, rec);
  }

  console.log(`reminders: checked ${blobs.length}, sent ${sent}`);
};

export const config = { schedule: "*/5 * * * *" };
