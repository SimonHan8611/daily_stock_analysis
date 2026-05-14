## MODIFIED Requirements

### Requirement: Portfolio Account Isolation
The system SHALL ensure that users can only view, create, update, or delete `PortfolioAccount` records that belong to them.

#### Scenario: View Portfolios
- **WHEN** an authenticated user requests the list of their portfolio accounts
- **THEN** the system only returns accounts where `owner_id` matches the user's internal `User.id`

#### Scenario: Unauthorized Access Attempt
- **WHEN** an authenticated user attempts to read or modify a portfolio account belonging to a different `User.id`
- **THEN** the system returns a 404 Not Found or 403 Forbidden error