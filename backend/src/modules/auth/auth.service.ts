import type { Prisma, Tenant, User } from '@prisma/client'
import bcrypt from 'bcryptjs'

import prisma from '../../lib/prisma'
import { signAccessToken } from '../../lib/jwt'
import { seedStaffRolePresets } from '../staff-roles/presets'
import { PhoneNormalizationService } from '../loyalty/phone-normalization.service'
import { ActivationError, ActivationService } from '../activation/activation.service'
import { ensureSubscription } from '../billing/subscription.service'

const MIN_PASSWORD_LENGTH = 8
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SLUG_REGEX = /^[a-z0-9-]+$/
const DUMMY_PASSWORD_HASH = '$2b$10$X9pL7vT6A2mQjO5k9sXXuuBkEFGhqUJSTjhRLuVVU3hV3MGWST5Oi'
const REGISTER_WHITELIST_PHONE = '0540801436'

type UserWithTenant = Prisma.UserGetPayload<{ include: { tenant: true } }>
type StaffRoleWithPermissions = {
    id: string
    name: string
    permissions: Array<{ resource: string; action: string }>
} | null

export class AuthServiceError extends Error {
    constructor(
        public statusCode: number,
        public statusMessage: string,
        /** Stable machine-readable reason, e.g. DEVICE_LIMIT_REACHED. */
        public code?: string,
        /** Extra fields merged into the response body, e.g. canRequestAccess. */
        public details?: Record<string, unknown>
    ) {
        super(statusMessage)
    }
}

/**
 * Kill switch for device seat enforcement.
 *
 * Ships disabled. Seat checks have been broken for long enough that some tenants
 * are running more devices than their licence allows; turning enforcement on
 * before those devices have heartbeated at least once would lock real shops out
 * mid-day. Enable it only once `Device.lastSeenAt` shows adoption.
 *
 * Disabled still means the failure is logged and no activation token is issued,
 * so the client learns it is unseated -- it just is not blocked from logging in.
 */
const isDeviceSeatEnforcementEnabled = () =>
    process.env.DEVICE_SEAT_ENFORCEMENT === 'true'

export type RegisterInput = {
    name?: unknown
    slug?: unknown
    email?: unknown
    password?: unknown
    phone?: unknown
}

export type LoginInput = {
    email?: unknown
    password?: unknown
    hardwareId?: unknown
    deviceName?: unknown
    devicePlatform?: unknown
}

const addUtcMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0))

export class AuthService {
    private phoneNormalization = new PhoneNormalizationService()
    private activationService = new ActivationService()

    /**
     * Registration was hard-gated to a single phone number while the platform
     * was closed. Self-serve trials need it open, so the gate now defaults OFF
     * and must be switched on deliberately.
     *
     * The trial itself is the abuse limit, backed by `registerRateLimiter`
     * (5/hour) and by the fact that a trial tenant's devices expire on their
     * own. `REGISTER_WHITELIST_PHONE` is kept so the gate can be re-armed.
     */
    private isTemporaryPhoneLockEnabled() {
        return process.env.REGISTER_PHONE_LOCK_ENABLED === 'true'
    }

    private getAllowedRegistrationPhoneNormalized() {
        const normalized = this.phoneNormalization.tryNormalizeAlgerianPhone(REGISTER_WHITELIST_PHONE)
        return normalized?.normalized ?? null
    }

    private buildStaffPermissions(role: StaffRoleWithPermissions) {
        if (!role) return { staffRole: null, staffPermissions: null }

        return {
            staffRole: { id: role.id, name: role.name },
            staffPermissions: role.permissions.map((permission) => `${permission.resource}:${permission.action}`)
        }
    }

    private async loadStaffRole(user: Pick<User, 'role' | 'staffRoleId' | 'tenantId'>) {
        if (user.role !== 'staff' || !user.staffRoleId) return null

        return prisma.tenantStaffRole.findUnique({
            where: { tenantId_id: { tenantId: user.tenantId, id: user.staffRoleId } },
            select: { id: true, name: true, permissions: { select: { resource: true, action: true } } }
        })
    }

    private areRegistrationsOpen() {
        return (process.env.REGISTRATIONS_OPEN ?? 'true') !== 'false'
    }

