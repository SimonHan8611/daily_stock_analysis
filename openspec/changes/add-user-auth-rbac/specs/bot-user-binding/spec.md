## ADDED Requirements

### Requirement: Bot Platform User Resolution
The system SHALL map incoming bot requests (which contain platform-specific user IDs like Telegram ID) to internal system `User` records using the `UserSocialBinding` table.

#### Scenario: Existing Binding
- **WHEN** a bot command is received from a Telegram user ID that is already mapped in `UserSocialBinding`
- **THEN** the system executes the command under the context of the mapped internal `User`

#### Scenario: Unknown Bot User
- **WHEN** a bot command is received from an unknown platform user ID
- **THEN** the system MAY auto-register a "guest" user and bind them, OR prompt the user to link their account (depending on implementation configuration)