import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../../backend/src/app';
import { verifyActivationToken } from '../../backend/src/lib/activation-token';
import { signAccessToken } from '../../backend/src/lib/jwt';
import prisma from '../../backend/src/lib/prisma';

describe('device activation API', () => {
  const stamp = Date.now();
  const slug = `activation-${stamp}`;
  const host = 'localhost:3000';
  const ownerEmail = `owner-${stamp}@example.com`;
  const staffEmail = `staff-${stamp}@example.com`;
  const foreignSlug = `activation-foreign-${stamp}`;
  const licenseKey = `LIC-${stamp}`;
  const hardwareId = `hw-${stamp}`;

  let tenantId = '';
  let foreignTenantId = '';
  let ownerToken = '';
  let staffToken = '';

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Activation Tenant',
        slug,
        isOffline: true,
      },
    });
    tenantId = tenant.id;

    const foreignTenant = await prisma.tenant.create({
      data: {
        name: 'Foreign Activation Tenant',
        slug: foreignSlug,
        isOffline: false,
      },
    });
    foreignTenantId = foreignTenant.id;

    const owner = await prisma.user.create({
      data: {
        tenantId,
        email: ownerEmail,
        role: 'owner',
        passwordHash: await bcrypt.hash('Password123!', 10),
      },
    });
    const staff = await prisma.user.create({
      data: {
        tenantId,
        email: staffEmail,
        role: 'staff',
        passwordHash: await bcrypt.hash('Password123!', 10),
      },
    });

    await prisma.license.create({
      data: {
        tenantId,
        licenseKey,
        maxDevices: 2,
      },
    });

    const foreignLicense = await prisma.license.create({
      data: {
        tenantId: foreignTenantId,
        licenseKey: `LIC-FOREIGN-${stamp}`,
        maxDevices: 1,
      },
    });

    await prisma.device.create({
      data: {
        tenantId: foreignTenantId,
        licenseId: foreignLicense.id,
        hardwareId: `foreign-hw-${stamp}`,
        deviceName: 'Foreign POS',
      },
    });

    ownerToken = signAccessToken({
      userId: owner.id,
      email: owner.email,
      role: owner.role,
      tenantId,
    });
    staffToken = signAccessToken({
      userId: staff.id,
      email: staff.email,
      role: staff.role,
      tenantId,
    });
  });

  afterAll(async () => {
    await prisma.device.deleteMany({
      where: { tenantId: { in: [tenantId, foreignTenantId] } },
    });
    await prisma.license.deleteMany({
      where: { tenantId: { in: [tenantId, foreignTenantId] } },
    });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantId, foreignTenantId] } },
    });
  });

  it('activates a device online and returns a signed workspace-scoped token', async () => {
    const res = await request(app)
      .post('/api/activation/online')
      .set('X-Forwarded-Host', host)
      .send({
        licenseKey,
        hardwareId,
        deviceName: 'POS Counter 1',
      });

    expect(res.status).toBe(200);
    expect(typeof res.body.activationToken).toBe('string');

    const decoded = verifyActivationToken(res.body.activationToken);
    expect(decoded.tenantId).toBe(tenantId);
    expect(decoded.workspaceId).toBeTruthy();
    expect(decoded.deviceId).toBe(decoded.workspaceId);
    expect(decoded.mode).toBe('offlineOnly');
    expect(decoded.subscriptionTier).toBe('offlineOnly');
    expect(decoded.hardwareId).toBe(hardwareId);
    expect(decoded.licenseKey).toBe(licenseKey);
  });

  it('generates an offline activation token for owner/admin users on the SaaS host', async () => {
    const requestCode = Buffer.from(
      `${licenseKey}:${hardwareId}`,
      'utf-8'
    ).toString('base64');

    const res = await request(app)
      .post('/api/activation/offline')
      .set('X-Forwarded-Host', host)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ requestCode });

    expect(res.status).toBe(200);
    expect(typeof res.body.activationToken).toBe('string');

    const decoded = verifyActivationToken(res.body.activationToken);
    expect(decoded.tenantId).toBe(tenantId);
    expect(decoded.hardwareId).toBe(hardwareId);
    expect(decoded.licenseKey).toBe(licenseKey);
  });

  it('lists only tenant-owned devices with license summary data', async () => {
    const res = await request(app)
      .get('/api/activation/devices')
      .set('X-Forwarded-Host', host)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({
      totalDevices: 1,
      activeDevices: 1,
      inactiveDevices: 0,
      licenses: 1,
      activeLicenses: 1,
      capacity: 2,
      mode: 'offlineOnly',
      subscriptionTier: 'offlineOnly',
    });
    expect(Array.isArray(res.body.devices)).toBe(true);
    expect(res.body.devices).toHaveLength(1);
    expect(res.body.devices[0]).toMatchObject({
      deviceName: 'POS Counter 1',
      status: 'ACTIVE',
      hardwareId: hardwareId,
      workspaceId: res.body.devices[0].id,
      license: {
        key: licenseKey,
        isActive: true,
        maxDevices: 2,
        activeDeviceCount: 1,
        totalDeviceCount: 1,
        kind: 'assigned',
      },
    });
  });

  it('rejects offline activation token generation for staff accounts', async () => {
    const requestCode = Buffer.from(
      `${licenseKey}:${hardwareId}`,
      'utf-8'
    ).toString('base64');

    const res = await request(app)
      .post('/api/activation/offline')
      .set('X-Forwarded-Host', host)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ requestCode });

    expect(res.status).toBe(403);
    expect(String(res.body.statusMessage)).toContain(
      'Insufficient permissions'
    );
  });

  it('rejects device listing for staff accounts', async () => {
    const res = await request(app)
      .get('/api/activation/devices')
      .set('X-Forwarded-Host', host)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
  });
});
