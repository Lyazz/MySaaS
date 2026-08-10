export type StatsRange = 'today' | '7d' | '30d' | '90d' | 'custom'

export type StatsChannel = 'all' | 'online' | 'pos'

export type StatsQuery = {
    range: StatsRange
    from?: Date | null
    to?: Date | null
    channel?: StatsChannel
    categoryId?: string | null
    wilayaCode?: string | null
    provider?: string | null
    compare?: boolean
}

export type ResolvedPeriod = {
    range: StatsRange
    fromAt: Date
    toAt: Date
    from: string
    to: string
    days: number
}

export type ResolvedPeriodWithPrevious = ResolvedPeriod & {
    previous: ResolvedPeriod
}

export type ComparableMetric = {
    value: number
    previousValue: number
    changePct: number | null
}

export const DAY_MS = 24 * 60 * 60 * 1000

export const ORDER_REVENUE_EXCLUDED_STATUSES = ['CANCELLED', 'RETURNED']

export const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)

export const endOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

export const isoDay = (date: Date) => {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
}

export const numberOrZero = (value: unknown) => {
    const n = Number(value ?? 0)
    return Number.isFinite(n) ? n : 0
}

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export const pctChange = (current: number, previous: number): number | null => {
    if (!Number.isFinite(previous) || previous === 0) {
        if (current === 0) return 0
        return null
    }
    return round2(((current - previous) / previous) * 100)
}

export const comparable = (value: number, previousValue: number): ComparableMetric => ({
    value: round2(value),
    previousValue: round2(previousValue),
    changePct: pctChange(value, previousValue)
})

export const resolvePeriod = (query: Pick<StatsQuery, 'range' | 'from' | 'to'>): ResolvedPeriod => {
    const now = new Date()
    const range = query.range || 'today'

    if (range === 'custom' && query.from && query.to) {
        const fromAt = startOfDay(query.from)
        const toAt = endOfDay(query.to)
        const days = Math.floor((startOfDay(query.to).getTime() - startOfDay(query.from).getTime()) / DAY_MS) + 1
        return { range, fromAt, toAt, from: isoDay(fromAt), to: isoDay(toAt), days }
    }

    const days = range === 'today' ? 1 : range === '90d' ? 90 : range === '30d' ? 30 : 7
    const toAt = endOfDay(now)
    const fromAt = startOfDay(new Date(toAt.getTime() - (days - 1) * DAY_MS))
    return { range, fromAt, toAt, from: isoDay(fromAt), to: isoDay(toAt), days }
}

/** Resolves the requested period plus the immediately preceding period of equal length, for comparisons. */
export const resolvePeriodWithPrevious = (query: Pick<StatsQuery, 'range' | 'from' | 'to'>): ResolvedPeriodWithPrevious => {
    const period = resolvePeriod(query)
    const previousToAt = new Date(period.fromAt.getTime() - DAY_MS)
    const previousFromAt = startOfDay(new Date(previousToAt.getTime() - (period.days - 1) * DAY_MS))
    const previous: ResolvedPeriod = {
        range: period.range,
        fromAt: previousFromAt,
        toAt: endOfDay(previousToAt),
        from: isoDay(previousFromAt),
        to: isoDay(previousToAt),
        days: period.days
    }
    return { ...period, previous }
}
