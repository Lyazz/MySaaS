# Security Audit Report — Swekly SaaS Platform

**Classification**: Confidential — Internal Use Only
**Report Version**: 1.0

---

## Executive Summary

### Audit Overview
- **Target System**: Swekly — Multi-Tenant SaaS E-Commerce Platform (Algeria)
- **Analysis Date**: 2026-04-16
- **Analysis Scope**: Full-stack code review covering backend API (Express.js), frontend (Nuxt 3 / Vue 3), database layer (Prisma/PostgreSQL), authentication, middleware, delivery integrations, and file handling
- **Technology Stack**: Nuxt 3, Vue 3, Express.js 5, Prisma ORM, PostgreSQL 15, AWS S3/MinIO, JWT (HS256), bcryptjs, Capacitor (Android/iOS)

### Risk Assessment Summary

| Risk Level | Count | Percentage |
|------------|-------|------------|
| Critical   | 2     | 11%        |
| High       | 5     | 28%        |
| Medium     | 6     | 33%        |
| Low        | 5     | 28%        |
| **Total**  | **18**| **100%**   |

### Key Findings

1. **No rate limiting** on any endpoint — login, registration, and public order creation are fully open to brute-force and denial-of-service attacks. This is the most operationally dangerous finding.
2. **No Content Security Policy (CSP)** headers configured in Nuxt or Express — combined with unsanitized `v-html` usage across all 14+ storefront templates, this creates a stored XSS surface on every tenant storefront.
3. **Sensitive authentication data logged** in plaintext — email addresses and the outcome of password verification are written to `console.log` on every login attempt, creating audit and privacy risk.
4. **No JWT token revocation mechanism** — tokens are valid for 24 hours and cannot be invalidated on logout or account deactivation.
5. **No security headers** (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) — both the Nuxt layer and the Express app omit helmet or equivalent configuration.
6. **No email format validation** at registration — the `email` field is only checked for non-empty string truthiness, not RFC 5321 conformance.
7. **No password complexity policy** at registration — any non-empty string is accepted at `/api/register`, while only the user management service enforces a minimum of 8 characters.
8. **Tenant isolation is correctly implemented** across all reviewed modules (orders, products, customers, cash, inventory, delivery). No cross-tenant data access vulnerabilities were found in the Prisma query layer.

---

## Analysis Methodology

### Security Analysis Approach

A manual, source-first audit methodology was applied:
1. Middleware chain analysis — authentication, tenant resolution, RBAC, subscription, audit middleware execution order and bypass conditions.
2. Route surface mapping — all public vs. authenticated routes catalogued, including delivery webhooks and pixel endpoints.
3. Service-layer tenant isolation verification — all Prisma queries in key modules verified for `tenantId` scoping.
4. Authentication flow review — JWT implementation, token lifecycle, password storage, login logging.
5. Input validation audit — registration, login, order creation, file uploads, HTML rendering.
6. Security header inspection — Nuxt `routeRules`, Express middleware, per-route headers.
7. Dependency review — `package.json` scanned for known-risky packages and version constraints.
8. Frontend XSS surface review — `v-html` usage across all `.vue` files in `pages/` and `components/`.

### Analysis Coverage

| Area | Coverage |
|------|----------|
| Backend middleware chain | Full |
| Auth module | Full |
| Orders module (public + admin) | Full |
| Products, customers, inventory, cash | Full |
| Delivery module + webhook | Full |
| Superadmin module | Full |
| Upload service | Full |
| File download service | Full |
| Nuxt config / security headers | Full |
| Frontend XSS surface (`v-html`) | Full |
| Prisma schema | Partial (structure reviewed via queries) |
| Dependency CVEs | Surface scan (no `npm audit` run) |

### Analysis Capabilities

This audit was performed via static code analysis without runtime execution. Dynamic testing (fuzzing, DAST, penetration testing) was not performed. Findings are based on code patterns, architecture review, and established security principles.

---

## Security Findings

### Critical Risk Findings

#### C-001: No Rate Limiting on Authentication and Public Endpoints

**Location**: `backend/src/app.ts` (entire middleware chain), `backend/src/modules/auth/routes.ts:130` (login), `backend/src/modules/auth/routes.ts:13` (register), `backend/src/modules/orders/public.routes.ts:8` (public order creation)

**Risk Score**: 9.1 (Critical)

**Pattern Detected**: No `express-rate-limit`, `rate-limiter-flexible`, or equivalent middleware is present anywhere in the application. The global middleware chain in `app.ts` applies `expressTenantMiddleware`, `expressAuthMiddleware`, `expressTenantFromUserMiddleware`, `expressAuditMiddleware`, and `expressSubscriptionMiddleware` — but no rate limiting.

**Code Context**:
```typescript
// backend/src/app.ts — full middleware chain, no rate limiting present
app.use(expressTenantMiddleware)
app.use(expressAuthMiddleware)
app.use(expressTenantFromUserMiddleware)
app.use(expressAuditMiddleware)
app.use(expressSubscriptionMiddleware)
app.use('/api', routes)
```

```typescript
// backend/src/modules/auth/routes.ts:130 — login endpoint, no rate limit
router.post('/login', async (req, res) => {
    const { email, password } = req.body
    ...
    const isValid = await bcrypt.compare(password, user.passwordHash)
```

