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
- Should the first public release expose the integration immediately or hide it behind an advanced/experimental setting?
- If connector licensing cannot be cleared in time, should the release use a minimal in-repo fork or postpone activation until replacement code is available?
