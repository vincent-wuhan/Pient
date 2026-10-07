import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSymbol } from "../src/symbols.ts";

test("normalizes A-share symbols by exchange", () => {
  assert.deepEqual(normalizeSymbol("600519"), {
    input: "600519",
    market: "cn",
    providerSymbol: "sh600519",
    tushareCode: "600519.SH",
    numericCode: "600519",
  });
  assert.equal(normalizeSymbol("000001.SZ").providerSymbol, "sz000001");
  assert.equal(normalizeSymbol("bj430047").tushareCode, "430047.BJ");
});

test("normalizes Hong Kong and United States symbols", () => {
  assert.equal(normalizeSymbol("700").providerSymbol, "hk00700");
  assert.equal(normalizeSymbol("AAPL").providerSymbol, "usAAPL");
});
