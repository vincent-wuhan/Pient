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
