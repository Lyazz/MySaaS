import { Router } from 'express'
import prisma from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = Router()

router.post('/register', async (req, res) => {
    // Tenants must register from the SaaS host (root domain), not from a tenant subdomain.
    if (req.tenant) {
        return res.status(403).json({
            statusCode: 403,
            statusMessage: 'Registration is only allowed from the SaaS landing domain'
        })
    }

    const { name, slug, email, password } = req.body

    if (!name || !slug || !email || !password) {
        return res.status(400).json({
            statusCode: 400,
            statusMessage: 'Missing required fields'
        })
    }

    // Basic slug validation
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
        return res.status(400).json({
            statusCode: 400,
            statusMessage: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.'
        })
    }

    try {
        // Check if tenant exists
        const existingTenant = await prisma.tenant.findUnique({
            where: { slug }
        })

        if (existingTenant) {
            return res.status(409).json({
                statusCode: 409, // Conflict
                statusMessage: 'Tenant URL is already taken'
            })
        }

        const passwordHash = await bcrypt.hash(password, 10)

        // Transaction: Create Tenant + Create Owner User
        const result = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name,
                    slug,
                }
            })

            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    role: 'owner',
                    isSuperAdmin: false,
                    tenantId: tenant.id
                }
            })

            await tx.storeSettings.create({
                data: {
                    tenantId: tenant.id
                }
            })

            return { tenant, user }
        })

        return res.json({
            success: true,
            tenant: {
                id: result.tenant.id,
                name: result.tenant.name,
                slug: result.tenant.slug,
                url: `http://${result.tenant.slug}.localhost:3000` // Helper for dev
            },
            onboarding: {
                required: true
            }
        })

    } catch (error) {
        console.error('Registration error:', error)
        res.status(500).json({
            statusCode: 500,
            statusMessage: 'Internal Server Error'
        })
    }
})

router.post('/login', async (req, res) => {
    // Tenants must log in from the SaaS host (root domain), not from a tenant subdomain.
    if (req.tenant) {
        return res.status(403).json({
            statusCode: 403,
            statusMessage: 'Login is only allowed from the SaaS landing domain'
        })
    }

    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({
            statusCode: 400,
            statusMessage: 'Email and password are required'
        })
    }

    try {
        const user = await prisma.user.findFirst({
            where: { email },
            include: { tenant: true }
        })

        if (!user || !user.passwordHash) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: 'Invalid credentials'
            })
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: 'Invalid credentials'
            })
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        )

        // Return user info sans password
        const { passwordHash, ...userInfo } = user

        res.json({
            success: true,
            token,
            user: userInfo
        })

    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({
            statusCode: 500,
            statusMessage: 'Internal Server Error'
        })
    }
})

router.get('/me', async (req, res) => {
    const user = req.user
    if (!user) {
        return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })
        const { passwordHash, ...userInfo } = user as any
        return res.json({ success: true, user: userInfo, tenant })
    } catch (error) {
        console.error('Me endpoint error:', error)
        return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
    }
})

export default router
