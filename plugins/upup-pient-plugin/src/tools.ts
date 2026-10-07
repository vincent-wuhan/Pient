import { Type } from "typebox";
import { TtlCache } from "./cache.ts";
import { UpupError, toSafeError } from "./errors.ts";
import type { FetchLike } from "./http.ts";
import { fetchFinancialSummary } from "./financials.ts";
import { fetchMarketSnapshot, type MarketSnapshot } from "./market.ts";
import { fetchStockNews, type StockNews } from "./news.ts";
import { truncateText } from "./output.ts";
import { runScreen, type ScreenPreset, type ScreenResult } from "./screening.ts";
import { calculateValuation, type ValuationInput, type ValuationResult } from "./valuation.ts";

export interface ToolResult<T> {
  content: Array<{ type: "text"; text: string }>;
  details: T;
}

export interface UpupToolDefinition {
  name: string;
  label: string;
  description: string;
  promptSnippet?: string;
  promptGuidelines?: string[];
  parameters: unknown;
  execute: (
    toolCallId: string,
    params: unknown,
    signal: AbortSignal | undefined,
    onUpdate: ((update: { content: Array<{ type: "text"; text: string }> }) => void) | undefined,
  ) => Promise<ToolResult<unknown>>;
}

export interface ExtensionApiLike {
  registerTool: (tool: UpupToolDefinition) => void;
}

export interface UpupToolDependencies {
  fetch?: typeof fetch;
  env?: Record<string, string | undefined>;
  marketCache?: TtlCache<MarketSnapshot>;
  newsCache?: TtlCache<StockNews>;
  financialCache?: TtlCache<unknown>;
  screenCache?: TtlCache<ScreenResult>;
}

interface MarketParams {
  symbols: string[];
}

interface NewsParams {
  symbol: string;
  limit?: number;
}

interface FinancialParams {
  symbol: string;
}

interface ScreenParams {
  preset: ScreenPreset;
  trade_date: string;
  limit?: number;
}

interface ValuationParams {
  price: number;
  eps?: number;
  book_value_per_share?: number;
  cash_flow_per_share?: number;
  shares_outstanding?: number;
  current_fcf?: number;
  growth_rate?: number;
  discount_rate?: number;
  terminal_growth_rate?: number;
  projection_years?: number;
  net_debt?: number;
  peers?: ValuationInput["peers"];
}

function safeToolResult(error: unknown, capability: string): ToolResult<unknown> {
  const safe = toSafeError(error, capability);
  return {
    content: [{ type: "text", text: `UpUp ${capability} failed (${safe.code}): ${safe.message}` }],
    details: {
      ok: false,
      code: safe.code,
      capability: safe.capability,
      retryable: safe.retryable,
    },
  };
}

function textResult(value: unknown): ToolResult<unknown> {
  const json = JSON.stringify(value, null, 2);
  const bounded = truncateText(json);
  return {
    content: [{ type: "text", text: bounded.value }],
    details: { ok: true, truncated: bounded.truncated },
  };
}

