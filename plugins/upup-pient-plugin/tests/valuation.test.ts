import assert from "node:assert/strict";
import test from "node:test";
import { calculateValuation } from "../src/valuation.ts";

test("calculates multiples, DCF, peers, and sensitivity", () => {
  const result = calculateValuation({
    price: 100,
    eps: 5,
    bookValuePerShare: 25,
    cashFlowPerShare: 10,
    currentFcf: 1_000,
    growthRate: 0.05,
    discountRate: 0.1,
    terminalGrowthRate: 0.02,
    projectionYears: 10,
    sharesOutstanding: 100,
    netDebt: 500,
    peers: [{ name: "Peer", peRatio: 10, pbRatio: 2, roe: 0.15 }],
  });
  assert.equal(result.multiples.peRatio, 20);
  assert.equal(result.multiples.pbRatio, 4);
  assert.equal(result.multiples.pcfRatio, 10);
  assert.ok(result.dcf.enterpriseValue !== null && result.dcf.enterpriseValue > 0);
  assert.ok(result.dcf.valuePerShare !== null && result.dcf.valuePerShare > 0);
  assert.equal(result.sensitivity.length, 9);
  assert.equal(result.peerComparison[0]?.peerAverage, 10);
  assert.equal(result.peerComparison[0]?.percentile, 100);
});

test("rejects invalid DCF assumptions without fabricating values", () => {
  assert.throws(
    () => calculateValuation({ price: 10, currentFcf: 100, terminalGrowthRate: 0.1, discountRate: 0.1 }),
    /terminal_growth_rate/,
  );
  assert.throws(() => calculateValuation({ price: Number.NaN }), /price/);
});
