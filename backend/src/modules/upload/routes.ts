import { Router } from 'express'
import multer from 'multer'
import { Upload } from '@aws-sdk/lib-storage'
import type { PutObjectCommandInput } from '@aws-sdk/client-s3'
import { s3Client, BUCKET_NAME } from '../../lib/s3'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'

const router = Router()

// Configure multer to store file in memory
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.post('/', requireTenantAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' })
        }

        const file = req.file
        // Create a unique file name
        const fileName = `${Date.now()}-${file.originalname}`

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
        const fileUrl = `${process.env.S3_PUBLIC_URL || 'http://localhost:9000'}/${BUCKET_NAME}/${fileName}`

        res.json({ url: fileUrl })
    } catch (error) {
        console.error('Upload error:', error)
        res.status(500).json({ error: 'Upload failed' })
    }
})

export default router
