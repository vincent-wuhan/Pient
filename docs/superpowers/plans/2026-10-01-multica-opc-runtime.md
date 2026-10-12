---
change: multica-opc-runtime
design-doc: docs/superpowers/specs/2026-10-01-multica-opc-runtime-design.md
base-ref: e50f2cf35488a28c348f8e6f320ef668d4624849
---

# Pient Multica/OPC Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an opt-in Pient `0.2.0` Android runtime that joins OPC/Multica through the existing Pi process and executes project/DM tasks.

**Architecture:** Pient stores non-secret Multica preferences in app-private JSON, materializes a guest-only connector `profiles.json`, installs the exact Pi connector package, and passes a validated membership to the existing `PiRpc` process. Connector polling and task execution stay inside that one Pi process and existing foreground keepalive.

**Tech Stack:** Kotlin, Jetpack Compose, Android app-private storage, Pi guest shell/RPC, Pi npm packages, JUnit 4, Gradle.

**Spec:** `openspec/changes/multica-opc-runtime/specs/multica-runtime-integration/spec.md`; design: `docs/superpowers/specs/2026-10-01-multica-opc-runtime-design.md`.

## Global Constraints

- Connector source is exactly `npm:@atoz-project/multica-pi-connector@0.10.0`; no floating version.
- Pient remains the only resident agent runtime; no OpenMinis or second Pi/Multica process.
- No native phone sensitive capability APIs in this change.
- Disabled mode makes no connector installation, profile write, Multica network request, or `--multica` argument.
- PAT appears only in guest `profiles.json` while enabled; never in logs, diagnostics, exports, or UI labels.
- Guest profile target is `root/.pi/agent/multica-pi-connector/profiles.json`, atomically replaced with POSIX mode `0600`.
- Membership grammar is `[profile:][workspace/]agent`; control characters are rejected.
- Android minimum is API 26; release artifact is arm64-v8a.
- Do not bundle connector source until legal review permits it.
- Before build exit, run `./gradlew test`, `./gradlew assembleDebug`, and strict OpenSpec validation.

---

### Task 1: Configuration Model and JVM Test Foundation

**Files:**
- Modify: `app/build.gradle.kts`
- Create: `app/src/main/java/com/pient/app/data/MulticaConfig.kt`
- Create: `app/src/main/java/com/pient/app/data/MulticaConfigStore.kt`
- Test: `app/src/test/java/com/pient/app/data/MulticaConfigTest.kt`

**Interfaces:**
- `data class MulticaMembership(val profile: String?, val workspace: String?, val agent: String)`
- `data class MulticaPreferences(val enabled: Boolean, val profileName: String, val serverUrl: String, val membership: String, val tokenMaterialized: Boolean)`
- `MulticaMembership.parse(value: String): Result<MulticaMembership>`
- `MulticaPreferences.normalized(): Result<MulticaPreferences>`
- `MulticaConfigStore.load(context: Context): MulticaPreferences`
- `MulticaConfigStore.save(context: Context, preferences: MulticaPreferences): Boolean`
- `MulticaConfigStore.redacted(preferences: MulticaPreferences): String`

- [ ] **Step 1: Write failing parser and normalization tests**

Cover bare agent, `[profile:][workspace/]agent`, missing agent, malformed separators, line-feed/control rejection, blank profile, invalid `ftp://` URL, and valid Unicode membership. Assert a valid object round-trips through `normalized()`.

- [ ] **Step 2: Add JUnit and verify failure**

Add `testImplementation("junit:junit:4.13.2")`. Run `./gradlew test --tests 'com.pient.app.data.MulticaConfigTest'`; expected failure is unresolved `MulticaConfig`.

- [ ] **Step 3: Implement model and app-private store**

Use explicit membership segment parsing rather than a loose split-only regex. Reject `Char.isISOControl()`. Accept only `http`/`https` with nonblank host. Persist version, enabled, profile name, server URL, membership, and token-materialized marker to `files/pient_data/multica_config.json` with atomic `.tmp` replacement. `redacted()` never accepts a PAT and returns only non-secret fields.

- [ ] **Step 4: Verify focused behavior**

Run the Task 1 focused test; expected result is pass.

- [ ] **Step 5: Commit**

```bash
git add app/build.gradle.kts app/src/main/java/com/pient/app/data/MulticaConfig.kt app/src/main/java/com/pient/app/data/MulticaConfigStore.kt app/src/test/java/com/pient/app/data/MulticaConfigTest.kt
git commit -m "feat: add multica configuration model"
```

