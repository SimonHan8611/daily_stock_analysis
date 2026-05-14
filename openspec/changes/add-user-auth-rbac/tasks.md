## 1. Database Layer (Models & Migration)

- [x] 1.1 Add `Role`, `User`, and `UserSocialBinding` models to `src/storage.py`
- [x] 1.2 Update `PortfolioAccount` model to add `owner_id` (ForeignKey to `users.id`)
- [x] 1.3 Create startup migration logic in `src/storage.py` (or a dedicated init script) to auto-create default `admin` and `user` roles
- [x] 1.4 Add migration logic to detect legacy `.admin_password_hash`, create the first `Admin` user, and assign existing `PortfolioAccount` records to this user

## 2. Authentication & Middleware

- [x] 2.1 Add `passlib[bcrypt]` and `PyJWT` to `requirements.txt`
- [x] 2.2 Create `src/services/auth_service.py` with password hashing, verification, and JWT generation logic
- [x] 2.3 Refactor `api/middlewares/auth.py` (`AuthMiddleware`) to validate JWT from cookies and inject `user_id` and `role` into `request.state`
- [x] 2.4 Create a `@require_role` dependency/decorator for FastAPI routes

## 3. API Endpoints

- [x] 3.1 Implement `POST /api/v1/auth/register` for new user registration
- [x] 3.2 Update `POST /api/v1/auth/login` to verify credentials against the DB and set JWT HTTPOnly cookie
- [x] 3.3 Implement `GET /api/v1/auth/me` to return current user info and role
- [x] 3.4 Update `POST /api/v1/auth/logout` to clear the JWT cookie

## 4. Data Isolation (Repositories & Bot)

- [x] 4.1 Update `src/repositories/portfolio_repo.py` to enforce `owner_id` filtering on all CRUD operations
- [x] 4.2 Apply `@require_role('admin')` to system configuration endpoints (`api/v1/endpoints/config.py` or `api/v1/endpoints/system_config.py`)
- [x] 4.3 Update bot dispatcher (`bot/dispatcher.py`) to lookup or auto-bind `UserSocialBinding` records before executing commands

## 5. Frontend UI (Web)

- [x] 5.1 Replace the existing single-password login screen with a standard Registration and Login form (`apps/dsa-web/src/pages/Login.tsx`)
- [x] 5.2 Update frontend state management to store and use user info from `/api/v1/auth/me`
- [x] 5.3 Hide or disable the "System Settings" menu item for non-admin users
- [x] 5.4 Create a basic "User Management" page (Admin only) to view registered users and toggle `is_active` status
