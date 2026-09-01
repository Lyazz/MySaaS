import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import prisma from './prisma'

/**
 * A cooperative lease lock for platform-wide background work.
 *
 * Background jobs run inside the API process, so every instance behind the load
 * balancer would otherwise fire the same work at the same minute. The lock is a
 * lease rather than a flag on purpose: a worker that dies mid-run cannot release
 * anything, and a flag would stay stuck forever — an expired lease is simply
 * taken by the next tick.
 *
 * It is deliberately not tenant-scoped: the holder is a process, not a tenant,
 * and the work it guards iterates over tenants itself.
 */

const OWNER = `${process.pid}-${randomUUID().slice(0, 8)}`

export const jobLockOwner = () => OWNER

export const acquireJobLock = async (name: string, leaseMs: number, now = new Date()): Promise<boolean> => {
    const lockedUntil = new Date(now.getTime() + leaseMs)

    try {
        await prisma.jobLock.create({
            data: { name, owner: OWNER, lockedAt: now, lockedUntil }
        })
        return true
    } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
            throw error
        }
    }

    // Someone holds it. Take it only if their lease has run out — the WHERE is
    // what makes this safe against two instances racing for the same row.
    const stolen = await prisma.jobLock.updateMany({
        where: { name, lockedUntil: { lt: now } },
        data: { owner: OWNER, lockedAt: now, lockedUntil }
    })

    return stolen.count === 1
}

export const releaseJobLock = async (name: string) => {
    // Only the holder releases: a worker whose lease already expired and was
    // taken by someone else must not cut that run short when it finishes.
    await prisma.jobLock.updateMany({
        where: { name, owner: OWNER },
        data: { lockedUntil: new Date() }
    })
}

/**
 * Runs `work` if this process can take the lock, and always gives it back.
 * Returns null when another instance holds it — that is a normal outcome, not
 * an error.
 */
export const withJobLock = async <T>(
    name: string,
    leaseMs: number,
    work: () => Promise<T>
): Promise<T | null> => {
    if (!(await acquireJobLock(name, leaseMs))) return null

    try {
        return await work()
    } finally {
        await releaseJobLock(name).catch((error) => {
            console.error(`[JobLock] Failed to release ${name}:`, error)
        })
    }
}
