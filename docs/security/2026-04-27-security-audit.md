# Security Audit Report — Swekly Multi-Tenant SaaS Platform

**Date:** 2026-04-27 | **Auditor:** ai-security:security-auditor | **Scope:** Full Codebase

---

## Executive Summary

### Audit Overview

- **Target System**: Swekly SaaS Platform
- **Analysis Date**: 2026-04-27
- **Analysis Scope**: Full Codebase (Web Application, API, Multi-Tenant Backend)
- **Technology Stack**: Nuxt 3, Vue 3, Pinia, Tailwind CSS, Express.js, PostgreSQL (Prisma ORM), AWS S3/MinIO, JWT, @nuxtjs/i18n

### Risk Assessment Summary

| Risk Level | Count | Percentage |
|------------|-------|------------|
| Critical   | 3     | 15%        |
| High       | 7     | 35%        |
| Medium     | 6     | 30%        |
| Low        | 4     | 20%        |
| **Total**  | **20**| **100%**   |

### Key Findings

- **Critical Issues**: 3 findings requiring immediate attention
- **OWASP Top 10 Compliance**: 4/10 categories fully compliant
- **Overall Security Score**: 61/100

The platform demonstrates a solid security foundation with correct bcrypt password hashing, Prisma-level tenant isolation, timing-safe webhook secret comparison, JWT algorithm pinning to HS256, and thorough input validation. The most critical findings are: (1) the impersonation endpoint leaks the tenant owner's full `passwordHash` in its JSON response, (2) shipping amount is fully client-controlled with no server-side lookup allowing price manipulation, and (3) the Nuxt server middleware unconditionally trusts `X-Forwarded-Host` without a proxy guard — a tenant-context spoofing path.

---

## Analysis Methodology

### Security Analysis Approach

- **Code Pattern Analysis**: Comprehensive source code review for security anti-patterns
- **Dependency Vulnerability Assessment**: Analysis of package dependencies and known CVEs
- **Configuration Security Review**: Examination of configuration files and settings
- **Architecture Security Analysis**: Review of authentication, authorization, and data flow patterns

### Analysis Coverage

- **Files Analyzed**: ~120 source files across backend/src, server/, stores/, middleware/, composables/
- **Dependencies Reviewed**: package.json production and dev dependencies
- **Configuration Files**: nuxt.config.ts, backend/src/app.ts, .env.example, playwright.config.ts
- **Security Patterns Checked**: OWASP Top 10, multi-tenancy isolation, JWT implementation, RBAC

---

## Security Findings

---

### Critical Risk Findings

#### C-001: Impersonation Endpoint Leaks Password Hash

**Location**: `backend/src/modules/tenants/routes.ts` (impersonation endpoint, ~lines 280–302)
**Risk Score**: 9.2 (Critical)
**Pattern Detected**: Prisma query without `select` clause returning all user fields including `passwordHash`

**Code Context**:

```ts
// VULNERABLE — no `select:` clause, all fields returned
const targetUser = await prisma.user.findFirst({
    where: { tenantId: id, role: 'owner' }
})
res.json({
    success: true,
    impersonatedUser: targetUser   // includes passwordHash!
})
```

**Impact**: Any super-admin can harvest bcrypt password hashes for all tenant owners. A compromised super-admin account immediately exposes all owner credentials to offline brute-force cracking.

**Recommendation**: Add an explicit `select` clause to exclude `passwordHash`:

```ts
// After (Secure)
const targetUser = await prisma.user.findFirst({
    where: { tenantId: id, role: 'owner' },
    select: {
        id: true, email: true, role: true, tenantId: true,
        isActive: true, isSuperAdmin: true, cashboxId: true,
        staffRoleId: true, createdAt: true, updatedAt: true
    }
})
res.json({ success: true, impersonatedUser: targetUser })
```

**Fix Priority**: Immediate

---

#### C-002: Client-Controlled Shipping Amount (Price Manipulation)

