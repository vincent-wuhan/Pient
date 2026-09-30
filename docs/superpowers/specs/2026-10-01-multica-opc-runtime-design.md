---
comet_change: multica-opc-runtime
role: technical-design
canonical_spec: openspec
---

# Pient Multica/OPC Runtime Technical Design

## Context

Pient already hosts one official Pi process in its bundled Ubuntu guest and communicates through `pi --mode rpc`. The Pi package manager can install npm packages, and the existing foreground keepalive service protects chat and terminal processes. Multica connector `0.10.0` supplies the missing control-plane behavior: profile loading, membership-addressed seat registration, task claiming, Multica tools, and task transcript reporting.

This design adds the minimum Pient-native activation layer around that connector. It does not add a second agent process, a custom Multica protocol, or native Android capability APIs.

## Goals / Non-Goals

**Goals**

- Ship an opt-in Android `0.2.0` release candidate.
- Let the existing Pi process become one OPC/Multica membership-addressed seat.
- Keep connector installation reproducible at exactly `npm:@atoz-project/multica-pi-connector@0.10.0`.
- Make setup, status, failure, disable, and rollback understandable on a phone.
- Preserve ordinary Pient behavior when Multica is disabled.

**Non-Goals**

- No OpenMinis bridge, second resident agent, or Debug Server integration.
- No calendar, contacts, photos, clipboard, location, accessibility, or other native phone capability APIs.
- No Pient-side Multica server implementation or replacement for connector task transport.
- No iOS support.

## Selected Approach

Use Pient as the Android host and the existing connector as the protocol adapter.

```
OPC / Multica console
        ⇅ connector 0.10.0
Pi agent inside Pient Ubuntu guest
        ⇅ official RPC and tools
Pient Compose UI / settings / diagnostics
        ⇅ host file bridge
profiles.json + pinned Pi package
```

The alternative of implementing seat registration and task APIs directly in Kotlin was rejected because it would fork connector semantics and make phone behavior diverge from desktop Pi. A fully bundled in-repo connector is deferred until legal and maintenance ownership are settled.

## Component Design

### 1. Multica configuration model

Create `MulticaConfigStore` in the data layer. It persists only:

- enabled flag;
- profile name and default profile;
- non-secret membership;
- server URL used by the profile;
- a marker for whether the PAT has been materialized.

The PAT is not copied into Pient diagnostics, Compose state exposed to logs, or the ordinary `pient_data` extras file. While enabled, the only persistent token copy is the connector-required guest `profiles.json`; disabling deletes that file. Re-enabling requires re-entering the PAT.

The model validates:

- profile name: non-empty, no control characters;
- membership: `[profile:][workspace/]agent`, non-empty agent, no control characters;
- server URL: `http` or `https` with a host;
- PAT: non-empty and not obviously written into the server URL.

Invalid configuration leaves integration disabled and starts no installation.

### 2. Guest profile provisioner

Create a focused `MulticaGuestProvisioner` rather than spreading guest file details through UI code.

Its host-side path is derived from `PiRuntime.rootfsDir(context)`:

`root/.pi/agent/multica-pi-connector/profiles.json`

It writes an atomic temporary JSON file, applies POSIX mode `0600`, then atomically replaces the target. It never logs the JSON body or PAT. Disable removes the profile directory token file and leaves other connector seat metadata untouched unless it is Pient-managed.

The source JSON stays the connector profile schema:

```json
{
  "default": "selected-profile",
  "profiles": {
    "selected-profile": {
      "server_url": "https://example.invalid",
      "pat": "secret"
    }
  }
}
```

### 3. Pinned package lifecycle

Use the existing Pi package command surface; do not invoke npm directly from Kotlin.

Activation runs the Pi install command for the exact source:

`npm:@atoz-project/multica-pi-connector@0.10.0`

Then it reads `pi list` and requires the same source/version before startup. Floating version ranges and `latest` are invalid. Package installation can run in the existing dedicated terminal session so network progress and real package errors remain visible.

Disable does not uninstall a user's package automatically. It only stops passing `--multica` and removes Pient's token material. The settings screen offers an explicit uninstall action.

### 4. Pi RPC startup integration

Extend the existing startup API with an optional membership parameter. The runtime identity becomes:

`provider + model + active Multica membership`

A change to any component restarts Pi. The existing provider/model state type can remain unchanged for UI consumers; membership participates in the internal reuse key.

Because `PiRpc` ultimately launches through `/bin/sh -c`, all user-derived arguments are single-quoted with the POSIX escaping rule:

```
' → '"'"'
```

The same helper quotes provider, model, and membership. Membership syntax validation additionally rejects newlines and control characters. This closes both the new Multica injection path and the existing unquoted model/provider path.

Disabled mode continues to produce exactly the current command shape and does not install or load the connector.

### 5. Activation state machine

Model activation as an explicit asynchronous state machine:

