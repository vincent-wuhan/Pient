---
name: upup-research
description: Conduct evidence-grounded, mobile-safe Chinese and global-market investment research with UpUp tools.
---

# UpUp Research Workflow

## Phase 1: Clarify

Identify the market, ticker/name, research horizon, currency, liquidity needs,
risk tolerance, and decision question. If any material input is missing, ask one
compact clarification question before collecting evidence.

## Phase 2: Collect evidence

Use `upup_market_snapshot`, `upup_stock_news`, `upup_financial_summary`, and
`upup_screen_stocks` only when the relevant data is needed. Keep result limits
small. Record the provider, timestamp, units, currency, and known limitations.
Never invent missing prices, filings, news, financials, or dates.

## Phase 3: Analyze

Separate provider data from deterministic calculations and model inference. Use
`upup_valuation_calculator` for local DCF, multiple, peer, and sensitivity
calculations. Name the method and material assumptions for every conclusion.

## Phase 4: Verify

Check symbol identity, reporting period, stale timestamps, units, currency,
extreme assumptions, survivorship, provider delays, and conflicting evidence.
When credentials or providers fail, state the evidence gap and suggest the safe
setup action; do not substitute fabricated data.

## Phase 5: Report

Use these sections: Question, Evidence, Analysis, Valuation Assumptions, Risks,
Unknowns, and Suggested Next Actions. Cite the tool evidence behind material
claims and explicitly mark unavailable figures. State that the result is
research, not investment advice.

## Mobile boundary

Complete the workflow in the current Pi turn/tool loop. Do not spawn another
agent, browser, daemon, MCP server, or background workflow. Do not attempt to
trade, place orders, connect brokers, pay, mutate a portfolio, or write plugin
state to disk.
