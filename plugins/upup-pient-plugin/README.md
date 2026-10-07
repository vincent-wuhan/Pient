# UpUp Pient Plugin

`@benyue/upup-pient-plugin` provides read-only, mobile-safe investment
research tools and an UpUp-style research skill to Pi running inside Pient.
It does not launch another agent, UpUp MCP service, Bun daemon, browser, or
background worker.

## Tools

- `upup_market_snapshot`: bounded A-share, Hong Kong, and United States quote snapshots
- `upup_stock_news`: bounded Eastmoney security announcements/news for one symbol
- `upup_financial_summary`: Tushare-gated income and core indicators
- `upup_screen_stocks`: deterministic Tushare fundamental presets
- `upup_valuation_calculator`: deterministic local DCF, multiples, peer, and sensitivity analysis

All network tools use HTTPS, an explicit host allowlist, timeout, cancellation,
bounded response size, bounded concurrency, and bounded output. Market and news
data are provider observations, not investment advice.

## Credentials

Set `UPUP_TUSHARE_TOKEN` in the existing Pi process environment for
`upup_financial_summary` and `upup_screen_stocks`. The plugin never writes the
token to disk and never includes it in errors, logs, prompts, diagnostics, or
tool results.

## Install and remove

For local validation:

```bash
pi install /path/to/plugins/upup-pient-plugin
```

After an exact version is published:

```bash
pi install npm:@benyue/upup-pient-plugin@0.1.0
pi remove npm:@benyue/upup-pient-plugin@0.1.0
```

Removal is the rollback path. The plugin keeps cache only in the Pi process and
creates no plugin-owned service or credential file.

## Verification

```bash
npm install
npm run typecheck
npm test
npm run package:check
```

Tests use fixtures and do not contact live providers.

## Troubleshooting

- **`UPUP_TUSHARE_TOKEN is not configured`**: set the token only in the Pi
  process environment, then restart/reload Pi. Do not paste it into chat.
- **Provider timeout or invalid payload**: retry later; the plugin does not
  fabricate data. Check Pient network access and provider status.
- **Tool is absent after install**: run Pi reload or restart the Pient guest,
  then verify `pi list` shows the exact package source.
- **A-share fundamentals/news unavailable**: confirm the six-digit A-share
  symbol and Tushare token permissions/points. HK and US snapshot coverage is
  more limited in Phase 1.

## Phase 1 gaps and roadmap

Phase 1 intentionally omits UpUp's industry datasets, portfolio accounting,
backtesting, forecasting, multi-perspective research, realtime monitoring, and
automation. Those capabilities require separate data contracts, persistence,
review, and safety design before mobile delivery. The phased roadmap is:

1. full single-stock research data;
2. research state and report generation;
3. industry, fund, portfolio, and risk context;
4. backtesting, forecasting, and multi-perspective research;
5. realtime alternatives, monitoring, and release hardening.
