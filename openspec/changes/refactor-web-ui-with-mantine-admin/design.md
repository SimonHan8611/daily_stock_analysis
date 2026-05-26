## Context

`apps/dsa-web` is a Vite React application using React Router, Zustand, Tailwind CSS, custom CSS tokens, `next-themes`, Recharts, Vitest, and Playwright. Its UI is already split into layout, common, dashboard, settings, report, history, task, and page modules, but many visual rules live in custom Tailwind classes and global CSS variables. The Electron desktop app in `apps/dsa-desktop` is thin and depends on the Web build output, so a Web UI refactor must preserve build behavior and packaged desktop assumptions.

The reference project, Mantine Admin, is a Next.js and Mantine-based admin template. This change uses its Mantine dashboard conventions as a design reference while keeping the current Vite application architecture.

## Goals / Non-Goals

**Goals:**

- Establish Mantine as the primary UI system for the Web app.
- Preserve current routes, API clients, auth semantics, Zustand stores, business hooks, report payload handling, and task lifecycle behavior.
- Replace the app shell and common component layer before migrating high-risk business pages.
- Keep migration incremental so each phase can be validated independently.
- Maintain dark/light theme support and desktop build compatibility.
- Reduce long-term UI drift by centralizing visual decisions in a Mantine theme and a smaller compatibility layer.

**Non-Goals:**

- Migrating from Vite to Next.js.
- Replacing React Router, Zustand, Recharts, or the existing API layer.
- Redesigning backend APIs, report schemas, authentication rules, task streaming semantics, or data source fallback logic.
- Introducing React Query, React Hook Form, or Zod as part of this UI refactor unless a later change explicitly scopes those migrations.
- Performing broad business workflow redesign outside of the current page behavior.

## Decisions

### 1. Keep Vite and React Router

**Decision**: Keep the current Vite React application and React Router route structure.

**Rationale**: The current app is a client-side dashboard consumed by both browsers and the Electron shell. Next.js would introduce a new routing model, build output shape, and deployment assumptions without a clear product need for SSR.

**Alternatives Considered**:

- **Full migration to Mantine Admin / Next.js**: Rejected because it would couple UI refresh work to framework migration, desktop packaging changes, CI changes, and route rewrites.
- **Create a parallel Mantine app**: Rejected because it would duplicate API integration, auth handling, stores, and tests.

### 2. Use Mantine as the primary UI layer with a compatibility bridge

**Decision**: Add Mantine providers and theme configuration, then implement existing common component exports with Mantine-backed internals where practical.

**Rationale**: Keeping exports such as `Button`, `Input`, `Drawer`, `ConfirmDialog`, `Select`, `Tooltip`, and `Pagination` reduces page churn and allows high-risk pages to migrate gradually.

**Alternatives Considered**:

- **Direct page-by-page replacement without a bridge**: Rejected because it would force large page diffs and make regressions harder to isolate.
- **Keep Tailwind as the primary system and only add Mantine widgets**: Rejected because it would preserve the current source of visual drift.

### 3. Centralize theme semantics in Mantine

**Decision**: Create a dedicated Mantine theme module and map essential existing tokens into Mantine colors, spacing, radius, shadows, font family, component defaults, and color scheme handling.

**Rationale**: The current `index.css` contains many domain and page-specific variables. Mantine should become the primary source for new layout and component styling while legacy CSS tokens remain only as migration support.

**Alternatives Considered**:

- **Delete all Tailwind/global tokens up front**: Rejected because many existing components still depend on them.
- **Keep independent Mantine and Tailwind themes indefinitely**: Rejected because it would create two competing design systems.

### 4. Migrate from low-risk pages to high-risk pages

**Decision**: Migrate in this order: provider/theme infrastructure, app shell/navigation, common components, settings page, portfolio page, backtest page, home dashboard/report modules, chat page, cleanup.

**Rationale**: Settings, portfolio, and backtest pages are easier to verify than the home dashboard, which combines stock search, task stream lifecycle, history selection, report rendering, and follow-up chat entry points.

**Alternatives Considered**:

- **Start with HomePage**: Rejected because it has the highest state density and regression risk.
- **Start with LoginPage only**: Rejected as too narrow to validate the dashboard shell and common component strategy.

### 5. Preserve behavior and contracts during UI migration

**Decision**: UI migration must not change API endpoints, payload shapes, route paths, auth redirect semantics, report language handling, stock autocomplete behavior, task stream behavior, or desktop build assumptions.

**Rationale**: This keeps the refactor reviewable and prevents visual work from masking product behavior changes.

**Alternatives Considered**:

- **Bundle workflow improvements with the UI refactor**: Rejected because those changes deserve separate specs and tests.

## Risks / Trade-offs

- **Risk: Mantine and Tailwind styles conflict during migration** -> Mitigation: Introduce Mantine providers first, keep legacy CSS tokens for existing components, and move common components behind stable exports before broad page rewrites.
- **Risk: Theme behavior regresses** -> Mitigation: Define a single color scheme bridge between `next-themes` or its replacement and Mantine, then add tests for theme bootstrapping and visible tokens.
- **Risk: Home dashboard regressions** -> Mitigation: Defer HomePage until shell and common components are stable, then migrate report, history, task panel, and search areas in smaller commits.
- **Risk: Desktop packaging breaks** -> Mitigation: Keep Vite output shape compatible and run desktop build validation after Web build-sensitive changes.
- **Risk: Bundle size increases** -> Mitigation: Import Mantine packages directly, avoid duplicating icon systems where possible, and run production build checks before completion.
- **Risk: Visual inconsistency remains if legacy CSS is never removed** -> Mitigation: Track cleanup tasks for retiring unused Tailwind utilities and page-specific tokens after page migrations are complete.

## Migration Plan

1. Add Mantine dependencies and provider setup in `apps/dsa-web`.
2. Create a Mantine theme module that maps the product palette, typography, radius, shadows, focus states, and component defaults.
3. Rebuild `Shell`, `SidebarNav`, `ShellHeader`, and theme controls around Mantine `AppShell`, responsive navigation, and color scheme support.
4. Replace common UI components with Mantine-backed implementations while preserving import paths.
5. Migrate pages in the agreed order, updating tests alongside each page.
6. Remove unused Tailwind-only helpers and CSS tokens after no migrated component depends on them.
7. Validate with Web lint, build, relevant unit tests, Playwright smoke tests, and desktop build checks.
8. Update relevant docs and `docs/CHANGELOG.md`.

Rollback strategy: Keep migrations staged so any problematic page can revert to the previous component implementation or page layout without undoing the entire Mantine foundation. If the provider-level integration causes broad regressions, revert the dependency/provider/theme changes and restore the prior Tailwind-only component layer.

## Open Questions

- Should Mantine replace `next-themes`, or should the app keep `next-themes` and bridge its color scheme into Mantine during the first migration phase?
- Should Remix Icon remain for existing icons, or should new UI use only `lucide-react` plus Mantine components?
- Which visual density should the final dashboard target: compact operations-focused layout or a more spacious analytics-console layout?
- Should the final cleanup remove Tailwind entirely, or keep Tailwind for narrow utility usage after Mantine becomes the primary component system?
