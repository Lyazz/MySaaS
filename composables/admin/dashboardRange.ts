export type DashboardRange = '7d' | '30d' | '90d' | 'custom'

const isoDate = (date: Date) => {
    const year = date.getUTCFullYear()
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
    const day = `${date.getUTCDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
}

export const defaultCustomDateRange = (now = new Date()) => {
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000)
    return {
        from: isoDate(start),
        to: isoDate(end)
    }
}

export const buildDashboardRangeQuery = (range: DashboardRange, from?: string | null, to?: string | null) => {
    const query: Record<string, string> = { range }
    if (range !== 'custom') return query

    if (!from || !to) {
        throw new Error('Custom range requires both "from" and "to"')
    }

    query.from = from
    query.to = to
    return query
}
