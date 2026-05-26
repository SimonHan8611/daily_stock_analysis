## ADDED Requirements

### Requirement: Mantine provider and theme foundation
The Web app SHALL provide a Mantine foundation that defines the application theme, color scheme handling, global UI defaults, and notification support without changing existing product routes or API behavior.

#### Scenario: Application boots with Mantine providers
- **WHEN** the Web app starts
- **THEN** the React tree is wrapped with the required Mantine providers
- **AND** existing authentication and routing behavior remains available

#### Scenario: Theme tokens are centralized
- **WHEN** a migrated component renders
- **THEN** it uses Mantine theme values for colors, spacing, radius, shadows, typography, and focus states
- **AND** it does not introduce unrelated hard-coded visual tokens

#### Scenario: Color scheme remains functional
- **WHEN** the user switches between light and dark modes
- **THEN** Mantine components and migrated page surfaces update consistently
- **AND** existing theme persistence behavior is preserved or replaced with equivalent persistence

### Requirement: Mantine Admin-style application shell
The Web app SHALL expose a Mantine Admin-style application shell with responsive navigation, content layout, and theme controls while preserving the existing route paths.

#### Scenario: Desktop navigation renders
- **WHEN** the viewport supports a desktop layout
- **THEN** the shell displays persistent navigation for all currently available top-level pages
- **AND** selecting a navigation item routes to the same path used before the refactor

#### Scenario: Mobile navigation renders
- **WHEN** the viewport is mobile-sized
- **THEN** the shell provides an accessible collapsible navigation experience
- **AND** navigation closes after the user selects a destination

#### Scenario: Auth route behavior remains unchanged
- **WHEN** authentication is enabled and the user is not logged in
- **THEN** protected routes redirect to the login page using the existing redirect semantics

### Requirement: Mantine-backed common component layer
The Web app SHALL migrate common UI components to Mantine-backed implementations while preserving existing import paths and expected behavioral contracts where practical.

#### Scenario: Existing component imports continue to work
- **WHEN** a page imports shared components from the current common component entry points
- **THEN** the import continues to resolve
- **AND** the component provides equivalent user-facing behavior after migration

#### Scenario: Dialog and drawer interactions remain accessible
- **WHEN** a migrated dialog or drawer opens
- **THEN** focus management, keyboard dismissal, labels, and close actions remain accessible
- **AND** existing destructive confirmation flows continue to require explicit user confirmation

#### Scenario: Form controls preserve validation display
- **WHEN** a migrated form field has validation or API errors
- **THEN** the field displays error state and helper text clearly
- **AND** form submission semantics remain unchanged

### Requirement: Phased page migration
The Web app SHALL migrate pages in phases that prioritize lower-risk pages before state-dense analysis workflows.

#### Scenario: Settings page migrates first
- **WHEN** the first page-level migration is implemented
- **THEN** settings views are migrated before the home analysis dashboard
- **AND** settings configuration loading, editing, saving, validation, and admin-only behavior remain intact

#### Scenario: Analysis dashboard migrates after foundation is stable
- **WHEN** the home dashboard migration begins
- **THEN** provider, shell, navigation, and common component migrations are already in place
- **AND** stock search, task stream state, history selection, report rendering, reanalysis, notification toggles, and follow-up chat entry points remain compatible

#### Scenario: Report presentation remains semantically compatible
- **WHEN** report UI components are migrated
- **THEN** existing report payload parsing, markdown rendering, summary display, news display, details display, and language handling remain unchanged

### Requirement: Desktop compatibility
The Web UI refactor SHALL preserve compatibility with the Electron desktop app that consumes the Web build output.

#### Scenario: Web build output remains consumable
- **WHEN** the Web app is built for production
- **THEN** the desktop app can continue loading the generated Web assets without route or asset path regressions

#### Scenario: Desktop build-sensitive changes are validated
- **WHEN** provider setup, build configuration, asset paths, or output assumptions change
- **THEN** desktop build validation is performed or the unverified desktop risk is explicitly documented

### Requirement: Validation and documentation
The Web UI refactor SHALL include validation and documentation updates proportional to the affected UI and user-visible behavior.

#### Scenario: Web checks run after UI migration
- **WHEN** migrated Web UI changes are ready for review
- **THEN** Web lint, production build, relevant unit tests, and Playwright smoke coverage are run or documented as not run with reasons

#### Scenario: User-visible changes are documented
- **WHEN** page interactions, navigation, settings flows, report presentation, or desktop packaging behavior visibly changes
- **THEN** relevant documentation and `docs/CHANGELOG.md` are updated according to repository rules
