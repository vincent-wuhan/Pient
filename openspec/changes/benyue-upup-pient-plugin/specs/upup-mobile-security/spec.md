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
