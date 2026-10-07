import { UpupError, toSafeError } from "./errors.ts";
import { requestText, type FetchLike } from "./http.ts";
import { limitItems } from "./output.ts";
import { normalizeSymbol, type NormalizedSymbol } from "./symbols.ts";

export interface MarketQuote {
  symbol: string;
  name: string;
  market: NormalizedSymbol["market"];
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volumeHanded: number | null;
  amountCny: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  marketCap: number | null;
  timestamp: string;
  source: "tencent";
  limitations: string[];
}

export interface MarketSnapshot {
  quotes: MarketQuote[];
  totalRequested: number;
  truncated: boolean;
  generatedAt: string;
}

function numberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseTencentSnapshot(payload: string, symbols: readonly NormalizedSymbol[]): MarketSnapshot {
  const declarations = payload.match(/v_[^=]+="([^"]*)"/g) ?? [];
  const byProviderSymbol = new Map(symbols.map((symbol) => [symbol.providerSymbol, symbol]));
  const quotes: MarketQuote[] = [];
  for (const declaration of declarations) {
    const nameMatch = declaration.match(/^v_([^=]+)=/);
    const valueMatch = declaration.match(/="([^"]*)"/);
    if (!nameMatch?.[1] || !valueMatch?.[1]) continue;
    const providerSymbol = nameMatch[1].toLowerCase();
    const symbol = byProviderSymbol.get(providerSymbol);
    if (!symbol) continue;
    const parts = valueMatch[1].split("~");
    const price = numberOrNull(parts[3]);
    const previousClose = numberOrNull(parts[4]);
    const change = price !== null && previousClose !== null ? price - previousClose : null;
    const changePercent =
      price !== null && previousClose !== null && previousClose !== 0 ? ((price - previousClose) / previousClose) * 100 : null;
    quotes.push({
      symbol: symbol.tushareCode ?? symbol.providerSymbol,
      name: parts[1]?.trim() ?? "",
      market: symbol.market,
      price,
      previousClose,
      change,
      changePercent,
      open: numberOrNull(parts[5]),
      high: numberOrNull(parts[31]),
      low: numberOrNull(parts[32]),
      volumeHanded: numberOrNull(parts[6]),
      amountCny: numberOrNull(parts[37]),
      peRatio: numberOrNull(parts[39]),
      pbRatio: numberOrNull(parts[46]),
      marketCap: numberOrNull(parts[38]),
      timestamp: new Date().toISOString(),
      source: "tencent",
      limitations: [
        "Public quote endpoint may be delayed and field coverage differs by market.",
        "Validate exchange-grade pricing before acting on this snapshot.",
      ],
    });
  }
  if (quotes.length === 0) {
    throw new UpupError({
      code: "provider",
      capability: "market_snapshot",
      message: "Tencent returned no parseable quote data.",
      retryable: true,
    });
  }
  const bounded = limitItems(quotes, symbols.length);
  return {
    quotes: bounded.value,
    totalRequested: symbols.length,
    truncated: bounded.truncated,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchMarketSnapshot(
  inputs: readonly string[],
  options: { fetch?: FetchLike; signal?: AbortSignal; now?: () => Date } = {},
): Promise<MarketSnapshot> {
  const symbols = inputs.map(normalizeSymbol);
  const bounded = limitItems(symbols, 10);
  const url = `https://qt.gtimg.cn/q=${bounded.value.map((symbol) => symbol.providerSymbol).join(",")}`;
  try {
    const response = await requestText(url, {
      fetch: options.fetch,
      signal: options.signal,
      timeoutMs: 6_000,
      maxBytes: 250_000,
    });
    const snapshot = parseTencentSnapshot(response.data, bounded.value);
    return { ...snapshot, truncated: snapshot.truncated || bounded.truncated };
  } catch (error) {
    throw toSafeError(error, "market_snapshot");
  }
}