1. `Disabled`
2. `ValidatingConfig`
3. `InstallingConnector`
4. `VerifyingPackage`
5. `WritingProfile`
6. `StartingPi`
7. `RuntimeActive`
8. terminal `Failed(reason)`

`RuntimeActive` means Pient started Pi with the selected membership; OPC-side online confirmation is still the external acceptance check. The UI must label this distinction honestly rather than inferring server registration from process existence alone.

Known connector stderr patterns can enrich diagnostics, but structured state must not depend solely on brittle log parsing. The primary local diagnostics are installation result, package identity, profile write result, process state, and the last non-secret connector error.

### 6. Compose settings and diagnostics

Add a Multica page under runtime/integration settings. It contains:

- enable/disable switch;
- profile, server, membership, and PAT fields;
- connector package/version/status;
- current activation phase;
- retry action;
- explicit package uninstall action;
- concise troubleshooting guidance.

The PAT field masks input by default and is cleared after successful profile materialization from UI state. Screens and localized strings never receive the token as a diagnostic label. Errors use categories, not raw exception text containing file contents.

### 7. Background and task lifecycle

Connector execution remains inside the one Pi RPC process. Pient does not create a second service. Existing `PiKeepAlive` continues to guard the process; connector heartbeats and task polling follow that process.

When Android or the user stops Pi, Pient marks local state disconnected and does not attempt an out-of-process connector loop. Restart follows the existing Pient runtime lifecycle and connector's own reconnect behavior. Stopping Multica integration calls the normal Pi stop path when a membership-triggered restart is needed.

## Security Design

- PAT entry is masked and retained only in the guest-owned `profiles.json` while enabled.
- The profile writer uses atomic replacement and mode `0600`.
- Application logs and log exports receive phase/category only, never profile JSON or PAT.
- Package source is a compile-time constant, not a user-entered command.
- All shell arguments are quoted and control-character validated.
- Disable removes token material and stops passing the membership.
- The release requires a low-privilege PAT and documents server-side revocation.
- Duplicate seat lock is surfaced as a connector failure; Pient never forces a second live membership.
- Connector has no explicit npm license metadata, so `0.2.0` must not bundle its source. First release uses user-initiated installation behind an experimental setting unless legal review requires a different route.

## Error Handling

| Failure | User result | System behavior |
| --- | --- | --- |
| Invalid config | Field-level guidance | No install, no profile write, no restart |
| Guest not ready | Ubuntu/Pi setup guidance | Remain disabled; local app usable |
| Package install fails | Show terminal output category | Stay in `InstallingConnector` failure |
| Wrong package version | Explain exact required source | Block activation |
| Profile write fails | Storage guidance | Do not start with stale credentials |
| Duplicate seat | Explain that membership is live elsewhere | Keep one Pi process |
| Network/credentials invalid | Non-secret connector guidance | Local Pi remains usable |
| Android kills process | Disconnected/restart guidance | Stop claiming; reconnect on next healthy start |
| Task cancelled | Console stop state | Connector aborts the Pi turn and acknowledges |

## Testing Strategy

### Unit tests

Add JVM tests for:

- membership parser and canonical formatting;
- URL/profile validation;
- profiles JSON generation without duplicate token stores;
- atomic profile writer and cleanup behavior;
- shell quoting, including apostrophe, whitespace, Unicode, and control-character rejection;
- package source pinning and `pi list` identity verification;
- disabled command equivalence;
- diagnostic redaction.

Use temporary directories for host-file tests. Add only the minimal JUnit dependency needed by the existing Gradle setup.

### Integration/build checks

- `./gradlew test`
- `./gradlew assembleDebug`
- `./gradlew assembleRelease` after signing configuration is available
- OpenSpec strict validation

### Manual device gate

On one arm64 Android 8+ device:

1. confirm disabled mode has no connector argument or network activity;
2. install exact connector version and write profile;
3. observe the expected seat online in OPC/Multica;
4. execute one project task;
5. execute one DM round trip;
6. background the app during task execution;
7. stop an active task;
8. disconnect/reconnect network;
9. attempt duplicate membership on another terminal;
10. disable integration and confirm ordinary chat/terminal behavior.

## Release / Rollout

1. Land disabled-by-default configuration and diagnostics.
2. Enable the experimental activation flow in internal builds.
3. Complete legal/supply-chain review.
4. Complete the device and console gate.
5. Bump to `versionName 0.2.0`, `versionCode 3`.
6. Build and sign arm64 APK.
7. Publish release notes with setup, PAT scope, background limitations, disable, and rollback.

Rollback is switching integration off. No migration is required because non-secret preferences remain and the PAT is intentionally discarded.

## Deferred Work

- Structured connector-to-host status events if connector maintainers expose them.
- A compliant in-repo connector fork if license or protocol stability is insufficient.
- Native Android `CapabilityBridge` and OpenMinis handler porting.
- iOS host support.
