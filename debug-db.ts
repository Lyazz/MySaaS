import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Connecting to database...');
    try {
        const tenants = await prisma.tenant.findMany();
        console.log(`Found ${tenants.length} tenants.`);

        for (const tenant of tenants) {
            console.log(`\nTenant: ${tenant.name} (${tenant.id})`);
            const products = await prisma.product.count({ where: { tenantId: tenant.id } });
            console.log(`- Products count: ${products}`);

            const activeProducts = await prisma.product.count({ where: { tenantId: tenant.id, isActive: true } });
            console.log(`- Active products count: ${activeProducts}`);

            const categories = await prisma.category.count({ where: { tenantId: tenant.id } });
            console.log(`- Categories count: ${categories}`);

            if (products > 0) {
                const firstProduct = await prisma.product.findFirst({ where: { tenantId: tenant.id } });
                console.log(`- Sample product: ${firstProduct?.title} (ID: ${firstProduct?.id})`);

                const users = await prisma.user.findMany({ where: { tenantId: tenant.id } });
                console.log(`- Users: ${users.map(u => u.email).join(', ')}`);
            }
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main()