### Task 2: Guest Profile Provisioner

**Files:**
- Create: `app/src/main/java/com/pient/app/data/MulticaProfileWriter.kt`
- Test: `app/src/test/java/com/pient/app/data/MulticaProfileWriterTest.kt`

**Interfaces:**
- `data class MulticaProfileDocument(val default: String, val serverUrl: String)`
- `MulticaProfileDocument.encode(pat: String): String`
- `MulticaProfileWriter.write(target: File, json: String, chmod: (File, Int) -> Unit): Boolean`
- `MulticaGuestProvisioner.profileFile(context: Context): File`
- `MulticaGuestProvisioner.write(context: Context, preferences: MulticaPreferences, pat: String): Boolean`
- `MulticaGuestProvisioner.clear(context: Context): Boolean`

- [ ] **Step 1: Write failing profile tests**

Assert exact connector JSON shape, atomic replacement of stale content, `0600` permission callback, and cleanup of `profiles.json.tmp` when chmod/rename fails.

- [ ] **Step 2: Verify failure**

Run `./gradlew test --tests 'com.pient.app.data.MulticaProfileWriterTest'`; expected failure is unresolved writer.

- [ ] **Step 3: Implement atomic writer**

Write to a sibling temporary file, call injectable `chmod(tmp, 0600)`, atomically rename, and delete temp on failure. Default chmod uses `android.system.Os.chmod`. Derive target from `PiRuntime.rootfsDir(context)`. `write` validates enabled preferences and marks token materialized only after success. `clear` deletes only this managed token file and preserves non-secret preferences with `tokenMaterialized = false`.

- [ ] **Step 4: Verify focused behavior**

Run the Task 2 focused test; expected result is pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/com/pient/app/data/MulticaProfileWriter.kt app/src/test/java/com/pient/app/data/MulticaProfileWriterTest.kt
git commit -m "feat: provision multica connector profile"
```

### Task 3: Exact Connector Package Lifecycle

**Files:**
- Create: `app/src/main/java/com/pient/app/runtime/MulticaPackageCoordinator.kt`
- Test: `app/src/test/java/com/pient/app/runtime/MulticaPackageCoordinatorTest.kt`
- Modify: `app/build.gradle.kts` only if coroutine test support is absent.

**Interfaces:**
- `const val MULTICA_CONNECTOR_SOURCE = "npm:@atoz-project/multica-pi-connector@0.10.0"`
- `fun interface PiPackageRunner { suspend fun run(args: String): Pair<Int, String> }`
- `sealed class MulticaPackageResult` with `Installed`, `AlreadyInstalled`, and `Failure(stage: String, output: String)`
- `MulticaPackageCoordinator(runner).ensureInstalled(): MulticaPackageResult`
- `MulticaPackageCoordinator(runner).isInstalled(): Boolean`

- [ ] **Step 1: Write failing package tests**

Use a fake runner to verify install command, exact `list` identity, `AlreadyInstalled`, wrong-version rejection, install failure, and no `list` call after nonzero install.

- [ ] **Step 2: Verify failure**

Run `./gradlew test --tests 'com.pient.app.runtime.MulticaPackageCoordinatorTest'`; expected failure is unresolved coordinator.

- [ ] **Step 3: Implement pinned lifecycle**

Strip ANSI output and require the exact source token. Production adapter delegates to `PiPackages.runPi(context, args, 180_000)`. Source is compile-time constant and never user input.

- [ ] **Step 4: Verify focused behavior**

Run the Task 3 focused test; expected result is pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/com/pient/app/runtime/MulticaPackageCoordinator.kt app/src/test/java/com/pient/app/runtime/MulticaPackageCoordinatorTest.kt app/build.gradle.kts
git commit -m "feat: pin multica connector package"
```

### Task 4: Safe Pi RPC Membership Startup

**Files:**
- Create: `app/src/main/java/com/pient/app/runtime/ShellArguments.kt`
- Modify: `app/src/main/java/com/pient/app/runtime/PiRpc.kt`
- Test: `app/src/test/java/com/pient/app/runtime/ShellArgumentsTest.kt`
- Test: `app/src/test/java/com/pient/app/runtime/PiRpcCommandTest.kt`

**Interfaces:**
- `ShellArguments.quote(value: String): String`
- `ShellArguments.isSafeArgument(value: String): Boolean`
- `PiRpc.buildStartCommand(provider: String, model: String, multicaMembership: String?): String`
- `PiRpc.start(provider: String, model: String, multicaMembership: String? = null): Boolean`

