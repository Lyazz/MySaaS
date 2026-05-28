import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  signProvisioningToken,
  verifyProvisioningToken,
} from '../../backend/src/lib/provisioning-token';
import { ProvisioningService } from '../../backend/src/modules/provisioning/provisioning.service';

describe('provisioning token helpers', () => {
  const previousSecret = process.env.PROVISIONING_TOKEN_SECRET;

  beforeEach(() => {
    process.env.PROVISIONING_TOKEN_SECRET = 'test-provisioning-secret';
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.PROVISIONING_TOKEN_SECRET;
    } else {
      process.env.PROVISIONING_TOKEN_SECRET = previousSecret;
    }
  });

  it('signs and verifies a trusted provisioning token', () => {
    const token = signProvisioningToken({
      tenantId: 'tenant-1',
      workspaceId: 'workspace-7',
      mode: 'hybrid',
      issuedByUserId: 'user-1',
    });

    const decoded = verifyProvisioningToken(token);

    expect(decoded.tenantId).toBe('tenant-1');
    expect(decoded.workspaceId).toBe('workspace-7');
    expect(decoded.mode).toBe('hybrid');
    expect(decoded.issuedByUserId).toBe('user-1');
  });

  it('issues workspace-scoped activation codes only for owner/admin users', () => {
    const service = new ProvisioningService();

    const issued = service.issueActivationCode({
      tenant: {
        id: 'tenant-1',
        slug: 'tenant-a',
        name: 'Tenant A',
        isOffline: false,
        isSuspended: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        role: 'owner',
        isSuperAdmin: false,
        tenantId: 'tenant-1',
        passwordHash: 'hash',
        cashboxId: null,
        staffRoleId: null,
        isActive: true,
        tokenInvalidBefore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    expect(issued.workspaceId).toBeTruthy();
    expect(issued.mode).toBe('hybrid');
    expect(typeof issued.activationCode).toBe('string');

    expect(() =>
      service.issueActivationCode({
        tenant: {
          id: 'tenant-1',
          slug: 'tenant-a',
          name: 'Tenant A',
          isOffline: true,
          isSuspended: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'user-2',
          email: 'staff@example.com',
          role: 'staff',
          isSuperAdmin: false,
          tenantId: 'tenant-1',
          passwordHash: 'hash',
          cashboxId: null,
          staffRoleId: null,
          isActive: true,
          tokenInvalidBefore: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
    ).toThrow(/owner or admin/i);
  });
});
