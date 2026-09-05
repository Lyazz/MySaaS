# AI administration

Everything about AI document import that an operator can change without a
redeploy lives on **Super admin → AI** (`/super-admin/ai`).

## What is where

| Setting | Owned by | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Environment | Deployment secret. Deliberately not editable from the dashboard — putting it in a table only moves it somewhere a database dump reaches. The screen reports whether one is present. |
| On/off switch | Super admin | Off ⇒ uploads answer 503 and the stale-job reaper stops. |
| Model | Super admin | Curated dropdown from `shared/ai/models.ts`. |
| Max pages per document | Super admin | 1–100. A hard ceiling per job, independent of the plan quota. |
| Monthly AI pages per plan | Super admin | Overrides `aiScansPerMonth` in `shared/pricing/plans.ts`. Blank ⇒ the code default. |
| Usage and token spend | Super admin | Read-only, aggregated from `AiDocumentJob`. |

## Resolution order

Every super-admin setting resolves **database → environment → built-in default**,
per field. The environment layer is what makes this safe to deploy: an existing
install keeps running on its current env vars, and the operator takes over one
field at a time by saving it. "Reset to environment" clears the saved values and
hands all three back.

The UI labels each field with the layer that supplied it, so an operator can see
at a glance whether they are looking at their own value or an inherited one.

## Caching

`lib/platform-settings.ts` and `lib/plan-limits.ts` each cache for 30 seconds.
A change therefore reaches every instance within half a minute rather than
instantly — the deliberate trade for not querying the database on every AI
request. Saving busts the writing process's own cache immediately.

If you edit either table directly in SQL, call the module's
`resetPlatformSettingsCache()` / `resetPlanLimitsCache()` or wait out the TTL.

## Tenancy

`PlatformSetting` and `PlanOverride` carry no `tenantId` on purpose: they are
operator configuration, not tenant data, and only `requireSuperAdmin` routes
reach them. The usage report is the single place in the codebase that queries
`AiDocumentJob` across tenants; it aggregates only — no document contents,
extractions or draft lines leave a tenant.

## Quota consistency

`AiDocumentsService.enforceScanQuota` and `BillingService.getTenantBillingSnapshot`
both read the plan through `resolvePlan()`. They must never diverge: a meter
still showing 20 while uploads are refused at 9 is a support ticket, and
`tests/api/superadmin-ai-settings.test.ts` pins the two together.

## Adding a model

One line in `shared/ai/models.ts`. Both the dropdown and the server-side
validation read that array, so they cannot drift.
