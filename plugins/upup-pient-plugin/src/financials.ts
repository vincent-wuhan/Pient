import { UpupError, toSafeError } from "./errors.ts";
import { requestJson, type FetchLike } from "./http.ts";
import { normalizeSymbol } from "./symbols.ts";

export interface FinancialSummary {
  symbol: string;
  reportingPeriod: string;
  announcementDate: string | null;
  currency: "CNY";
  units: Record<string, string>;
  revenue: number | null;
  netProfit: number | null;
  netProfitMargin: number | null;
  roe: number | null;
  grossMargin: number | null;
  eps: number | null;
  limitations: string[];
}

export interface TushareResponse {
  code?: number;
  msg?: string;
  data?: { fields?: unknown; items?: unknown };
}

export interface TushareDependencies {
  token?: string;
  fetch?: FetchLike;
  signal?: AbortSignal;
}

export function parseRows(response: TushareResponse): Array<Record<string, number | string | null>> {
  if (response.code !== 0) {
    throw new UpupError({
      code: "provider",
      capability: "tushare",
      message: "Tushare rejected the request. Check token permissions, points, and provider status.",
      retryable: false,
    });
  }
  const fields = response.data?.fields;
  const items = response.data?.items;
  if (!Array.isArray(fields) || !fields.every((field) => typeof field === "string")) {
    throw new UpupError({ code: "provider", capability: "tushare", message: "Tushare returned invalid response fields.", retryable: true });
  }
  if (!Array.isArray(items)) {
    throw new UpupError({ code: "provider", capability: "tushare", message: "Tushare returned invalid response rows.", retryable: true });
  }
  return items.map((item) => {
    if (!Array.isArray(item)) throw new UpupError({ code: "provider", capability: "tushare", message: "Tushare returned an invalid row.", retryable: true });
    const row: Record<string, number | string | null> = {};
    fields.forEach((field, index) => {
      const value = item[index];
      row[field] = typeof value === "number" || typeof value === "string" || value === null ? value : null;
    });
    return row;
  });
}

async function callTushare(apiName: string, params: Record<string, unknown>, dependencies: TushareDependencies) {
  if (!dependencies.token) {
    throw new UpupError({
      code: "configuration",
      capability: "financial_summary",
      message: "UPUP_TUSHARE_TOKEN is not configured in the Pi process environment.",
    });
  }
  const response = await requestJson<TushareResponse>("https://api.tushare.pro", {
    fetch: dependencies.fetch,
    signal: dependencies.signal,
    method: "POST",
    timeoutMs: 12_000,
    maxBytes: 1_500_000,
    body: { api_name: apiName, token: dependencies.token, params, fields: "" },
  });
  return parseRows(response.data);
}

function num(row: Record<string, number | string | null> | undefined, key: string): number | null {
  const value = row?.[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function str(row: Record<string, number | string | null> | undefined, key: string): string | null {
  const value = row?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function fetchFinancialSummary(input: string, dependencies: TushareDependencies): Promise<FinancialSummary> {
  const symbol = normalizeSymbol(input);
  if (symbol.market !== "cn" || !symbol.tushareCode) {
    throw new UpupError({ code: "invalid_input", capability: "financial_summary", message: "Only A-share symbols are supported." });
  }
  try {
    const [incomeRows, indicatorRows] = await Promise.all([
      callTushare("income", { ts_code: symbol.tushareCode }, dependencies),
      callTushare("fina_indicator", { ts_code: symbol.tushareCode }, dependencies),
    ]);
    const income = incomeRows.find((row) => str(row, "end_date") !== null);
    const indicator = indicatorRows.find((row) => str(row, "end_date") === str(income, "end_date")) ?? indicatorRows[0];
    if (!income || !indicator) {
      throw new UpupError({ code: "provider", capability: "financial_summary", message: "Tushare returned no financial rows." });
    }
    const revenue = num(income, "total_revenue");
    const netProfit = num(income, "n_income");
    return {
      symbol: symbol.tushareCode,
      reportingPeriod: str(income, "end_date") ?? "unknown",
      announcementDate: str(income, "ann_date"),
      currency: "CNY",
      units: {
        revenue: "CNY",
        netProfit: "CNY",
        netProfitMargin: "ratio",
        roe: "ratio",
        grossMargin: "ratio",
        eps: "CNY/share",
      },
      revenue,
      netProfit,
      netProfitMargin:
        revenue !== null && netProfit !== null && revenue !== 0 ? netProfit / revenue : num(indicator, "netprofit_margin"),
      roe: num(indicator, "roe"),
      grossMargin: num(indicator, "grossprofit_margin"),
      eps: num(indicator, "eps"),
      limitations: [
        "Tushare values follow the provider's reporting convention and may include restatements.",
        "China GAAP consolidated statements may not be comparable across markets.",
      ],
    };
  } catch (error) {
    throw toSafeError(error, "financial_summary", dependencies.token);
  }
}
