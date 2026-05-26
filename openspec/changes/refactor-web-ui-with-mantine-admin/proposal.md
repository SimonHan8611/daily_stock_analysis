## Why

The current Web UI has grown into several business-heavy pages with a custom Tailwind component layer, which makes visual consistency and future interaction changes costly. Refactoring the Web app toward a Mantine Admin-style interface can improve maintainability, dashboard ergonomics, and desktop packaging confidence without changing the core analysis workflow.

## What Changes

- Introduce Mantine as the primary Web UI component system in `apps/dsa-web`, including provider setup, theme tokens, color scheme handling, notifications, and common layout primitives.
- Rebuild the application shell around a Mantine Admin-style dashboard layout while preserving the current routes, authentication flow, API clients, Zustand stores, and business hooks.
- Replace custom common UI components incrementally with Mantine-backed implementations, keeping existing component exports where practical to reduce page-level churn.
- Migrate major Web pages in controlled phases: settings first, then portfolio and backtest pages, then the home analysis dashboard, report presentation, and chat page.
- Keep Electron desktop integration compatible with the Web build output and include desktop build validation in the migration plan.
- Do not migrate the app to Next.js as part of this change. Mantine Admin is used as a design and interaction reference, not as a full framework replacement.
- Do not change backend APIs, report payload contracts, task lifecycle semantics, authentication semantics, or data source behavior unless a page migration exposes an existing bug that must be fixed.

## Capabilities

### New Capabilities

- `web-ui-mantine-admin`: Defines the expected Web UI structure, Mantine-based component system, dashboard layout behavior, page migration boundaries, and validation requirements for the Mantine Admin-style refactor.

### Modified Capabilities

None. There are no existing main OpenSpec capability specs in `openspec/specs/`, and this change is intended to preserve current product behavior while replacing the Web UI implementation and visual system.

## Impact

- **Web app**: `apps/dsa-web` dependencies, provider setup, global styles, theme handling, layout components, common components, page components, tests, and Playwright smoke coverage.
- **Desktop app**: `apps/dsa-desktop` remains structurally unchanged but must continue consuming the Web build output successfully.
- **Documentation**: User-visible UI and workflow changes require updates to relevant `docs/*.md` files and `docs/CHANGELOG.md`; README should only be updated if the top-level product positioning or quick start changes.
- **CI and validation**: Web lint/build/test coverage remains required. Desktop build validation is required when the Web build output or desktop packaging assumptions are affected.
- **Dependencies**: Adds Mantine packages and possibly related first-party Mantine utilities. Existing Tailwind usage may remain temporarily during migration but should no longer be the primary UI composition layer once the refactor is complete.
