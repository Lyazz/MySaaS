/**
 * Resolves what a tenant's app runtime should look like.
 *
 * `Tenant.isOffline` was being mapped straight onto both `mode` and
 * `subscriptionTier` at four separate call sites -- one boolean standing in for
 * two independent concepts, which `admin_app/CLAUDE.md` explicitly forbids.
 *
 * The case that boolean could not express is the trial: a trialling tenant gets
 * full online capability regardless of how `isOffline` happens to be set, and
 * loses it when the trial lapses. That needs the subscription, not just a flag.
 */

import { STATUS_TRIALING } from '../modules/billing/subscription.service'

export type TenantRuntimeMode = 'hybrid' | 'offlineOnly'
export type TenantSubscriptionTier = 'online' | 'offlineOnly'

export type TenantRuntime = {
    mode: TenantRuntimeMode
    subscriptionTier: TenantSubscriptionTier
}

export const resolveTenantRuntime = (
    tenant: { isOffline: boolean },
    subscription?: { status: string | null; trialEnd?: Date | null } | null,
    now: Date = new Date()
): TenantRuntime => {
    const status = subscription?.status?.trim().toUpperCase()

    // A live trial is full online access. It ends by itself: the activation
    // licence issued to the device is clamped to `trialEnd`, so the device
    // locks on schedule whether or not it ever reaches the server again.
    const isTrialing =
        status === STATUS_TRIALING &&
        subscription?.trialEnd != null &&
        now < subscription.trialEnd

    if (isTrialing) {
        return { mode: 'hybrid', subscriptionTier: 'online' }
    }

    return tenant.isOffline
        ? { mode: 'offlineOnly', subscriptionTier: 'offlineOnly' }
        : { mode: 'hybrid', subscriptionTier: 'online' }
}
