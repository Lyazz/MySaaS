import { randomBytes } from 'node:crypto'

import { Prisma } from '@prisma/client'

import { logAction } from '../../lib/audit'
import prisma from '../../lib/prisma'

import { ActivationError, ActivationService } from './activation.service'

/**
 * The super-admin side of device licensing.
 *
 * Kept apart from `ActivationService`, which is the device-facing surface: these
 * operations are privileged, every one of them is audited, and none of them may
 * ever be reachable by a tenant. Splitting the files makes that boundary
 * something you can see rather than something you have to remember.
 */

/** How long an approved request may go unclaimed before it lapses. */
const CLAIM_WINDOW_HOURS = 72
/** Default window during which a revoked device may still drain queued writes. */
const DEFAULT_DRAIN_HOURS = 48

const hours = (n: number) => n * 60 * 60 * 1000

const newClaimCode = () => randomBytes(24).toString('base64url')

export class ActivationAdminService {
    private activationService = new ActivationService()

    /** Pending requests across the whole platform, newest first. */
    async listRequests(status?: string) {
        return prisma.deviceActivationRequest.findMany({
            where: status ? { status: status as never } : undefined,
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                tenant: { select: { id: true, name: true, slug: true } },
                license: {
                    select: { id: true, licenseKey: true, maxDevices: true }
                }
            }
        })
    }

    async listTenantDevices(tenantId: string) {
        return this.activationService.listDevices(tenantId)
    }

    /**
     * Approves a request and mints the one-time code the waiting device swaps
     * for a real licence.
     *
     * When the request replaces a device, the old seat is freed in the same
     * transaction -- otherwise approving a transfer on a one-seat licence would
     * hand out a code that then fails the seat check.
     */
    async approveRequest(input: {
        requestId: string
        adminUserId: string
        note?: string
        drainHours?: number
    }) {
        const now = new Date()

        const result = await prisma.$transaction(
            async (tx) => {
                const request = await tx.deviceActivationRequest.findUnique({
                    where: { id: input.requestId }
                })

                if (!request) {
                    throw new ActivationError(
                        'DEVICE_UNKNOWN',
                        'Activation request not found',
                        404
                    )
                }

                if (request.status !== 'PENDING') {
                    throw new ActivationError(
                        'TOKEN_SUPERSEDED',
                        `Request is already ${request.status}`,
                        409
                    )
                }

                if (request.replacesDeviceId) {
                    const replaced = await tx.device.findFirst({
                        where: {
                            id: request.replacesDeviceId,
                            tenantId: request.tenantId
                        }
                    })

                    if (replaced) {
                        await tx.device.update({
                            where: { id: replaced.id },
                            data: {
                                status: 'REVOKED',
                                // Retires every token minted for it, without a
                                // blocklist consulted on each request.
                                tokenVersion: { increment: 1 },
                                revokedAt: now,
                                revokedByUserId: input.adminUserId,
                                revokedReason: 'Replaced by an approved device transfer',
                                // The old terminal keeps pushing work it already
                                // captured offline, so a transfer never destroys
                                // the tenant's data.
                                drainUntil: new Date(
                                    now.getTime() +
                                        hours(input.drainHours ?? DEFAULT_DRAIN_HOURS)
                                )
                            }
                        })
                    }
                }

                return tx.deviceActivationRequest.update({
                    where: { id: request.id },
                    data: {
                        status: 'APPROVED',
                        decidedAt: now,
                        decidedByUserId: input.adminUserId,
                        decisionNote: input.note?.trim() || null,
                        claimCode: newClaimCode(),
                        expiresAt: new Date(now.getTime() + hours(CLAIM_WINDOW_HOURS))
                    }
                })
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        )

        await logAction({
            action: 'DEVICE_APPROVED',
            details: `Approved device ${result.hardwareId.slice(0, 8)}… ${
                result.replacesDeviceId ? `replacing ${result.replacesDeviceId}` : ''
            }`.trim(),
            userId: input.adminUserId,
            targetId: result.id,
            tenantId: result.tenantId
        })

        return result
    }

    async denyRequest(input: {
        requestId: string
        adminUserId: string
        note?: string
    }) {
        const request = await prisma.deviceActivationRequest.findUnique({
            where: { id: input.requestId }
        })

        if (!request) {
            throw new ActivationError(
                'DEVICE_UNKNOWN',
                'Activation request not found',
                404
            )
        }

        const updated = await prisma.deviceActivationRequest.update({
            where: { id: request.id },
            data: {
                status: 'DENIED',
                decidedAt: new Date(),
                decidedByUserId: input.adminUserId,
                decisionNote: input.note?.trim() || null
            }
        })

        await logAction({
            action: 'DEVICE_DENIED',
            details: input.note?.trim() || 'Device activation request denied',
            userId: input.adminUserId,
            targetId: updated.id,
            tenantId: updated.tenantId
        })

        return updated
    }

    /**
     * Revokes a device, freeing its seat.
     *
     * `drainHours` is what keeps this safe to use: the device stops being able
     * to start new work immediately, but its already-queued offline writes still
     * reach the server. Revoking a terminal must never cost the tenant the sales
     * it already rang up.
     */
    async revokeDevice(input: {
        tenantId: string
        deviceId: string
        adminUserId: string
        reason: string
        drainHours?: number
    }) {
        const now = new Date()

        const device = await prisma.device.findFirst({
            where: { id: input.deviceId, tenantId: input.tenantId }
        })

        if (!device) {
            throw new ActivationError('DEVICE_UNKNOWN', 'Device not found', 404)
        }

        const updated = await prisma.device.update({
            where: { id: device.id },
            data: {
                status: 'REVOKED',
                tokenVersion: { increment: 1 },
                revokedAt: now,
                revokedByUserId: input.adminUserId,
                revokedReason: input.reason.trim() || 'Revoked by an administrator',
                drainUntil: new Date(
                    now.getTime() + hours(input.drainHours ?? DEFAULT_DRAIN_HOURS)
                )
            }
        })

        await logAction({
            action: 'DEVICE_REVOKED',
            details: input.reason.trim() || 'Revoked by an administrator',
            userId: input.adminUserId,
            targetId: updated.id,
            tenantId: input.tenantId
        })

        return updated
    }

    /** Puts a revoked device back into service, if a seat is free. */
    async restoreDevice(input: {
        tenantId: string
        deviceId: string
        adminUserId: string
    }) {
        const restored = await prisma.$transaction(
            async (tx) => {
                const device = await tx.device.findFirst({
                    where: { id: input.deviceId, tenantId: input.tenantId },
                    include: { license: true }
                })

                if (!device) {
                    throw new ActivationError('DEVICE_UNKNOWN', 'Device not found', 404)
                }

                const activeDevices = await tx.device.count({
                    where: { licenseId: device.licenseId, status: 'ACTIVE' }
                })

                if (activeDevices >= device.license.maxDevices) {
                    throw new ActivationError(
                        'DEVICE_LIMIT_REACHED',
                        `Cannot restore: the licence already has ${activeDevices} of ${device.license.maxDevices} seats in use.`,
                        409
                    )
                }

                return tx.device.update({
                    where: { id: device.id },
                    data: {
                        status: 'ACTIVE',
                        // Bumped again so any token minted while it was revoked
                        // cannot be replayed.
                        tokenVersion: { increment: 1 },
                        revokedAt: null,
                        revokedByUserId: null,
                        revokedReason: null,
                        drainUntil: null
                    }
                })
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        )

        await logAction({
            action: 'DEVICE_RESTORED',
            details: 'Device returned to service',
            userId: input.adminUserId,
            targetId: restored.id,
            tenantId: input.tenantId
        })

        return restored
    }

    /**
     * Pushes a device's read-only date out.
     *
     * The support valve for a tenant that genuinely cannot get online -- a shop
     * with no connectivity for a month should not lose its till.
     */
    async extendGrace(input: {
        tenantId: string
        deviceId: string
        adminUserId: string
        days: number
    }) {
        const device = await prisma.device.findFirst({
            where: { id: input.deviceId, tenantId: input.tenantId }
        })

        if (!device) {
            throw new ActivationError('DEVICE_UNKNOWN', 'Device not found', 404)
        }

        const base = device.graceUntil ?? new Date()
        const graceUntil = new Date(base.getTime() + input.days * 24 * 60 * 60 * 1000)

        const updated = await prisma.device.update({
            where: { id: device.id },
            data: { graceUntil }
        })

        await logAction({
            action: 'DEVICE_GRACE_EXTENDED',
            details: `Grace extended by ${input.days} day(s), now ${graceUntil.toISOString()}`,
            userId: input.adminUserId,
            targetId: updated.id,
            tenantId: input.tenantId
        })

        return updated
    }

    /** Changes seat count and licence window settings. */
    async updateLicense(input: {
        tenantId: string
        licenseId: string
        adminUserId: string
        data: {
            maxDevices?: number
            isActive?: boolean
            expiresAt?: Date | null
            offlineValidityDays?: number
            graceDays?: number
        }
    }) {
        const license = await prisma.license.findFirst({
            where: { id: input.licenseId, tenantId: input.tenantId }
        })

        if (!license) {
            throw new ActivationError('LICENSE_INVALID', 'Licence not found', 404)
        }

        if (input.data.maxDevices != null) {
            if (!Number.isInteger(input.data.maxDevices) || input.data.maxDevices < 1) {
                throw new ActivationError(
                    'LICENSE_INVALID',
                    'maxDevices must be a positive whole number',
                    400
                )
            }

            const activeDevices = await prisma.device.count({
                where: { licenseId: license.id, status: 'ACTIVE' }
            })

            // Reducing below what is already in use would silently decide which
            // of a tenant's live terminals stops working. Revoking is explicit;
            // this must not be a back door into it.
            if (input.data.maxDevices < activeDevices) {
                throw new ActivationError(
                    'DEVICE_LIMIT_REACHED',
                    `Cannot set ${input.data.maxDevices} seats: ${activeDevices} devices are active. Revoke devices first.`,
                    409
                )
            }
        }

        const updated = await prisma.license.update({
            where: { id: license.id },
            data: input.data
        })

        await logAction({
            action: 'DEVICE_SEATS_CHANGED',
            details: JSON.stringify(input.data),
            userId: input.adminUserId,
            targetId: updated.id,
            tenantId: input.tenantId
        })

        return updated
    }
}
