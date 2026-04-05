import {
    CreateBucketCommand,
    HeadBucketCommand,
    PutBucketPolicyCommand,
    S3Client
} from '@aws-sdk/client-s3'

const REGION = process.env.AWS_REGION || 'us-east-1'
const ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000'
const FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE !== 'false' // Default to true for MinIO
const PUBLIC_READ =
    process.env.S3_PUBLIC_READ === 'true' ||
    (process.env.S3_PUBLIC_READ !== 'false' && process.env.NODE_ENV !== 'production') // safe by default in prod

export const PUBLIC_BUCKET_NAME = process.env.S3_PUBLIC_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'products'
export const PRIVATE_BUCKET_NAME = process.env.S3_PRIVATE_BUCKET_NAME || 'private'

export const s3Client = new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    forcePathStyle: FORCE_PATH_STYLE,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
    }
})

const bucketReadyPromises = new Map<string, Promise<void>>()
const bucketPolicyPromises = new Map<string, Promise<void>>()

// Ensure target bucket exists (helpful for local dev when MinIO bucket wasn't pre-created)
export const ensureBucketExists = async (bucketName: string) => {
    const existing = bucketReadyPromises.get(bucketName)
    if (existing) return existing

    const allowCreate =
        process.env.S3_ALLOW_CREATE_BUCKET === 'true' ||
        (process.env.S3_ALLOW_CREATE_BUCKET !== 'false' && process.env.NODE_ENV !== 'production')

    const promise = (async () => {
        try {
            await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }))
            return
        } catch (error: any) {
            const notFound =
                error?.name === 'NotFound' ||
                error?.Code === 'NoSuchBucket' ||
                error?.$metadata?.httpStatusCode === 404

            if (!notFound) {
                throw error
            }

            if (!allowCreate) {
                const err = new Error(
                    `Bucket "${bucketName}" not found. Create it manually or set S3_ALLOW_CREATE_BUCKET=true (dev only).`
                )
                ;(err as any).code = 'NoSuchBucket'
                throw err
            }

            const createParams: any = { Bucket: bucketName }

            if (REGION && REGION !== 'us-east-1') {
                createParams.CreateBucketConfiguration = { LocationConstraint: REGION }
            }

            await s3Client.send(new CreateBucketCommand(createParams))
        }
    })()

    try {
        bucketReadyPromises.set(bucketName, promise)
        await promise
    } catch (err) {
        bucketReadyPromises.delete(bucketName) // allow retry on next request
        throw err
    }

    return promise
}

export const ensureBucketPublicRead = async (bucketName: string) => {
    if (!PUBLIC_READ) return
    const existing = bucketPolicyPromises.get(bucketName)
    if (existing) return existing

    const promise = (async () => {
        // Important: Keep public read scoped to tenant-owned assets only.
        // In production, set bucket policy manually (recommended) and keep S3_PUBLIC_READ=false.
        const policy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: '*',
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${bucketName}/tenants/*`]
                }
            ]
        }

        await s3Client.send(
            new PutBucketPolicyCommand({
                Bucket: bucketName,
                Policy: JSON.stringify(policy)
            })
        )
    })()

    try {
        bucketPolicyPromises.set(bucketName, promise)
        await promise
    } catch (err) {
        bucketPolicyPromises.delete(bucketName)
        throw err
    }

    return promise
}

export const buildPublicUrl = (bucketName: string, key: string) => {
    const base = (process.env.S3_PUBLIC_URL || ENDPOINT).replace(/\/$/, '')

    try {
        const url = new URL(base)
        if (url.hostname.startsWith(`${bucketName}.`)) {
            return `${base}/${key}`
        }
    } catch {
        // ignore invalid URL
    }

    if (base.endsWith(`/${bucketName}`)) {
        return `${base}/${key}`
    }

    return `${base}/${bucketName}/${key}`
}
