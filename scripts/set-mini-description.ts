import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Setting mini description for iPhone 15 Pro Max...')

    const product = await prisma.product.findFirst({
        where: { title: 'iPhone 15 Pro Max' }
    })

    if (!product) {
        console.error('Product not found!')
        return
    }

    await prisma.product.update({
        where: { id: product.id },
        data: {
            miniDescription: 'Experience the power of titanium. The lightest, most durable Pro model ever.'
        }
    })

    console.log('Mini description updated.')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
