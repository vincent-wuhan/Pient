# Comet Design Handoff

- Change: multica-opc-runtime
- Phase: design
- Mode: compact
- Context hash: 65feb53847b0ce4b110d8df920dc7fb73c4f90af7583a93d2b54ba94c319e363

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/multica-opc-runtime/proposal.md

- Source: openspec/changes/multica-opc-runtime/proposal.md
- Lines: 1-33
- SHA256: bc42bbed23de5140ed88e05a596c48a18a1f001af11b2f98dd3b56ad01b4f757

```md
## Why

Pient already runs the official Pi agent inside its Android guest, but that runtime cannot yet appear as a managed seat in the OPC/Multica control plane. We need a near-term Android release that lets a phone join a Multica workspace, claim project tasks, execute them through Pi, and return results without introducing a second resident agent runtime.

## What Changes

- Add an opt-in Multica runtime integration that installs and activates `@atoz-project/multica-pi-connector` inside the existing Pi guest.
- Add mobile configuration for a Multica server profile, low-privilege PAT, and membership string in `[profile:][workspace/]agent` format.
- Write the connector-required guest `profiles.json` with restrictive permissions and pass `--multica <membership>` when starting the Pi RPC process.
- Surface activation, connection, task-execution, and failure states in Pient without exposing credentials in logs or exports.
- Reuse the existing Pi foreground-service lifecycle so Multica heartbeats, task polling, and task execution survive normal app backgrounding.
- Verify that the Pient seat appears online in the OPC/Multica console, can claim project and DM tasks, can use `multica_*` tools, and reports completion or failure.
- Produce an Android `0.2.0` release candidate with integration documentation and rollback/disable instructions.
- Keep OpenMinis and a broad native Android `CapabilityBridge` out of this change; they are follow-up work rather than release blockers.

## Capabilities

### New Capabilities

- `multica-runtime-integration`: Configure, activate, operate, diagnose, and disable a Pient-hosted Pi seat that joins an OPC/Multica workspace and executes assigned project tasks.

### Modified Capabilities

None. This repository has no existing OpenSpec capability specifications.

## Impact

- **Android runtime:** `app/src/main/java/com/pient/app/runtime/PiRpc.kt`, `PiPackages.kt`, `PiKeepAlive.kt`, and Pi guest preparation.
- **Configuration and UI:** a new Multica settings store/screen plus existing settings navigation and localized strings.
- **Guest files:** managed Pi package entry and `~/.pi/agent/multica-pi-connector/profiles.json`.
- **External systems:** Multica/OPC server APIs used by connector `0.10.0`; no Pient-owned server protocol changes.
- **Supply chain:** connector is currently published without explicit package license metadata, so the first release must use a pinned user-installed experimental integration or replace it with a compliant in-repo implementation after legal review.
- **Release:** increase the Android version to `0.2.0` / `versionCode 3` only after the console-driven task flow passes device validation.
```

## openspec/changes/multica-opc-runtime/design.md

- Source: openspec/changes/multica-opc-runtime/design.md
- Lines: 1-82
- SHA256: 7b3d225e600788977a996b31c8262dd40926cc5a5981afafad92158d73f63aed

[TRUNCATED]