**Impact**: Attackers can perform unlimited credential stuffing and brute-force attacks against `/api/login`. The public order endpoint `POST /api/orders` allows unlimited order creation per tenant, enabling inventory flooding and subscription limit DoS. Registration endpoint allows unlimited tenant creation spam. Account lockout is not implemented.

**Recommendation**: Install `express-rate-limit` (or `rate-limiter-flexible` for Redis-backed distributed limiting). Apply at minimum:
- `/api/login`: 10 requests/15 minutes per IP
- `/api/register`: 5 requests/hour per IP
- `POST /api/orders`: 30 requests/hour per IP or phone number fingerprint
- Global API: 300 requests/15 minutes per IP

**Fix Priority**: Immediate

---

#### C-002: Stored XSS via Unsanitized `v-html` with No Content Security Policy

**Location**: All storefront templates — representative examples:
- `components/storefront/templates/cyber/Product.vue:162`
- `components/storefront/templates/classic/Product.vue:134`
- `components/storefront/templates/activewear/Product.vue:144`
- `components/storefront/templates/modern/Product.vue:160`
- `pages/admin/billing/index.vue:267`
- (14+ additional template files)

**Risk Score**: 9.3 (Critical)

**Pattern Detected**: Vue's `v-html` directive renders raw HTML without escaping. Tenant admins enter `product.description` via the Quill rich-text editor (`@vueup/vue-quill`), which produces HTML. This HTML is stored in the database and rendered with `v-html` directly on public-facing storefront pages. No `DOMPurify`, `sanitize-html`, or equivalent sanitization library is present in the codebase. There is no Content Security Policy header configured.

**Code Context**:
```vue
<!-- components/storefront/templates/cyber/Product.vue:162 -->
v-html="product.description"

<!-- components/storefront/templates/classic/ProductLandingPage.vue:83 -->
v-html="product.description"

<!-- pages/admin/billing/index.vue:267 -->
<div v-html="methodInstructions"></div>
```

**Impact**:
- A compromised or malicious tenant admin can inject JavaScript into their storefront product descriptions, executing arbitrary JS in every customer browser that visits that tenant's product pages.
- Since tenants share the same Nuxt application and cookies are scoped to the domain, XSS on one tenant's subdomain can steal session tokens or redirect customers.
- The billing page renders `methodInstructions` (a computed string with `v-html`); while this value is currently hardcoded, any future server-driven content injection here would affect admin users.
- With no CSP, exfiltrating data to external origins via `fetch`, `XMLHttpRequest`, or `<img src>` is trivially possible.

**Recommendation**:
1. Install `dompurify` (client-side) or `isomorphic-dompurify` (SSR-compatible) and sanitize all product description HTML before passing to `v-html`.
2. Configure a Content Security Policy (CSP) in Nuxt `routeRules` for storefront pages restricting `script-src` to `'self'` and explicitly blocking inline scripts.
3. Evaluate replacing `v-html` with a safe rendering component that whitelists only known safe HTML tags (bold, italic, lists, links).

**Fix Priority**: Immediate

---

### High Risk Findings

#### H-001: Sensitive Authentication Data Logged in Plaintext

**Location**: `backend/src/modules/auth/routes.ts:136`, `routes.ts:177`, `routes.ts:187`

**Risk Score**: 7.2 (High)

**Pattern Detected**: Three `console.log` statements in the login handler emit user email addresses and password verification outcomes on every login attempt.

**Code Context**:
```typescript
// backend/src/modules/auth/routes.ts:136
console.log('Login attempt:', { email: normalizedEmail, passwordProvided: !!password })

// backend/src/modules/auth/routes.ts:177
console.log('Login user found:', user ? user.email : 'not found')

// backend/src/modules/auth/routes.ts:187
console.log('Login password valid:', isValid)
```

**Impact**: In production, these logs are written to stdout/stderr and collected by log aggregators. Email addresses of all login attempts (including failed ones, which may contain credential stuffing targets) are permanently stored in log systems. The boolean `isValid` log on line 187 creates a timing oracle in the log stream: an observer with log access can determine if a submitted password was correct independently of the HTTP response. This violates credential hygiene standards (GDPR Article 32, PCI-DSS 8.3.x).

**Recommendation**: Remove all three `console.log` statements from the production login path. If login attempt monitoring is needed for security alerting, emit only anonymized signals (e.g., hashed email prefix, tenant ID, timestamp) to a dedicated audit log, not stdout.

**Fix Priority**: Immediate (before production deployment)

---

#### H-002: No JWT Token Revocation or Refresh Mechanism

**Location**: `backend/src/lib/jwt.ts`, `backend/src/modules/auth/routes.ts`

**Risk Score**: 7.5 (High)

**Pattern Detected**: Access tokens are signed with a 24-hour expiry (`expiresIn: '24h'`) and there is no logout endpoint, token revocation list, or refresh token infrastructure.

**Code Context**:
```typescript
// backend/src/lib/jwt.ts:11-16
export const signAccessToken = (payload: object, opts?: Omit<SignOptions, 'algorithm'>): string => {
    return jwt.sign(payload, getJwtSecret(), {
        algorithm: 'HS256',
        expiresIn: '24h',
        ...opts
    })
}
```

**Impact**:
- A user who logs out retains a valid token for up to 24 hours. If that token is stolen (XSS, network interception), it cannot be invalidated.
- When an admin deactivates a user (`isActive: false`) or deletes an account, their token remains valid until expiry. The auth middleware does fetch the user from DB on each request (`prisma.user.findFirst({ where: { id: decoded.userId, isActive: true } })`), so deactivation does propagate — but only if the token hasn't been cached by a client that skips the auth header.
- Staff role changes or permission updates do not take effect until a user re-authenticates, because permissions are loaded from the DB at login and embedded in the frontend Pinia store.
- No logout endpoint means the client cannot signal session end to the backend.

