## Context

The current `daily_stock_analysis` project uses a single file-based password (`.admin_password_hash`) to authenticate a single global admin user. As we move towards supporting multiple users managing independent stock portfolios and interacting via diverse bot platforms, we need a robust, database-backed authentication and authorization system. 

## Goals / Non-Goals

**Goals:**
- Implement a multi-tenant user system with RBAC (Role-Based Access Control).
- Replace the current file-based session authentication with a scalable JWT mechanism.
- Enforce strict data isolation for portfolios and bot interactions based on the logged-in user.
- Provide a seamless migration path for existing single-tenant data.

**Non-Goals:**
- Implementing OAuth2 (Google/GitHub login) or SSO is out of scope for this iteration.
- Complex, dynamic row-level permissions (we will stick to role-level access: Admin vs. User).

## Decisions

### 1. Database Schema for Auth & RBAC
**Decision**: Implement a structured schema with `User`, `Role`, and `UserSocialBinding` tables.
- `Role`: Stores roles (e.g., `admin`, `user`). `is_system=True` prevents deletion of core roles.
- `User`: Stores credentials, linked to `Role` via `role_id`.
- `UserSocialBinding`: Maps external platform IDs (e.g., Feishu/Telegram `user_id`) to the internal `User.id`, enabling cross-platform identity resolution.

**Alternatives Considered**:
- *Adding a string `role` field directly to `User`*: Rejected because having a dedicated `Role` table provides better extensibility if we later want to add `Permissions` or custom roles.

### 2. Password Hashing Algorithm
**Decision**: Use `passlib[bcrypt]` for password hashing.
- Standard, secure, and widely adopted in the FastAPI ecosystem.

### 3. Session & Authentication Mechanism
**Decision**: Migrate from custom HMAC-signed cookies to standard JWT (JSON Web Tokens) stored in HTTPOnly cookies.
- **Why**: JWTs can securely encode the `user_id` and `role`, reducing database lookups on every request while maintaining the security benefits of HTTPOnly/SameSite cookies against XSS and CSRF.

### 4. Data Migration Strategy
**Decision**: On system startup, run an automatic initialization script that:
1. Creates the default `admin` and `user` roles if they don't exist.
2. Checks if an `.admin_password_hash` exists and no users exist in the DB. If so, creates an initial `Admin` user with the existing password.
3. Finds all existing `PortfolioAccount` records where `owner_id` is null or string-based, and maps them to this initial `Admin` user to prevent data loss.

## Risks / Trade-offs

- **Risk: Disruption to Bot Webhooks**
  - *Mitigation*: Ensure `UserSocialBinding` lookup gracefully handles unknown users. Bots can either auto-register a "guest" user or prompt the user to link their account via the Web UI.
- **Risk: Breaking existing client sessions**
  - *Mitigation*: The change is inherently breaking for sessions. Users will be forced to log in again once deployed. This is acceptable for a major version bump.
- **Trade-off: SQLite Concurrency**
  - *Mitigation*: Adding auth checks might increase database read frequency. We will rely on JWT payloads for route-level authorization to minimize DB hits on every API call.

## Migration Plan

1. Create SQLAlchemy models and generate Alembic migrations (if Alembic is used, otherwise rely on `Base.metadata.create_all`).
2. Write a startup hook in `main.py` or `storage.py` to seed default roles and migrate the legacy admin account.
3. Update repository layers to filter by `owner_id`.
4. Deploy API changes.
5. Deploy Web Frontend updates.