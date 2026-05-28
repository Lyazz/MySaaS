import request from 'supertest';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../../backend/src/app';
import { signAccessToken } from '../../backend/src/lib/jwt';
import prisma from '../../backend/src/lib/prisma';

describe('Trusted provisioning API', () => {
  const stamp = Date.now();
  const slug = `provisioning-${stamp}`;
  const host = 'localhost:3000';
  const ownerEmail = `owner-${stamp}@example.com`;
  const staffEmail = `staff-${stamp}@example.com`;

  let tenantId = '';
  let ownerToken = '';
  let staffToken = '';

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Provisioning Tenant',
        slug,
        isOffline: true,
      },
    });
    tenantId = tenant.id;

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
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
  });

  it('issues a trusted activation code for tenant owners and redeems it into a workspace binding', async () => {
    const issued = await request(app)
      .post('/api/admin/provisioning/tokens')
      .set('X-Forwarded-Host', host)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(issued.status).toBe(201);
    expect(issued.body.success).toBe(true);
    expect(issued.body.tenantId).toBe(tenantId);
    expect(issued.body.workspaceId).toBeTruthy();
    expect(issued.body.mode).toBe('offlineOnly');
    expect(typeof issued.body.activationCode).toBe('string');

    const activated = await request(app)
      .post('/api/provisioning/activate')
      .set('X-Forwarded-Host', host)
      .send({ activationCode: issued.body.activationCode });

    expect(activated.status).toBe(200);
    expect(activated.body.success).toBe(true);
    expect(activated.body.provisioning).toMatchObject({
      tenantId,
      workspaceId: issued.body.workspaceId,
      mode: 'offlineOnly',
    });
  });

  it('rejects provisioning token issuance for staff accounts', async () => {
    const res = await request(app)
      .post('/api/admin/provisioning/tokens')
      .set('X-Forwarded-Host', host)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(String(res.body.statusMessage)).toContain('owner or admin');
  });

  it('rejects invalid activation codes', async () => {
    const res = await request(app)
      .post('/api/provisioning/activate')
      .set('X-Forwarded-Host', host)
      .send({ activationCode: 'not-a-real-code' });

    expect(res.status).toBe(400);
    expect(String(res.body.statusMessage)).toContain(
      'Invalid or expired activation code'
    );
  });
});