**Recommendation**:
1. Reduce access token lifetime to 15-30 minutes.
2. Implement a short-lived refresh token pattern (7-day httpOnly cookie).
3. Add a `POST /api/logout` endpoint that clears the refresh token cookie.
4. For immediate staff permission changes, rely on the DB re-fetch in `expressAuthMiddleware` (already present — this is a mitigating control).

**Fix Priority**: High (production readiness)

---

#### H-003: Missing Security Headers (No Helmet, No CSP, No HSTS)

**Location**: `backend/src/app.ts`, `nuxt.config.ts`

**Risk Score**: 7.8 (High)

**Pattern Detected**: Neither the Express app nor the Nuxt configuration sets standard security headers. `helmet` is not installed as a dependency. The only security-adjacent headers set are `X-Robots-Tag` (SEO), `Cache-Control: no-store` on sensitive paths, and `app.disable('x-powered-by')`.

**Code Context**:
```typescript
// backend/src/app.ts — no security headers middleware
app.disable('x-powered-by')
app.use(expressTenantMiddleware)
// ... no helmet(), no CSP, no HSTS, no X-Frame-Options
```

```typescript
// nuxt.config.ts — routeRules only set x-robots-tag, no security headers
routeRules: {
    '/api/**': { headers: { 'x-robots-tag': 'noindex, ...' } },
    '/admin/**': { ssr: false, headers: { 'x-robots-tag': '...' } },
    // No Content-Security-Policy, X-Frame-Options, HSTS, etc.
}
```

**Missing Headers**:
| Header | Risk if Absent |
|--------|---------------|
| `Content-Security-Policy` | XSS, data exfiltration (see C-002) |
| `Strict-Transport-Security` | Downgrade to HTTP, MITM |
| `X-Frame-Options` | Clickjacking on admin/storefront |
| `X-Content-Type-Options: nosniff` | MIME sniffing attacks |
| `Referrer-Policy` | Referrer leakage of admin URLs |
| `Permissions-Policy` | Camera/microphone/geolocation abuse |

**Recommendation**: Install `helmet` in Express and configure it in `app.ts`. Add corresponding security headers to Nuxt `routeRules` for SSR-served pages. Minimum viable config:
```typescript
// app.ts
import helmet from 'helmet'
app.use(helmet({
    contentSecurityPolicy: false, // Configure separately per route
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true }
}))
```

**Fix Priority**: High

---

#### H-004: No Input Validation on Registration Password and Email

**Location**: `backend/src/modules/auth/routes.ts:22-27`

**Risk Score**: 7.0 (High)

**Pattern Detected**: The `/api/register` endpoint accepts any non-empty `password` string (no minimum length, no complexity check) and any non-empty `email` string (no RFC 5321 validation). The user management service (`users.service.ts:52-53`) enforces a minimum of 8 characters, but that protection is absent in the self-service registration route.

**Code Context**:
```typescript
// backend/src/modules/auth/routes.ts:22-27
const { name, slug, email, password } = req.body
const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

if (!name || !slug || !normalizedEmail || !password) {
    return res.status(400).json({ statusCode: 400, statusMessage: 'Missing required fields' })
}
// No email format validation, no password length check
const passwordHash = await bcrypt.hash(password, 10)
```

**Impact**: A single-character password `"a"` is accepted at registration, creating a trivially guessable credential. An invalid email address (e.g., `"notanemail"`) creates an account that will never receive email-based communications and cannot be verified. When combined with the absence of rate limiting (C-001), this allows mass-creation of weak accounts.

**Recommendation**:
1. Add email regex or library validation (e.g., `validator.isEmail(normalizedEmail)`).
2. Enforce `password.length >= 8` (matching `users.service.ts`) and optionally add `zxcvbn` strength scoring.
3. Consider email verification flow before activating the tenant account.

**Fix Priority**: High

---

#### H-005: Webhook Secret Transmitted via URL Query Parameter

**Location**: `backend/src/modules/delivery/routes.ts:119`, `backend/src/modules/delivery/delivery.controller.ts:178`

**Risk Score**: 7.1 (High)

**Pattern Detected**: The Maystro webhook validation uses a per-tenant secret passed as a URL query parameter (`?secret=...`). While `timingSafeEqual` is correctly used for comparison, secrets in query strings are logged by web servers, proxies, CDNs, and browser history.

**Code Context**:
```typescript
// backend/src/modules/delivery/delivery.controller.ts:178
const incoming = typeof req.query.secret === 'string' ? req.query.secret : ''
```

```typescript
// backend/src/modules/delivery/routes.ts:119
router.post('/webhooks/maystro', controller.maystroWebhook.bind(controller))
// Webhook URL registered with Maystro as: https://{tenant}.domain.com/api/webhooks/maystro?secret={webhookSecret}
```

**Impact**: The webhook secret URL is stored in Maystro's system. If Maystro's platform is breached, or if any proxy/load-balancer/CDN access log is compromised, an attacker learns the per-tenant secret and can forge webhook events to arbitrarily update order statuses (e.g., marking orders as DELIVERED, triggering cash transactions).

