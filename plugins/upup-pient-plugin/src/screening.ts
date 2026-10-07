import { UpupError, toSafeError } from "./errors.ts";
import { requestJson } from "./http.ts";
import { limitItems } from "./output.ts";
import { parseRows, type TushareDependencies, type TushareResponse } from "./financials.ts";

export type ScreenPreset = "low_valuation_liquid" | "quality_value" | "small_cap_liquid";

export interface ScreenCandidate {
  symbol: string;
  tradeDate: string;
  peRatio: number | null;
  pbRatio: number | null;
  turnoverRate: number | null;
  totalMarketCap: number | null;
}

export interface ScreenResult {
  preset: ScreenPreset;
  tradeDate: string;
  assumptions: string[];
  rankingRule: string;
  totalMatches: number;
  returned: number;
  truncated: boolean;
  candidates: ScreenCandidate[];
  units: Record<string, string>;
}

const PRESETS: Record<ScreenPreset, {
  assumptions: string[];
  match: (candidate: ScreenCandidate) => boolean;
  rankingRule: string;
  score: (candidate: ScreenCandidate) => number;
}> = {
  low_valuation_liquid: {
    assumptions: ["PE > 0 and <= 15", "PB > 0 and <= 2", "turnover >= 1%", "total market cap >= CNY 5 billion"],
    match: (candidate) => (candidate.peRatio ?? Infinity) <= 15 && (candidate.peRatio ?? 0) > 0 && (candidate.pbRatio ?? Infinity) <= 2 && (candidate.pbRatio ?? 0) > 0 && (candidate.turnoverRate ?? 0) >= 1 && (candidate.totalMarketCap ?? 0) >= 500_000,
    rankingRule: "turnover rate descending, then symbol ascending",
    score: (candidate) => candidate.turnoverRate ?? -Infinity,
  },
  quality_value: {
    assumptions: ["PE > 5 and <= 25", "PB > 0 and <= 5", "turnover >= 0.5%", "total market cap >= CNY 10 billion"],
    match: (candidate) => (candidate.peRatio ?? 0) > 5 && (candidate.peRatio ?? Infinity) <= 25 && (candidate.pbRatio ?? 0) > 0 && (candidate.pbRatio ?? Infinity) <= 5 && (candidate.turnoverRate ?? 0) >= 0.5 && (candidate.totalMarketCap ?? 0) >= 1_000_000,
    rankingRule: "PE ascending, then symbol ascending",
    score: (candidate) => (candidate.peRatio ?? Infinity) * -1,
  },
  small_cap_liquid: {
    assumptions: ["PE is not required", "PB > 0", "turnover >= 3%", "total market cap < CNY 10 billion"],
    match: (candidate) => (candidate.pbRatio ?? 0) > 0 && (candidate.turnoverRate ?? 0) >= 3 && (candidate.totalMarketCap ?? Infinity) < 1_000_000,
    rankingRule: "turnover rate descending, then symbol ascending",
    score: (candidate) => candidate.turnoverRate ?? -Infinity,
  },
};

async function fetchDailyBasic(tradeDate: string, dependencies: TushareDependencies) {
  if (!dependencies.token) {
    throw new UpupError({
      code: "configuration",
      capability: "screen_stocks",
      message: "UPUP_TUSHARE_TOKEN is not configured in the Pi process environment.",
    });
  }
  const response = await requestJson<TushareResponse>("https://api.tushare.pro", {
    fetch: dependencies.fetch,
    signal: dependencies.signal,
    method: "POST",
    timeoutMs: 12_000,
    maxBytes: 3_000_000,
    body: {
      api_name: "daily_basic",
      token: dependencies.token,
      params: { trade_date: tradeDate, limit: 6000, offset: 0 },
      fields: "ts_code,trade_date,turnover_rate,pe,pb,total_mv",
    },
  });
  return parseRows(response.data);
}

function numberOrNull(value: number | string | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function screenCandidates(rows: ReadonlyArray<Record<string, number | string | null>>, preset: ScreenPreset, limit: number): ScreenResult {
  const definition = PRESETS[preset];
  const candidates = rows
    .map((row) => ({
      symbol: typeof row.ts_code === "string" ? row.ts_code : "",
      tradeDate: typeof row.trade_date === "string" ? row.trade_date : "",
      peRatio: numberOrNull(row.pe ?? null),
      pbRatio: numberOrNull(row.pb ?? null),
      turnoverRate: numberOrNull(row.turnover_rate ?? null),
      totalMarketCap: numberOrNull(row.total_mv ?? null),
    }))
    .filter((candidate) => candidate.symbol !== "" && candidate.tradeDate !== "")
    .filter(definition.match)
    .sort((left, right) => definition.score(right) - definition.score(left) || left.symbol.localeCompare(right.symbol));
  const bounded = limitItems(candidates, limit);
  return {
    preset,
    tradeDate: candidates[0]?.tradeDate ?? "",
    assumptions: definition.assumptions,
    rankingRule: definition.rankingRule,
    totalMatches: candidates.length,
    returned: bounded.value.length,
    truncated: bounded.truncated,
    candidates: bounded.value,
    units: { totalMarketCap: "CNY 10k", turnoverRate: "%", peRatio: "x", pbRatio: "x" },
  };
}

export async function runScreen(
  preset: ScreenPreset,
  tradeDate: string,
  limit: number,
  dependencies: TushareDependencies,
): Promise<ScreenResult> {
  if (!/^\d{8}$/.test(tradeDate)) {
    throw new UpupError({ code: "invalid_input", capability: "screen_stocks", message: "trade_date must use YYYYMMDD." });
  }
  try {
    const rows = await fetchDailyBasic(tradeDate, dependencies);
    return screenCandidates(rows, preset, limit);
  } catch (error) {
    throw toSafeError(error, "screen_stocks", dependencies.token);
  }
}