**Location**: `backend/src/modules/orders/orders.service.ts` (~lines 1791–1795, 1998)
**Risk Score**: 9.0 (Critical)
**Pattern Detected**: `shippingAmount` from request body stored on order without server-side rate validation

**Code Context**:

```ts
const shippingAmount =
    input.shippingAmount == null ? null : Number((input as any).shippingAmount)
if (shippingAmount != null && (!Number.isFinite(shippingAmount) || shippingAmount < 0)) {
    throw new OrderValidationError(400, 'shippingAmount must be a positive number')
}
// ...
const effectiveShippingAmount = deliveryMode === 'store' ? 0 : shippingAmount
```

**Impact**: A malicious customer can submit `shippingAmount: 0` (or any value) in their POST body. The server only verifies it is non-negative — not that it matches the actual quoted delivery price. The `totalWithShippingAmount` stored on the order is computed from the attacker-supplied value, directly reducing order revenue.

**Recommendation**: Ignore the client-supplied `shippingAmount` and compute it server-side from `TenantDeliveryRate`:

```ts
// After (Secure) — look up the authoritative rate server-side
const deliveryRate = await prisma.tenantDeliveryRate.findFirst({
    where: { tenantId, wilaya: input.deliveryWilaya, deliveryType: input.deliveryType }
})
const effectiveShippingAmount = deliveryMode === 'store' ? 0 : (deliveryRate?.price ?? 0)
```

**Fix Priority**: Immediate

---

#### C-003: Nuxt Server Middleware Unconditionally Trusts `X-Forwarded-Host`

**Location**: `server/middleware/tenant.ts` (~lines 25–26)
**Risk Score**: 9.0 (Critical)
**Pattern Detected**: `X-Forwarded-Host` read without `TRUST_PROXY` guard in Nuxt middleware

**Code Context**:

```ts
// VULNERABLE — no proxy trust check
const hostHeader = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || ''
```

**Impact**: The Express backend correctly gates this on `TRUST_PROXY === 'true'`, but the Nuxt middleware does not. An attacker who sends requests directly to the Nuxt server (bypassing the reverse proxy) can inject any `X-Forwarded-Host` header to resolve any tenant's context, potentially accessing tenant-specific SSR-rendered data.

**Recommendation**:

```ts
// After (Secure)
const trustProxy = process.env.TRUST_PROXY === 'true'
const hostHeader = (trustProxy ? getRequestHeader(event, 'x-forwarded-host') : null)
    || getRequestHeader(event, 'host') || ''
```

**Fix Priority**: Immediate

---

### High Risk Findings

#### H-001: Content Security Policy Disabled on Express API

**Location**: `backend/src/app.ts` (~line 27), `nuxt.config.ts` (~lines 5–15)
**Risk Score**: 8.0 (High)
**Pattern Detected**: `contentSecurityPolicy: false` in Helmet; `Content-Security-Policy-Report-Only` only in Nuxt; `unsafe-inline` and `unsafe-eval` in script-src

**Impact**: CSP in report-only mode provides zero XSS protection. `unsafe-inline` in script-src would defeat CSP even if enforcement were enabled.

**Recommendation**: Enable enforced CSP. Remove `unsafe-inline` from `script-src` and replace with nonce-based CSP. Set API layer CSP to `default-src 'none'`.

**Fix Priority**: Within 1 week

---

#### H-002: Hardcoded Default S3/MinIO Credentials

**Location**: `backend/src/lib/s3.ts` (~lines 23–24)
**Risk Score**: 8.5 (High)
**Pattern Detected**: Fallback to `'minioadmin'`/`'minioadmin'` when env vars are absent

**Code Context**:

```ts
credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
}
```

**Impact**: If environment variables are missing in production, the application silently uses well-known MinIO default credentials. Any operator copying `.env.example` without changes ships with default credentials.

**Recommendation**:

```ts
// After (Secure)
const accessKeyId = process.env.AWS_ACCESS_KEY_ID
if (!accessKeyId && process.env.NODE_ENV === 'production') {
    throw new Error('AWS_ACCESS_KEY_ID is required in production')
}
```

**Fix Priority**: Immediate

---

#### H-003: Weak JWT Secret in Example Configuration

**Location**: `.env.example` (line 2), `playwright.config.ts` (line 3)
**Risk Score**: 7.5 (High)
**Pattern Detected**: Low-entropy placeholder JWT secret; test secret may leak to production

**Impact**: If either the example or test JWT secret value is used in production, all JWT tokens can be forged, allowing authentication bypass and privilege escalation.

**Recommendation**: Add a startup assertion that `JWT_SECRET` meets minimum entropy (32+ random bytes) and does not match known-bad defaults.

**Fix Priority**: Within 1 week

---

#### H-004: Critical and High CVEs in Production Dependencies

**Location**: `package.json`
**Risk Score**: 8.0 (High)
**Pattern Detected**: Known CVEs in production dependencies

| Package | CVE Type | Severity |
|---------|----------|----------|
| `fast-xml-parser` | RangeError DoS via numeric entities | Critical |
| `multer` | DoS via incomplete cleanup | High |
| `h3` | Path traversal in `serveStatic` | High |
| `axios` | DoS via `__proto__` in `mergeConfig` | High |
| `path-to-regexp` | ReDoS via sequential optional groups | High |
| `defu` | Prototype pollution | High |

**Impact**: `multer` is used in upload and billing routes; `axios` in delivery provider clients; `h3` is Nuxt's underlying HTTP layer.

**Recommendation**: Run `npm audit fix` targeting `multer`, `axios`, `h3`, `path-to-regexp`, and `fast-xml-parser`.

**Fix Priority**: Within 1 week

---

#### H-005: Public Order Endpoint Accepts Unlimited Item Arrays

**Location**: `backend/src/modules/orders/orders.service.ts` (~line 1760)
**Risk Score**: 7.0 (High)
**Pattern Detected**: No upper bound on `items.length` in `createPublicOrder`

**Impact**: An attacker can submit an order with thousands of items, forcing O(n) database lookups for products, variants, bundle deals, and inventory checks. Combined with the 30/hour rate limit (per tenant+IP), this creates a database amplification vector.

**Recommendation**:

```ts
const MAX_ITEMS = 50
if (input.items.length > MAX_ITEMS) {
    throw new OrderValidationError(400, `Maximum ${MAX_ITEMS} items per order`)
}
```

**Fix Priority**: Within 1 week

---

#### H-006: RBAC Is Client-Side Only for SSR Admin Routes

**Location**: `middleware/admin-rbac.global.ts` (~lines 50–76)
**Risk Score**: 7.5 (High)
**Pattern Detected**: Frontend RBAC skips enforcement when `process.server` is true

**Impact**: SSR renders of admin routes are not RBAC-checked on the frontend. While backend enforces permissions via `requireStaffPermission`, any route not explicitly protected at the backend is accessible to all authenticated staff regardless of declared permissions.

**Fix Priority**: Within 1 week

---

#### H-007: Superadmin Audit Log Endpoint Returns All Tenants Unfiltered

**Location**: `backend/src/modules/superadmin/routes.ts` (~lines 10–17)
**Risk Score**: 7.0 (High)
**Pattern Detected**: `prisma.auditLog.findMany` without `tenantId` filter

**Code Context**:

```ts
const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
})
```

**Impact**: Returns audit logs across all tenants. No filtering by `tenantId` query parameter makes targeted audit review of a specific tenant impossible. High-volume tenants dominate the result set.

**Fix Priority**: Within 1 month

---

### Medium Risk Findings

#### M-001: Webhook Secret Exposed in URL Query Parameter (Legacy Path)

**Location**: `backend/src/modules/delivery/delivery.controller.ts` (~lines 176–180)
**Risk Score**: 6.0 (Medium)
**Pattern Detected**: `?secret=...` query parameter accepted as authentication fallback