export function createUpupTools(dependencies: UpupToolDependencies = {}): UpupToolDefinition[] {
  const fetchImpl: FetchLike = dependencies.fetch ?? ((input: string, init?: RequestInit) => fetch(input, init));
  const env = dependencies.env ?? process.env;
  const marketCache = dependencies.marketCache ?? new TtlCache<MarketSnapshot>(15_000);
  const newsCache = dependencies.newsCache ?? new TtlCache<StockNews>(60_000);
  const financialCache = dependencies.financialCache ?? new TtlCache<unknown>(300_000);
  const screenCache = dependencies.screenCache ?? new TtlCache<ScreenResult>(300_000);
  const token = env.UPUP_TUSHARE_TOKEN;

  return [
    {
      name: "upup_market_snapshot",
      label: "UpUp Market Snapshot",
      description: "Fetch a bounded, read-only quote snapshot for up to ten A-share, Hong Kong, or United States symbols.",
      promptSnippet: "Fetch delayed public market quote snapshots",
      promptGuidelines: ["Use upup_market_snapshot when current price context is needed; state provider delay and data-quality limitations."],
      parameters: Type.Object({
        symbols: Type.Array(Type.String({ minLength: 1, maxLength: 16 }), { minItems: 1, maxItems: 10 }),
      }),
      async execute(_toolCallId, rawParams, signal, onUpdate) {
        try {
          const params = rawParams as MarketParams;
          const key = [...params.symbols].sort().join(",");
          const cached = marketCache.get(key);
          if (cached) return textResult(cached);
          onUpdate?.({ content: [{ type: "text", text: "Fetching bounded quote snapshot..." }] });
          const snapshot = await fetchMarketSnapshot(params.symbols, { fetch: fetchImpl, signal });
          marketCache.set(key, snapshot);
          return textResult(snapshot);
        } catch (error) {
          return safeToolResult(error, "market_snapshot");
        }
      },
    },
    {
      name: "upup_stock_news",
      label: "UpUp Stock News",
      description: "Fetch a bounded, reverse-chronological set of Eastmoney news and security announcements for one A-share symbol.",
      promptSnippet: "Fetch bounded stock news and announcements",
      promptGuidelines: ["Use upup_stock_news for evidence collection; do not infer missing articles or treat headlines as verified facts."],
      parameters: Type.Object({
        symbol: Type.String({ minLength: 1, maxLength: 16 }),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 20 })),
      }),
      async execute(_toolCallId, rawParams, signal, onUpdate) {
        try {
          const params = rawParams as NewsParams;
          const limit = params.limit ?? 5;
          const key = `${params.symbol}:${limit}`;
          const cached = newsCache.get(key);
          if (cached) return textResult(cached);
          onUpdate?.({ content: [{ type: "text", text: "Fetching bounded news list..." }] });
          const news = await fetchStockNews(params.symbol, limit, { fetch: fetchImpl, signal });
          newsCache.set(key, news);
          return textResult(news);
        } catch (error) {
          return safeToolResult(error, "stock_news");
        }
      },
    },
    {
      name: "upup_financial_summary",
      label: "UpUp Financial Summary",
      description: "Fetch Tushare-gated core income and financial indicators for one A-share company.",
      promptSnippet: "Fetch bounded company fundamentals",
      promptGuidelines: ["Use upup_financial_summary when reporting-period fundamentals are material; name the period, units, currency, and provider limitation."],
      parameters: Type.Object({
        symbol: Type.String({ minLength: 1, maxLength: 16 }),
      }),
      async execute(_toolCallId, rawParams, signal, onUpdate) {
        try {
          const params = rawParams as FinancialParams;
          const key = params.symbol;
          const cached = financialCache.get(key);
          if (cached) return textResult(cached);
          onUpdate?.({ content: [{ type: "text", text: "Fetching bounded financial summary..." }] });
          const summary = await fetchFinancialSummary(params.symbol, { token, fetch: fetchImpl, signal });
          financialCache.set(key, summary);
          return textResult(summary);
        } catch (error) {
          return safeToolResult(error, "financial_summary");
        }
      },
    },
    {
      name: "upup_screen_stocks",
      label: "UpUp Stock Screen",
      description: "Run one bounded, deterministic preset screen over Tushare daily-basic fundamentals for a trade date.",
      promptSnippet: "Run bounded deterministic stock screens",
      promptGuidelines: ["Use upup_screen_stocks only for candidate discovery; report assumptions, units, total matches, and truncation."],
      parameters: Type.Object({
        preset: Type.Union([
          Type.Literal("low_valuation_liquid"),
          Type.Literal("quality_value"),
          Type.Literal("small_cap_liquid"),
        ]),
        trade_date: Type.String({ minLength: 8, maxLength: 8, pattern: "^[0-9]{8}$" }),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
      }),
      async execute(_toolCallId, rawParams, signal, onUpdate) {
        try {
          const params = rawParams as ScreenParams;
          const limit = params.limit ?? 20;
          const key = `${params.preset}:${params.trade_date}:${limit}`;
          const cached = screenCache.get(key);
          if (cached) return textResult(cached);
          onUpdate?.({ content: [{ type: "text", text: "Fetching bounded fundamental dataset..." }] });
          const result = await runScreen(params.preset, params.trade_date, limit, { token, fetch: fetchImpl, signal });
          screenCache.set(key, result);
          return textResult(result);
        } catch (error) {
          return safeToolResult(error, "screen_stocks");
        }
      },
    },
    {
      name: "upup_valuation_calculator",
      label: "UpUp Valuation Calculator",
      description: "Perform deterministic local DCF, PE/PB/PCF, peer-comparison, and sensitivity calculations without network access.",
      promptSnippet: "Calculate valuation scenarios locally",
      promptGuidelines: ["Use upup_valuation_calculator for transparent arithmetic; label outputs as model assumptions, not market truth."],
      parameters: Type.Object({
        price: Type.Number({ minimum: 0.000001, maximum: 1_000_000_000 }),
        eps: Type.Optional(Type.Number({ maximum: 1_000_000_000 })),
        book_value_per_share: Type.Optional(Type.Number({ maximum: 1_000_000_000 })),
        cash_flow_per_share: Type.Optional(Type.Number({ maximum: 1_000_000_000 })),
        shares_outstanding: Type.Optional(Type.Number({ minimum: 1, maximum: 1e15 })),
        current_fcf: Type.Optional(Type.Number({ minimum: 0.000001, maximum: 1e15 })),
        growth_rate: Type.Optional(Type.Number({ exclusiveMinimum: -1, exclusiveMaximum: 1 })),
        discount_rate: Type.Optional(Type.Number({ exclusiveMinimum: 0, exclusiveMaximum: 1 })),
        terminal_growth_rate: Type.Optional(Type.Number({ minimum: 0, exclusiveMaximum: 1 })),
        projection_years: Type.Optional(Type.Integer({ minimum: 3, maximum: 15 })),
        net_debt: Type.Optional(Type.Number({ maximum: 1e15 })),
        peers: Type.Optional(Type.Array(
          Type.Object({
            name: Type.String({ minLength: 1, maxLength: 48 }),
            pe_ratio: Type.Optional(Type.Number({ maximum: 1_000_000 })),
            pb_ratio: Type.Optional(Type.Number({ maximum: 1_000_000 })),
            roe: Type.Optional(Type.Number({ maximum: 100 })),
            revenue_growth: Type.Optional(Type.Number({ maximum: 100 })),
            profit_margin: Type.Optional(Type.Number({ maximum: 100 })),
          }),
          { maxItems: 12 },
        )),
      }),
      async execute(_toolCallId, rawParams) {
        try {
          const params = rawParams as ValuationParams;
          const input: ValuationInput = {
            price: params.price,
            eps: params.eps,
            bookValuePerShare: params.book_value_per_share,
            cashFlowPerShare: params.cash_flow_per_share,
            sharesOutstanding: params.shares_outstanding,
            currentFcf: params.current_fcf,
            growthRate: params.growth_rate,
            discountRate: params.discount_rate,
            terminalGrowthRate: params.terminal_growth_rate,
            projectionYears: params.projection_years,
            netDebt: params.net_debt,
            peers: params.peers as ValuationInput["peers"],
          };
          const result: ValuationResult = calculateValuation(input);
          return textResult(result);
        } catch (error) {
          if (error instanceof UpupError) return safeToolResult(error, "valuation_calculator");
          return safeToolResult(new Error("Invalid valuation input."), "valuation_calculator");
        }
      },
    },
  ];
}
