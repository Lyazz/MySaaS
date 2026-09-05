/**
 * Calendar maths for subscriptions.
 *
 * Four copies of `addUtcMonths` / `addUtcYears` used to live in
 * billing.service, billing-admin.service, orders.service and pos.service. All
 * four built the result as `Date.UTC(y, m + n, getUTCDate(), 0, 0, 0, 0)`,
 * which has two defects:
 *
 *   - a 31 January period end rolls over into 3 March instead of clamping to
 *     28/29 February;
 *   - zeroing the clock silently throws away up to a day of paid time.
 *
 * Everything that moves a subscription date now goes through this module.
 */

export type BillingInterval = 'month' | 'year'

/** How many months one paid term covers. The only place this mapping lives. */
export const MONTHS_PER_INTERVAL: Record<BillingInterval, number> = {
  month: 1,
  year: 12
}

export const MS_PER_DAY = 86_400_000

export const isBillingInterval = (value: unknown): value is BillingInterval =>
  value === 'month' || value === 'year'

export const normalizeInterval = (value: unknown): BillingInterval =>
  isBillingInterval(value) ? value : 'month'

const daysInUtcMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

/**
 * Adds whole months in UTC, keeping the time of day and clamping the day of
 * month to the target month's length (31 Jan + 1 month = 28/29 Feb).
 */
export const addUtcMonths = (date: Date, months: number): Date => {
  const absoluteMonth = date.getUTCMonth() + months
  const targetYear = date.getUTCFullYear() + Math.floor(absoluteMonth / 12)
  const targetMonth = ((absoluteMonth % 12) + 12) % 12
  const day = Math.min(date.getUTCDate(), daysInUtcMonth(targetYear, targetMonth))

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  )
}

/** End of one paid term that starts at [date]. */
export const addBillingInterval = (date: Date, interval: BillingInterval): Date =>
  addUtcMonths(date, MONTHS_PER_INTERVAL[normalizeInterval(interval)])

export interface UsageWindow {
  start: Date
  end: Date
  /** How many whole months have elapsed since the anchor. */
  index: number
}

/**
 * The one-month quota window containing [now], anchored on the day of month the
 * subscription bills on.
 *
 * Plan allowances are quoted per month ("1500 orders/mo") but enforcement used
 * to count across the whole billing period, so a tenant on annual billing got a
 * single month's allowance to last twelve months and started getting 429s on
 * their storefront. The quota window and the paid term are different things;
 * this is the quota one, and it is a month wide whatever the interval.
 */
export const currentUsageWindow = (anchor: Date, now: Date = new Date()): UsageWindow => {
  if (now < anchor) {
    return { start: anchor, end: addUtcMonths(anchor, 1), index: 0 }
  }

  let index = Math.max(
    0,
    (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + (now.getUTCMonth() - anchor.getUTCMonth())
  )

  // The calendar-month difference can be one out once the anchor's day of month
  // and time of day are accounted for; correct in both directions.
  while (index > 0 && addUtcMonths(anchor, index) > now) index -= 1
  while (addUtcMonths(anchor, index + 1) <= now) index += 1

  return { start: addUtcMonths(anchor, index), end: addUtcMonths(anchor, index + 1), index }
}

/**
 * Whole days from [from] to [to], rounded up. Negative once [to] is in the past,
 * which is what lets the UI say "expired 3 days ago" from the same number.
 */
export const daysBetween = (from: Date, to: Date): number =>
  Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY)
