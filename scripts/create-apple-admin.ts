import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const TENANT_ID = 'f74cf864-f4cc-41af-8988-c536466e5d95'

async function main() {
    console.log('Restoring admin@apple.com...')

    const email = 'admin@apple.com'
    const password = 'password123'
    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.upsert({
        where: {
            tenantId_email: {
                tenantId: TENANT_ID,
                email
            }
        },
        update: {
            passwordHash,
            role: 'owner', // Make them owner/admin
            isSuperAdmin: true // Giving super admin for ease of access if needed, or false if just tenant admin
        },
        create: {
            email,
            passwordHash,
            role: 'owner',
            isSuperAdmin: true,
            tenantId: TENANT_ID
        }
    })

    console.log(`User restored: ${user.email}`)
    console.log(`Password set to: ${password}`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
