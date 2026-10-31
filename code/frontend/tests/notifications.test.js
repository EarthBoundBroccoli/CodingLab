import assert from "node:assert/strict";
import test from "node:test";
import { loadNotificationInbox, markNotificationsRead } from "../src/lib/notifications.js";

const notifications = [{ _id: "unread", isRead: false }, { _id: "read", isRead: true }];

test("inbox displays fetched notifications before marking only loaded unread IDs", async () => {
  const calls = [];
  const result = await loadNotificationInbox("https://backend", {
    signal: new AbortController().signal,
    onLoaded: data => { calls.push("display"); assert.deepEqual(data, notifications); },
    fetchImpl: async (url, options) => {
      assert.equal(options.credentials, "include");
      if (!options.method) {
        calls.push("get");
        return { ok: true, json: async () => notifications };
      }
      calls.push("patch");
      assert.equal(url, "https://backend/api/notifications/read-all");
      assert.deepEqual(JSON.parse(options.body), { ids: ["unread"] });
      return { ok: true };
    },
  });
  assert.deepEqual(calls, ["get", "display", "patch"]);
  assert.ok(result.notifications.every(item => item.isRead));
  assert.equal(notifications[0].isRead, false);
});

test("failed or malformed loads never mark notifications read", async () => {
  for (const response of [{ ok: false }, { ok: true, json: async () => ({ error: "bad data" }) }]) {
    let requests = 0;
    await assert.rejects(loadNotificationInbox("", {
      signal: new AbortController().signal,
      onLoaded: () => assert.fail("Failed load was displayed"),
      fetchImpl: async () => { requests++; return response; },
    }));
    assert.equal(requests, 1);
  }
});

test("failed read update preserves unread items and can be retried", async () => {
  const result = await loadNotificationInbox("", {
    signal: new AbortController().signal, onLoaded: () => {},
    fetchImpl: async (_url, options) => options.method
      ? { ok: false } : { ok: true, json: async () => notifications },
  });
  assert.equal(result.notifications[0].isRead, false);
  assert.match(result.readError, /retry/i);
  const retried = await markNotificationsRead("", result.notifications, undefined, async () => ({ ok: true }));
  assert.equal(retried[0].isRead, true);
});

test("empty or already-read inbox skips the read request", async () => {
  for (const data of [[], [{ _id: "read", isRead: true }]]) {
    let requests = 0;
    await loadNotificationInbox("", {
      signal: new AbortController().signal, onLoaded: () => {},
      fetchImpl: async () => { requests++; return { ok: true, json: async () => data }; },
    });
    assert.equal(requests, 1);
  }
});

test("unmount during fetch prevents display and the subsequent read update", async () => {
  const controller = new AbortController();
  let requests = 0;
  const result = await loadNotificationInbox("", {
    signal: controller.signal, onLoaded: () => assert.fail("Aborted load was displayed"),
    fetchImpl: async () => {
      requests++;
      controller.abort();
      return { ok: true, json: async () => notifications };
    },
  });
  assert.equal(result, null);
  assert.equal(requests, 1);
});