- [ ] **Step 1: Write failing shell and command tests**

Cover spaces, apostrophes, Unicode, all ISO control characters, disabled command equivalence, and appended membership. Expected exact disabled command is `exec pi --mode rpc --provider 'openai' --model 'openai/gpt-4.1'`; enabled command ends with `--multica 'prod:研发/phone'`.

- [ ] **Step 2: Verify failure**

Run both focused test classes; expected failure is unresolved helper/builder.

- [ ] **Step 3: Implement safe startup**

Quote provider, model, and membership using POSIX single-quote escaping. Build an internal restart key from provider, model, and membership while preserving existing `Running(provider, model)` UI state. Reject unsafe/unparsable membership before launch. Default `null` keeps existing call sites compiling and disabled behavior unchanged.

- [ ] **Step 4: Verify focused behavior**

Run both Task 4 test classes; expected result is pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/com/pient/app/runtime/ShellArguments.kt app/src/main/java/com/pient/app/runtime/PiRpc.kt app/src/test/java/com/pient/app/runtime/ShellArgumentsTest.kt app/src/test/java/com/pient/app/runtime/PiRpcCommandTest.kt
git commit -m "feat: pass multica membership safely to pi"
```

### Task 5: Activation Controller and Runtime Wiring

**Files:**
- Create: `app/src/main/java/com/pient/app/runtime/MulticaRuntimeController.kt`
- Modify: the existing startup call site that invokes `PiRpc.start`
- Test: `app/src/test/java/com/pient/app/runtime/MulticaRuntimeControllerTest.kt`

**Interfaces:**
- `enum class MulticaRuntimePhase { DISABLED, VALIDATING, INSTALLING, VERIFYING, WRITING_PROFILE, STARTING_PI, ACTIVE, FAILED }`
- `data class MulticaRuntimeStatus(val phase: MulticaRuntimePhase, val diagnostic: MulticaDiagnostic)`
- Secret-free `MulticaDiagnostic` variants for config, guest, package, profile, runtime, duplicate seat, and disconnected state
- `MulticaRuntimeController.enable(preferences, pat): Result<MulticaRuntimeStatus>`
- `MulticaRuntimeController.disable(): Boolean`
- `MulticaRuntimeController.status(): MulticaRuntimeStatus`

- [ ] **Step 1: Write failing orchestration tests**

Use fake package/profile/Pi collaborators. Verify success order, invalid-config short circuit, distinct package/profile/runtime failures, disable clears token without uninstalling package, and ordinary startup does not install when token state is already valid.

- [ ] **Step 2: Verify failure**

Run `./gradlew test --tests 'com.pient.app.runtime.MulticaRuntimeControllerTest'`; expected failure is unresolved controller.

- [ ] **Step 3: Implement controller and startup wiring**

Keep orchestration outside Compose. Enable validates, installs/verifies, writes profile, then starts Pi with membership. Normal startup passes saved membership only when enabled and token materialized. Membership change participates in Task 4 restart identity.

- [ ] **Step 4: Verify focused behavior**

Run the Task 5 focused test; expected result is pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/com/pient/app/runtime/MulticaRuntimeController.kt app/src/test/java/com/pient/app/runtime/MulticaRuntimeControllerTest.kt
git commit -m "feat: orchestrate multica runtime activation"
```

### Task 6: Settings UI, Localization, and Documentation

**Files:**
- Create: `app/src/main/java/com/pient/app/ui/settings/MulticaSettingsScreen.kt`
- Modify: `app/src/main/java/com/pient/app/ui/settings/SettingsScreen.kt`
- Modify: `app/src/main/java/com/pient/app/MainActivity.kt`
- Modify every concrete settings strings file under `app/src/main/java/com/pient/app/data/i18n/`
- Create: `docs/multica-runtime.md`

**Interfaces:**
- Consumes Task 1 store and Task 5 controller.
- Produces `@Composable fun MulticaSettingsScreen(onBack: () -> Unit)`.
- Produces settings labels and status text in all eight supported languages.

- [ ] **Step 1: Extend strings interfaces**

Add title, subtitle, enable, profile, server, membership, PAT, package status, runtime status, retry, disable, uninstall connector, and setup guidance to `SettingsStrings` and every concrete language object.

- [ ] **Step 2: Add settings navigation**

