import { randomUUID } from 'node:crypto';

import type { Tenant, User } from '@prisma/client';

import prisma from '../../lib/prisma';
import {
  signProvisioningToken,
  verifyProvisioningToken,
} from '../../lib/provisioning-token';

export class ProvisioningService {
  issueActivationCode(input: { tenant: Tenant; user: User }) {
    const { tenant, user } = input;

    if (!tenant.id || !user.id || user.tenantId !== tenant.id) {
      throw new Error('Provisioning requires a tenant-scoped admin user');
    }

    if (!['owner', 'admin'].includes(user.role)) {
      const error = new Error(
        'Only owner or admin accounts can provision a workspace'
      );
      (error as Error & { statusCode?: number }).statusCode = 403;
      throw error;
    }

    const workspaceId = randomUUID();
    const mode = tenant.isOffline ? 'offlineOnly' : 'hybrid';
    const activationCode = signProvisioningToken({
      tenantId: tenant.id,
      workspaceId,
      mode,
      issuedByUserId: user.id,
    });

    return {
      activationCode,
      tenantId: tenant.id,
      workspaceId,
      mode,
    };
  }

  async activateFromCode(activationCode: string) {
    if (!activationCode.trim()) {
      const error = new Error('Activation code is required');
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }

    let decoded;
    try {
      decoded = verifyProvisioningToken(activationCode.trim());
    } catch {
      const error = new Error('Invalid or expired activation code');
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: decoded.tenantId },
      select: { id: true, isOffline: true, isSuspended: true },
    });

    if (!tenant) {
      const error = new Error('Provisioning tenant was not found');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    if (tenant.isSuspended) {
      const error = new Error('Tenant is suspended');
      (error as Error & { statusCode?: number }).statusCode = 403;
      throw error;
    }

    const mode = tenant.isOffline ? 'offlineOnly' : 'hybrid';

    return {
      tenantId: tenant.id,
      workspaceId: decoded.workspaceId,
      mode,
    };
  }
}
