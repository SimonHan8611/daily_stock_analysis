## ADDED Requirements

### Requirement: User Registration
The system SHALL allow new users to register by providing a unique username, email, and password. The password MUST be hashed using bcrypt before storage.

#### Scenario: Successful Registration
- **WHEN** a user submits valid registration details
- **THEN** a new `User` record is created with `is_active=True` and assigned the default `user` role, and a success response is returned

#### Scenario: Duplicate Username Registration
- **WHEN** a user submits a registration with a username that already exists
- **THEN** the system returns a 400 Bad Request error indicating the username is taken

### Requirement: User Login and Session
The system SHALL allow users to log in using their username and password. Upon successful authentication, the system MUST issue a JWT stored in an HTTPOnly cookie.

#### Scenario: Successful Login
- **WHEN** a user submits correct login credentials
- **THEN** the system validates the password hash, issues a JWT containing `user_id` and `role`, and sets it as an HTTPOnly cookie

#### Scenario: Invalid Login
- **WHEN** a user submits an incorrect password or non-existent username
- **THEN** the system returns a 401 Unauthorized error and no cookie is set

### Requirement: Initial Admin Setup
The system SHALL automatically create an initial `Admin` user during startup if no users exist in the database but a legacy `.admin_password_hash` file is present.

#### Scenario: System Bootstrap with Legacy Password
- **WHEN** the system starts, has 0 users, and finds `.admin_password_hash`
- **THEN** it creates an `admin` role and an `Admin` user, migrating the legacy password hash, and associates legacy records with this Admin
