import { describe, it, expect, vi, beforeEach } from 'vitest'

const load = async () => {
    vi.resetModules()
    return await import('../../backend/src/lib/public-assets')
}

describe('public assets deletion', () => {
    beforeEach(() => {
        vi.unstubAllEnvs()
    })

    it('does not delete when URL bucket is not public bucket', async () => {
        vi.stubEnv('S3_PUBLIC_BUCKET_NAME', 'swekly-public')
        vi.stubEnv('S3_ENDPOINT', 'https://nbg1.your-objectstorage.com')
        const mod = await load()
        const modS3 = await import('../../backend/src/lib/s3')
        const sendSpy = vi.spyOn(modS3.s3Client, 'send').mockResolvedValueOnce({} as any)
        const deleted = await mod.deletePublicAssetIfOwned({
            tenantId: 't1',
            urlOrPath: 'https://other-bucket.nbg1.your-objectstorage.com/tenants/t1/public/x.jpg'
        })

        expect(deleted).toBe(false)
        expect(sendSpy).not.toHaveBeenCalled()
    })

    it('does not delete when key is not tenant scoped', async () => {
        vi.stubEnv('S3_PUBLIC_BUCKET_NAME', 'swekly-public')
        vi.stubEnv('S3_ENDPOINT', 'https://nbg1.your-objectstorage.com')
        const mod = await load()
        const modS3 = await import('../../backend/src/lib/s3')
        const sendSpy = vi.spyOn(modS3.s3Client, 'send').mockResolvedValueOnce({} as any)
        const deleted = await mod.deletePublicAssetIfOwned({
            tenantId: 't1',
            urlOrPath: 'https://swekly-public.nbg1.your-objectstorage.com/tenants/other/public/x.jpg'
        })

        expect(deleted).toBe(false)
        expect(sendSpy).not.toHaveBeenCalled()
    })

    it('resolves path-style URL under endpoint', async () => {
        vi.stubEnv('S3_PUBLIC_BUCKET_NAME', 'swekly-public')
        vi.stubEnv('S3_ENDPOINT', 'https://nbg1.your-objectstorage.com')
        const mod = await load()
        const resolved = mod.resolvePublicAsset('https://nbg1.your-objectstorage.com/swekly-public/tenants/t1/public/x.jpg')
        expect(resolved).toEqual({ kind: 's3', bucket: 'swekly-public', key: 'tenants/t1/public/x.jpg' })
    })

    it('resolves virtual-hosted URL', async () => {
        vi.stubEnv('S3_PUBLIC_BUCKET_NAME', 'swekly-public')
        vi.stubEnv('S3_ENDPOINT', 'https://nbg1.your-objectstorage.com')
        const mod = await load()
        const resolved = mod.resolvePublicAsset('https://swekly-public.nbg1.your-objectstorage.com/tenants/t1/public/x.jpg')
        expect(resolved).toEqual({ kind: 's3', bucket: 'swekly-public', key: 'tenants/t1/public/x.jpg' })
    })
})
