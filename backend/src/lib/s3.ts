import { S3Client } from '@aws-sdk/client-s3'

export const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false', // Default to true for MinIO
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
    }
})

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'products'
