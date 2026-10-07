import assert from "node:assert/strict";
import test from "node:test";
import { parseEastmoneyNews } from "../src/news.ts";

test("normalizes, sorts, and truncates news items", () => {
  const result = parseEastmoneyNews({
    data: {
      list: [
        { title: "Older", publish_time: 1_700_000_000_000, art_url: "/a" },
        { title: "Newer", publish_time: 1_760_000_000_000, art_url: "https://data.eastmoney.com/b" },
        { title: " ", publish_time: 1_760_000_000_001 },
      ],
    },
  }, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.title, "Newer");
  assert.equal(result.items[0]?.datetime, new Date(1_760_000_000_000).toISOString());
  assert.equal(result.totalReturned, 2);
  assert.equal(result.truncated, true);
});

test("reports an empty valid result without synthesis", () => {
  const result = parseEastmoneyNews({ data: { list: [] } }, 5);
  assert.deepEqual(result.items, []);
  assert.equal(result.totalReturned, 0);
});
