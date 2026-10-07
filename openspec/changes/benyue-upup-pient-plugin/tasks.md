## 1. Foundation

- [ ] 1.1 Create the `@benyue/upup-pient-plugin` package with `pi.extensions` and `pi.skills` manifests, license attribution, and plugin-local test scripts.
- [ ] 1.2 Implement the shared Pi tool-result, error, schema, timeout, cancellation, output-budget, cache, and HTTPS allowlist infrastructure.
- [ ] 1.3 Add the `upup-research` skill that enforces clarification, evidence collection, verification, risk, and citation phases.

## 2. Investment Tools

- [ ] 2.1 Implement `upup_market_snapshot` with market-aware symbol normalization, provider adapters, fixture tests, and bounded output.
- [ ] 2.2 Implement `upup_stock_news` with result limits, timestamp normalization, empty handling, provider failures, and fixture tests.
- [ ] 2.3 Implement `upup_financial_summary` with credential gating, reporting-period normalization, units, source limitations, and fixture tests.
- [ ] 2.4 Implement `upup_screen_stocks` with deterministic presets, ranking, truncation, match counts, and fixture tests.
- [ ] 2.5 Implement `upup_valuation_calculator` with DCF, multiples, peer comparison, sensitivity analysis, numeric guards, and deterministic tests.

## 3. Security and Mobile Safety

- [ ] 3.1 Verify credential confinement, secret-free errors, host allowlisting, bounded concurrency, cancellation, and timeout behavior with automated tests.
- [ ] 3.2 Verify no UpUp MCP, Bun daemon, resident child process, Playwright, trading, filesystem-write, or arbitrary-shell capability is introduced.
- [ ] 3.3 Add package documentation covering exact installation, credentials, available tools, capability boundaries, troubleshooting, attribution, and rollback.

## 4. Pient Integration

- [ ] 4.1 Validate extension registration and skill discovery through the plugin test harness and a Pient Ubuntu guest with Node 22.19+.
- [ ] 4.2 Validate install, enable, invoke, disable, remove, and reload behavior through existing Pient Pi package management.
- [ ] 4.3 Record mobile smoke evidence for one deterministic offline tool, one credential-gated data tool, output truncation, and clean rollback.

## 5. Release Gates

- [ ] 5.1 Run plugin tests, typecheck, packaging checks, OpenSpec strict validation, and repository-required Android tests where affected.
- [ ] 5.2 Publish an exact versioned npm package only after legal review, supply-chain inspection, package audit, and signed artifact/hash evidence are complete.
- [ ] 5.3 Record known functional gaps and the phased roadmap for industry, portfolio, backtesting, multi-perspective research, monitoring, and automation capabilities.
