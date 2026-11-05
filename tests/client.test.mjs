import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../web/api.ts", import.meta.url))],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const client = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundled.outputFiles[0].text).toString("base64")
);

test("client reports a stopped local service and reports recovery on next request", async () => {
  const saved = { fetch: globalThis.fetch, window: globalThis.window };
  const target = new EventTarget(),
    events = [];
  globalThis.window = target;
  target.addEventListener("figure-connection", (e) => events.push(e.detail));
  try {
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(client.initSession(), /启动科研绘图.cmd/);
    globalThis.fetch = async () => Response.json({ token: "session-test" });
    await client.initSession();
    assert.deepEqual(events, [false, true]);
  } finally {
    Object.assign(globalThis, saved);
  }
});

test("client refreshes an expired local session once and preserves the posted project", async () => {
  const saved = { fetch: globalThis.fetch, window: globalThis.window };
  const calls = [];
  globalThis.window = new EventTarget();
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1)
        return Response.json({ error: "expired" }, { status: 401 });
      if (url === "/api/session")
        return Response.json({ token: "refreshed-test" });
      return Response.json({ ok: true });
    };
    const project = { schemaVersion: 1, labels: { title: "会话恢复测试" } };
    assert.deepEqual(await client.api("/api/inspect", project), { ok: true });
    assert.deepEqual(
      calls.map((c) => c.url),
      ["/api/inspect", "/api/session", "/api/inspect"],
    );
    assert.equal(calls[0].options.body, calls[2].options.body);
    assert.equal(
      calls[2].options.headers.Authorization,
      "Bearer refreshed-test",
    );
    calls.length = 0;
    globalThis.fetch = async (url) => {
      calls.push(url);
      return url === "/api/session"
        ? Response.json({ token: "still-expired" })
        : Response.json({ error: "expired again" }, { status: 401 });
    };
    await assert.rejects(client.api("/api/inspect", project), /expired again/);
    assert.equal(calls.length, 3);
  } finally {
    Object.assign(globalThis, saved);
  }
});
