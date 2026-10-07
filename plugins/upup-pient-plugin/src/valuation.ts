import { UpupError } from "./errors.ts";

export interface ValuationInput {
  price: number;
  eps?: number;
  bookValuePerShare?: number;
  cashFlowPerShare?: number;
  sharesOutstanding?: number;
  currentFcf?: number;
  growthRate?: number;
  discountRate?: number;
  terminalGrowthRate?: number;
  projectionYears?: number;
  netDebt?: number;
  peers?: Array<{
    name: string;
    peRatio?: number;
    pbRatio?: number;
    roe?: number;
    revenueGrowth?: number;
    profitMargin?: number;
  }>;
}

export interface SensitivityRow {
  discountRate: number;
  growthRate: number;
  valuePerShare: number | null;
}

export interface ValuationResult {
  multiples: {
    peRatio: number | null;
    pbRatio: number | null;
    pcfRatio: number | null;
  };
  dcf: {
    enterpriseValue: number | null;
    equityValue: number | null;
    valuePerShare: number | null;
    assumptions: string[];
  };
  peerComparison: Array<{
    metric: string;
    target: number | null;
    peerAverage: number | null;
    peerMin: number | null;
    peerMax: number | null;
    percentile: number | null;
  }>;
  sensitivity: SensitivityRow[];
  formulas: string[];
  limitations: string[];
}

function finiteOrZero(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return value;
}