**Recommendation**: Maystro should provide an HMAC request signature header. If Maystro does not support header-based signing, move the secret to a custom HTTP header (e.g., `X-Webhook-Secret`) on the registered URL and configure Maystro to send it. Alternatively, use IP allowlisting for Maystro's known egress IPs as a defence-in-depth measure. Ensure all reverse proxy access logs exclude query strings for webhook paths.

**Fix Priority**: High

---

### Medium Risk Findings

#### M-001: Login Credentials Brute-Force Oracle via Distinct Error Timing

**Location**: `backend/src/modules/auth/routes.ts:179-193`

**Risk Score**: 5.5 (Medium)

**Pattern Detected**: When a user is not found, the endpoint returns immediately with a 401. When a user is found but the password is wrong, `bcrypt.compare` is called, adding ~100ms of compute time before the 401 response. An attacker can enumerate valid email addresses by measuring response time difference.

**Code Context**:
```typescript
// routes.ts:179-193
if (!user || !user.passwordHash) {
    return res.status(401).json({ statusCode: 401, statusMessage: 'Invalid credentials' })
    // Returns immediately — no bcrypt call
}
const isValid = await bcrypt.compare(password, user.passwordHash)
// Returns after ~100ms bcrypt delay
```

**Impact**: User account enumeration via timing side-channel. Combined with no rate limiting (C-001), efficient large-scale enumeration is feasible.

**Recommendation**: Call `bcrypt.compare` against a dummy hash even when no user is found, to equalize response time:
```typescript
const dummyHash = '$2b$10$...' // pre-computed at startup
if (!user || !user.passwordHash) {
    await bcrypt.compare(password, dummyHash) // consume same time
    return res.status(401).json({ statusCode: 401, statusMessage: 'Invalid credentials' })
}
```

**Fix Priority**: Medium

---

#### M-002: TRUST_PROXY Allows Host Header Spoofing if Misconfigured

**Location**: `backend/src/middleware/tenant.middleware.ts:6-7`

**Risk Score**: 5.8 (Medium)

**Pattern Detected**: Tenant resolution trusts `X-Forwarded-Host` when the environment variable `TRUST_PROXY=true` is set. If this variable is enabled without a properly configured reverse proxy that strips and re-adds `X-Forwarded-Host`, clients can send arbitrary values for this header.

**Code Context**:
```typescript
// backend/src/middleware/tenant.middleware.ts:6-7
const trustProxy = process.env.TRUST_PROXY === 'true'
const host = (trustProxy ? req.get('x-forwarded-host') : null) || req.get('host') || ''
```

**Impact**: If `TRUST_PROXY=true` is set in an environment where the reverse proxy does not sanitize `X-Forwarded-Host`, an attacker can set `X-Forwarded-Host: victim-tenant.platform.com` to access a different tenant's context in unauthenticated public routes (storefront, delivery options, pixel endpoints). This would not bypass authentication but could leak tenant configuration metadata.

**Recommendation**: Document the strict requirement that `TRUST_PROXY=true` must only be used with a reverse proxy that validates and overwrites `X-Forwarded-Host`. Consider validating the parsed tenant slug against an allowlist of known tenants at the middleware level, or log a startup warning when `TRUST_PROXY=true`.

**Fix Priority**: Medium (operational)

---

#### M-003: Raw SQL Query in Suppliers Service

**Location**: `backend/src/modules/suppliers/suppliers.service.ts:79-87`

**Risk Score**: 4.5 (Medium)

**Pattern Detected**: One `prisma.$queryRaw` tagged template literal is used in the suppliers service. The Prisma tagged template literal pattern is safe against SQL injection (parameters are parameterized). However, this is the only raw SQL in the codebase and represents a maintenance risk if the pattern is copied incorrectly.

**Code Context**:
```typescript
// backend/src/modules/suppliers/suppliers.service.ts:79-87
const receivedRows = await prisma.$queryRaw<Array<{ totalReceived: any }>>`
    SELECT COALESCE(SUM(("PurchaseOrderItem"."quantityReceived"::numeric) * "PurchaseOrderItem"."unitCost"), 0) AS "totalReceived"
    FROM "PurchaseOrderItem"
    JOIN "PurchaseOrder"
      ON "PurchaseOrder"."tenantId" = "PurchaseOrderItem"."tenantId"
     AND "PurchaseOrder"."id" = "PurchaseOrderItem"."purchaseOrderId"
    WHERE "PurchaseOrderItem"."tenantId" = ${tenantId}
      AND "PurchaseOrder"."supplierId" = ${supplierId}
`
```

**Impact**: The current usage is safe. The risk is that future developers may use `$queryRawUnsafe` string interpolation following this pattern without understanding the distinction. No active injection vector exists here.

**Recommendation**: Add a code comment explaining that this uses Prisma's safe tagged template literal (parameterized), and document a policy against using `$queryRawUnsafe`. The query could also be rewritten using Prisma's aggregation API.

**Fix Priority**: Low (code quality / future-proofing)

---

#### M-004: No Email Verification for New Tenant Registration

**Location**: `backend/src/modules/auth/routes.ts:13-128`

**Risk Score**: 4.2 (Medium)

**Pattern Detected**: The `/api/register` endpoint immediately creates a fully active tenant and owner account with no email verification step. The created tenant is immediately accessible.

**Impact**: Allows creation of accounts with unowned email addresses. Inhibits password reset flows that assume email ownership. Enables abuse of free trial period (combined with no rate limiting, C-001).

