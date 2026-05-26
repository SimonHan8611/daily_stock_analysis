## 1. Mantine Foundation

- [x] 1.1 Add required Mantine dependencies to `apps/dsa-web/package.json` and refresh `package-lock.json`
- [x] 1.2 Import Mantine core styles and notification styles in the Web app entrypoint
- [x] 1.3 Create a Mantine theme module for product colors, typography, spacing, radius, shadows, focus states, and component defaults
- [x] 1.4 Wrap the Web React tree with `MantineProvider` and notifications support without changing router or auth provider behavior
- [x] 1.5 Bridge existing light/dark theme persistence into Mantine color scheme handling
- [x] 1.6 Add or update tests that verify app bootstrap and theme initialization still work

## 2. Application Shell and Navigation

- [x] 2.1 Rebuild `Shell` around Mantine `AppShell` while preserving the current nested route outlet behavior
- [x] 2.2 Rebuild `SidebarNav` with Mantine navigation primitives and keep all existing route paths unchanged
- [x] 2.3 Rebuild header and theme controls with Mantine components
- [x] 2.4 Preserve mobile navigation open, close, resize, and route-selection behavior
- [x] 2.5 Update shell and navigation unit tests for desktop and mobile states

## 3. Common Component Migration

- [x] 3.1 Migrate `Button` to a Mantine-backed implementation while preserving existing variants used by pages
- [x] 3.2 Migrate `Input`, `Select`, `Checkbox`, and related form feedback patterns to Mantine-backed implementations
- [x] 3.3 Migrate `Card`, `SectionCard`, `StatCard`, `PageHeader`, `Toolbar`, and layout primitives to Mantine-backed implementations
- [x] 3.4 Migrate `Drawer`, `ConfirmDialog`, `Tooltip`, `InlineAlert`, `ApiErrorAlert`, `Badge`, `Pagination`, and loading/empty states
- [x] 3.5 Replace toast rendering with Mantine notifications or a Mantine-compatible notification adapter
- [x] 3.6 Update common component tests to cover accessibility, variant mapping, and interaction behavior

## 4. Low-Risk Page Migration

- [x] 4.1 Migrate `LoginPage` visual structure without changing auth redirect, login, logout, or status behavior
- [x] 4.2 Migrate `SettingsPage` layout, category navigation, settings cards, field controls, import flow, LLM channel editor, and user management UI
- [x] 4.3 Migrate `PortfolioPage` tables, forms, dialogs, filters, and pagination without changing portfolio API behavior
- [x] 4.4 Migrate `BacktestPage` controls, result panels, charts, and empty/error/loading states without changing backtest API behavior
- [x] 4.5 Update page-level Vitest coverage for migrated low-risk pages

## 5. Analysis Dashboard and Report Migration

- [x] 5.1 Migrate `HomePage` layout in smaller sections while preserving stock search, notify toggle, task lifecycle, history selection, and report actions
- [x] 5.2 Migrate `StockAutocomplete` and suggestions UI without changing normalization, selection source, or submission behavior
- [x] 5.3 Migrate `TaskPanel` and `HistoryList` while preserving active task updates, load more behavior, selection, and deletion confirmation
- [x] 5.4 Migrate report components while preserving markdown rendering, summary fields, news display, details display, strategy display, and report language handling
- [x] 5.5 Migrate markdown drawer and follow-up chat entry points without changing route query parameters
- [x] 5.6 Update dashboard, history, autocomplete, task, and report tests for migrated UI behavior

## 6. Chat Page Migration

- [x] 6.1 Migrate `ChatPage` shell integration, message list, composer, export controls, loading states, and error states
- [x] 6.2 Preserve chat store behavior, route-derived stock context, follow-up suggestions, scroll behavior, and export formatting
- [x] 6.3 Update chat tests for migrated interaction behavior

## 7. Cleanup and Compatibility

- [x] 7.1 Remove unused Tailwind-only utility classes, obsolete CSS variables, and dead custom component styles after migrated components no longer depend on them
- [x] 7.2 Keep only the Tailwind utilities that remain intentionally supported after Mantine becomes the primary UI system
- [x] 7.3 Check icon usage and consolidate new UI icons around the selected icon strategy
- [x] 7.4 Confirm production Web build output remains compatible with the Electron desktop app
- [x] 7.5 Update relevant docs and `docs/CHANGELOG.md` for visible UI, workflow, or desktop packaging changes

## 8. Verification

- [x] 8.1 Run `cd apps/dsa-web && npm run lint`
- [x] 8.2 Run `cd apps/dsa-web && npm run build`
- [ ] 8.3 Run `cd apps/dsa-web && npm run test`
- [ ] 8.4 Run `cd apps/dsa-web && npm run test:smoke`
- [ ] 8.5 Run desktop build validation after Web build-sensitive changes
- [ ] 8.6 Document any skipped checks, remaining risks, and rollback path in the final delivery notes
