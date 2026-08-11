import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
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

        const endpointHost = (() => {
            const raw = process.env.S3_ENDPOINT
            if (!raw) return null
            try {
                return new URL(raw).hostname.toLowerCase()
            } catch {
                return null
            }
        })()

        // We only support resolving public assets to the *configured* public bucket.
        // This prevents accidental deletions when a URL points to some other host/bucket.

        // Virtual-hosted: https://<PUBLIC_BUCKET_NAME>.<endpoint>/<key>
        if (u.hostname.toLowerCase().startsWith(`${PUBLIC_BUCKET_NAME.toLowerCase()}.`)) {
            return { bucket: PUBLIC_BUCKET_NAME, key: pathname }
        }

        // Path-style: https://<endpoint>/<PUBLIC_BUCKET_NAME>/<key>
        if (pathname.startsWith(`${PUBLIC_BUCKET_NAME}/`)) {
            return { bucket: PUBLIC_BUCKET_NAME, key: pathname.slice(`${PUBLIC_BUCKET_NAME}/`.length) }
        }

        // CDN/custom domain: https://cdn.example.com/<key> where <key> is already bucket-relative.
        // We only allow tenant-scoped keys for deletion later, so this stays safe.
        const host = u.hostname.toLowerCase()
        const looksLikeS3VirtualHosted =
            endpointHost && host !== endpointHost && host.endsWith(`.${endpointHost}`)

        if (!looksLikeS3VirtualHosted && pathname.startsWith('tenants/')) {
            return { bucket: PUBLIC_BUCKET_NAME, key: pathname }
        }

        return null
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

const streamToBuffer = async (stream: any): Promise<Buffer> => {
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
}

/**
 * Read the raw bytes of a public asset (product image, etc.) regardless of whether it lives
 * on local disk, our own S3/MinIO bucket, or an external host. Used for bundling images into
 * a downloadable export archive. Returns null if the asset can't be read (missing, unreachable).
 */
export const readPublicAssetBuffer = async (
    urlOrPath: string
): Promise<{ buffer: Buffer; contentType?: string } | null> => {
    const resolved = resolvePublicAsset(urlOrPath)

    if (resolved?.kind === 'local') {
        try {
            const buffer = await fs.readFile(resolved.absPath)
            return { buffer }
        } catch {
            return null
        }
    }

    if (resolved?.kind === 's3') {
        try {
            const result = await s3Client.send(new GetObjectCommand({ Bucket: resolved.bucket, Key: resolved.key }))
            if (!result.Body) return null
            const buffer = await streamToBuffer(result.Body)
            return { buffer, contentType: result.ContentType }
        } catch {
            return null
        }
    }

    // External URL not owned by us — best-effort fetch so archives stay portable.
    const v = normalizeUrl(urlOrPath)
    if (!/^https?:\/\//i.test(v)) return null

    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10_000)
        const res = await fetch(v, { signal: controller.signal })
        clearTimeout(timeout)
        if (!res.ok) return null
        const arrayBuffer = await res.arrayBuffer()
        return { buffer: Buffer.from(arrayBuffer), contentType: res.headers.get('content-type') || undefined }
    } catch {
        return null
    }
}
