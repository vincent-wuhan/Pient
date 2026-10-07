import assert from "node:assert/strict";
import test from "node:test";
import { TtlCache } from "../src/cache.ts";

test("expires entries after TTL", () => {
  let now = 1_000;
  const cache = new TtlCache<string>(100, 2, () => now);
  cache.set("one", "first");
  assert.equal(cache.get("one"), "first");
  now += 101;
  assert.equal(cache.get("one"), undefined);
});

test("bounds resident entries and keeps latest access fresh", () => {
  let now = 0;
  const cache = new TtlCache<number>(1_000, 2, () => now);
  cache.set("one", 1);
  cache.set("two", 2);
  cache.get("one");
  cache.set("three", 3);
  assert.equal(cache.get("two"), undefined);
  assert.equal(cache.get("one"), 1);
  assert.equal(cache.get("three"), 3);
  now += 999;
  assert.equal(cache.get("one"), 1);
});
