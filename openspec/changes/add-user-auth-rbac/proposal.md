## Why

The current system relies on a single global administrator password stored in a local file (`.admin_password_hash`). This limits the system to single-user or fully-trusted team scenarios. As the application grows to support multiple portfolios, personalized stock analysis, and diverse bot interactions, there is a clear need for a multi-user architecture. Implementing a robust Role-Based Access Control (RBAC) and user authentication system will enable data isolation, personalized settings, and secure multi-user collaboration across both Web and Bot interfaces.

## What Changes

- **Database Schema Expansion**: Introduce new ORM models (`User`, `Role`, `UserSocialBinding`) to manage user identities, role-based permissions, and mappings between internal users and external bot platforms (e.g., Telegram, Feishu).
- **Authentication Replacement**: **[BREAKING]** Deprecate the single-password file-based authentication. Implement a standard JWT/Session-based authentication system backed by the database using secure password hashing (bcrypt).
- **API Endpoints**: Add new authentication endpoints for user registration, login, and profile management (`/api/v1/auth/register`, `/api/v1/auth/login`).
- **Data Isolation**: **[BREAKING]** Update existing business models (e.g., `PortfolioAccount`, `AnalysisHistory`) to reference `User.id` as foreign keys, ensuring strict data isolation between tenants.
- **Frontend Refactoring**: Replace the single-password login screen with standard Login/Registration pages. Add a User Management dashboard for Administrators.

## Capabilities

### New Capabilities

- `user-authentication`: Registration, DB-backed login, password hashing, and session management.
- `rbac-management`: Role definition (e.g., Admin, User), role assignment, and API route protection based on roles.
- `bot-user-binding`: Mechanism to link external platform user IDs (Telegram/Feishu) to internal system users for unified data access.

### Modified Capabilities

- `portfolio-management`: Must enforce data isolation based on the authenticated user. Users should only see and manage their own portfolios.
- `system-configuration`: Must be restricted exclusively to the `Admin` role.

## Impact

- **Database**: Requires schema migrations (adding new tables and updating foreign keys on existing tables). Existing single-user data will need a migration path to be assigned to a default "admin" user.
- **API Layer**: The `AuthMiddleware` and dependency injection (`get_current_user`) will be heavily modified to read from the DB.
- **Bot Layer**: Bot dispatchers will need to verify or create `UserSocialBinding` records upon receiving commands to correctly attribute actions.
- **Web App**: Major UI updates to the authentication flow and the addition of admin-only settings views.
