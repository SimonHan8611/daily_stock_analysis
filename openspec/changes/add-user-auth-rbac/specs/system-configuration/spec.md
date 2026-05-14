## MODIFIED Requirements

### Requirement: Global System Configuration Access

The system SHALL restrict access to ALL global system configurations (e.g., LLM settings, API Keys, Data Provider settings, webhook URLs) to users with the `admin` role exclusively. The system configuration is shared globally across all tenants (Scheme 1 approach).

#### Scenario: Unauthorized Config Access

- **WHEN** a user with the `user` role attempts to fetch or update system settings
- **THEN** the system denies access with a 403 Forbidden error

#### Scenario: Admin Config Update

- **WHEN** a user with the `admin` role updates the system settings
- **THEN** the settings are successfully updated and applied globally to the application instance