function calculateDcf(
  currentFcf: number,
  growthRate: number,
  discountRate: number,
  terminalGrowthRate: number,
  projectionYears: number,
  sharesOutstanding?: number,
  netDebt = 0,
): { enterpriseValue: number; equityValue: number; valuePerShare: number | null } {
  if (currentFcf <= 0) throw new UpupError({ code: "calculation", capability: "valuation_calculator", message: "Current FCF must be greater than zero for DCF." });
  if (growthRate <= -1 || growthRate >= 1) throw new UpupError({ code: "calculation", capability: "valuation_calculator", message: "growth_rate must be between -1 and 1 exclusive." });
  if (discountRate <= 0 || discountRate >= 1) throw new UpupError({ code: "calculation", capability: "valuation_calculator", message: "discount_rate must be between 0 and 1 exclusive." });
  if (terminalGrowthRate < 0 || terminalGrowthRate >= discountRate) throw new UpupError({ code: "calculation", capability: "valuation_calculator", message: "terminal_growth_rate must be >= 0 and below discount_rate." });
  if (projectionYears < 3 || projectionYears > 15) throw new UpupError({ code: "calculation", capability: "valuation_calculator", message: "projection_years must be between 3 and 15." });
  let enterpriseValue = 0;
  let fcf = currentFcf;
  for (let year = 1; year <= projectionYears; year += 1) {
    fcf *= 1 + growthRate;
    enterpriseValue += fcf / (1 + discountRate) ** year;
  }
  const terminalValue = (fcf * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
  enterpriseValue += terminalValue / (1 + discountRate) ** projectionYears;
  const equityValue = enterpriseValue - netDebt;
  const valuePerShare = sharesOutstanding !== undefined && sharesOutstanding > 0 ? equityValue / sharesOutstanding : null;
  return { enterpriseValue, equityValue, valuePerShare };
}

function peerStats(target: number | null | undefined, peers: number[]): { target: number | null; average: number | null; min: number | null; max: number | null; percentile: number | null } {
  const valid = peers.filter((value) => Number.isFinite(value));
  if (valid.length === 0) return { target: target ?? null, average: null, min: null, max: null, percentile: null };
  const average = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  const percentile = target === undefined || target === null ? null : (valid.filter((value) => value < target).length / valid.length) * 100;
  return { target: target ?? null, average, min: Math.min(...valid), max: Math.max(...valid), percentile };
}

export function calculateValuation(input: ValuationInput): ValuationResult {
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new UpupError({ code: "calculation", capability: "valuation_calculator", message: "price must be finite and greater than zero." });
  }
  const multiples = {
    peRatio: input.eps !== undefined && Number.isFinite(input.eps) && input.eps !== 0 ? input.price / input.eps : null,
    pbRatio: input.bookValuePerShare !== undefined && Number.isFinite(input.bookValuePerShare) && input.bookValuePerShare !== 0 ? input.price / input.bookValuePerShare : null,
    pcfRatio: input.cashFlowPerShare !== undefined && Number.isFinite(input.cashFlowPerShare) && input.cashFlowPerShare !== 0 ? input.price / input.cashFlowPerShare : null,
  };
  const growthRate = finiteOrZero(input.growthRate);
  const discountRate = input.discountRate ?? 0.1;
  const terminalGrowthRate = input.terminalGrowthRate ?? 0.02;
  const projectionYears = input.projectionYears ?? 10;
  let dcf: ValuationResult["dcf"] = {
    enterpriseValue: null,
    equityValue: null,
    valuePerShare: null,
    assumptions: ["DCF inputs were not supplied; no DCF value was synthesized."],
  } as ValuationResult["dcf"];
  const sensitivity: SensitivityRow[] = [];
  if (input.currentFcf !== undefined) {
    const result = calculateDcf(
      input.currentFcf,
      growthRate,
      discountRate,
      terminalGrowthRate,
      projectionYears,
      input.sharesOutstanding,
      finiteOrZero(input.netDebt),
    );
    dcf = {
      ...result,
      assumptions: [
        `projection_years=${projectionYears}`,
        `growth_rate=${growthRate}`,
        `discount_rate=${discountRate}`,
        `terminal_growth_rate=${terminalGrowthRate}`,
        input.netDebt === undefined ? "net_debt omitted (treated as 0)" : "enterprise value minus net debt",
      ],
    };
    for (const adjustedDiscount of [discountRate - 0.02, discountRate, discountRate + 0.02]) {
      for (const adjustedGrowth of [growthRate - 0.02, growthRate, growthRate + 0.02]) {
        try {
          const row = calculateDcf(input.currentFcf, adjustedGrowth, adjustedDiscount, terminalGrowthRate, projectionYears, input.sharesOutstanding, finiteOrZero(input.netDebt));
          sensitivity.push({ discountRate: adjustedDiscount, growthRate: adjustedGrowth, valuePerShare: row.valuePerShare });
        } catch {
          sensitivity.push({ discountRate: adjustedDiscount, growthRate: adjustedGrowth, valuePerShare: null });
        }
      }
    }
  }
  const peers = input.peers ?? [];
  const metrics = [
    ["pe_ratio", peers.map((peer) => peer.peRatio), input.eps !== undefined ? input.price / input.eps : null],
    ["pb_ratio", peers.map((peer) => peer.pbRatio), input.bookValuePerShare !== undefined ? input.price / input.bookValuePerShare : null],
    ["roe", peers.map((peer) => peer.roe), null],
    ["revenue_growth", peers.map((peer) => peer.revenueGrowth), null],
    ["profit_margin", peers.map((peer) => peer.profitMargin), null],
  ] as const;
  return {
    multiples,
    dcf,
    peerComparison: metrics.map(([metric, values, target]) => {
      const stats = peerStats(target, values.filter((value): value is number => value !== undefined));
      return {
        metric,
        target: stats.target,
        peerAverage: stats.average,
        peerMin: stats.min,
        peerMax: stats.max,
        percentile: stats.percentile,
      };
    }),
    sensitivity,
    formulas: [
      "PE = price / EPS; PB = price / book value per share; PCF = price / cash flow per share",
      "DCF sums projected FCF and a Gordon terminal value, then discounts both to present value",
      "Equity value = enterprise value - net debt; per-share value = equity value / shares outstanding",
    ],
    limitations: [
      "Calculations are deterministic arithmetic, not provider market truth or investment advice.",
      "Small assumption changes can materially change DCF output; inspect sensitivity before drawing conclusions.",
      "Peer averages are unweighted and omit companies without the supplied metric.",
    ],
  };
}
