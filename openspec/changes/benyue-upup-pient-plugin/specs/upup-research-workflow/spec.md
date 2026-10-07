## ADDED Requirements

### Requirement: UpUp research skill
The plugin SHALL provide an `upup-research` skill that guides Pi through clarification, data collection, assumption, verification, risk, and reporting phases.

#### Scenario: User requests investment research
- **WHEN** Pi activates the skill for an investment question
- **THEN** the skill instructs Pi to identify market, symbol, time horizon, currency, risk tolerance, and missing evidence before drawing conclusions

#### Scenario: Required data cannot be retrieved
- **WHEN** investment tools fail or lack credentials
- **THEN** the skill requires Pi to report the evidence gap and avoid presenting inferred values as provider data

### Requirement: Evidence-grounded synthesis
The research workflow MUST distinguish provider data, deterministic calculations, and model inference, and MUST cite the tool evidence used for material claims.

#### Scenario: Research report is produced
- **WHEN** Pi completes an UpUp research workflow
- **THEN** the report separates data, analysis, risks, valuation assumptions, and follow-up actions and identifies figures that were unavailable

#### Scenario: Calculations drive a conclusion
- **WHEN** valuation or screening output supports a conclusion
- **THEN** the report names the calculation method and material assumptions rather than presenting the result as market truth

### Requirement: Mobile research scope
The workflow SHALL operate within a single Pi turn or normal Pi tool-use loop and MUST NOT spawn an UpUp workflow engine, background job, worker pool, browser, or second model agent.

#### Scenario: Research workflow runs on mobile
- **WHEN** the user performs UpUp-style research in Pient
- **THEN** only Pi performs planning and synthesis while plugin tools supply bounded evidence and calculations
