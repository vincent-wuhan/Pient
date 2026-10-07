## ADDED Requirements

### Requirement: Market snapshot tool
The plugin SHALL register `upup_market_snapshot` to return bounded quote and index data for a limited list of A-share, Hong Kong, and United States symbols.

#### Scenario: User requests a small symbol set
- **WHEN** Pi calls the tool with valid symbols
- **THEN** the result identifies each symbol, market, price, change, source, timestamp, and data-quality limitation within the output budget

#### Scenario: Provider request fails
- **WHEN** the upstream request times out or returns an invalid payload
- **THEN** the tool returns a structured failure that names the provider and suggests credential or network checks without exposing the credential

### Requirement: Stock news tool
The plugin SHALL register `upup_stock_news` to return a bounded, reverse-chronological set of recent news items for one supported symbol.

#### Scenario: News is available
- **WHEN** Pi calls the tool with a valid symbol and result limit
- **THEN** the tool returns at most the requested number of items with title, date, source, URL when available, and no full-article content

#### Scenario: No news is available
- **WHEN** the provider returns an empty valid result
- **THEN** the tool reports zero items rather than synthesizing news

### Requirement: Financial summary tool
The plugin SHALL register `upup_financial_summary` to return core reporting-period indicators for a supported company.

#### Scenario: Fundamentals are available
- **WHEN** Pi requests a valid company identifier
- **THEN** the tool returns reporting period, revenue, profit, margin, valuation-related indicators, units, currency, and source limitations

#### Scenario: Required credential is absent
- **WHEN** no supported data-provider credential is configured
- **THEN** the tool fails closed with setup guidance and does not return placeholder financial values

### Requirement: Stock screening tool
The plugin SHALL register `upup_screen_stocks` to run a bounded preset screen over a fetched fundamental dataset.

#### Scenario: Screen matches candidates
- **WHEN** Pi requests a supported preset and maximum result count
- **THEN** the tool returns deterministic ranked candidates with the matching metric values and screen assumptions

#### Scenario: Screen has too many candidates
- **WHEN** more candidates match than the requested maximum
- **THEN** the tool truncates the list, reports the total match count, and identifies the ranking rule

### Requirement: Valuation calculator tool
The plugin SHALL register `upup_valuation_calculator` to perform deterministic DCF, multiple-based, peer-comparison, and sensitivity calculations locally.

#### Scenario: Valid valuation inputs are supplied
- **WHEN** Pi calls the calculator with numeric assumptions inside supported ranges
- **THEN** the tool returns calculations, formulas, assumptions, limitations, and sensitivity rows without a network request

#### Scenario: Inputs are unsafe or non-finite
- **WHEN** parameters fall outside declared bounds or produce non-finite intermediate values
- **THEN** schema validation or local calculation rejects the request with an actionable error

### Requirement: Mobile-safe tool execution
Every UpUp investment tool MUST be read-only and apply input validation, HTTPS endpoint allowlisting, cancellation, timeout, bounded concurrency, result truncation, and secret-free errors.

#### Scenario: Long-running call is cancelled
- **WHEN** Pi cancels a tool execution
- **THEN** the plugin stops propagating cancellation to the fetch layer and returns no partial result as a successful payload

#### Scenario: Provider output is very large
- **WHEN** normalized output exceeds the documented budget
- **THEN** the tool truncates the payload and reports that truncation occurred
