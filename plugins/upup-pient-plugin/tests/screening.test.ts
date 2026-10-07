import assert from "node:assert/strict";
import test from "node:test";
import { screenCandidates } from "../src/screening.ts";

test("filters, ranks, truncates, and reports total matches", () => {
  const rows = [
    { ts_code: "000001.SZ", trade_date: "20260930", pe: 10, pb: 1, turnover_rate: 2, total_mv: 600_000 },
    { ts_code: "600000.SH", trade_date: "20260930", pe: 12, pb: 1.5, turnover_rate: 5, total_mv: 700_000 },
    { ts_code: "030000.SZ", trade_date: "20260930", pe: 40, pb: 8, turnover_rate: 9, total_mv: 900_000 },
  ];
  const result = screenCandidates(rows, "low_valuation_liquid", 1);
  assert.equal(result.totalMatches, 2);
  assert.equal(result.returned, 1);
  assert.equal(result.truncated, true);
  assert.equal(result.candidates[0]?.symbol, "600000.SH");
  assert.equal(result.rankingRule, "turnover rate descending, then symbol ascending");
});
