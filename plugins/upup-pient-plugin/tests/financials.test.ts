import assert from "node:assert/strict";
import test from "node:test";
import { fetchFinancialSummary } from "../src/financials.ts";

function tushare(apiName: string) {
  const income = {
    code: 0,
    data: {
      fields: ["ts_code", "ann_date", "end_date", "total_revenue", "n_income"],
      items: [["600519.SH", "20260328", "20251231", 1_000, 200]],
    },
  };
  const indicator = {
    code: 0,
    data: {
      fields: ["ts_code", "end_date", "eps", "roe", "grossprofit_margin"],
      items: [["600519.SH", "20251231", 20, 0.3, 0.5]],
    },
  };
  return apiName === "income" ? income : indicator;
}

test("fetches and normalizes financial reporting data", async () => {
  const calls: string[] = [];
  const summary = await fetchFinancialSummary("600519", {
    token: "secret-token",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { api_name: string };
      calls.push(body.api_name);
      return new Response(JSON.stringify(tushare(body.api_name)));
    },
  });
  assert.deepEqual(calls.sort(), ["fina_indicator", "income"]);
  assert.equal(summary.reportingPeriod, "20251231");
  assert.equal(summary.revenue, 1_000);
  assert.equal(summary.netProfitMargin, 0.2);
  assert.equal(summary.units.revenue, "CNY");
});

test("fails closed when Tushare token is absent", async () => {
  await assert.rejects(
    fetchFinancialSummary("600519", {}),
    /UPUP_TUSHARE_TOKEN is not configured/,
  );
});
