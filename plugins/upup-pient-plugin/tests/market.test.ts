import assert from "node:assert/strict";
import test from "node:test";
import { parseTencentSnapshot } from "../src/market.ts";
import { normalizeSymbol } from "../src/symbols.ts";

function tencentFixture(price: string, previousClose: string): string {
  const parts = Array.from({ length: 50 }, (_, index) => String(index));
  parts[1] = "Kweichow Moutai";
  parts[3] = price;
  parts[4] = previousClose;
  parts[31] = "1700";
  parts[32] = "1600";
  return `v_sh600519="${parts.join("~")}";`;
}

test("parses quote change and limitations", () => {
  const snapshot = parseTencentSnapshot(tencentFixture("1650", "1600"), [normalizeSymbol("600519")]);
  assert.equal(snapshot.totalRequested, 1);
  assert.equal(snapshot.quotes.length, 1);
  const quote = snapshot.quotes[0]!;
  assert.equal(quote.price, 1650);
  assert.equal(quote.change, 50);
  assert.equal(quote.changePercent, 3.125);
  assert.equal(quote.source, "tencent");
  assert.ok(quote.limitations.length >= 2);
});

test("fails closed when no quote can be parsed", () => {
  assert.throws(
    () => parseTencentSnapshot("empty", [normalizeSymbol("600519")]),
    /no parseable quote data/,
  );
});