**Recommendation**: Implement an email verification token sent on registration. Tenant account should remain in a `PENDING_VERIFICATION` state until the email link is clicked.

**Fix Priority**: Medium

---

#### M-005: Sensitive Financial Instructions Rendered with v-html in Admin Panel

**Location**: `pages/admin/billing/index.vue:267`

**Risk Score**: 4.8 (Medium)

**Pattern Detected**: The `methodInstructions` computed property is rendered via `v-html` in the admin billing page. Currently the value is fully hardcoded on the client. However, the `t()` i18n function is called with fallback strings, meaning future server-delivered i18n strings could contain HTML tags that would be rendered without escaping.

**Code Context**:
```typescript
// pages/admin/billing/index.vue:577-604
const methodInstructions = computed(() => {
    ...
    return t('admin.pages.billing.payment.instructions.baridimob', { amount: formatDzd(finalAmount) })
        || `Please send ${formatDzd(finalAmount)} DZD via BaridiMob...`
})
```

```html
<div v-html="methodInstructions"></div>
```

**Impact**: If i18n translations are ever loaded from a server (rather than static bundled files), or if a dependency supplying translation strings is compromised, this becomes an XSS vector in the admin panel.

**Recommendation**: Replace `v-html` with `{{ methodInstructions }}` using CSS `white-space: pre-line` for the newline-formatting effect, which eliminates the HTML rendering entirely.

**Fix Priority**: Medium

---

#### M-006: Devtools Enabled in Production Build Configuration

**Location**: `nuxt.config.ts:9`

**Risk Score**: 4.0 (Medium)

**Pattern Detected**: `devtools: { enabled: true }` is hardcoded in `nuxt.config.ts` without any environment-based toggle.

**Code Context**:
```typescript
// nuxt.config.ts:9
devtools: { enabled: true },
```

**Impact**: Nuxt devtools expose internal SSR state, component trees, and timing information. In a production build, this may expose implementation details useful for attackers performing reconnaissance. The `devtools` module also increases bundle size and may emit debug endpoints.

**Recommendation**: Change to `devtools: { enabled: process.env.NODE_ENV !== 'production' }`.

**Fix Priority**: Medium

---

### Low Risk Findings

#### L-001: JWT Access Token and Local File Token Share the Same Secret

**Location**: `backend/src/lib/jwt.ts:3-8`, `backend/src/lib/local-file-token.ts:10-13`

**Risk Score**: 3.2 (Low)

**Pattern Detected**: Both `signAccessToken` (user auth) and `signLocalFileToken` (file download) use `JWT_SECRET` from the environment variable. The tokens differ only in the `kind` field claim. If an attacker can forge a `local-file` token using a valid access token as a starting point (which they cannot with HS256), cross-token use could occur.

**Impact**: Low in practice due to HS256 being opaque. However, secret rotation affects both token types simultaneously. If `JWT_SECRET` is rotated to invalidate sessions, all pending local file download links also become invalid. Separation of concerns is violated.

**Recommendation**: Use distinct secrets: `JWT_ACCESS_SECRET` and `JWT_FILE_SECRET`. This allows independent rotation and provides cryptographic domain separation.

**Fix Priority**: Low

---

#### L-002: HTTP dev Server Exposed on 0.0.0.0

**Location**: `nuxt.config.ts:66-68`

**Risk Score**: 2.5 (Low)

**Pattern Detected**: `devServer.host: '0.0.0.0'` binds the development server to all network interfaces. Combined with `vite.server.allowedHosts: ['.nip.io', '.localhost']` and `cors: true`, the dev server is accessible from any machine on the LAN without authentication.

**Code Context**:
```typescript
// nuxt.config.ts:66-75
devServer: { host: '0.0.0.0' },
vite: {
    server: {
        allowedHosts: ['.nip.io', '.localhost'],
        cors: true
    }
}
```

**Impact**: Development databases, API keys, and tenant data can be accessed by anyone on the same network (office, home network, public WiFi). This is an intentional dev convenience feature but should not reach staging/production environments without firewalling.

**Recommendation**: Ensure CI/CD and staging deployments override `NUXT_DEV_HOST` to `127.0.0.1`. Add a startup warning when `NODE_ENV !== 'production'` and `host === '0.0.0.0'`.

**Fix Priority**: Low (dev environment only)

---

#### L-003: Superadmin Audit Logs Not Paginated

**Location**: `backend/src/modules/superadmin/routes.ts:10-19`

**Risk Score**: 2.0 (Low)

**Pattern Detected**: The `/api/super-admin/audit-logs` endpoint returns the latest 100 records with `take: 100` and no pagination. On a busy platform, this may be insufficient for forensic investigations and the endpoint has no filtering capability.

**Code Context**:
```typescript
// superadmin/routes.ts:10-19
router.get('/audit-logs', async (req, res) => {
    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
    })
```

**Impact**: Operational limitation rather than a direct security vulnerability. Forensic analysis of security incidents would be hampered by the fixed 100-record window.

**Recommendation**: Add `page`, `limit`, and `tenantId` filter query parameters. Implement proper cursor-based pagination for the audit log endpoint.

**Fix Priority**: Low

---

#### L-004: bcrypt Work Factor at Minimum Recommended Value

**Location**: `backend/src/modules/auth/routes.ts:54`, `backend/src/modules/users/users.service.ts:103`, `backend/src/modules/tenants/routes.ts:61`

**Risk Score**: 2.8 (Low)

