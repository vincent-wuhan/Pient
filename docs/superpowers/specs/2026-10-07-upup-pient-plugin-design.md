---
comet_change: benyue-upup-pient-plugin
role: technical-design
canonical_spec: openspec
---

# UpUp Pient Plugin Technical Design

## Decision

Implement UpUp investment capabilities as the standalone Pi package
`@benyue/upup-pient-plugin`. Pi remains the only resident agent in Pient; the
package contributes tools and a research skill rather than launching another
runtime, MCP service, Bun process, browser, or model loop.

## Architecture

```text
Pient Android
  ⇅
Pi Agent
  ⇅
@benyue/upup-pient-plugin
  ├── Thin TypeBox tool registration layer
  ├── Read-only market/news/financial adapters
  ├── Deterministic local screening and valuation
  ├── Process-local bounded cache
  └── upup-research skill
```

The extension entry only wires schemas to pure adapter functions. HTTP, cache,
symbol normalization, errors, output truncation, and calculation logic live in
testable modules that accept injected fetch, clock, and environment values.

## Phase 1 Tools

- `upup_market_snapshot`: normalize A-share/HK/US symbols and return bounded
  quote snapshots from an allowlisted provider.
- `upup_stock_news`: return bounded, timestamp-normalized recent news.
- `upup_financial_summary`: return Tushare-gated core reporting-period data
  with units, dates, and evidence limitations.
- `upup_screen_stocks`: apply deterministic preset filters and ranking to a
  bounded candidate set while reporting the total match count.
- `upup_valuation_calculator`: run deterministic DCF, multiples, peer, and
  sensitivity calculations with numeric guards and no synthesized market data.

## Security Design

All outbound requests use HTTPS to an explicit host allowlist, with timeout,
cancellation, bounded concurrency, and bounded response size. Credentials are
read only from the Pi process environment and never included in results,
errors, diagnostics, logs, or persistent state. Missing token-gated data fails
closed. The plugin performs no trading, order, payment, broker, filesystem
write, arbitrary shell, Playwright, MCP, or resident child-process operations.

## Testing Strategy

Fixture-driven unit tests cover schema validation, extension registration,
manifest discovery, provider parsing, symbol normalization, cache TTL, timeout,
cancellation, allowlist rejection, credential gating, failures, empty results,
ranking, truncation, calculations, and secret redaction. Local typecheck and
tests are required before any npm publication. A Pient guest smoke test must
validate install/load/invoke/remove behavior.

## Rollout and Rollback

First validate from a local package path in a Pient Ubuntu guest. After legal,
supply-chain, and package review, publish an exact npm version and recommend
`pi install npm:@benyue/upup-pient-plugin@<exact-version>`. Rollback is package
removal; no Pient preference or native Android migration is involved.
