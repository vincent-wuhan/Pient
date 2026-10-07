# Comet Design Handoff

- Change: benyue-upup-pient-plugin
- Phase: design
- Mode: compact
- Context hash: 8bc3f674032897da3e11813089614dc60754548b4f26e64cce8269b4bea3e9a2

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/benyue-upup-pient-plugin/proposal.md

- Source: openspec/changes/benyue-upup-pient-plugin/proposal.md
- Lines: 1-44
- SHA256: 8b2883a2466f6e60a92bcee2caa683574c9f91086eb37f8bd2af150dbfdc57b0

```md
## Why

Pient needs a mobile-native path to UpUp's Chinese investment-research capabilities without adding a second resident agent, Bun runtime, browser stack, or MCP service. A Pi extension package can reuse UpUp's proven data adapters, prompts, and methodology while keeping Pi as the only mobile agent.

## What Changes

- Add a new Pi package, `upup-pient-plugin`, that installs through Pient's existing `pi install` manager and registers tools through `pi.extensions`.
- Port a focused, read-only mobile investment toolkit from UpUp:
  - market snapshot and quotes;
  - stock news search;
  - financial summary;
  - simple stock screening;
  - valuation and risk calculators.
- Add an UpUp-inspired investment-research skill/prompt that guides Pi through dossier, assumption, verification, risk, and reporting phases.
- Keep all execution inside the existing Pi process and Pient Ubuntu guest.
- Store API credentials only through existing Pient/Pi private configuration mechanisms and keep them out of tool output, logs, diagnostics, and prompts.
- Explicitly exclude:
  - resident UpUp agent/runtime;
  - UpUp MCP dependency;
  - Playwright/browser tools;
  - trading/order execution;
  - multi-agent orchestration;
  - daemon or cron activation in this change.

## Capabilities

### New Capabilities

- `upup-pi-package`: Pi package structure, installation identity, extension loading, compatibility, and lifecycle behavior.
- `upup-investment-tools`: Read-only mobile investment data and calculation tools, including validation, truncation, caching, and failure behavior.
- `upup-research-workflow`: UpUp-inspired skill and prompt behavior that guides Pi through an investment research workflow without a second agent.
- `upup-mobile-security`: Mobile runtime, credential, network, and data-safety boundaries for the plugin.

### Modified Capabilities

- None. This change adds an independent plugin surface and does not alter an existing published capability.

## Impact

- Add a TypeScript plugin package under `plugins/upup-pient-plugin`.
- Add Pi extension tool registrations, a research skill, lightweight adapters ported from UpUp, and plugin-local tests.
- Add documentation for installation, API-key setup, capability boundaries, troubleshooting, and rollback.
- No Pient Android application ID or native Android capability bridge changes are required.
- UpUp source is MIT-licensed, but copied code must retain attribution and this change must not bundle unstable or unrelated UpUp dependencies.
```

## openspec/changes/benyue-upup-pient-plugin/design.md

- Source: openspec/changes/benyue-upup-pient-plugin/design.md
- Lines: 1-116
- SHA256: 14fa937b1b46074c2177b3256db71c687917a0a06a930806a57c5ff466ec95d2

[TRUNCATED]

```md
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
```

Full source: openspec/changes/benyue-upup-pient-plugin/design.md

## openspec/changes/benyue-upup-pient-plugin/tasks.md

- Source: openspec/changes/benyue-upup-pient-plugin/tasks.md
- Lines: 1-31
- SHA256: b89a9cf6b4fb564add3aa33897ba8e21db8fee6764a278a2647c7051bdb00b98

```md
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
```

## openspec/changes/benyue-upup-pient-plugin/specs/upup-investment-tools/spec.md

- Source: openspec/changes/benyue-upup-pient-plugin/specs/upup-investment-tools/spec.md
- Lines: 1-67
- SHA256: dc73919f78461de8ede711c0b3fa2ff5ed06b5df87f842c9279656784da2c3b1

