type CsvParseOptions = {
    delimiter?: string
    maxRows?: number
    maxColumns?: number
}

export type ParsedCsv = {
    header: string[]
    records: Record<string, string>[]
}

const stripBom = (text: string) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)

export const parseCsv = (text: string, opts?: CsvParseOptions): ParsedCsv => {
    const delimiter = opts?.delimiter ?? ','
    const maxRows = opts?.maxRows ?? 10_000
    const maxColumns = opts?.maxColumns ?? 200

    const input = stripBom(text)
    const rows: string[][] = []

    let currentField = ''
    let currentRow: string[] = []
    let inQuotes = false

    const pushField = () => {
        currentRow.push(currentField)
        currentField = ''
        if (currentRow.length > maxColumns) throw new Error(`CSV has too many columns (>${maxColumns})`)
    }

    const pushRow = () => {
        rows.push(currentRow)
        currentRow = []
        if (rows.length > maxRows) throw new Error(`CSV has too many rows (>${maxRows})`)
    }

    for (let i = 0; i < input.length; i++) {
        const ch = input[i]

        if (inQuotes) {
            if (ch === '"') {
                const next = input[i + 1]
                if (next === '"') {
                    currentField += '"'
                    i++
                    continue
                }
                inQuotes = false
                continue
            }

            currentField += ch
            continue
        }

        if (ch === '"') {
            inQuotes = true
            continue
        }

        if (ch === delimiter) {
            pushField()
            continue
        }

        if (ch === '\n') {
            pushField()
            pushRow()
            continue
        }

        if (ch === '\r') {
            const next = input[i + 1]
            if (next === '\n') i++
            pushField()
            pushRow()
            continue
        }

        currentField += ch
    }

    if (inQuotes) {
        throw new Error('CSV has an unterminated quoted field')
    }

    const hasTrailingData = currentField.length > 0 || currentRow.length > 0
    if (hasTrailingData) {
        pushField()
        pushRow()
    }

    // Drop a trailing empty row (common when ending with newline)
    if (rows.length > 0 && rows[rows.length - 1].every((cell) => cell.trim() === '')) {
        rows.pop()
    }

    const header = (rows.shift() ?? []).map((h) => h.trim())
    if (header.length === 0 || header.every((h) => !h)) throw new Error('CSV header row is missing')
    if (header.some((h) => !h)) {
        const emptyColumns = header
            .map((h, idx) => ({ h, idx }))
            .filter((x) => !x.h)
            .map((x) => x.idx + 1) // 1-based for users

        // This commonly happens when the header row has an extra comma:
        // - leading comma: ",id,slug,..."  -> empty column 1
        // - double comma:  "id,,slug,..."  -> some empty column
        // - trailing comma:"id,slug,..." + "," -> empty last column
        throw new Error(
            `CSV header contains empty column names at column(s): ${emptyColumns.join(', ')}. ` +
                `Fix: remove extra commas / empty header cells. Parsed header: ${JSON.stringify(header)}`
        )
    }

    const records = rows.map((row) => {
        const record: Record<string, string> = {}
        for (let i = 0; i < header.length; i++) {
            record[header[i]] = (row[i] ?? '').trim()
        }
        return record
    })

    return { header, records }
}

const escapeCell = (value: unknown, delimiter: string) => {
    const s = value === undefined || value === null ? '' : String(value)
    if (s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes(delimiter)) {
        return `"${s.replace(/"/g, '""')}"`
    }
    return s
}

export const stringifyCsv = (header: string[], rows: Array<Record<string, unknown>>, opts?: { delimiter?: string }) => {
    const delimiter = opts?.delimiter ?? ','

    const lines: string[] = []
    lines.push(header.map((h) => escapeCell(h, delimiter)).join(delimiter))

    for (const row of rows) {
        lines.push(header.map((h) => escapeCell(row[h], delimiter)).join(delimiter))
    }

    return `${lines.join('\n')}\n`
}
