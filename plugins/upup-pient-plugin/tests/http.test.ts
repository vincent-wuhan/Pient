import assert from "node:assert/strict";
import test from "node:test";
import { UpupError } from "../src/errors.ts";
import { requestJson, requestText } from "../src/http.ts";

test("rejects undocumented HTTPS hosts before dispatch", async () => {
  let dispatched = false;
  await assert.rejects(
    requestText("https://example.com/data", {
      fetch: async () => {
        dispatched = true;
        return new Response("");
      },
    }),
    (error: unknown) => error instanceof UpupError && error.code === "configuration" && !dispatched,
  );
});

test("rejects non-HTTPS endpoints", async () => {
  await assert.rejects(
    requestText("http://api.tushare.pro"),
    (error: unknown) => error instanceof UpupError && error.code === "configuration",
  );
});

test("forwards external cancellation", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    requestText("https://api.tushare.pro", { signal: controller.signal, timeoutMs: 1_000 }),
    (error: unknown) => error instanceof UpupError && error.code === "cancelled",
  );
});

test("enforces request timeout", async () => {
  const startedAt = performance.now();
  await assert.rejects(
    requestText("https://api.tushare.pro", {
      timeoutMs: 250,
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    }),
    (error: unknown) => error instanceof UpupError && error.code === "network" && /timed out/.test(error.message),
  );
  assert.ok(performance.now() - startedAt >= 240);
});

test("enforces bounded response size", async () => {
  await assert.rejects(
    requestText("https://api.tushare.pro", {
      maxBytes: 1_000,
      fetch: async () => new Response("x".repeat(1_500), { headers: { "content-length": "1500" } }),
    }),
    (error: unknown) => error instanceof UpupError && error.code === "provider",
  );
});

test("parses allowlisted JSON", async () => {
  const result = await requestJson<{ ok: boolean }>("https://api.tushare.pro", {
    fetch: async () => new Response(JSON.stringify({ ok: true })),
  });
  assert.equal(result.data.ok, true);
  assert.equal(result.host, "api.tushare.pro");
});