```md
## Context

Pient version `0.1.1` starts the official Pi agent with `pi --mode rpc --provider ... --model ...` inside its bundled Ubuntu guest. It already supports package installation through `pi install`, a foreground-service keepalive path, and a local chat RPC lifecycle. The Multica Pi connector `0.10.0` is a Pi extension that reads `~/.pi/agent/multica-pi-connector/profiles.json`, accepts a membership through `pi --multica [profile:][workspace/]agent`, registers a membership-addressed runtime seat, claims tasks, and exposes `multica_send`, `multica_reply`, `multica_stop`, `multica_list`, and `multica_read`.

The near-term product need is an Android-hosted Multica/OPC execution seat, not a second mobile agent. OpenMinis and a native Android `CapabilityBridge` remain useful follow-up directions, but adding them to this release would create duplicate runtime, permission, licensing, and support boundaries.

## Goals / Non-Goals

**Goals:**

- Ship an opt-in Android `0.2.0` release candidate that can join an OPC/Multica workspace as one Pi seat.
- Make configuration, activation, diagnostics, disable, and rollback understandable on a phone.
- Reuse the existing Pi process, official Pi package system, tool runtime, session behavior, and foreground keepalive.
- Keep the connector version and protocol behavior reproducible.
- Validate real project-task and DM-task execution from the console on an arm64 device.

**Non-Goals:**

- No native calendar, contacts, photo, location, clipboard, accessibility, media, or speech capabilities.
- No OpenMinis integration, OpenMinis Debug Server protocol, or second resident mobile agent.
- No custom Multica server protocol or OPC console implementation.
- No iOS support.
- No unattended privileged operations; users must still control sensitive permissions and destructive actions.

## Decisions

### Use the Pi connector as the first integration seam

Pient will use `@atoz-project/multica-pi-connector@0.10.0` rather than reimplementing Multica seat registration and task transport. This preserves connector behavior across Pi hosts and avoids inventing a parallel protocol.

**Alternative rejected:** calling Multica HTTP APIs directly from Kotlin. That would duplicate connector semantics, fork task/session behavior, and require Pient to maintain another protocol client.

### Pin an exact connector version and keep activation experimental

The first implementation will install the exact npm version `0.10.0`; floating `latest` is forbidden. Because npm metadata currently has no explicit license or repository field, the integration must be user-initiated and clearly experimental until legal review approves redistribution or the dependency is replaced/forked under acceptable terms.

**Alternative rejected:** bundling the connector in the APK immediately. That creates distribution and supply-chain obligations before license and maintenance ownership are clear.

### Keep one Pi runtime and pass the membership at process start

`PiRpc.start` will accept an optional Multica membership. When integration is enabled, Pient will safely quote and append `--multica <membership>` to the existing `exec pi --mode rpc` command and include that membership in process-reuse/restart decisions. A membership change restarts Pi so connector startup state remains deterministic.

**Alternative rejected:** launching a second Pi process just for Multica. It would double model/runtime state and make chat-versus-task behavior harder to reason about.

### Treat connector profiles as guest-private credentials

Pient will persist non-secret preferences in its normal app-private settings storage and materialize the connector-required JSON under the guest connector directory only while integration is enabled. The file will use owner-only permissions. Disable removes or invalidates the token material; logs and diagnostics display only non-secret profile and membership identifiers.

**Alternative rejected:** passing the PAT through environment variables. Connector `0.10.0` intentionally does not support an environment token layer, and process environments are easier to leak through diagnostics.

### Reuse the existing foreground lifecycle

The connector remains inside the existing Pi RPC process. The existing Pient foreground-service behavior remains responsible for keeping that process alive; no second Multica service is introduced. Disconnect recovery is delegated to the connector, with Pient surfacing status and allowing the user to restart/disable.

### Scope release validation around the console loop

The release gate is a real arm64-device flow: configure profile, activate seat, observe online state in OPC/Multica, execute a project task, execute a DM round-trip, background the app, stop a task, disable integration, and confirm ordinary Pi chat still works. Automated tests cover configuration redaction, command construction, package pinning, and lifecycle state; external Multica coverage is exercised against a designated test workspace.

## Risks / Trade-offs

- **Connector has no explicit license metadata** → do not bundle it in the first release; pin `0.10.0`, mark the feature experimental, complete legal review, and replace/fork it before making it default-on or distributing its source in the APK.
- **Connector protocol may change quickly** → store the tested version in Pient configuration and provide a compatibility matrix in release documentation.
- **Android may kill long-running background processes** → document expected behavior, reuse the existing foreground-service controls, and avoid claiming work when the runtime is not healthy.
- **A phone seat is easier to duplicate across devices** → preserve connector membership locking and report duplicate-seat failures instead of forcing a second session.
- **PAT compromise is high impact** → require a low-privilege token, keep the guest file owner-only, redact secrets everywhere, and provide one-action disable/token invalidation guidance.
- **Task failure could be silent** → add explicit activation/task diagnostics and make console-side terminal success/failure/stopped state part of validation.
- **Scope creep into native phone APIs** → keep this change limited to Multica runtime integration; create a separate OpenSpec change for `CapabilityBridge`.

## Migration Plan

1. Add disabled-by-default configuration and UI without altering existing startup behavior.
2. Add pinned connector installation and profile writing behind the explicit activation action.
3. Extend `PiRpc` startup and restart identity with the optional membership.
4. Validate seat registration and task execution against a disposable Multica workspace.
5. Ship the feature as experimental in `0.2.0`; users who never enable it retain the `0.1.1` behavior.
6. Rollback is turning integration off (and uninstalling the pinned package if desired); no data migration is required.

## Open Questions

- Which OPC/Multica test workspace, low-privilege PAT policy, and seat naming convention should be used for release validation?
```

