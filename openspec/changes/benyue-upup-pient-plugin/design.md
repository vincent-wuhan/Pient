## Context

Pient already runs one official Pi agent in its bundled Ubuntu guest and supports Pi packages through `pi install`, `pi list`, `pi remove`, and the plugin management UI. UpUp provides a large Bun-oriented investment agent with valuable Chinese-market data adapters, prompts, and a five-phase research methodology, but its full runtime is not suitable for an Android guest: it depends on Bun-oriented tooling, many runtime packages, browser automation, persistent workspaces, multi-agent orchestration, and a test suite that is not currently green.

UpUp's `@upup/plugin-sdk` extends UpUp itself; it is not a Pi adapter. Its Gateway is primarily a WhatsApp channel and its MCP subsystem is mainly a client/lifecycle manager. Therefore neither interface is the preferred integration boundary.

## Goals / Non-Goals

**Goals:**

- Keep Pi as the only resident mobile agent.
- Add a standalone Pi package that registers mobile-safe investment tools and a research skill.
- Reuse selected UpUp data behavior and methodology under UpUp's MIT terms.
- Support read-only Chinese-market research with bounded output, network, memory, and credential exposure.
- Make the package installable and removable through existing Pient plugin management.
- Provide plugin-local tests and documentation without changing native Android capabilities.

**Non-Goals:**

- No resident UpUp agent, daemon, cron process, Bun runtime, or second model loop.
- No dependency on UpUp MCP, UpUp Gateway, Playwright, desktop UI, WhatsApp, or remote control.
- No trading, order execution, portfolio mutation, payment, credential UI, or native Android capability bridge.
- No attempt to make all UpUp tools available on mobile.

## Decisions

### 1. Integrate as a Pi extension package

The plugin will live at `plugins/upup-pient-plugin` and declare:

```json
{
  "name": "@benyue/upup-pient-plugin",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"]
  }
}
```

Pi loads the extension inside its existing process. This preserves Pient's one-agent model and avoids cross-process state synchronization.

Alternatives rejected:

- **Resident UpUp service:** introduces a second agent, lifecycle, permissions, secrets, and model runtime.
- **UpUp MCP dependency:** requires a production-grade UpUp MCP server that does not currently exist and would still need a process boundary.
- **Native Android implementation:** loses compatibility with desktop Pi packages and increases Pient maintenance.

### 2. Reimplement mobile adapters instead of importing UpUp modules

The first tools will use small, testable adapter functions with Node's standard `fetch`, timeouts, cancellation, allowlisted HTTPS endpoints, and no LangChain or Bun-only imports. UpUp source may be consulted or minimally copied for endpoint semantics and formatting, but the package will not depend on the UpUp workspace.

This keeps the dependency graph small enough for an Android guest while preserving UpUp's market knowledge.

### 3. Ship a focused read-only MVP tool set

Initial tools:

| Tool | Purpose | Preferred data route |
| --- | --- | --- |
| `upup_market_snapshot` | Quotes and index snapshot for A-share/HK/US symbols | Tushare token when configured; public fallback only if reliable |
| `upup_stock_news` | Bounded recent news lookup | Tushare or allowlisted public news endpoint |
| `upup_financial_summary` | Core indicators and recent reporting-period data | Tushare |
| `upup_screen_stocks` | Bounded preset screening | Local computation over fetched fundamentals |
| `upup_valuation_calculator` | DCF, PE, PB, peer, and sensitivity calculations | Local deterministic calculation |

All tool names are prefixed with `upup_` to avoid collisions. Parameters use TypeBox schemas exposed by the Pi extension environment. Results use Pi tool content shapes and deterministic `details` objects.

### 4. Model a workflow as a skill, not a runtime

An `upup-research` skill will instruct Pi to perform:

1. clarify the investment question and market;
2. collect quotes, news, and fundamentals through plugin tools;
3. state assumptions and missing evidence;
4. verify figures and distinguish data from inference;
5. produce risk, valuation, and follow-up sections with citations to tool calls.

Pi owns planning and synthesis. The plugin does not spawn workers or persist an independent research plan.

### 5. Use bounded mobile execution semantics

- Requests default to a 20-second timeout and honor tool cancellation.
- Text output is truncated to a documented character budget.
- In-memory caches are short-lived and process-local.
- No disk cache is introduced in the first version.
- Concurrent requests are bounded per tool.
- Errors identify the failing capability and safe user action without echoing credentials or full upstream payloads.

### 6. Read credentials from the existing guest environment

The first version supports `UPUP_TUSHARE_TOKEN` through the Pi process environment. It does not add an Android credential UI or store tokens in plugin files. Missing credentials produce an actionable configuration error. Token values MUST never be returned, logged, embedded in requests visible in tool output, or persisted by plugin code.

### 7. Validate locally and on a real guest

Plugin-local tests will cover schema validation, adapter normalization, failures, cancellation, truncation, caching, secret redaction, deterministic calculations, and manifest resource discovery. A Pient guest smoke test will verify local installation, extension loading, tool discovery, one offline/deterministic call, and clean removal.

## Risks / Trade-offs

- [UpUp endpoint behavior may drift] → Keep adapters thin, fixture-based, and allowlisted; surface structured provider errors.
- [Chinese public APIs may be unreliable or rate-limited] → Prefer token-configured Tushare, cache briefly, bound concurrency, and fail clearly rather than fabricating data.
- [Mobile context is smaller] → Use narrow schemas, truncated output, no disk cache, and a small MVP tool set.
- [Copied MIT code can lose attribution] → Preserve UpUp notices in `THIRD_PARTY_NOTICES.md` and document reused behavior.
- [Pi extension API may change] → Pin the tested Pi package family in validation and keep registration code isolated.
- [A plugin has full process access by Pi design] → Keep the implementation dependency-light, read-only, and reviewable; do not add shell or arbitrary network tools.

## Migration Plan

1. Add the package with tests and documentation.
2. Install it into a Pient guest from its local path for validation.
3. Publish an exact npm version after review.
4. Recommend `pi install npm:@benyue/upup-pient-plugin@<exact-version>` in Pient.
5. Remove with `pi remove npm:@benyue/upup-pient-plugin`; no Android data migration is required.

Rollback is package removal. The plugin must not alter Pient preferences, native files, or guest configuration outside its package resources.
