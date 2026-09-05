import prisma from '../../lib/prisma'
import { withJobLock } from '../../lib/job-lock'
import { getAiSettings } from '../../lib/platform-settings'

/**
 * Fails scans that were left mid-flight.
 *
 * Extraction runs detached in the API process, so a deploy or a crash during a
 * long multi-page read would strand a job in EXTRACTING forever — the review
 * screen would spin and the pages would still count against the tenant's quota.
 * This closes them out with a message the merchant can act on.
 *
 * Same shape as the WhatsApp reminder job: lease lock so several instances do
 * not fight, off under test, killable by env.
 */

export const REAPER_JOB_NAME = 'ai-documents-reaper'

const TICK_MS = 5 * 60 * 1000
/** Longer than a tick: the lease must cover a slow run, not just the gap. */
const LEASE_MS = 10 * 60 * 1000
/** Generous — a ten-page PDF at high effort can legitimately run for minutes. */
const STALE_AFTER_MS = 15 * 60 * 1000

export type ReaperSummary = { failed: number }

export const runAiDocumentReaper = async (now = new Date()): Promise<ReaperSummary> => {
    const cutoff = new Date(now.getTime() - STALE_AFTER_MS)

    const result = await prisma.aiDocumentJob.updateMany({
        where: {
            status: { in: ['PENDING', 'EXTRACTING'] },
            OR: [{ startedAt: { lt: cutoff } }, { startedAt: null, createdAt: { lt: cutoff } }]
        },
        data: {
            status: 'FAILED',
            completedAt: now,
            errorMessage: 'Reading this document timed out. Upload it again.'
        }
    })

    return { failed: result.count }
}

/**
 * Checked per tick, not once at boot: a super-admin flipping the switch off
 * should stop the reaper without a restart, and flipping it back on should not
 * need one either.
 */
export const tickAiDocumentReaper = async () => {
    if (!(await getAiSettings()).enabled) return null
    return withJobLock(REAPER_JOB_NAME, LEASE_MS, () => runAiDocumentReaper())
}

let timer: NodeJS.Timeout | null = null

export const startAiDocumentReaperScheduler = () => {
    if (timer) return timer
    if (process.env.NODE_ENV === 'test') return null

    timer = setInterval(() => {
        void tickAiDocumentReaper().catch((error) => {
            console.error('[AiDocumentReaper] Tick failed:', error)
        })
    }, TICK_MS)

    timer.unref?.()
    return timer
}

export const stopAiDocumentReaperScheduler = () => {
    if (!timer) return
    clearInterval(timer)
    timer = null
}
