import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need a fresh module instance each time to reset internal caches.
const loadModule = async () => {
    vi.resetModules()
    return await import('../../backend/src/lib/s3')
}

describe('S3 helpers', () => {
    beforeEach(() => {
        vi.unstubAllEnvs()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('buildPublicUrl uses S3_PUBLIC_URL when set and trims trailing slash', async () => {
        vi.stubEnv('S3_PUBLIC_URL', 'http://cdn.local/')
        const mod = await loadModule()
        const url = mod.buildPublicUrl('tenant-a/image.png')
        expect(url).toBe('http://cdn.local/products/tenant-a/image.png')
    })

    it('ensureBucketExists short-circuits when bucket already exists', async () => {
        const mod = await loadModule()
        const sendSpy = vi.spyOn(mod.s3Client, 'send')
        sendSpy.mockResolvedValueOnce({}) // HeadBucket success

        await mod.ensureBucketExists()

        expect(sendSpy).toHaveBeenCalledTimes(1)
        expect(sendSpy.mock.calls[0][0].constructor.name).toBe('HeadBucketCommand')
    })

    it('ensureBucketExists creates bucket when missing', async () => {
        const mod = await loadModule()
        const sendSpy = vi.spyOn(mod.s3Client, 'send')
        sendSpy.mockRejectedValueOnce({ name: 'NotFound' }) // HeadBucket failure
        sendSpy.mockResolvedValueOnce({}) // CreateBucket success

        await mod.ensureBucketExists()

        expect(sendSpy).toHaveBeenCalledTimes(2)
        expect(sendSpy.mock.calls[0][0].constructor.name).toBe('HeadBucketCommand')
        expect(sendSpy.mock.calls[1][0].constructor.name).toBe('CreateBucketCommand')
    })

    it('ensureBucketPublicRead sets policy when enabled', async () => {
        vi.stubEnv('S3_PUBLIC_READ', 'true')
        const mod = await loadModule()
        const sendSpy = vi.spyOn(mod.s3Client, 'send')
        sendSpy.mockResolvedValueOnce({}) // PutBucketPolicy success

        await mod.ensureBucketPublicRead()

        expect(sendSpy).toHaveBeenCalledTimes(1)
        expect(sendSpy.mock.calls[0][0].constructor.name).toBe('PutBucketPolicyCommand')
    })
})
