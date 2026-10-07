import assert from "node:assert/strict";
import test from "node:test";
import { limitItems, truncateText } from "../src/output.ts";

test("bounds item lists", () => {
  const bounded = limitItems([1, 2, 3], 2);
  assert.deepEqual(bounded.value, [1, 2]);
  assert.equal(bounded.truncated, true);
});

test("marks text truncation", () => {
  const bounded = truncateText("x".repeat(1_000), 300);
  assert.equal(bounded.truncated, true);
  assert.ok(bounded.value.length <= 300);
  assert.match(bounded.value, /original 1000 chars/);
});