Full source: openspec/changes/multica-opc-runtime/design.md

## openspec/changes/multica-opc-runtime/tasks.md

- Source: openspec/changes/multica-opc-runtime/tasks.md
- Lines: 1-41
- SHA256: 316c539bef1d755d8c41f8710b23dfaabd955b5ce8ca0a43c408fbad4bd59722

```md
## 1. Baseline and Compatibility

- [ ] 1.1 Capture the connector `0.10.0` package hash, source inventory, tool contracts, profiles schema, membership grammar, and license finding in an implementation note.
- [ ] 1.2 Manually install the connector in a Pient guest, activate it with `pi --multica`, and record the existing Pi command/session behavior as the baseline.
- [ ] 1.3 Confirm the target Multica/OPC test workspace, low-privilege PAT policy, workspace slug, agent name, and device seat naming convention.

## 2. Configuration and Guest State

- [ ] 2.1 Implement an app-private Multica settings model for server URL, PAT, profile name, default profile, membership, and enabled state.
- [ ] 2.2 Implement owner-only `profiles.json` writing, validation, redaction, disable-time token removal, and non-secret preference retention.
- [ ] 2.3 Add a pinned `npm:@atoz-project/multica-pi-connector@0.10.0` installation/update path that fails activation if the expected version cannot be loaded.
- [ ] 2.4 Add unit tests for configuration parsing, membership formatting, secret redaction, token-file permissions, disable cleanup, and package pinning.

## 3. Pi Runtime Integration

- [ ] 3.1 Extend `PiRpc.start` with an optional safely quoted Multica membership and include it in process reuse/restart identity.
- [ ] 3.2 Route all existing Pi startup call sites through the Multica-aware runtime configuration without changing disabled-mode behavior.
- [ ] 3.3 Confirm connector heartbeats, task polling, and task turns use the existing foreground Pi lifecycle and terminate with `PiRpc.stop()`.
- [ ] 3.4 Add regression coverage proving no `--multica` argument or connector startup occurs while integration is disabled.

## 4. Pient UI and Diagnostics

- [ ] 4.1 Add a localized Multica settings/status screen for profile, PAT, membership, enable/disable, connector installation, and connection state.
- [ ] 4.2 Surface actionable connector failures for credentials, network, duplicate seat, package load, and task execution without exposing secrets.
- [ ] 4.3 Add integration documentation covering setup, seat naming, permissions, background limits, troubleshooting, disable, and rollback.
- [ ] 4.4 Verify all affected strings in every existing Pient language and prevent PAT/profile contents from entering logs or log exports.

## 5. End-to-End Validation

- [ ] 5.1 On an arm64 Android 8+ device, verify the configured seat becomes online and correctly addressed in the OPC/Multica console.
- [ ] 5.2 Execute a project task from the console and verify Pi runs it with progress/result state returned to Multica.
- [ ] 5.3 Execute a DM round-trip using `multica_send`/`multica_reply`, including thread identity and no-reply behavior.
- [ ] 5.4 Verify task stop, connector disconnect/reconnect, app backgrounding, duplicate membership rejection, and clean disable behavior.
- [ ] 5.5 Confirm ordinary local chat, terminal, package management, and model switching remain unaffected when Multica is disabled.

## 6. Release Candidate

- [ ] 6.1 Complete connector legal/supply-chain review and choose pinned-user-install, compliant fork, or release-blocked based on the finding.
- [ ] 6.2 Update release notes and integration documentation for the selected distribution policy.
- [ ] 6.3 Bump the Android release to version `0.2.0` / `versionCode 3`.
- [ ] 6.4 Build and sign the arm64 release artifact, run the release smoke checklist, and publish only after all end-to-end tasks pass.
```

## openspec/changes/multica-opc-runtime/specs/multica-runtime-integration/spec.md

- Source: openspec/changes/multica-opc-runtime/specs/multica-runtime-integration/spec.md
- Lines: 1-75
- SHA256: 5d2961cb73be46c38cfe58a1f4c9a064b6a81c49d32069a2ba60e0af931b2645