```md
## ADDED Requirements

### Requirement: Market snapshot tool
The plugin SHALL register `upup_market_snapshot` to return bounded quote and index data for a limited list of A-share, Hong Kong, and United States symbols.

#### Scenario: User requests a small symbol set
- **WHEN** Pi calls the tool with valid symbols
- **THEN** the result identifies each symbol, market, price, change, source, timestamp, and data-quality limitation within the output budget

#### Scenario: Provider request fails
- **WHEN** the upstream request times out or returns an invalid payload
- **THEN** the tool returns a structured failure that names the provider and suggests credential or network checks without exposing the credential

### Requirement: Stock news tool
The plugin SHALL register `upup_stock_news` to return a bounded, reverse-chronological set of recent news items for one supported symbol.

#### Scenario: News is available
- **WHEN** Pi calls the tool with a valid symbol and result limit
- **THEN** the tool returns at most the requested number of items with title, date, source, URL when available, and no full-article content

#### Scenario: No news is available
- **WHEN** the provider returns an empty valid result
- **THEN** the tool reports zero items rather than synthesizing news

### Requirement: Financial summary tool
The plugin SHALL register `upup_financial_summary` to return core reporting-period indicators for a supported company.

#### Scenario: Fundamentals are available
- **WHEN** Pi requests a valid company identifier
- **THEN** the tool returns reporting period, revenue, profit, margin, valuation-related indicators, units, currency, and source limitations

#### Scenario: Required credential is absent
- **WHEN** no supported data-provider credential is configured
- **THEN** the tool fails closed with setup guidance and does not return placeholder financial values

### Requirement: Stock screening tool
The plugin SHALL register `upup_screen_stocks` to run a bounded preset screen over a fetched fundamental dataset.

#### Scenario: Screen matches candidates
- **WHEN** Pi requests a supported preset and maximum result count
- **THEN** the tool returns deterministic ranked candidates with the matching metric values and screen assumptions

#### Scenario: Screen has too many candidates
- **WHEN** more candidates match than the requested maximum
- **THEN** the tool truncates the list, reports the total match count, and identifies the ranking rule

### Requirement: Valuation calculator tool
The plugin SHALL register `upup_valuation_calculator` to perform deterministic DCF, multiple-based, peer-comparison, and sensitivity calculations locally.

#### Scenario: Valid valuation inputs are supplied
- **WHEN** Pi calls the calculator with numeric assumptions inside supported ranges
- **THEN** the tool returns calculations, formulas, assumptions, limitations, and sensitivity rows without a network request

#### Scenario: Inputs are unsafe or non-finite
- **WHEN** parameters fall outside declared bounds or produce non-finite intermediate values
- **THEN** schema validation or local calculation rejects the request with an actionable error

### Requirement: Mobile-safe tool execution
Every UpUp investment tool MUST be read-only and apply input validation, HTTPS endpoint allowlisting, cancellation, timeout, bounded concurrency, result truncation, and secret-free errors.

#### Scenario: Long-running call is cancelled
- **WHEN** Pi cancels a tool execution
- **THEN** the plugin stops propagating cancellation to the fetch layer and returns no partial result as a successful payload

#### Scenario: Provider output is very large
- **WHEN** normalized output exceeds the documented budget
- **THEN** the tool truncates the payload and reports that truncation occurred
```

## openspec/changes/benyue-upup-pient-plugin/specs/upup-mobile-security/spec.md

- Source: openspec/changes/benyue-upup-pient-plugin/specs/upup-mobile-security/spec.md
- Lines: 1-52
- SHA256: 569119fd8d09b719010ac7cefc489904dd001af51ec75e99f2eda0a77d72de22

```md
## ADDED Requirements

### Requirement: No second resident runtime
The integration MUST NOT install, launch, or require a resident UpUp agent, UpUp MCP server, Bun daemon, cron daemon, or background worker on the Android device.

#### Scenario: Plugin is active
- **WHEN** the plugin is loaded and tools are invoked
- **THEN** all supplied functionality executes within the Pi process and no UpUp child process is required

#### Scenario: Plugin is removed
- **WHEN** the package is removed through Pi
- **THEN** no plugin-owned process, service, credential file, or persisted cache remains

### Requirement: Credential confinement
The plugin SHALL read supported provider credentials only from the existing Pi process environment and MUST NOT write credentials to disk, logs, diagnostics, tool results, package settings, prompts, or analytics.

#### Scenario: Credential is configured
- **WHEN** a supported environment credential is present
- **THEN** tools may use it for allowlisted upstream requests without echoing its value

#### Scenario: Error includes request context
- **WHEN** an upstream request fails
- **THEN** the error describes the provider and safe troubleshooting action but omits credentials, authorization headers, and raw request bodies

### Requirement: Read-only capability boundary
The plugin MUST NOT provide trading, order execution, payment, credential mutation, arbitrary shell, filesystem write, phone capability, or destructive data operations.

#### Scenario: Tool registry is inspected
- **WHEN** the plugin is loaded
- **THEN** only declared read-only investment tools are registered

#### Scenario: User asks the plugin to trade
- **WHEN** no supported trading operation exists
- **THEN** the plugin does not register or invoke a trading endpoint

### Requirement: Network and output safety
The plugin SHALL restrict outbound requests to documented HTTPS provider hosts and MUST bound payloads, timeouts, caches, and concurrent requests for mobile use.

#### Scenario: Adapter targets an undocumented host
- **WHEN** an implementation or test attempts a request to a host outside the allowlist
- **THEN** the request is rejected before network dispatch

#### Scenario: Cache entries expire
- **WHEN** a cached response exceeds its declared time-to-live
- **THEN** the next request retrieves fresh data instead of returning the expired entry

### Requirement: UpUp attribution
The package SHALL document UpUp's MIT license and identify ported or materially reused behavior.

#### Scenario: Package is distributed
- **WHEN** a reviewer inspects package metadata and notices
- **THEN** UpUp source attribution and license compatibility information are present
```

