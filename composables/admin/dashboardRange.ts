export type DashboardRange = 'today' | '7d' | '30d' | '90d' | 'custom'

const isoDate = (date: Date) => {
    const year = date.getUTCFullYear()
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
    const day = `${date.getUTCDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
}

export const dashboardPresetRanges = ['today', '7d', '30d', '90d'] as const
export type DashboardPresetRange = typeof dashboardPresetRanges[number]

export const getDashboardPresetDateRange = (range: DashboardPresetRange, now = new Date()) => {
    const days = range === 'today' ? 1 : range === '90d' ? 90 : range === '30d' ? 30 : 7
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
    return {
        from: isoDate(start),
        to: isoDate(end)
    }
}

export const defaultCustomDateRange = (now = new Date()) => {
    return getDashboardPresetDateRange('7d', now)
}

export const resolveDashboardRangeFromDates = (
    from?: string | null,
    to?: string | null,
    now = new Date()
): DashboardRange => {
    if (!from || !to) return 'custom'

    for (const range of dashboardPresetRanges) {
        const preset = getDashboardPresetDateRange(range, now)
        if (preset.from === from && preset.to === to) return range
    }

    return 'custom'
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
