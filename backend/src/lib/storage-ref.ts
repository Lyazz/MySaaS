export type ParsedStorageRef =
    | { kind: 'http'; url: string }
    | { kind: 's3'; bucket: string; key: string }
    | { kind: 'local'; key: string }

export const parseStorageRef = (value: string): ParsedStorageRef => {
    const trimmed = String(value || '').trim()
    if (!trimmed) throw new Error('Missing ref')

    if (/^https?:\/\//i.test(trimmed)) return { kind: 'http', url: trimmed }

    const s3Match = trimmed.match(/^s3:\/\/([^/]+)\/(.+)$/i)
    if (s3Match) {
        const bucket = s3Match[1]!
        const key = s3Match[2]!
        return { kind: 's3', bucket, key }
    }

    const localMatch = trimmed.match(/^local:\/\/(.+)$/i)
    if (localMatch) {
        const key = localMatch[1]!
        return { kind: 'local', key }
    }

    throw new Error('Unsupported ref')
}
