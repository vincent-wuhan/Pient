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
