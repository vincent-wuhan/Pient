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
