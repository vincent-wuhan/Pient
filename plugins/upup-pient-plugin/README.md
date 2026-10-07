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
