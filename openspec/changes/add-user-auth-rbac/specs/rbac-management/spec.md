## ADDED Requirements

### Requirement: Role Definitions
The system SHALL maintain a `Role` table with at least two default system roles: `admin` and `user`. System roles MUST NOT be deletable.

#### Scenario: Prevent Deletion of System Roles
- **WHEN** an administrator attempts to delete the `admin` or `user` role
- **THEN** the system blocks the deletion and returns an error because `is_system` is True

### Requirement: Role-Based Route Protection
The system SHALL provide a middleware or dependency injection mechanism to restrict API endpoints based on the JWT payload's role.

#### Scenario: Admin Access Only
- **WHEN** a user with the `user` role attempts to access an endpoint protected by `@require_role('admin')`
- **THEN** the system returns a 403 Forbidden error

#### Scenario: Valid Access
- **WHEN** a user with the `admin` role attempts to access the same endpoint
- **THEN** the system allows the request to proceed