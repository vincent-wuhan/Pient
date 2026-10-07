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
