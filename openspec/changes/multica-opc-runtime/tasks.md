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
