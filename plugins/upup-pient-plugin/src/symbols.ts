export type Market = "cn" | "hk" | "us";

export interface NormalizedSymbol {
  input: string;
  market: Market;
  providerSymbol: string;
  tushareCode?: string;
  numericCode?: string;
}

export function normalizeSymbol(input: string): NormalizedSymbol {
  const raw = input.trim();
  if (!raw) throw new Error("Symbol is empty.");
  const value = raw.toUpperCase();
  if (/^\d{6}$/.test(value)) {
    const exchange = value.startsWith("6") ? "SH" : value.startsWith("4") || value.startsWith("8") ? "BJ" : "SZ";
    const prefix = exchange === "SH" ? "sh" : exchange === "BJ" ? "bj" : "sz";
    return { input: raw, market: "cn", providerSymbol: `${prefix}${value}`, tushareCode: `${value}.${exchange}`, numericCode: value };
  }
  const cnPrefixed = value.match(/^(SH|SZ|BJ)(\d{6})$/);
  if (cnPrefixed?.[1] && cnPrefixed?.[2]) {
    const [, exchange, code] = cnPrefixed;
    return { input: raw, market: "cn", providerSymbol: `${exchange.toLowerCase()}${code}`, tushareCode: `${code}.${exchange}`, numericCode: code };
  }
  const cnTushare = value.match(/^(\d{6})\.(SH|SZ|BJ)$/);
  if (cnTushare?.[1] && cnTushare?.[2]) {
    const [, code, exchange] = cnTushare;
    return { input: raw, market: "cn", providerSymbol: `${exchange.toLowerCase()}${code}`, tushareCode: value, numericCode: code };
  }
  const hk = value.match(/^(?:HK)?(\d{1,5})$/);
  if (hk?.[1]) {
    const code = hk[1].padStart(5, "0");
    return { input: raw, market: "hk", providerSymbol: `hk${code}`, numericCode: code };
  }
  if (/^[A-Z][A-Z0-9.\-]{0,19}$/.test(value)) {
    return { input: raw, market: "us", providerSymbol: `us${value}` };
  }
  throw new Error(`Unsupported symbol: ${raw}`);
}
