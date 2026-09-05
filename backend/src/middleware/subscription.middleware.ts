import type { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import {
  ensureSubscription,
  STATUS_TRIALING
} from '../modules/billing/subscription.service';
import { isTenantMemberByCookie } from '../lib/draft-storefront';

const addUtcMonths = (date: Date, months: number) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

const isBillingPath = (path: string) => path.startsWith('/api/admin/billing');
const isSuperAdminPath = (path: string) => path.startsWith('/api/super-admin');
const isAuthPath = (path: string) =>
  path === '/api/login' || path === '/api/register' || path === '/api/me';
const isFilesPath = (path: string) => path.startsWith('/api/files');
const isWebhookPath = (path: string) => path.startsWith('/api/webhooks/');
/**
 * Activation must stay reachable for a tenant this middleware would otherwise
 * reject. A PAST_DUE or trial-expired tenant gets 402 on every tenant-scoped
 * path -- including, without this, its own heartbeat and re-activation. That
 * would make the lock permanent: the device could never obtain the fresh
 * licence that unlocks it once the tenant pays.
 */
const isActivationPath = (path: string) => path.startsWith('/api/activation');

export const expressSubscriptionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const path = req.path || '';

  if (!path.startsWith('/api')) return next();
  if (path === '/api/hello') return next();
  if (isAuthPath(path)) return next();
  if (isSuperAdminPath(path)) return next();
  if (isFilesPath(path)) return next();
  if (isActivationPath(path)) return next();
  if (isWebhookPath(path)) return next();

  // Determine tenant context:
  // - Tenant-host requests have req.tenant from Host resolution middleware.
  // - SaaS-host admin requests derive tenant from authenticated user (req.user.tenantId).
  let tenant = req.tenant;

  const isAdminApi = path.startsWith('/api/admin');
  if (!tenant && isAdminApi && req.user?.tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });
    if (tenant) req.tenant = tenant;
  }

  // If request isn't tenant-scoped, skip enforcement.
  if (!tenant) return next();

  if (tenant.isSuspended) {
    return res
      .status(403)
      .json({ statusCode: 403, statusMessage: 'Tenant is suspended' });
  }

  /**
   * A store that has never been published is invisible, not merely unstyled.
   * Without this the browser 404s on the storefront while the API happily serves
   * /api/store/settings, /api/products and POST /api/orders for the same tenant --
   * the draft store would be readable and orderable by anyone who skipped the HTML.
   *
   * Admin paths stay open so the merchant can build the store. Membership is
   * checked twice because the two clients authenticate differently: the Bearer
   * token expressAuthMiddleware resolved (admin fetches, the mobile app), or the
   * auth_token cookie a browser sends while the owner walks their own draft
   * storefront -- that middleware never looks at cookies.
   */
  if (tenant.publishedAt === null && !isAdminApi) {
    const isTenantMember =
      req.user?.tenantId === tenant.id ||
      isTenantMemberByCookie(req.headers.cookie, tenant.id);

    if (!isTenantMember) {
      return res
        .status(404)
        .json({ statusCode: 404, statusMessage: 'Store not found' });
    }
  }

  if (tenant.maintenanceMode && !isAdminApi) {
    return res
      .status(503)
      .json({ statusCode: 503, statusMessage: 'Store is under maintenance' });
  }

  const now = new Date();
  const defaultEnd = addUtcMonths(now, 1);

  // One writer for this row, shared with registration and super-admin tenant
  // creation. All three used to create it independently, each hardcoding
  // status ACTIVE -- which is why nothing ever wrote TRIALING.
  const subscription = await ensureSubscription(prisma, tenant.id, { now });

  req.subscription = subscription;

  const isTrialing =
    subscription.status?.trim().toUpperCase() === STATUS_TRIALING;

  // A live trial is full access. It ends by its own date rather than by the
  // paid period, and the activation licence handed to a device is clamped to
  // the same instant, so an offline trial device locks itself on schedule.
  if (isTrialing && subscription.trialEnd && now < subscription.trialEnd) {
    return next();
  }

  const end = isTrialing
    ? (subscription.trialEnd ?? defaultEnd)
    : (subscription.currentPeriodEnd ?? defaultEnd);
  const isExpired = now >= end;

  if (isExpired) {
    if (!isBillingPath(path) && !isSuperAdminPath(path)) {
      if (subscription.status !== 'PAST_DUE') {
        await prisma.tenantSubscription.update({
          where: { tenantId: tenant.id },
          data: { status: 'PAST_DUE' },
        });
      }

      return res.status(402).json({
        statusCode: 402,
        statusMessage: 'Subscription payment required',
        subscription: {
          status:
            subscription.status === 'PAST_DUE'
              ? 'PAST_DUE'
              : subscription.status,
          currentPeriodEnd: end.toISOString(),
        },
      });
    }
  }

  next();
};
