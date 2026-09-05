type UploadWithProgressOptions = {
    url: string
    file: File
    token?: string | null
    fieldName?: string
    /** Extra multipart fields sent alongside the file (e.g. a document kind). */
    fields?: Record<string, string>
    onProgress?: (percent: number) => void
    fallbackErrorMessage?: string
}

const parseJsonSafely = (raw: string): any => {
    if (!raw) return {}
    try {
        return JSON.parse(raw)
    } catch {
        return {}
    }
}

export const useUploadWithProgress = () => {
    const uploadWithProgress = async <T = any>({
        url,
        file,
        token,
        fieldName = 'file',
        fields,
        onProgress,
        fallbackErrorMessage = 'Upload failed'
    }: UploadWithProgressOptions): Promise<T> => {
        if (typeof window === 'undefined' || typeof XMLHttpRequest === 'undefined') {
            throw new Error('Upload progress is not available in this environment')
        }

        const formData = new FormData()
        // Fields first: multer parses the stream in order, so a field appended
        // after the file is not on req.body when the route handler runs.
        for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value)
        formData.append(fieldName, file)

        return await new Promise<T>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('POST', url)

            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`)
            }

            xhr.upload.onprogress = (event) => {
                if (!onProgress || !event.lengthComputable || event.total <= 0) return
                const percent = Math.min(99, Math.round((event.loaded / event.total) * 100))
                onProgress(percent)
            }

            xhr.onload = () => {
                onProgress?.(100)
                const payload = parseJsonSafely(xhr.responseText)
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(payload as T)
                    return
                }
                reject(new Error(payload?.error || payload?.statusMessage || fallbackErrorMessage))
            }

            xhr.onerror = () => {
                reject(new Error(fallbackErrorMessage))
            }

            xhr.onabort = () => {
                reject(new Error(fallbackErrorMessage))
            }

            xhr.send(formData)
        })
    }

    return { uploadWithProgress }
}