**Pattern Detected**: All password hashing uses `bcrypt.hash(password, 10)` — a cost factor of 10. This is the OWASP minimum (2023 recommendation is cost factor 12 for bcrypt, or Argon2id).

**Impact**: On modern hardware, bcrypt with cost factor 10 can be computed at approximately 10-20 hashes/second per GPU core. Factor 12 roughly halves the attack throughput. The impact is low given bcrypt's inherent resistance, but not at the OWASP-recommended level.

**Recommendation**: Increase to `bcrypt.hash(password, 12)` in all three locations. Alternatively, migrate to `argon2id` which is the current OWASP preferred algorithm.

**Fix Priority**: Low

---

#### L-005: No Structured Error Logging (Stack Traces to stdout)

**Location**: Multiple — all `console.error('...error:', error)` patterns throughout backend modules

**Risk Score**: 1.8 (Low)

**Pattern Detected**: All error handlers use `console.error` with the raw `error` object. In some environments, this can expose internal stack traces, file paths, and ORM query details in log aggregators accessible to non-security personnel.

**Impact**: Information disclosure in logs. Stack traces containing Prisma query structures or internal file paths could aid attackers with log access in understanding the system architecture.

**Recommendation**: Implement a structured logger (e.g., `pino`) that sanitizes stack traces in production and emits structured JSON. Include correlation IDs for request tracing without exposing internal implementation details.

**Fix Priority**: Low

---

## Architecture Security Assessment

### Authentication & Authorization Analysis

**Strengths:**
- JWT algorithm is pinned to `['HS256']` on verification — preventing algorithm confusion attacks (e.g., RS256→HS256 substitution).
- The `verifyAccessToken` function is correct and the `getJwtSecret()` function throws at startup if `JWT_SECRET` is unset.
- Auth middleware fetches the live user record from the DB on each request (`prisma.user.findFirst`) with `isActive: true` check — this provides near-real-time account deactivation propagation.
- RBAC middleware correctly enforces `user.tenantId === tenant.id` cross-tenant check.
- The `isSuperAdmin` flag is only settable through direct DB operations; the user creation API in `users.service.ts` does not expose it.
- Password hashing uses bcryptjs consistently across all user creation paths.
- Local file download uses a separate short-lived JWT with `kind: 'local-file'` claim validation and path traversal protection.

**Weaknesses:**
- No token revocation (H-002).
- No rate limiting on auth endpoints (C-001).
- Timing side-channel on login (M-001).
- No email verification on registration (M-004).
- Password policy absent at `/api/register` (H-004).
- 24-hour token lifetime is excessive.

### Data Protection Analysis

**Tenant Isolation:**
Tenant isolation was reviewed across all major modules. All reviewed Prisma queries include `tenantId` scoping:
- Orders service: all queries scoped by `tenantId`
- Products service: all queries scoped by `tenantId`
- Customers service: all queries scoped by `tenantId` (via compound unique key `tenantId_id`)
- Cash service: all queries scoped by `tenantId`
- Inventory service: all queries scoped by `tenantId`
- Dashboard service: all `count` and `findMany` queries include `where: { tenantId }`
- Delivery service: shipments scoped by `tenantId`
- Superadmin routes: correctly query cross-tenant (intended behavior, protected by `requireSuperAdmin`)

No cross-tenant data leakage was found in the Prisma query layer. This is the most critical security property and it is correctly implemented.

**Password Storage:**
bcryptjs with cost factor 10 is used consistently. Passwords are never returned in API responses (confirmed by `const { passwordHash, ...userInfo } = user` pattern in auth routes).

**Sensitive Data:**
- Payment credentials (Maystro API tokens, Yalidine credentials) are stored in `TenantDeliveryAccount.config` as JSON in the database. This is acceptable if the DB is encrypted at rest.
- Telegram bot tokens are stored in the integrations table — same consideration applies.

**File Upload Security:**
Upload service validates MIME type against an allowlist (`image/png`, `image/jpeg`, `image/webp`), enforces a 5MB size limit, and uses `crypto.randomBytes(6)` nonces in file keys. Uploaded images are processed through `sharp` (image optimization), which also prevents polyglot file exploits.

### Dependency Security Analysis

Dependencies reviewed from `package.json`. Notable observations:

| Package | Version Constraint | Note |
|---------|-------------------|------|
| `express` | `^5.2.1` | Express 5 — relatively recent, no known critical CVEs |
| `jsonwebtoken` | `^9.0.3` | Current major version, no known critical CVEs |
| `bcryptjs` | `^3.0.3` | OK; `bcrypt` native also listed (`^6.0.0`) — dual dependency may cause confusion |
| `axios` | `^1.13.2` | OK — SSRF risk is in caller logic, not axios itself |
| `multer` | `^2.0.2` | Recent major version |
| `@aws-sdk/*` | `^3.975.0` | AWS SDK v3 — OK |
| `prisma` | `^5.22.0` | Prisma 5 — current |
| `telegraf` | `^4.16.3` | OK |
| `@vueup/vue-quill` | `^1.2.0` | Quill 2.x — Quill's sanitization is not a replacement for server-side sanitization |

**Key concern**: Both `bcrypt` (native) and `bcryptjs` (pure JS) are listed as dependencies. `bcryptjs` is used in code (confirmed via `import bcrypt from 'bcryptjs'`). The `bcrypt` dependency appears unused but adds to the dependency surface.