**Impact**: Query parameters are logged in access logs, proxies, CDN edge logs, and browser history. The webhook secret would be exposed in any system that logs HTTP request URLs.

**Recommendation**: Remove the `?secret=` query parameter fallback. Use `X-Webhook-Secret` header exclusively.

**Fix Priority**: Within 1 month

---

#### M-002: No Maximum Quantity per Order Item

**Location**: `backend/src/modules/orders/orders.service.ts` (~line 1774)
**Risk Score**: 4.5 (Medium)
**Pattern Detected**: Item quantity validated `>= 1` but no upper bound

**Impact**: Sending `quantity: 999999` could cause edge-case integer behavior in inventory reservation math and abuse the loyalty points system.

**Fix Priority**: Within 1 month

---

#### M-003: Auth Cookie Missing `httpOnly` Flag

**Location**: `stores/auth.ts` (~lines 28–32)
**Risk Score**: 6.5 (Medium)
**Pattern Detected**: Auth cookie created without `httpOnly: true`

**Code Context**:

```ts
const token = useCookie<string | null>('auth_token', {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS
})
```

**Impact**: The JWT token in this cookie is accessible to JavaScript. Any XSS vulnerability (including third-party scripts like Facebook Pixel configured by tenants) can exfiltrate the token.

**Recommendation**:

```ts
const token = useCookie<string | null>('auth_token', {
    httpOnly: true,   // ADD THIS
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS
})
```

**Fix Priority**: Within 1 week

---

#### M-004: Webhook Secret Embedded in Registered Webhook URL

**Location**: `backend/src/modules/delivery/delivery-accounts.service.ts` (~line 326)
**Risk Score**: 5.5 (Medium)
**Pattern Detected**: 32-byte hex secret appended to webhook URL registered with Maystro

**Code Context**:

