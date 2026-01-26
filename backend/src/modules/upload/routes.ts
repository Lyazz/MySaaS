import { Router } from 'express'
import multer from 'multer'
import { Upload } from '@aws-sdk/lib-storage'
import type { PutObjectCommandInput } from '@aws-sdk/client-s3'
import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { s3Client, BUCKET_NAME, ensureBucketExists, ensureBucketPublicRead, buildPublicUrl } from '../../lib/s3'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'

const router = Router()

// Configure multer to store file in memory and validate uploads early
const storage = multer.memoryStorage()
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file is enough for product imagery
        files: 5
    },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image uploads are allowed'))
        }
        cb(null, true)
    }
})

router.post('/', requireTenantAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' })
        }
        if (req.file.mimetype !== 'image/png') {
            return res.status(400).json({ error: 'Only PNG uploads are allowed' })
        }

        const tenant = req.tenant
        if (!tenant) {
            return res.status(400).json({ error: 'Tenant context missing' })
        }

        const file = req.file
        // Create a unique file name under tenant scope to avoid collisions and leaks
        const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')
        const ext = safeOriginal.toLowerCase().endsWith('.png') ? '.png' : '.png'
        const baseName = safeOriginal.replace(/\.[^.]+$/, '')
        const fileName = `${tenant.id}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${baseName}${ext}`

        try {
            await ensureBucketExists()
            await ensureBucketPublicRead()

            const uploadParams: PutObjectCommandInput = {
                Bucket: BUCKET_NAME,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read' // Make it public so frontend can access
            }

            // Use lib-storage Upload for easier handling
            const parallelUploads3 = new Upload({
                client: s3Client,
                params: uploadParams,
            })

            await parallelUploads3.done()

            // Construct public URL
            // For local MinIO: http://localhost:9000/products/filename
            const fileUrl = buildPublicUrl(fileName)

            return res.json({ url: fileUrl, storage: 's3' })
        } catch (cloudError) {
            const allowFallback = process.env.S3_FALLBACK_LOCAL !== 'false' && process.env.NODE_ENV !== 'production'
            const storageUnavailable =
                (cloudError as any)?.code &&
                ['ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EAI_AGAIN', 'ENOTFOUND', 'AccessDenied'].includes(
                    (cloudError as any).code
                )
            if (!allowFallback || !storageUnavailable) {
                throw cloudError
            }

            // Fallback to local filesystem storage for dev to keep UX working
            const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', tenant.id)
            await fs.mkdir(uploadDir, { recursive: true })
            const destPath = path.join(uploadDir, path.basename(fileName))
            await fs.writeFile(destPath, file.buffer)
            const publicUrl = `/uploads/${tenant.id}/${path.basename(fileName)}`

            return res.json({ url: publicUrl, storage: 'local' })
        }
    } catch (error) {
        console.error('Upload error:', error)

        if (error instanceof multer.MulterError) {
            return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && error.message === 'Only image uploads are allowed') {
            return res.status(400).json({ error: error.message })
        }

        const storageUnavailable =
            (error as any)?.code &&
            ['ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EAI_AGAIN', 'ENOTFOUND'].includes(
                (error as any).code
            )

        const accessDenied = (error as any)?.code === 'AccessDenied'

        if (storageUnavailable || accessDenied || (error as any)?.$metadata?.httpStatusCode === 503) {
            return res.status(503).json({
                error: 'Storage unavailable. Please ensure MinIO/S3 is running at S3_ENDPOINT or use local fallback.'
            })
        }

        const message = error instanceof Error ? error.message : 'Upload failed'
        res.status(500).json({ error: message })
    }
})

export default router
