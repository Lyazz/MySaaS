# Super-admin AI administration

**Date:** 2026-09-05
**Status:** Implemented

## Problem

Everything about AI document import was configuration the operator could not
reach. The switch, the model and the page ceiling were four environment
variables read directly from `process.env` in `backend/src/lib/anthropic.ts`;
the per-plan monthly page allowance was a hardcoded field in
`shared/pricing/plans.ts`. Changing any of them meant a redeploy, and nobody
could see what the platform was spending per tenant without querying the
database by hand.

## Scope

Super admin gains control of:

1. The AI on/off switch, the model, and the maximum pages per document.
2. The monthly AI page quota per plan.
3. A read-only usage and token-spend report, per tenant and per model.

**Out of scope, deliberately:** the `ANTHROPIC_API_KEY`. It is a deployment
secret, not an operator setting. Storing it in a table only moves it somewhere a
database dump can reach, and no dashboard convenience is worth that. The screen
reports whether a key is present and nothing more.

## Design

### Storage

Two platform-level tables, neither tenant-scoped — this is operator
configuration, not tenant data, and only `requireSuperAdmin` routes touch it.
The schema carries a comment saying so, so the missing `tenantId` does not read
as a tenancy bug.

```prisma
model PlatformSetting {
  key   String @id   // "ai.documents"
  value Json
  updatedByUserId String?
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}

model PlanOverride {
  planCode String @id
  aiScansPerMonth Int?   // null = no override, use the code default
  updatedByUserId String?
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}
```

A generic key/value row rather than a typed `AiSettings` model: one migration
serves every future platform-wide setting, and the typed guarantee moves into
the accessor, which is where the validation has to live anyway.

`PlanOverride`'s nullable column means an override can always be reverted
without remembering what the original number was.

### Resolution order

Every field resolves **database → environment → built-in default**. The
environment layer is what makes this shippable: an existing deployment keeps
running on its current env vars, and the operator takes over one field at a time
by saving it. The API returns which layer supplied each value so the UI can say
"From environment" next to a field nobody has set.

### Modules

| File | Responsibility |
|---|---|
| `shared/ai/models.ts` | The curated model catalogue. Shared so the dropdown and the server-side validation cannot drift. |
| `backend/src/lib/platform-settings.ts` | The only reader/writer of `PlatformSetting`. Validation, resolution, 30s cache. |
| `backend/src/lib/plan-limits.ts` | The only reader/writer of `PlanOverride`. `resolvePlan()` merges overrides over `plans.ts`. |
| `backend/src/lib/anthropic.ts` | Client construction and the env-owned API key. Now async, reading through the settings accessor. |
| `backend/src/modules/superadmin/ai/` | Controller / service / routes, per the module rule. |
| `pages/super-admin/ai.vue` | The screen, built from the admin design kit. |

Malformed stored values are dropped rather than thrown on, and a failed settings
read falls back to env with a logged error. A settings table must never be the
reason a merchant's upload 500s.

### Caching

Both accessors cache for 30 seconds. A change reaches every instance within half
a minute rather than instantly — the deliberate trade for not querying the
database on every AI request. Saving busts the writing process's own cache.

### Quota consistency

`AiDocumentsService.enforceScanQuota` and
`BillingService.getTenantBillingSnapshot` both read the plan through
`resolvePlan()`. If they diverged, a merchant would watch a usage bar that never
fills refuse their upload. A test pins them together.

### Async refactor

`isAiEnabled`, `aiDocumentModel`, `aiDocumentMaxPages` and `getAnthropicClient`
became async. All six call sites were already inside async functions, so the
change is mechanical. The reaper's kill switch moved from a boot-time env read
to a per-tick settings read, so toggling AI off stops it without a restart.

### Cross-tenant read

The usage report is the one place in the codebase that queries `AiDocumentJob`
across tenants. It sits behind `requireSuperAdmin` and aggregates only — no
document contents, extraction payloads or draft lines leave a tenant.

## Audit

Every write logs: `SUPERADMIN_AI_SETTINGS_UPDATED`,
`SUPERADMIN_AI_SETTINGS_RESET`, `SUPERADMIN_AI_PLAN_QUOTA_UPDATED`, each with a
before/after payload.

## Tests

`tests/api/superadmin-ai-settings.test.ts` — 20 cases covering access control
(anonymous, tenant owner on read and write and on the cross-tenant usage route),
the three-layer precedence, patch-merge semantics, validation rejections,
reset-to-environment, audit lines, malformed-row tolerance, quota override and
clearing, enforcement/display agreement, and the usage aggregate.