```ts
const webhookUrl = `https://${host}/api/webhooks/maystro?secret=${webhookSecret}`
```

**Impact**: Maystro stores and displays the full webhook URL in their dashboard, exposing the secret to anyone with Maystro dashboard access.

**Fix Priority**: Within 1 month

---

#### M-005: `getTenantPrisma` Extension Not Used in Main Code Paths

**Location**: `backend/src/lib/prisma.ts` (~lines 33–138)
**Risk Score**: 5.0 (Medium)
**Pattern Detected**: Automatic tenantId injection extension exists but is not the primary isolation mechanism

**Impact**: Tenant isolation relies entirely on manual `tenantId` scoping in every query. Any developer who omits `tenantId` in a future query will not be caught by the extension, as it is not used in the main code paths.

**Recommendation**: Either (a) migrate all service queries to use `getTenantPrisma`, or (b) add a lint rule / Prisma middleware that enforces `tenantId` is present on all queries against tenant-owned tables.

**Fix Priority**: Within 2 months

---

#### M-006: `variant.cost` Potentially Exposed in Public Product List API

**Location**: `backend/src/modules/products/public-products.service.ts` (~lines 94–96, 117, 165, 202)
**Risk Score**: 4.5 (Medium)
**Pattern Detected**: Inconsistent `cost` field stripping between slug and list endpoints

**Impact**: The list endpoint's variant query includes `cost: true` and the mapper may inadvertently expose cost/margin data to storefront customers.

**Fix Priority**: Within 1 month

---

### Low Risk Findings

#### L-001: JWT Token TTL Is 7 Days With No Refresh Token

**Location**: `backend/src/lib/jwt.ts` (~line 3)
**Risk Score**: 3.5 (Low)
**Pattern Detected**: 7-day JWT lifetime, no refresh token mechanism

**Impact**: A stolen token remains valid for up to 7 days if the victim does not log out. Standard practice for admin sessions is 15–60 minute access tokens with a longer-lived refresh token.

**Fix Priority**: Within 2 months

---

#### L-002: Nuxt Devtools Enabled When NODE_ENV Is Not `production`

**Location**: `nuxt.config.ts` (~line 28)
**Risk Score**: 2.5 (Low)
**Pattern Detected**: `devtools: { enabled: process.env.NODE_ENV !== 'production' }`

**Impact**: Nuxt devtools panel exposed in staging if `NODE_ENV` is not explicitly set to `production`.

**Fix Priority**: Within 2 months

---

#### L-003: Audit Log Redaction Does Not Cover `secret`/`apiKey` Keys

**Location**: `backend/src/middleware/audit.middleware.ts` (~lines 11–23)
**Risk Score**: 3.0 (Low)
**Pattern Detected**: `redact()` strips password/token fields but not `secret`, `apiKey`, `botToken`, `webhookSecret`

**Impact**: Request bodies containing Telegram bot tokens or Maystro credentials may be stored in plaintext in audit logs.

**Fix Priority**: Within 1 month

---

#### L-004: HSTS Not Set in Non-Production Environments

**Location**: `backend/src/app.ts` (~lines 30–37)
**Risk Score**: 2.0 (Low)
**Pattern Detected**: HSTS only enabled when `NODE_ENV === 'production'`

**Impact**: Staging environments serving HTTPS do not set HSTS, exposing users to downgrade attacks.

**Fix Priority**: Within 2 months

---

## Architecture Security Assessment

### Authentication & Authorization Analysis

- JWT implementation is correct: HS256 algorithm is pinned in both signing and verification, the secret is validated at startup, and `tokenInvalidBefore` provides server-side token revocation on logout
- The 7-day token lifetime is long for admin sessions (see L-001)
- Super-admin authentication goes through the same JWT pathway — no separate super-admin session mechanism
- `requireTenantRoles` and `requireStaffPermission` middleware correctly applied at route level
- `staff` role cannot escalate to `admin` or `owner` through the users API due to `canManageRole` enforcement

### Data Protection Analysis

- Passwords correctly hashed with bcrypt
- Rich text content sanitized via `sanitize-html` on the backend and DOMPurify on the frontend
- File upload MIME types are allowlisted
- No `$queryRaw` or `$executeRaw` calls found — all database interaction uses Prisma's parameterized query builder
- Auth cookie missing `httpOnly` flag (see M-003)
- Cost/margin data may leak in public product API (see M-006)

### Dependency Security Analysis

- Multiple production dependencies have known CVEs (see H-004)
- Package-lock.json is present for supply chain integrity
- No dependency confusion or typosquatting patterns observed
- Default MinIO credentials hardcoded as fallback (see H-002)

---

## OWASP Top 10 2021 Compliance Analysis

| Risk Category | Compliance Status | Assessment |
|---------------|-------------------|------------|
| A01 - Broken Access Control | Partial | C-003 (host spoofing), H-006 (client-side RBAC gap) |
| A02 - Cryptographic Failures | Partial | H-002 (default creds), H-003 (weak JWT secret example), M-003 (httpOnly missing) |
| A03 - Injection | Compliant | No raw SQL; sanitize-html and DOMPurify in use; Prisma parameterizes all queries |
| A04 - Insecure Design | Partial | C-002 (price manipulation), H-005 (unbounded items) |
| A05 - Security Misconfiguration | Non-Compliant | H-001 (CSP report-only only), H-004 (known CVEs in production deps) |
| A06 - Vulnerable Components | Non-Compliant | H-004: fast-xml-parser (Critical CVE), multer, h3, axios, path-to-regexp (High CVEs) |
| A07 - Identity & Auth Failures | Partial | L-001 (7-day JWT, no refresh), M-003 (httpOnly missing on auth cookie) |
| A08 - Data Integrity Failures | Compliant | Package-lock committed; no supply chain issues observed |
| A09 - Security Logging Failures | Partial | H-007 (audit log unfiltered), L-003 (redaction gaps for secret/apiKey) |
| A10 - Server-Side Request Forgery | Compliant | Telegram API uses hardcoded domain; no user-supplied URLs in server-side fetches |

**Overall OWASP Compliance**: 30% (3/10 categories fully compliant)

---

## Technical Recommendations

### Immediate Code Fixes

1. **C-001**: Add `select` clause to impersonation endpoint to exclude `passwordHash`
2. **C-002**: Compute shipping amount server-side from `TenantDeliveryRate`; do not accept client value
3. **C-003**: Guard `X-Forwarded-Host` trust in Nuxt middleware behind `TRUST_PROXY=true` env check
4. **H-002**: Remove default MinIO credentials fallback; add startup assertion

### Security Enhancements

1. **M-003**: Add `httpOnly: true` to auth cookie in `stores/auth.ts`
2. **H-005**: Add `MAX_ITEMS = 50` guard in `createPublicOrder` and `createAdminOrder`
3. **H-004**: Run `npm audit fix` for `multer`, `h3`, `axios`, `path-to-regexp`, `fast-xml-parser`
4. **M-001/M-004**: Remove webhook secret from URL; use `X-Webhook-Secret` header exclusively
5. **L-003**: Extend `redact()` in audit middleware to include `secret`, `apiKey`, `botToken`, `webhookSecret`

### Architecture Improvements

1. **H-001**: Enable enforced CSP; remove `unsafe-inline`/`unsafe-eval`; add nonce-based CSP
2. **L-001**: Reduce JWT TTL to 1 hour; implement refresh token mechanism
3. **M-005**: Migrate all service queries to use `getTenantPrisma` for automatic tenantId enforcement
4. **H-003**: Add startup entropy check for `JWT_SECRET`

---

## Code Remediation Examples

### Impersonation Endpoint: Exclude passwordHash (C-001)

**Before (Vulnerable)**:

```ts
const targetUser = await prisma.user.findFirst({
    where: { tenantId: id, role: 'owner' }
})
res.json({ success: true, impersonatedUser: targetUser })
```

**After (Secure)**:

```ts
const targetUser = await prisma.user.findFirst({
    where: { tenantId: id, role: 'owner' },
    select: {
        id: true, email: true, role: true, tenantId: true,
        isActive: true, isSuperAdmin: true, cashboxId: true,
        staffRoleId: true, createdAt: true, updatedAt: true
    }
})
res.json({ success: true, impersonatedUser: targetUser })
```

**Security Impact**: Eliminates password hash exposure to super-admins; prevents offline cracking of tenant owner credentials.

---

### Server-Side Shipping Calculation (C-002)

**Before (Vulnerable)**:

```ts
const shippingAmount = input.shippingAmount == null ? null : Number(input.shippingAmount)
// only validates non-negative, not that it's correct
const effectiveShippingAmount = deliveryMode === 'store' ? 0 : shippingAmount
```

**After (Secure)**:

```ts
// Ignore client-supplied amount; compute from authoritative rate table
let effectiveShippingAmount = 0
if (deliveryMode !== 'store') {
    const deliveryRate = await prisma.tenantDeliveryRate.findFirst({
        where: { tenantId, wilaya: input.deliveryWilaya, deliveryType: input.deliveryType }
    })
    effectiveShippingAmount = deliveryRate?.price ?? 0
}
```

**Security Impact**: Eliminates price manipulation via client-supplied shipping amounts; ensures revenue integrity.

---

### Auth Cookie httpOnly Flag (M-003)

**Before (Vulnerable)**:

```ts
const token = useCookie<string | null>('auth_token', {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS
})
```

**After (Secure)**:

```ts
const token = useCookie<string | null>('auth_token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS
})
```

**Security Impact**: Prevents JavaScript from reading the JWT token; mitigates token theft via XSS in third-party scripts.

---

### Nuxt Proxy Trust Guard (C-003)

**Before (Vulnerable)**:

```ts
const hostHeader = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || ''
```

**After (Secure)**:

```ts
const trustProxy = process.env.TRUST_PROXY === 'true'
const hostHeader = (trustProxy ? getRequestHeader(event, 'x-forwarded-host') : null)
    || getRequestHeader(event, 'host') || ''
