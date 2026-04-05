import path from 'path'
import { createReadStream, promises as fs } from 'fs'

const BASE_DIR = path.resolve(process.cwd(), 'private_uploads')

export class LocalFilesService {
    resolveAbsolutePath(key: string) {
        const normalized = key.replace(/^\/+/, '')
        const abs = path.resolve(BASE_DIR, normalized)
        if (!abs.startsWith(BASE_DIR + path.sep) && abs !== BASE_DIR) {
            throw new Error('Invalid path')
        }
        return abs
    }

    async exists(absPath: string) {
        try {
            const stat = await fs.stat(absPath)
            return stat.isFile()
        } catch {
            return false
        }
    }

    stream(absPath: string) {
        return createReadStream(absPath)
    }
}