A full `npm audit` should be run as part of the CI pipeline. No CVE scan was performed in this audit.

---

## OWASP Top 10 2021 Compliance Analysis

| # | Category | Status | Key Findings |
|---|----------|--------|--------------|
| A01 | Broken Access Control | Partial Pass | Tenant isolation is correct. No privilege escalation found in user management. RBAC middleware is sound. Weakness: no rate limiting enables DoS of access controls. |
| A02 | Cryptographic Failures | Partial Pass | bcrypt cost factor at minimum (10 vs recommended 12). JWT HS256 — acceptable. Both token types share one secret. No TLS enforcement in app code (assumed at infrastructure level). |
| A03 | Injection | Pass | All DB queries use Prisma ORM with parameterized inputs. One `$queryRaw` tagged template is safe. No eval/exec/spawn patterns. File paths are validated against BASE_DIR. |
| A04 | Insecure Design | Partial Fail | No email verification. No password complexity at registration. No account lockout. Webhook secret in URL. |
| A05 | Security Misconfiguration | Fail | No CSP, HSTS, X-Frame-Options, or security headers. Devtools enabled in production config. HTTP dev server on 0.0.0.0. |
| A06 | Vulnerable & Outdated Components | Unknown | No automated CVE scanning in evidence. Dual bcrypt dependency. Full `npm audit` not performed. |
| A07 | Identification & Authentication Failures | Fail | No rate limiting on login/register. No token revocation. 24h token lifetime. No MFA support. Timing oracle on login. Sensitive auth data in logs. |
| A08 | Software & Data Integrity Failures | Partial Pass | Maystro webhook uses timing-safe secret comparison. No HMAC signature verification on webhooks. Subresource Integrity (SRI) not configured for external Google Fonts. |
| A09 | Security Logging & Monitoring Failures | Partial Fail | Audit middleware present and logs mutations. Audit log endpoint is superadmin-protected. Weaknesses: email/password outcome logged in auth, no structured logging, audit logs limited to 100 records. |
| A10 | Server-Side Request Forgery (SSRF) | Pass | Delivery provider URLs are hardcoded constants (`DEFAULT_BASE_URL`) or controlled environment variables — not user-supplied. No user-controlled URL fetch patterns found. |

---

## Technical Recommendations

### Immediate Code Fixes

1. **Add rate limiting** — Install `express-rate-limit` and apply to `/api/login` (10 req/15min), `/api/register` (5 req/hour), and `POST /api/orders` (30 req/hour).
2. **Remove auth console.log statements** — Lines 136, 177, 187 of `backend/src/modules/auth/routes.ts`.
3. **Sanitize product descriptions before v-html** — Add `isomorphic-dompurify` to all storefront templates and the billing page.
4. **Add email format validation** — Validate `normalizedEmail` against RFC 5321 pattern or `validator.isEmail()` at `/api/register`.
5. **Add password length validation at registration** — `password.length >= 8` check before `bcrypt.hash`.
6. **Disable devtools in production** — `devtools: { enabled: process.env.NODE_ENV !== 'production' }`.

### Security Enhancements

1. **Configure security headers** — Add `helmet` to Express, configure CSP in Nuxt `routeRules`.
2. **Implement token revocation** — Reduce access token to 15-30 minutes, add refresh token (httpOnly cookie, 7-day), add `POST /api/logout`.
3. **Add dummy bcrypt call for timing normalization** at login on user-not-found path.
4. **Implement email verification** — Verification token sent on registration; tenant in `PENDING_VERIFICATION` state until confirmed.
5. **Separate JWT secrets** — `JWT_ACCESS_SECRET` and `JWT_FILE_SECRET`.
6. **Move webhook secret to HTTP header** — Register Maystro webhooks with `X-Webhook-Secret` header instead of query parameter.
7. **Increase bcrypt work factor** — Change cost factor from 10 to 12 in all three hashing locations.

### Architecture Improvements

1. **Structured logging** — Replace `console.log/error` with `pino` or equivalent. Sanitize sensitive fields.
2. **Automated dependency scanning** — Add `npm audit --audit-level=high` to CI pipeline.
3. **Paginate audit logs** — Add cursor pagination and filtering to `/api/super-admin/audit-logs`.
4. **Remove unused `bcrypt` dependency** — Keep only `bcryptjs` to reduce attack surface.
5. **CSP reporting** — Configure `Content-Security-Policy-Report-Only` before enforcing CSP to catch policy violations.
6. **SRI for external resources** — Add `integrity` attributes to Google Fonts `<link>` tags.

---

## Code Remediation Examples

### Example 1: Add Rate Limiting to Login (C-001)

**Before** (`backend/src/app.ts`):
```typescript
app.use(expressTenantMiddleware)
app.use(expressAuthMiddleware)
// ... no rate limiting
app.use('/api', routes)
```

**After**:
```typescript
import rateLimit from 'express-rate-limit'

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { statusCode: 429, statusMessage: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
})

const publicOrderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30,
    message: { statusCode: 429, statusMessage: 'Order limit reached, please try again later' }
})

app.use(expressTenantMiddleware)
app.use(expressAuthMiddleware)
// ...
app.use('/api/login', loginLimiter)
app.use('/api/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }))
// Applied in public orders router
```

---

### Example 2: Remove Sensitive Logging and Add Timing Normalization (H-001, M-001)