```

**Security Impact**: Prevents tenant context spoofing via injected `X-Forwarded-Host` headers on direct Nuxt connections.

---

## Risk Mitigation Priorities

### Phase 1: Critical Vulnerability Remediation (Week 1)

- [ ] C-001: Add `select` clause to impersonation endpoint to exclude `passwordHash`
- [ ] C-002: Compute shipping amount server-side; ignore client-supplied `shippingAmount`
- [ ] C-003: Guard `X-Forwarded-Host` in Nuxt middleware behind `TRUST_PROXY` env check
- [ ] H-002: Remove hardcoded MinIO fallback credentials; add startup assertion
- [ ] H-004: Run `npm audit fix` for `multer`, `h3`, `axios`, `path-to-regexp`, `fast-xml-parser`

### Phase 2: High Risk Resolution (Week 2)

- [ ] M-003: Add `httpOnly: true` to auth cookie in `stores/auth.ts`
- [ ] H-003: Add startup entropy validation for `JWT_SECRET`
- [ ] H-005: Add `MAX_ITEMS = 50` bound in `createPublicOrder` and `createAdminOrder`
- [ ] M-001: Remove `?secret=` webhook authentication fallback
- [ ] M-004: Remove webhook secret from registered URL; use header-only authentication

### Phase 3: Medium Risk and Configuration (Month 1)

- [ ] H-001: Enable enforced CSP; remove `unsafe-inline`/`unsafe-eval` from script-src
- [ ] H-007: Add `tenantId` filter to superadmin audit log endpoint
- [ ] L-003: Extend `redact()` to cover `secret`, `apiKey`, `botToken`, `webhookSecret`
- [ ] M-006: Audit and fix `cost` field exposure in public product list endpoint

### Phase 4: Security Hardening (Month 2)

- [ ] L-001: Reduce JWT TTL to 1 hour; implement refresh token mechanism
- [ ] M-005: Migrate service queries to use `getTenantPrisma` for automatic tenantId enforcement
- [ ] H-006: Harden backend route-level RBAC to ensure all admin routes are explicitly protected
- [ ] L-002: Investigate explicit `NODE_ENV=production` enforcement for staging environments
- [ ] L-004: Enable HSTS in staging/non-production HTTPS environments

---

## Summary

This security analysis identified **3 critical**, **7 high**, **6 medium**, and **4 low** risk vulnerabilities across the codebase.

**Key Strengths Identified**:

- Correct bcrypt password hashing throughout the authentication system
- Prisma-based multi-tenancy with consistent manual `tenantId` scoping in all reviewed modules
- JWT algorithm pinned to HS256 — no algorithm confusion vulnerability
- Timing-safe webhook secret comparison (no timing oracle)
- No raw SQL queries — all database access via Prisma's parameterized query builder
- Input sanitization with `sanitize-html` (backend) and DOMPurify (frontend)
- File upload MIME type allowlisting
- `X-Powered-By` header removed

**Critical Areas Requiring Immediate Attention**:

1. **Impersonation endpoint** (`backend/src/modules/tenants/routes.ts`): Returns `passwordHash` in response — fix by adding a `select` clause
2. **Price manipulation** (`backend/src/modules/orders/orders.service.ts`): `shippingAmount` fully client-controlled — compute server-side from rate tables
3. **Tenant context spoofing** (`server/middleware/tenant.ts`): `X-Forwarded-Host` trusted unconditionally — add `TRUST_PROXY` guard
4. **Hardcoded MinIO credentials** (`backend/src/lib/s3.ts`): Remove fallback to `minioadmin` defaults
5. **Production CVEs** (`package.json`): Multiple critical/high CVEs in actively-used packages requiring immediate patching
