import crypto from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import prisma from '../lib/prisma'

/**
 * Replays the stored response for a write that has already been applied under
 * the same `Idempotency-Key`.
 *
 * The Flutter admin app keeps a durable outbox: writes made offline are queued
 * and flushed on reconnect. A reconnect is exactly when a request is most
 * likely to be accepted by the server and then lose its response — the radio
 * drops again, the connection times out. The client cannot distinguish that
 * from "never arrived", so it retries, and the retry used to create a second
 * customer, order or cash movement. Only POS sales were protected, through a
 * `clientRequestId` column on Sale.
 *
 * Scope: POST only. PUT/PATCH/DELETE against a known id are already idempotent
 * by construction, and it is creates that duplicate.
 */

/** How long a key is honoured. Long enough to outlive any realistic outage. */
const RETENTION_MS = 24 * 60 * 60 * 1000

/** At most one purge per process per hour; this is housekeeping, not a job. */
const PURGE_INTERVAL_MS = 60 * 60 * 1000
let lastPurgeAt = 0

const hashRequest = (method: string, path: string, body: unknown): string => {
    // Undefined and an empty object have to hash alike: a body-less POST is
    // parsed as `{}` by express.json() but arrives as undefined in tests.
    const payload = body === undefined || body === null ? {} : body
    return crypto
        .createHash('sha256')
        .update(`${method}\n${path}\n${JSON.stringify(payload)}`)
        .digest('hex')
}

const purgeExpiredKeys = async () => {
    const now = Date.now()
    if (now - lastPurgeAt < PURGE_INTERVAL_MS) return
    lastPurgeAt = now
    try {
        await prisma.idempotencyKey.deleteMany({
            where: { createdAt: { lt: new Date(now - RETENTION_MS) } }
        })
    } catch (error) {
        // Housekeeping must never fail a write.
        console.error('Idempotency purge error:', error)
    }
}

export const expressIdempotencyMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const tenant = req.tenant
    const key = req.get('Idempotency-Key')?.trim()

    if (req.method !== 'POST' || !key || !tenant) return next()

    const requestHash = hashRequest(req.method, req.path, req.body)

    let claimed = false
    try {
        await prisma.idempotencyKey.create({
            data: { tenantId: tenant.id, key, method: req.method, path: req.path, requestHash }
        })
        claimed = true
    } catch (error: any) {
        if (error?.code !== 'P2002') {
            // Anything other than "this key is taken" is an infrastructure
            // problem. Failing open would reintroduce the duplicate this
            // middleware exists to prevent, so refuse instead — 503 tells the
            // client to back off and retry rather than to give up.
            console.error('Idempotency claim error:', error)
            return res.status(503).json({
                statusCode: 503,
                statusMessage: 'Could not verify request idempotency, please retry'
            })
        }
    }

    if (!claimed) {
        // Scoped by tenantId, never by key alone: two tenants generating the
        // same key must not see each other's response.
        const existing = await prisma.idempotencyKey.findUnique({
            where: { tenantId_key: { tenantId: tenant.id, key } }
        })

        if (!existing) {
            // Purged between the failed insert and this read. Treat it as a
            // fresh request rather than guessing.
            return next()
        }

        if (existing.requestHash !== requestHash) {
            // Logged, not refused. The Flutter outbox rewrites a payload
            // between attempts by design: `_resolveOperationAliases` swaps
            // local ids for the remote ids their parent create just returned,
            // and `_processImagesInPayload` replaces local file paths with
            // uploaded URLs. Those retries are the same write and must replay.
            //
            // Refusing on a hash mismatch would drop them, which is why the
            // POS suite pins a retry that deliberately changes `offlineId`.
            // Keys are per-operation UUIDs generated once when the write is
            // queued, so a key genuinely shared by two different writes cannot
            // arise from this client — the hash stays as a diagnostic.
            console.warn(
                `Idempotency-Key ${key} replayed with a different request body on ${req.path}`
            )
        }

        if (!existing.completedAt) {
            // The first attempt is still in flight. 425 rather than 409: the
            // client should come back, not treat this as a conflict needing a
            // human.
            //
            // A claim is deliberately never auto-released on age. If the
            // process died between answering and recording, the write may well
            // have been applied, and letting the retry through would create
            // the duplicate this whole middleware exists to prevent. A key
            // stuck until it expires strands one write visibly, in the sync
            // screen's recovery list; a duplicate corrupts the ledger silently.
            return res.status(425).json({
                statusCode: 425,
                statusMessage: 'The original request is still being processed, please retry'
            })
        }

        return res.status(existing.statusCode ?? 200).json(existing.responseBody ?? {})
    }

    void purgeExpiredKeys()

    const releaseClaim = async () => {
        try {
            await prisma.idempotencyKey.deleteMany({ where: { tenantId: tenant.id, key } })
        } catch (error) {
            console.error('Idempotency release error:', error)
        }
    }

    const originalJson = res.json.bind(res)
    let recorded = false

    res.json = (body: any) => {
        if (recorded) return originalJson(body)
        recorded = true

        if (res.statusCode >= 200 && res.statusCode < 300) {
            // Store what goes on the wire, not the handler's objects. Prisma
            // hands back Decimal and Date instances, and a replay has to be
            // byte-identical to the response the client missed.
            const serialized = JSON.parse(JSON.stringify(body ?? {}))
            prisma.idempotencyKey
                .updateMany({
                    where: { tenantId: tenant.id, key },
                    data: { statusCode: res.statusCode, responseBody: serialized, completedAt: new Date() }
                })
                .catch((error) => console.error('Idempotency store error:', error))
        } else {
            // Only successes are replayable. A 4xx or 5xx says nothing was
            // applied, so the key has to stay free for a genuine retry —
            // pinning a transient 500 to it would make every retry fail.
            void releaseClaim()
        }

        return originalJson(body)
    }

    // A handler that ends without res.json — a redirect, a 204, a crash caught
    // by the error handler — leaves a claim that would block every retry with
    // 425 until it expires.
    res.on('close', () => {
        if (!recorded) void releaseClaim()
    })

    return next()
}
