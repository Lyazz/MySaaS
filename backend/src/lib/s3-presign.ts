import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client } from './s3'

export const presignGetObject = async (args: { bucket: string; key: string; expiresInSeconds?: number }) => {
    const expiresInSeconds = Math.max(15, Math.min(60 * 10, Number(args.expiresInSeconds ?? 60 * 2)))

    const command = new GetObjectCommand({
        Bucket: args.bucket,
        Key: args.key
    })

    return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds })
}