## openspec/changes/benyue-upup-pient-plugin/specs/upup-pi-package/spec.md

- Source: openspec/changes/benyue-upup-pient-plugin/specs/upup-pi-package/spec.md
- Lines: 1-41
- SHA256: 009acdecf4b869e545b2f7fe0c04d9cab45b7f0b43edf91f19a22719b39c3046

```md
## ADDED Requirements

### Requirement: Pi package manifest
The plugin SHALL provide an npm-compatible package named `@benyue/upup-pient-plugin` with a `pi-package` keyword and a `pi` manifest that declares its extension and skill resources.

#### Scenario: Pi discovers plugin resources
- **WHEN** Pi loads the package through its package manager
- **THEN** it discovers at least one extension entry and the `upup-research` skill without project-specific path assumptions

#### Scenario: Package identity is exact
- **WHEN** the package is installed for Pient validation
- **THEN** installation uses a local path or an exact versioned npm source and never a floating version

### Requirement: Single Pi runtime compatibility
The plugin SHALL execute as TypeScript/JavaScript inside the existing Pi process and MUST NOT require Bun, a second agent, a daemon, or an MCP server.

#### Scenario: Plugin loads in Pient guest
- **WHEN** Pient's Ubuntu guest has Node 22.19 or newer and Pi loads the package
- **THEN** the extension initializes without spawning another resident process

#### Scenario: Runtime dependency remains bounded
- **WHEN** the package dependencies are inspected
- **THEN** Pi core packages are peer dependencies and no UpUp workspace, Playwright, LangChain, daemon, or MCP runtime dependency is present

### Requirement: Existing package lifecycle
The plugin SHALL be enabled, disabled, updated, and removed through Pi's existing package manager and Pient plugin UI semantics.

#### Scenario: User disables the plugin
- **WHEN** the package is disabled or removed through Pi package management
- **THEN** its tools and skill disappear from the next Pi resource discovery and no plugin-specific cleanup service is required

#### Scenario: Plugin is re-enabled
- **WHEN** the package is enabled again after removal or disablement
- **THEN** Pi rediscovers the same tool names and skill without duplicated registrations

### Requirement: Plugin-local verification
The package SHALL provide automated tests for manifest discovery, tool registration, adapter behavior, output bounding, and security invariants.

#### Scenario: Plugin test suite runs
- **WHEN** a developer runs the package test command
- **THEN** manifest and extension behavior tests pass without contacting a live external data provider
```

## openspec/changes/benyue-upup-pient-plugin/specs/upup-research-workflow/spec.md

- Source: openspec/changes/benyue-upup-pient-plugin/specs/upup-research-workflow/spec.md
- Lines: 1-30
- SHA256: dee8fcd2014df5cc506f9aa7d5ed099532dda1b8535bbc741c7a90e3396ecd9f

```md
## ADDED Requirements

### Requirement: UpUp research skill
The plugin SHALL provide an `upup-research` skill that guides Pi through clarification, data collection, assumption, verification, risk, and reporting phases.

#### Scenario: User requests investment research
- **WHEN** Pi activates the skill for an investment question
- **THEN** the skill instructs Pi to identify market, symbol, time horizon, currency, risk tolerance, and missing evidence before drawing conclusions

#### Scenario: Required data cannot be retrieved
- **WHEN** investment tools fail or lack credentials
- **THEN** the skill requires Pi to report the evidence gap and avoid presenting inferred values as provider data

### Requirement: Evidence-grounded synthesis
The research workflow MUST distinguish provider data, deterministic calculations, and model inference, and MUST cite the tool evidence used for material claims.

#### Scenario: Research report is produced
- **WHEN** Pi completes an UpUp research workflow
- **THEN** the report separates data, analysis, risks, valuation assumptions, and follow-up actions and identifies figures that were unavailable

#### Scenario: Calculations drive a conclusion
- **WHEN** valuation or screening output supports a conclusion
- **THEN** the report names the calculation method and material assumptions rather than presenting the result as market truth

### Requirement: Mobile research scope
The workflow SHALL operate within a single Pi turn or normal Pi tool-use loop and MUST NOT spawn an UpUp workflow engine, background job, worker pool, browser, or second model agent.

#### Scenario: Research workflow runs on mobile
- **WHEN** the user performs UpUp-style research in Pient
- **THEN** only Pi performs planning and synthesis while plugin tools supply bounded evidence and calculations
```