```md
## ADDED Requirements

### Requirement: Opt-in Multica activation
Pient SHALL keep Multica integration disabled and network-silent until the user explicitly configures and enables it.

#### Scenario: Integration remains inactive
- **WHEN** Pient starts without a saved Multica membership
- **THEN** Pient starts Pi without `--multica`, installs no connector implicitly, and makes no Multica network request

#### Scenario: User activates a seat
- **WHEN** the user saves a valid server profile, PAT, and membership and enables integration
- **THEN** Pient installs the pinned connector package, writes the guest profile configuration, restarts Pi with the selected membership, and attempts to register the corresponding Multica seat

### Requirement: Connector credential handling
Pient SHALL protect the Multica PAT and SHALL NOT include it in application logs, crash diagnostics, exported logs, analytics, or UI state.

#### Scenario: Guest profile is written
- **WHEN** Multica integration is enabled
- **THEN** Pient writes only the configured connector profile data to the guest-owned `profiles.json` path with owner-only file permissions

#### Scenario: Integration is disabled
- **WHEN** the user turns Multica integration off
- **THEN** Pient removes or invalidates the guest token file, stops passing `--multica`, and ends the seat session without deleting the user's non-secret configuration preferences

### Requirement: Phone runtime seat lifecycle
Pient SHALL operate exactly one Pi agent process that hosts the selected Multica membership and SHALL expose that seat as online while the Pi runtime is active and authorized.

#### Scenario: Seat appears online
- **WHEN** connector activation succeeds and the Pi foreground lifecycle remains alive
- **THEN** the OPC/Multica console shows the membership-addressed runtime seat as online and available for task assignment

#### Scenario: Duplicate membership is rejected
- **WHEN** another live terminal already owns the same membership seat
- **THEN** Pient reports the connector failure, does not create a second executing runtime, and provides the connector guidance without exposing the PAT

#### Scenario: Runtime is interrupted
- **WHEN** Android stops the Pi process or the network connection is lost
- **THEN** Pient stops claiming new tasks, reports the disconnected state to the user, and reconnects using the saved configuration when the Pi runtime can start again

### Requirement: Project and DM task execution
An active Pient seat SHALL claim and execute Multica project tasks and DM tasks through the same Pi session and tool runtime used by the Pient chat interface.

#### Scenario: Project task completes
- **WHEN** an authorized user assigns a task to the Pient membership in the OPC/Multica console
- **THEN** the seat claims the task, executes it as a real Pi turn, streams progress/result state back to Multica, and leaves the task in a terminal success or failure state rather than silently dropping it

#### Scenario: DM delegation round-trips
- **WHEN** a Pient-hosted agent uses `multica_send` or `multica_reply` to delegate to another Multica agent
- **THEN** the receiving seat receives the DM task and a subsequent reply is delivered on the original thread

#### Scenario: Task is stopped
- **WHEN** the user or another participant stops the active task while Pient is executing it
- **THEN** Pient aborts the corresponding Pi work promptly and records the stopped state in Multica

### Requirement: Mobile diagnostics and recovery
Pient SHALL provide actionable local diagnostics for connector installation, profile parsing, seat registration, network failure, duplicate-seat lock, and task-execution failures.

#### Scenario: Connection fails
- **WHEN** the connector cannot reach the configured Multica server or rejects the credentials
- **THEN** the Multica settings/status surface shows a non-secret actionable error and retains the user's ability to edit or disable the configuration

#### Scenario: Connector is missing or stale
- **WHEN** activation cannot install or load the pinned connector
- **THEN** Pient blocks Multica startup, explains the recovery step, and keeps ordinary local Pi chat usable

#### Scenario: Connector version does not match
- **WHEN** the installed connector source is not exactly `npm:@atoz-project/multica-pi-connector@0.10.0`
- **THEN** Pient refuses to activate Multica until that exact source is installed or repaired and does not silently fall back to another version

### Requirement: Release readiness
The Multica integration SHALL ship only after pinned-dependency, security, background-lifecycle, localized-UI, and real-device console task validation pass.

#### Scenario: Android release candidate is validated
- **WHEN** Pient `0.2.0` is built for arm64 Android 8+
- **THEN** a real device can join a Multica workspace, execute at least one project task and one DM round-trip in background, disable cleanly, and retain ordinary Pient behavior after rollback
```

