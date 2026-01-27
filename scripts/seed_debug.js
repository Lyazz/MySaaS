import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding for debug...')

    // 1. Create Super Admin Tenant & User
    const saTenantSlug = 'platform-admin'
    let saTenant = await prisma.tenant.findUnique({ where: { slug: saTenantSlug } })
    if (!saTenant) {
        saTenant = await prisma.tenant.create({
            data: { name: 'Platform Admin', slug: saTenantSlug }
        })
    } else {
        // ensure not suspended
        if (saTenant.isSuspended) {
            await prisma.tenant.update({ where: { id: saTenant.id }, data: { isSuspended: false } })
        }
    }

    const hashedPassword = await bcrypt.hash('password', 10)
    const saEmail = 'super@platform.com'

    let saUser = await prisma.user.findFirst({ where: { email: saEmail, tenantId: saTenant.id } })
    if (!saUser) {
        saUser = await prisma.user.create({
            data: {
                email: saEmail,
                passwordHash: hashedPassword,
                role: 'owner',
                isSuperAdmin: true,
                tenantId: saTenant.id
            }
        })
        console.log(`✅ Created Super Admin: ${saEmail} / password`)
    } else {
        // Update password just in case
        await prisma.user.update({
            where: { id: saUser.id },
            data: { passwordHash: hashedPassword, isSuperAdmin: true }
        })
        console.log(`ℹ️ Super Admin updated: ${saEmail}`)
    }

    // 2. Create Tenant A (Apple)
    const appleSlug = 'apple'
    let appleTenant = await prisma.tenant.findUnique({ where: { slug: appleSlug } })
    if (!appleTenant) {
        appleTenant = await prisma.tenant.create({
            data: { name: 'Apple Store', slug: appleSlug }
        })
    }

    const appleEmail = 'admin@apple.com'
    let appleUser = await prisma.user.findFirst({ where: { email: appleEmail, tenantId: appleTenant.id } })
    if (!appleUser) {
        appleUser = await prisma.user.create({
            data: {
                email: appleEmail,
                passwordHash: hashedPassword,
                role: 'owner',
                isSuperAdmin: false,
                tenantId: appleTenant.id
            }
        })
        console.log(`✅ Created Apple Admin: ${appleEmail} / password`)
    } else {
        await prisma.user.update({
            where: { id: appleUser.id },
            data: { passwordHash: hashedPassword }
        })
        console.log(`ℹ️ Apple Admin updated`)
    }

    // Apple Product
    const iPhoneSlug = 'iphone-15'
    let iPhone = await prisma.product.findFirst({ where: { slug: iPhoneSlug, tenantId: appleTenant.id } })
    if (!iPhone) {
        iPhone = await prisma.product.create({
            data: {
                title: 'iPhone 15',
                slug: iPhoneSlug,
                description: 'The latest iPhone',
                miniDescription: 'A brief overview of the iPhone 15.',
                price: 999,
                stock: 100,
                tenantId: appleTenant.id
            }
        })
        console.log(`✅ Created Product: iPhone 15`)
    }

    // 3. Create Tenant B (Samsung)
    const samsungSlug = 'samsung'
    let samsungTenant = await prisma.tenant.findUnique({ where: { slug: samsungSlug } })
    if (!samsungTenant) {
        samsungTenant = await prisma.tenant.create({
            data: { name: 'Samsung Store', slug: samsungSlug }
        })
    }

    const samsungEmail = 'admin@samsung.com'
    let samsungUser = await prisma.user.findFirst({ where: { email: samsungEmail, tenantId: samsungTenant.id } })
    if (!samsungUser) {
        samsungUser = await prisma.user.create({
            data: {
                email: samsungEmail,
                passwordHash: hashedPassword,
                role: 'owner',
                isSuperAdmin: false,
                tenantId: samsungTenant.id
            }
        })
        console.log(`✅ Created Samsung Admin: ${samsungEmail} / password`)
    } else {
        await prisma.user.update({
            where: { id: samsungUser.id },
            data: { passwordHash: hashedPassword }
        })
        console.log(`ℹ️ Samsung Admin updated`)
    }

    // Samsung Product
    const galaxySlug = 'galaxy-s24'
    let galaxy = await prisma.product.findFirst({ where: { slug: galaxySlug, tenantId: samsungTenant.id } })
    if (!galaxy) {
        galaxy = await prisma.product.create({
            data: {
                title: 'Galaxy S24',
                slug: galaxySlug,
                description: 'AI Phone',
                price: 899,
                stock: 50,
                tenantId: samsungTenant.id
            }
        })
        console.log(`✅ Created Product: Galaxy S24`)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