Follow existing row and route patterns. Put Multica in the runtime/integration group and preserve neighboring back behavior.

- [ ] **Step 3: Build screen**

PAT uses `PasswordVisualTransformation`, clears from UI state after activation, and never appears in diagnostics. Display local runtime state honestly as `Runtime active locally; confirm seat status in OPC/Multica`. Provide retry, disable, and explicit package uninstall.

- [ ] **Step 4: Write user documentation**

Document experimental status, connector `0.10.0`, low-privilege PAT, membership examples, background limits, duplicate seat, phase troubleshooting, disable, token revocation, rollback, and excluded native capabilities.

- [ ] **Step 5: Validate UI build**

Run `./gradlew test`, `./gradlew assembleDebug`, and strict OpenSpec validation. Inspect all language implementations for missing overrides.

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/com/pient/app docs/multica-runtime.md
git commit -m "feat: add multica runtime settings"
```

### Task 7: Baseline Evidence, Legal Gate, and Device Validation

**Files:**
- Create: `docs/superpowers/reports/2026-10-01-multica-opc-runtime-validation.md`
- Modify: `openspec/changes/multica-opc-runtime/tasks.md`

**Interfaces:**
- Consumes OPC project `Pient Multica Runtime`, squad `pient-runtime`, parent issue `BENY-536`, and child issues `BENY-537`–`BENY-542`.
- Produces evidence needed to check OpenSpec tasks `1.1`–`5.5`.

- [ ] **Step 1: Capture connector baseline**

Record npm integrity/shasum, tarball SHA-256, source inventory, license finding, profiles schema, and five `multica_*` tool names.

- [ ] **Step 2: Make exact legal/supply-chain decision**

Record only one outcome: `user-install-approved`, `release-blocked`, or `fork-approved`. Only `user-install-approved` permits experimental activation in `0.2.0`; `fork-approved` requires a new change.

- [ ] **Step 3: Run arm64 device/OPC gate**

On Android 8+ arm64, record disabled startup, exact install, seat online, one project task, one DM round trip, background execution, task stop, reconnect, duplicate-seat rejection, clean disable, unchanged local behavior, and test/build results. Link evidence to `BENY-537`–`BENY-541`.

- [ ] **Step 4: Update OpenSpec tasks**

Check `1.1`–`5.5` only with direct evidence. Leave release tasks unchecked.

- [ ] **Step 5: Commit evidence**

```bash
git add docs/superpowers/reports/2026-10-01-multica-opc-runtime-validation.md openspec/changes/multica-opc-runtime/tasks.md
git commit -m "test: validate multica runtime integration"
```

### Task 8: Release Candidate

**Files:**
- Modify: `app/build.gradle.kts`
- Modify: `README.md`, `README.en.md`, and `docs/multica-runtime.md`
- Modify: `docs/superpowers/reports/2026-10-01-multica-opc-runtime-validation.md`
- Modify: `openspec/changes/multica-opc-runtime/tasks.md`

**Interfaces:**
- Produces Android `versionName "0.2.0"`, `versionCode 3`, bilingual release notes, and signed arm64 APK.

- [ ] **Step 1: Bump metadata**

Set exactly `versionCode = 3` and `versionName = "0.2.0"`.

- [ ] **Step 2: Update release documentation**

Document experimental setup, connector distribution decision, security expectations, Android requirements, validation evidence, and rollback.

- [ ] **Step 3: Run full release verification**

Run `./gradlew test`, `./gradlew assembleDebug`, `./gradlew assembleRelease`, and strict OpenSpec validation. Record APK path, SHA-256, and signing status.

- [ ] **Step 4: Complete remaining tasks**

Check `6.1`–`6.4` only after legal decision, docs, version bump, build/sign, and publication readiness pass.

- [ ] **Step 5: Commit release candidate**

```bash
git add app/build.gradle.kts README.md README.en.md docs/multica-runtime.md docs/superpowers/reports/2026-10-01-multica-opc-runtime-validation.md openspec/changes/multica-opc-runtime/tasks.md
git commit -m "chore: prepare pient 0.2.0 release candidate"
```

## Plan Self-Review

- Spec coverage: configuration, exact package identity, credential handling, one-seat lifecycle, project/DM execution, diagnostics, release, and rollback map to Tasks 1–8.
- Type consistency: model, profile, package, controller, and UI names are stable across tasks.
- Scope: native phone capabilities and connector fork work are excluded; a fork requires a new legal decision and separate change.
