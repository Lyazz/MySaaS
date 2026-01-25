import prisma from '../backend/src/lib/prisma'

async function createSuperAdmin() {
    try {
        // Find the first user (you can change the email filter if needed)
        const users = await prisma.user.findMany({
            take: 5,
            include: {
                tenant: true
            }
        })

        console.log('Existing users:')
        users.forEach((u, i) => {
            console.log(`${i + 1}. ${u.email} (Tenant: ${u.tenant.slug}, Super Admin: ${u.isSuperAdmin})`)
        })

        if (users.length === 0) {
            console.log('No users found. Please register a user first.')
            return
        }

        // Update the first user to be super admin
        const updated = await prisma.user.update({
            where: { id: users[0].id },
            data: { isSuperAdmin: true }
        })

        console.log('\n✅ Super admin created!')
        console.log(`Email: ${updated.email}`)
        console.log(`You can now login at: http://localhost:3001/super-admin/login`)
        console.log(`\nUse the same password you registered with for this account.`)
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

createSuperAdmin()
