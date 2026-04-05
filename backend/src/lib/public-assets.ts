import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import path from 'path'
import { promises as fs } from 'fs'
import { PUBLIC_BUCKET_NAME, s3Client } from './s3'

type ResolvedAsset =
    | { kind: 's3'; bucket: string; key: string }
    | { kind: 'local'; absPath: string }

const normalizeUrl = (value: string) => String(value || '').trim()

const urlPathnameSafe = (u: URL) => decodeURIComponent(u.pathname || '').replace(/\/+/g, '/')

const resolveS3ObjectFromUrl = (url: string): { bucket: string; key: string } | null => {
    try {
        const u = new URL(url)
        const pathname = urlPathnameSafe(u).replace(/^\/+/, '')
        if (!pathname) return null

        // Virtual-hosted: https://<bucket>.<endpoint>/<key>
        const hostParts = u.hostname.split('.')
        if (hostParts.length >= 2) {
            const bucketCandidate = hostParts[0]!
            if (bucketCandidate) {
                // If the URL is virtual-hosted style, key is full pathname.
                // We cannot fully verify endpoint host here; we will verify bucket later.
                return { bucket: bucketCandidate, key: pathname }
            }
        }

        // Path-style: https://<endpoint>/<bucket>/<key>
        const [bucket, ...rest] = pathname.split('/')
        if (!bucket || rest.length === 0) return null
        return { bucket, key: rest.join('/') }
    } catch {
        return null
    }
}

const resolveLocalUploadFromUrl = (urlOrPath: string): { absPath: string } | null => {
    const v = normalizeUrl(urlOrPath)
    if (!v) return null

    const pathname = (() => {
        if (v.startsWith('/')) return v
        if (/^https?:\/\//i.test(v)) {
            try {
                const u = new URL(v)
                return urlPathnameSafe(u)
            } catch {
                return ''
            }
        }
        return ''
    })()

    const match = pathname.match(/^\/uploads\/(.+)$/i)
    if (!match) return null

    const rel = match[1]!
    const abs = path.resolve(process.cwd(), 'public', 'uploads', rel)
    const base = path.resolve(process.cwd(), 'public', 'uploads')
    if (!abs.startsWith(base + path.sep) && abs !== base) return null
    return { absPath: abs }
}

export const resolvePublicAsset = (urlOrPath: string): ResolvedAsset | null => {
    const v = normalizeUrl(urlOrPath)
    if (!v) return null

    const local = resolveLocalUploadFromUrl(v)
    if (local) return { kind: 'local', absPath: local.absPath }

    if (!/^https?:\/\//i.test(v)) return null
    const s3 = resolveS3ObjectFromUrl(v)
    if (!s3) return null
    return { kind: 's3', bucket: s3.bucket, key: s3.key }
}

const isTenantScopedKey = (tenantId: string, key: string) =>
    key.startsWith(`tenants/${tenantId}/`) || key.startsWith(`${tenantId}/`)

export const deletePublicAssetIfOwned = async (args: { tenantId: string; urlOrPath: string }) => {
    const resolved = resolvePublicAsset(args.urlOrPath)
    if (!resolved) return false

    if (resolved.kind === 'local') {
        await fs.rm(resolved.absPath, { force: true })
        return true
    }

    // Only delete our public bucket objects.
    if (resolved.bucket !== PUBLIC_BUCKET_NAME) return false
    if (!isTenantScopedKey(args.tenantId, resolved.key)) return false

    await s3Client.send(new DeleteObjectCommand({ Bucket: resolved.bucket, Key: resolved.key }))
    return true
}