    async register(input: RegisterInput, tenant?: Tenant) {
        if (tenant) {
            throw new AuthServiceError(403, 'Registration is only allowed from the SaaS landing domain')
        }

        if (!this.areRegistrationsOpen()) {
            throw new AuthServiceError(403, 'Registration is temporarily closed')
        }

        const name = typeof input.name === 'string' ? input.name.trim() : ''
        const normalizedSlug = typeof input.slug === 'string' ? input.slug.trim() : ''
        const normalizedEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
        const password = typeof input.password === 'string' ? input.password : ''

        if (!name || !normalizedSlug || !normalizedEmail || !password) {
            throw new AuthServiceError(400, 'Missing required fields')
        }

        if (!EMAIL_REGEX.test(normalizedEmail)) {
            throw new AuthServiceError(400, 'Invalid email format')
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            throw new AuthServiceError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
        }

        if (!SLUG_REGEX.test(normalizedSlug)) {
            throw new AuthServiceError(400, 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.')
        }

        if (this.isTemporaryPhoneLockEnabled()) {
            const normalizedPhone = this.phoneNormalization.tryNormalizeAlgerianPhone(input.phone)
            const allowedPhone = this.getAllowedRegistrationPhoneNormalized()

            if (!allowedPhone || !normalizedPhone || normalizedPhone.normalized !== allowedPhone) {
                throw new AuthServiceError(403, 'Registration is currently unavailable')
            }
        }

        const existingTenant = await prisma.tenant.findUnique({
            where: { slug: normalizedSlug }
        })

        if (existingTenant) {
            throw new AuthServiceError(409, 'Tenant URL is already taken')
        }

        const passwordHash = await bcrypt.hash(password, 10)

        const result = await prisma.$transaction(async (tx) => {
            const now = new Date()
            const createdTenant = await tx.tenant.create({
                data: {
                    name,
                    slug: normalizedSlug,
                    // A self-registered tenant starts on an online trial. It was
                    // pinned to offline-only here, which meant every signup was
                    // born on the local-only tier no matter what it signed up for.
                    isOffline: false
                }
            })

            const defaultCashbox = await tx.cashbox.create({
                data: {
                    tenantId: createdTenant.id,
                    name: 'Caisse principale',
                    isActive: true
                }
            })

            const user = await tx.user.create({
                data: {
                    email: normalizedEmail,
                    passwordHash,
                    role: 'owner',
                    isSuperAdmin: false,
                    tenantId: createdTenant.id,
                    cashboxId: defaultCashbox.id
                }
            })

            await seedStaffRolePresets(tx, createdTenant.id)

            await tx.storeSettings.create({
                data: {
                    tenantId: createdTenant.id,
                    defaultCashboxId: defaultCashbox.id
                }
            })

            // Self-registration starts a trial, not a live subscription. The
            // trial's end date bounds the activation licence a device receives,
            // so it expires by itself even on a device that never reconnects.
            await ensureSubscription(tx, createdTenant.id, { startTrial: true, now })

            return { tenant: createdTenant, user }
        })

        const token = signAccessToken({
            userId: result.user.id,
            email: result.user.email,
            role: result.user.role,
            tenantId: result.user.tenantId
        })

        const { passwordHash: _passwordHash, ...userInfo } = result.user
        const responseTenant = { ...result.tenant, isOffline: result.tenant.isOffline }

        return {
            success: true,
            token,
            user: {
                ...userInfo,
                tenant: responseTenant
            },
            tenant: responseTenant,
            staffRole: null,
            staffPermissions: null,
            onboarding: {
                required: true
            }
        }
    }

    /**
     * Turns a seat refusal into a login refusal the client can act on.
     *
     * The 409 deliberately carries `canRequestAccess`, so the app can offer
     * "ask your administrator for access" instead of a dead-end error -- that
     * request flow is what makes a one-device licence workable in practice.
     */
    private toDeviceAuthError(error: unknown): AuthServiceError {
        if (error instanceof ActivationError) {
            return new AuthServiceError(
                error.statusCode,
                error.message,
                error.code,
                error.details
            )
        }

        // An unexpected failure must not silently grant a seat.
        return new AuthServiceError(
            503,
            'Device activation is temporarily unavailable',
            'DEVICE_ACTIVATION_UNAVAILABLE'
        )
    }

    async login(input: LoginInput, tenant?: Tenant) {
        const normalizedEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
        const password = typeof input.password === 'string' ? input.password : ''
        const hardwareId = typeof input.hardwareId === 'string' ? input.hardwareId.trim() : ''
        const deviceName = typeof input.deviceName === 'string' ? input.deviceName : undefined
        const devicePlatform = typeof input.devicePlatform === 'string' ? input.devicePlatform : undefined

        if (!normalizedEmail || !password) {
            throw new AuthServiceError(400, 'Email and password are required')
        }

        if (tenant?.isSuspended) {
            throw new AuthServiceError(403, 'Tenant is suspended')
        }

        let user: UserWithTenant | null = null

        if (tenant) {
            user = await prisma.user.findFirst({
                where: { tenantId: tenant.id, email: { equals: normalizedEmail, mode: 'insensitive' }, isActive: true },
                include: { tenant: true }
            })
        } else {
            const matches = await prisma.user.findMany({
                where: { email: { equals: normalizedEmail, mode: 'insensitive' }, isActive: true },
                include: { tenant: true },
                orderBy: { createdAt: 'desc' },
                take: 2
            })

            if (matches.length > 1) {
                throw new AuthServiceError(409, 'This email exists on multiple tenants. Please log in from your tenant domain.')
            }

            user = matches[0] ?? null
        }

        if (!user || !user.passwordHash) {
            await bcrypt.compare(password, DUMMY_PASSWORD_HASH)
            throw new AuthServiceError(401, 'Invalid credentials')
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) {
            throw new AuthServiceError(401, 'Invalid credentials')
        }

        const { passwordHash, ...userInfo } = user
        const responseTenant = tenant || user.tenant
        const isOffline = responseTenant ? responseTenant.isOffline : false

        const role = await this.loadStaffRole(user)
        const { staffRole, staffPermissions } = this.buildStaffPermissions(role)

        // The seat claim runs BEFORE the access token is signed, because the
        // token carries the device binding. It also has to be able to fail the
        // whole login: a `hardwareId` means the Flutter app, and refusing an
        // unseated device is the entire point of one-device licensing. Absence
        // of `hardwareId` means the browser admin, which is not seat-limited.
        let activationToken: string | undefined
        let deviceBinding: { deviceId: string; tokenVersion: number } | undefined

        if (hardwareId && user.tenantId) {
            try {
                const activationResult = await this.activationService.autoRegisterOrLoginDevice(
                    user.tenantId,
                    hardwareId,
                    deviceName || 'Online POS Device',
                    devicePlatform
                )
                activationToken = activationResult.activationToken
                deviceBinding = {
                    deviceId: activationResult.device.id,
                    tokenVersion: activationResult.device.tokenVersion
                }
            } catch (error) {
                if (isDeviceSeatEnforcementEnabled()) {
                    throw this.toDeviceAuthError(error)
                }

                console.error(
                    'Device seat claim failed during login (enforcement disabled):',
                    error instanceof Error ? error.message : error
                )
            }
        }

        const token = signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            // Present only for app logins. `dv` retires the token as soon as the
            // device is revoked or transferred, without the blast radius of
            // `User.tokenInvalidBefore`, which kills every session for the user.
            ...(deviceBinding
                ? { deviceId: deviceBinding.deviceId, dv: deviceBinding.tokenVersion }
                : {})
        })

        return {
            success: true,
            token,
            activationToken,
            user: { ...userInfo, tenant: responseTenant ? { ...responseTenant, isOffline } : null },
            tenant: responseTenant ? { ...responseTenant, isOffline } : null,
            staffRole,
            staffPermissions
        }
    }

    async logout(user?: User | null) {
        if (!user) {
            throw new AuthServiceError(401, 'Unauthorized')
        }

        await prisma.user.updateMany({
            where: {
                id: user.id,
                tenantId: user.tenantId
            },
            data: {
                tokenInvalidBefore: new Date()
            }
        })

        return { success: true }
    }

    async me(user?: User | null) {
        if (!user) {
            throw new AuthServiceError(401, 'Unauthorized')
        }

        const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })
        const { passwordHash, ...userInfo } = user as User & { passwordHash?: string | null }
        const role = await this.loadStaffRole(user)
        const { staffRole, staffPermissions } = this.buildStaffPermissions(role)
        const isOffline = tenant ? tenant.isOffline : false

        return {
            success: true,
            user: userInfo,
            tenant: tenant ? { ...tenant, isOffline } : null,
            staffRole,
            staffPermissions
        }
    }
}
