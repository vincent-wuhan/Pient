import { toSafeError } from "./errors.ts";
import { requestJson, type FetchLike } from "./http.ts";
import { limitItems } from "./output.ts";
import { normalizeSymbol } from "./symbols.ts";

export interface NewsItem {
  title: string;
  datetime: string | null;
  source: string;
  url: string | null;
}

export interface StockNews {
  symbol: string;
  items: NewsItem[];
  totalReturned: number;
  truncated: boolean;
  limitation: string;
}

interface EastmoneyResponse {
  data?: {
    list?: Array<{
      title?: unknown;
      notice_title?: unknown;
      summary?: unknown;
      content?: unknown;
      art_url?: unknown;
      publish_time?: unknown;
      codes?: Array<{ stock_code?: unknown; short_name?: unknown }>;
    }>;
  };
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const url = new URL(value, "https://www.eastmoney.com/");
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeDatetime(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseEastmoneyNews(payload: EastmoneyResponse, requested: number): StockNewsResult {
  const list = payload.data?.list ?? [];
  const parsed = list
    .map((item) => ({
      title: String(item.title ?? item.notice_title ?? "").trim(),
      datetime: normalizeDatetime(item.publish_time),
      source: "eastmoney",
      url: normalizeUrl(item.art_url),
    }))
    .filter((item) => item.title.length > 0)
    .sort((left, right) => (right.datetime ?? "").localeCompare(left.datetime ?? ""));
  const bounded = limitItems(parsed, requested);
  return {
    items: bounded.value,
    totalReturned: parsed.length,
    truncated: bounded.truncated,
    limitation: "Eastmoney security announcements and news may be incomplete, delayed, or provider-filtered.",
  };
}

export type StockNewsResult = Omit<StockNews, "symbol">;

export async function fetchStockNews(
  input: string,
  requestedLimit: number,
  options: { fetch?: FetchLike; signal?: AbortSignal } = {},
): Promise<StockNews> {
  const symbol = normalizeSymbol(input);
  if (symbol.market !== "cn" || !symbol.numericCode) {
    throw toSafeError(new Error("Only six-digit A-share symbols are supported."), "stock_news");
  }
  const limit = limitItems([], requestedLimit).value.length === 0 ? 0 : Math.min(requestedLimit, 20);
  const url = new URL("https://np-anotice-stock.eastmoney.com/api/security/ann");
  url.searchParams.set("sr", "-1");
  url.searchParams.set("page_size", String(Math.max(limit, 1)));
  url.searchParams.set("page_index", "1");
  url.searchParams.set("ann_type", "SHA,SZA");
  url.searchParams.set("client_source", "web");
  url.searchParams.set("stock_list", symbol.numericCode);
  try {
    const response = await requestJson<EastmoneyResponse>(url.toString(), {
      fetch: options.fetch,
      signal: options.signal,
      timeoutMs: 8_000,
      maxBytes: 750_000,
    });
    const result = parseEastmoneyNews(response.data, Math.max(limit, 1));
    return { symbol: symbol.tushareCode ?? symbol.numericCode, ...result };
  } catch (error) {
    throw toSafeError(error, "stock_news");
  }
}
