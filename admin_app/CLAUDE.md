# CLAUDE.md - Flutter Admin App

## Mission
Build and maintain the Flutter admin panel for this multi-tenant SaaS e-commerce platform.

The app must be production-ready for:
- Windows
- macOS
- Android
- iOS

It must be:
- Responsive on phone, tablet, laptop, and large desktop
- Capable of online mode, offline-only mode, and hybrid offline/online sync mode
- Visually aligned with the existing web admin, not a separate design language

This app is the tenant admin panel of the web app. It is not a separate product.

## Read Before Coding
Always read these first:
- `INSTRUCTIONS.md`
- `OFFLINE_ONLINE_REQUIREMENTS.md`
- `FEATURE_TIER_MATRIX.md`
- `../AGENTS.md`
- `../CLAUDE.md`
- `../spec/01-overview.md`
- `../spec/03-tenancy.md`
- `../spec/04-roles-permissions.md`
- `../spec/05-data-model.md`
- `../spec/07-apis.md`
- `../spec/08-ux-conversion.md`
- `../spec/09-nonfunctional.md`
- `../spec/10-acceptance-tests.md`

Then inspect these code areas before making changes:
- `lib/main.dart`
- `lib/router.dart`
- `lib/bootstrap.dart`
- `lib/models/bootstrap_config.dart`
- `lib/providers/`
- `lib/repositories/`
- `lib/services/`
- `lib/widgets/`
- `lib/screens/`

For design parity, treat these web files as visual source of truth:
- `../layouts/admin.vue`
- `../pages/admin/**`
- `../components/admin/**`

## Product Scope
The Flutter app covers tenant admin operations for the SaaS platform, including:
- Dashboard
- Products and variants
- Categories
- Orders
- Customers
- Sales / POS
- Purchases / suppliers
- Cash / cashier workflows
- Delivery settings
- Billing awareness where relevant
- Store settings
- Staff and permissions
- Printing and device workflows where needed

The app must follow the same business rules as the web admin.

## Non-Negotiable Rules
1. Tenant isolation is mandatory.
2. The app must never enable cross-tenant data mixing locally or remotely.
3. The app must never trust user-entered `tenantId` for server authorization.
4. The app must support all three runtime modes:
   - online
   - offline-only
   - hybrid sync
5. Login must not be assumed as the only entry flow.
6. Core flows must ship with tests. No TODOs in core logic.
7. The app must look and feel like the current web admin.

## Operating Modes
The app must handle three explicit modes. Do not collapse them into a single boolean.

### 1. Online Mode
- User authenticates normally.
- Backend is source of truth.
- Local cache may exist, but server state wins.
- Tenant is resolved server-side from authenticated user or trusted provisioning context, never from arbitrary client payload.

### 2. Offline-Only Mode
- App may start with no login flow.
- One install is bound to one tenant workspace through trusted provisioning.
- Local encrypted database is source of truth.
- Network is optional or disabled.
- Unsupported cloud-only features must be hidden or clearly disabled with explanation.
- If future upgrade to hybrid or online is allowed, activation must happen through a safe provisioning flow, not ad hoc tenant switching.

### 3. Hybrid Offline/Online Sync Mode
- App remains usable without network.
- Writes are local-first and enqueue durable sync operations.
- Sync runs in background when connectivity returns.
- Conflict handling, retries, idempotency, and user-visible sync state are required.
- No silent overwrites or silent data loss.

## Provisioning and Tenant Binding
Offline-only mode with no login is allowed, but it must still be secure and tenant-safe.

Required approach:
- A device or install must be provisioned to exactly one tenant workspace.
- Provisioning can be done through a trusted bootstrap payload, signed activation file, QR code, deep link, or admin-issued device registration.
- The app stores tenant binding locally and uses it for local namespace isolation.
- The app must not allow a user to type any tenant identifier and gain access.
- If the app syncs later, the server must recognize the device/workspace through trusted credentials or provisioning tokens, not raw client tenant input.

Do not build an offline flow that bypasses tenancy rules.

## Tenant Isolation Requirements
The root platform rules still apply inside Flutter.

Required:
- Every tenant-owned local table must include tenant identity fields.
- At minimum, local records and sync queue rows must be namespaced by `tenantId`.
- If multiple local workspaces or installations are supported, also namespace by `workspaceId` or equivalent trusted local binding.
- Every local query must filter by the active tenant/workspace context.
- Every sync payload must preserve tenant-safe mapping without allowing the client to impersonate another tenant.

Important current gap:
- `lib/services/database_service.dart` currently creates local tables without `tenantId`.
- Any production work on offline or sync must fix this before claiming tenant-safe offline support.

## Auth and Access Rules
- Online and hybrid mode may require login.
- Offline-only mode may skip login, but must still use a trusted local workspace context.
- Super-admin flows do not belong in this app unless explicitly planned. The current web super-admin remains the source of truth.
- RBAC still applies for tenant staff.
- If offline mode supports multiple local staff users, permissions must be enforced locally and sync safely later.
- If offline-only mode is single-operator, document that explicitly and design the provisioning accordingly.

Do not hard-code `/login` as the only startup route.
Startup must branch based on bootstrap/provisioning state:
- unprovisioned
- provisioned offline-only
- provisioned online/hybrid with login required
- authenticated session restored

## Flutter Architecture Rules
Stay aligned with the current app structure unless there is a strong, documented reason to refactor.

Current structure:
- `models/` for typed domain models
- `repositories/` for data access and persistence orchestration
- `providers/` for Riverpod state management
- `services/` for infrastructure and cross-cutting concerns
- `screens/` for route-level UI
- `widgets/` for reusable UI components