**Before** (`backend/src/modules/auth/routes.ts:136-193`):
```typescript
console.log('Login attempt:', { email: normalizedEmail, passwordProvided: !!password })
// ...
console.log('Login user found:', user ? user.email : 'not found')
// ...
if (!user || !user.passwordHash) {
    return res.status(401).json({ statusCode: 401, statusMessage: 'Invalid credentials' })
    // Returns immediately — timing oracle
}
const isValid = await bcrypt.compare(password, user.passwordHash)
console.log('Login password valid:', isValid)
```

**After**:
```typescript
// Remove all three console.log statements
const DUMMY_HASH = '$2b$10$X9pL7vT6A2mQjO5k9sXXuuBkEFGhqUJSTjhRLuVVU3hV3MGWST5Oi' // pre-computed

if (!user || !user.passwordHash) {
    await bcrypt.compare(password, DUMMY_HASH) // normalize timing
    return res.status(401).json({ statusCode: 401, statusMessage: 'Invalid credentials' })
}
const isValid = await bcrypt.compare(password, user.passwordHash)
// No logging of isValid
```

---

### Example 3: Sanitize v-html Product Description (C-002)

**Before** (all storefront Product.vue templates):
```vue
<div v-html="product.description"></div>
```

**After**:
```vue
<script setup>
import DOMPurify from 'isomorphic-dompurify'
const sanitizedDescription = computed(() =>
    DOMPurify.sanitize(product.value?.description || '', {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'p', 'br', 'a'],
        ALLOWED_ATTR: ['href', 'target', 'rel']
    })
)
</script>
<template>
    <div v-html="sanitizedDescription"></div>
</template>
```

---

### Example 4: Add Security Headers (H-003)

**Before** (`backend/src/app.ts`):
```typescript
app.disable('x-powered-by')
```

**After**:
```typescript
import helmet from 'helmet'

app.disable('x-powered-by')
app.use(helmet({
    crossOriginEmbedderPolicy: false, // Required for S3 image embedding
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
        }
    },
    hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}))
```

---

## Risk Mitigation Priorities

### Phase 1: Critical Vulnerability Remediation (Week 1)

| Action | Finding | Effort |
|--------|---------|--------|
| Add rate limiting to login, register, public order endpoints | C-001 | Low (1-2 hours) |
| Install DOMPurify and sanitize all v-html product descriptions | C-002 | Medium (4-6 hours) |
| Remove sensitive console.log statements from auth routes | H-001 | Low (15 minutes) |
| Add dummy bcrypt call for timing normalization | M-001 | Low (30 minutes) |
| Add email format validation and password length check at registration | H-004 | Low (1 hour) |

### Phase 2: High Risk Resolution (Week 2-3)

| Action | Finding | Effort |
|--------|---------|--------|
| Install helmet and configure security headers in Express and Nuxt | H-003 | Medium (4-8 hours) |
| Reduce JWT access token lifetime to 30 minutes; add refresh token | H-002 | High (1-2 days) |
| Move Maystro webhook authentication from query param to HTTP header | H-005 | Medium (2-4 hours) |
| Add `POST /api/logout` endpoint | H-002 | Low (2 hours) |

### Phase 3: Medium Risk and Configuration (Week 4-6)

| Action | Finding | Effort |
|--------|---------|--------|
| Add email verification flow for new registrations | M-004 | High (2-3 days) |
| Disable Nuxt devtools in production | M-006 | Low (15 minutes) |
| Replace v-html in admin billing page with text interpolation | M-005 | Low (30 minutes) |
| Document and enforce TRUST_PROXY operational requirements | M-002 | Low (documentation) |
| Add code review policy against `$queryRawUnsafe` | M-003 | Low (documentation) |

### Phase 4: Security Hardening (Ongoing)

| Action | Finding | Effort |
|--------|---------|--------|
| Implement structured logging with pino | L-005 | Medium (1 day) |
| Run `npm audit` in CI and block on high/critical CVEs | L-001 | Low (CI config) |
| Increase bcrypt cost factor to 12 | L-004 | Low (30 minutes) |
| Separate JWT secrets for access and file tokens | L-001 | Low (1 hour) |
| Add pagination to superadmin audit logs endpoint | L-003 | Low (2 hours) |
| Remove unused `bcrypt` (native) dependency | Architecture | Low (15 minutes) |
| Configure CSP-Report-Only header before enforcement | H-003 | Low (config) |
| Add SRI to external Google Fonts links | A08 | Low (1 hour) |

---

## Summary

The Swekly platform demonstrates a well-structured multi-tenant architecture with strong tenant isolation implemented consistently across all reviewed database queries. The RBAC and RBAC-adjacent middleware (tenant resolution, user verification, subscription enforcement) are correctly implemented and compose without obvious bypass conditions.

The most urgent security concerns are operational rather than architectural: the complete absence of rate limiting leaves every endpoint vulnerable to brute-force and DoS attacks, and the combined effect of unsanitized `v-html` rendering with absent Content Security Policy headers creates a stored XSS surface across all tenant storefronts that would allow tenant admins (or compromised admin accounts) to inject malicious JavaScript into customer browsers.

Addressing the two Critical findings (rate limiting, XSS/CSP) and the sensitive logging issue (H-001) before any production traffic is handled is strongly recommended. The remaining findings follow standard web security hygiene practices and can be addressed in subsequent sprints without blocking deployment, provided the Critical items are resolved first.

---

*Report generated by manual code review on 2026-04-16.*
*Auditor: Claude Sonnet 4.6 (Anthropic) via Claude Code*
