import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import extension from "../extensions/index.ts";
import { createUpupTools } from "../src/tools.ts";

test("package manifest discovers extension and skill resources", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    keywords: string[];
    pi: { extensions: string[]; skills: string[] };
  };
  assert.ok(manifest.keywords.includes("pi-package"));
  assert.deepEqual(manifest.pi.extensions, ["./extensions"]);
  assert.deepEqual(manifest.pi.skills, ["./skills"]);
  assert.equal(manifest.pi.skills[0], "./skills");
});

test("extension registers all five UpUp tools", () => {
  const registered: string[] = [];
  extension({
    registerTool: (tool: { name: string }) => registered.push(tool.name),
  } as never);
  assert.deepEqual(registered, [
    "upup_market_snapshot",
    "upup_stock_news",
    "upup_financial_summary",
    "upup_screen_stocks",
    "upup_valuation_calculator",
  ]);
});

test("valuation tool executes offline and hides configured credentials", async () => {
  const tool = createUpupTools({ env: { UPUP_TUSHARE_TOKEN: "super-secret-token" } })
    .find((candidate) => candidate.name === "upup_valuation_calculator")!;
  const result = await tool.execute("test", { price: 10, eps: 2 }, undefined, undefined);
  assert.match(result.content[0]?.text ?? "", /deterministic arithmetic/);
  assert.doesNotMatch(JSON.stringify(result), /super-secret-token/);
});

test("credential-gated tool returns safe setup guidance", async () => {
  const tool = createUpupTools({ env: {} }).find((candidate) => candidate.name === "upup_financial_summary")!;
  const result = await tool.execute("test", { symbol: "600519" }, undefined, undefined);
  assert.match(result.content[0]?.text ?? "", /UPUP_TUSHARE_TOKEN is not configured/);
  assert.equal((result.details as { ok: boolean }).ok, false);
});