Rules:
- Screens and widgets must not contain business logic or raw networking.
- Repositories own API, local database, and sync orchestration.
- Providers coordinate UI state and call repositories.
- Services handle infrastructure concerns such as API, sync engine, database, storage, discovery, printing, and connectivity.
- Prefer immutable typed models and explicit serialization.
- Avoid hidden global state. Make services injectable where practical for tests.

## Data and Sync Architecture
The current app already has:
- `ApiService`
- `DatabaseService`
- `SyncService`
- local repositories
- offline banners and network status providers

Use these as the base, but harden them for production.

Production sync expectations:
- Durable outbox pattern for writes
- Idempotency keys for create/update/delete operations
- Retry with backoff
- Partial failure handling
- Ordered sync where dependencies matter
- Conflict policy documented per entity
- Attachment/image upload strategy that survives app restarts
- Last-sync metadata per domain where useful
- User-visible pending, syncing, failed, and conflicted states
- Safe restart behavior after crash or forced close

Do not ship a "best effort" sync model without explicit conflict and retry rules.

## Design Parity Rules
The Flutter admin must look like the web admin.

Use the web admin as source of truth for:
- layout structure
- spacing density
- card radius
- sidebar behavior
- topbar behavior
- surface colors
- brand accent usage
- typography
- status badges
- empty states
- form layout
- table density

Specific references:
- `../layouts/admin.vue` for shell structure
- `../pages/admin/**` for page composition
- `../components/admin/**` for UI patterns

Design expectations:
- Compact, premium admin UI
- Slate-based surfaces with brand accent
- Branded tenant-aware UI
- Responsive sidebar and topbar behavior
- Consistent badges, tables, filters, forms, and action bars
- RTL and LTR support
- EN / FR / AR parity

Do not invent a generic Material dashboard if the web app already defines the product language.

## Responsiveness Rules
The app must work across:
- narrow phones
- large phones
- tablets
- laptop widths
- wide desktop screens

Required:
- no table overflow that breaks core actions
- mobile-safe action placement
- desktop information density without visual clutter
- keyboard and pointer support on desktop
- touch-friendly targets on mobile
- tested responsive breakpoints for major screens

## Storage and Security
- Local database must remain encrypted.
- Secrets and auth tokens must use secure storage.
- Cached data must respect tenant/workspace boundaries.
- Logout, tenant switch, or reprovisioning must clear or isolate local data correctly.
- Image and file caching must not leak across tenants.

## API and Backend Expectations
The backend is Express.js behind the Nuxt server proxy.

For Flutter integration:
- prefer typed repository methods, not ad hoc endpoint calls from UI
- keep request/response shapes aligned with backend modules
- do not add client-only assumptions that weaken server-side tenancy enforcement
- if mobile/desktop needs a provisioning or device-registration flow, define it explicitly and implement it as a proper backend feature

If a required backend capability does not exist, document it and add it properly. Do not hack around it from the client.

## Testing Requirements
Anything related to tenancy, auth, sync, or checkout-adjacent admin flows must have tests.

Minimum test matrix:

### Unit tests
- model serialization and mapping
- repository behavior
- sync queue logic
- conflict resolution helpers
- tenant/workspace scoping helpers
- bootstrap and provisioning logic
- permission gating
- local database migration logic

### Widget tests
- app shell on mobile and desktop
- login flow when enabled
- no-login offline startup flow
- offline banners and sync status UI
- responsive tables and filter bars
- key forms and action states
- locale and RTL behavior

### Integration tests
- bootstrap -> startup mode selection
- online CRUD flows
- offline create/update/delete flows
- hybrid offline write then later sync
- app restart with pending sync queue
- tenant reprovisioning / logout data isolation behavior
- failure and retry scenarios

### Golden or screenshot tests
- dashboard
- products list
- orders list
- product form
- settings screens
- mobile and desktop variants
- light/dark only if the product actually supports both

### Manual or CI release gates
- `flutter analyze`
- `flutter test`
- platform build smoke checks for Windows, macOS, Android, iOS

## Definition of Done
Do not mark work done unless:
- it works in the correct runtime mode
- tenant isolation is preserved locally and remotely
- design matches the web admin closely
- responsive behavior is verified
- offline and sync behavior are explicit and observable
- tests were added or updated
- deferred items are documented as decisions, not hidden TODOs

## Output Format Required From Claude
For every substantial change or PR, provide:
- Summary of changes
- Files changed
- How to run / test locally
- Tests added / updated
- Assumptions and decisions

## Current Codebase Notes
These existing files are especially relevant:
- `lib/router.dart` currently assumes login-centric routing and must evolve for no-login offline mode.
- `lib/providers/auth_provider.dart` currently models `isOfflineTenant`; this likely needs a more explicit mode/capabilities model.
- `lib/services/tenant_mode_service.dart` currently blocks requests for offline tenants; keep the intent, but make the runtime mode architecture clearer.
- `lib/services/database_service.dart` currently needs tenant-safe schema hardening for true production offline support.
- `lib/services/sync_service.dart` already exists but needs production-grade conflict, retry, and namespace guarantees.
- `lib/widgets/app_shell.dart`, `lib/widgets/responsive_layout.dart`, and `lib/widgets/sidebar.dart` are the current UI shell foundation.

## Final Direction
Prefer secure-by-default, local-first, explicit mode-aware architecture.

If a choice exists between:
- faster implementation vs stronger tenant isolation
- simpler demo flow vs durable offline sync
- generic Flutter UI vs faithful web-admin parity

choose:
- stronger tenant isolation
- durable offline behavior
- faithful product parity
