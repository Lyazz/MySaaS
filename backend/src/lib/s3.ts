import {
    CreateBucketCommand,
    HeadBucketCommand,
    PutBucketPolicyCommand,
    S3Client
} from '@aws-sdk/client-s3'

const REGION = process.env.AWS_REGION || 'us-east-1'
const ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000'
const FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE !== 'false' // Default to true for MinIO
const PUBLIC_READ = process.env.S3_PUBLIC_READ !== 'false' // default true for local/dev

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'products'

export const s3Client = new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    forcePathStyle: FORCE_PATH_STYLE,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
    }
})

let bucketReadyPromise: Promise<void> | null = null
let bucketPolicyPromise: Promise<void> | null = null

// Ensure target bucket exists (helpful for local dev when MinIO bucket wasn't pre-created)
export const ensureBucketExists = async () => {
    if (bucketReadyPromise) return bucketReadyPromise

    bucketReadyPromise = (async () => {
        try {
            await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }))
            return
        } catch (error: any) {
            const notFound =
                error?.name === 'NotFound' ||
                error?.Code === 'NoSuchBucket' ||
                error?.$metadata?.httpStatusCode === 404

            if (!notFound) {
                throw error
            }

            const createParams: any = { Bucket: BUCKET_NAME }

            if (REGION && REGION !== 'us-east-1') {
                createParams.CreateBucketConfiguration = { LocationConstraint: REGION }
            }

            await s3Client.send(new CreateBucketCommand(createParams))
        }
    })()

    try {
        await bucketReadyPromise
    } catch (err) {
        bucketReadyPromise = null // allow retry on next request
        throw err
    }

    return bucketReadyPromise
}

export const ensureBucketPublicRead = async () => {
    if (!PUBLIC_READ) return
    if (bucketPolicyPromise) return bucketPolicyPromise

    bucketPolicyPromise = (async () => {
        const policy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: '*',
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
                }
            ]
        }

        await s3Client.send(
            new PutBucketPolicyCommand({
                Bucket: BUCKET_NAME,
                Policy: JSON.stringify(policy)
            })
        )
    })()

    try {
        await bucketPolicyPromise
    } catch (err) {
        bucketPolicyPromise = null
        throw err
    }

    return bucketPolicyPromise
}

export const buildPublicUrl = (key: string) => {
    const base = (process.env.S3_PUBLIC_URL || ENDPOINT).replace(/\/$/, '')
    return `${base}/${BUCKET_NAME}/${key}`
}
