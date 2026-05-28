import type { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

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
const isProvisioningPath = (path: string) =>
  path === '/api/provisioning/activate' ||
  path === '/api/admin/provisioning/tokens';
const isWebhookPath = (path: string) => path.startsWith('/api/webhooks/');

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
  if (isProvisioningPath(path)) return next();
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

  const now = new Date();
  const defaultEnd = addUtcMonths(now, 1);

  const subscription = await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      planCode: 'basic',
      interval: 'month',
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: defaultEnd,
    },
    update: {},
  });

  req.subscription = subscription;

  const end = subscription.currentPeriodEnd ?? defaultEnd;
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
