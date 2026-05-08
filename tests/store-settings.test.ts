import { describe, it, expect } from 'vitest'
import request from 'supertest'
import prisma from '../backend/src/lib/prisma'
import app from '../backend/src/app'
import { signAccessToken } from '../backend/src/lib/jwt'
import { buildDefaultStoreLegalPagesConfig } from '../shared/storefront/legal-pages'

describe('Store Settings API', () => {
    let tenantId: string
    let userId: string
    let token: string
    const slug = `settings-test-${Date.now()}`

    it('sets up a tenant for settings test', async () => {
        const res = await request(app).post('/api/register').send({
            name: 'Settings Test Tenant',
            slug,
            email: `admin-${slug}@example.com`,
            password: 'password123'
        })
        expect(res.status).toBe(200)
        tenantId = res.body.tenant.id
        const user = await prisma.user.findFirst({ where: { tenantId } })
        userId = user!.id
        token = signAccessToken({ userId })
    })

    it('updates logo and favicon successfully', async () => {
        const logoUrl = 'http://example.com/logo.png'
        const faviconUrl = 'http://example.com/favicon.ico'

        const res = await request(app)
            .patch('/api/admin/store-settings')
            .set('host', `${slug}.localhost`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                logoUrl,
                faviconUrl,
                name: 'Updated Name',
                slug: slug,
                primaryColor: '#4D7C0F',
                templateKey: 'modern',
                orderIdPrefix: 'shop1'
            })

        if (res.status !== 200) {
            console.log('Update Settings Failed:', res.status, res.body)
        }
        expect(res.status).toBe(200)
        expect(res.body.logoUrl).toBe(logoUrl)
        expect(res.body.faviconUrl).toBe(faviconUrl)
        expect(res.body.orderIdPrefix).toBe('SHOP1')

        // Verify in DB
        const settings = await prisma.storeSettings.findUnique({
            where: { tenantId }
        })
        expect(settings?.logoUrl).toBe(logoUrl)
        expect(settings?.faviconUrl).toBe(faviconUrl)
        expect(settings?.orderIdPrefix).toBe('SHOP1')
    })

    it('fails with invalid faviconUrl type', async () => {
        const res = await request(app)
            .patch('/api/admin/store-settings')
            .set('host', `${slug}.localhost`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                faviconUrl: 123 // Should be string
            })

        expect(res.status).toBe(400)
    })

    it('updates legal pages config in 3 languages and stores tenant-scoped payload', async () => {
        const legalPages = buildDefaultStoreLegalPagesConfig()
        legalPages.terms.enabled = true
        legalPages.privacy.enabled = true
        legalPages.contact.enabled = true
        legalPages.terms.content.fr = `${legalPages.terms.content.fr}\n\nClause FR test.`
        legalPages.privacy.content.en = `${legalPages.privacy.content.en}\n\nEN policy test.`
        legalPages.contact.title.ar = 'تواصل معنا الآن'

        const res = await request(app)
            .patch('/api/admin/store-settings')
            .set('host', `${slug}.localhost`)
            .set('Authorization', `Bearer ${token}`)
            .send({ legalPages })

        expect(res.status).toBe(200)
        expect(res.body.legalPages.terms.enabled).toBe(true)
        expect(res.body.legalPages.privacy.content.en).toContain('EN policy test.')

        const settings = await prisma.storeSettings.findUnique({ where: { tenantId } })
        const stored = settings?.legalPages as any
        expect(stored?.contact?.title?.ar).toBe('تواصل معنا الآن')
    })

    it('rejects malformed legal pages payload', async () => {
        const res = await request(app)
            .patch('/api/admin/store-settings')
            .set('host', `${slug}.localhost`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                legalPages: {
                    terms: { enabled: true }
                }
            })

        expect(res.status).toBe(400)
        expect(String(res.body?.statusMessage || '')).toContain('legalPages')
    })

    it('cleanups', async () => {
        if (tenantId) {
            await prisma.storeSettings.deleteMany({ where: { tenantId } })
            await prisma.user.deleteMany({ where: { tenantId } })
            await prisma.tenant.delete({ where: { id: tenantId } })
        }
    })
})
