import prisma from '../../lib/prisma'

const normalizeImageUrl = (value: unknown): string | null | undefined => {
    if (value === undefined) return undefined
    if (value === null) return null
    if (typeof value !== 'string') throw new Error('Invalid image')

    const trimmed = value.trim()
    if (!trimmed) return null
    const isHttpUrl = /^https?:\/\//i.test(trimmed)
    const isRelativeUpload = /^\/uploads\//i.test(trimmed)

    let pathname: string
    if (isHttpUrl) {
        try {
            const url = new URL(trimmed)
            pathname = url.pathname.toLowerCase()
        } catch {
            throw new Error('Invalid image')
        }
    } else if (isRelativeUpload) {
        // Normalize relative upload path
        pathname = trimmed.toLowerCase()
    } else {
        throw new Error('Invalid image')
    }

    if (!pathname.endsWith('.png')) {
        throw new Error('Invalid image type')
    }

    return trimmed
}

export class CategoriesService {
    async listAdmin(tenantId: string, sortBy?: string, sortOrder?: 'asc' | 'desc') {
        const sortableFields: Record<string, boolean> = {
            createdAt: true,
            title: true,
            slug: true,
            products: true
        }

        const orderBy = (() => {
            if (sortBy && sortableFields[sortBy]) {
                if (sortBy === 'products') {
                    return { products: { _count: sortOrder === 'asc' ? 'asc' : 'desc' } }
                }
                return { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' }
            }
            return { createdAt: 'desc' as const }
        })()

        return prisma.category.findMany({
            where: { tenantId },
            include: {
                _count: { select: { products: true } }
            },
            orderBy
        })
    }

    async listPublic(tenantId: string) {
        return prisma.category.findMany({
            where: { tenantId },
            include: {
                _count: { select: { products: true } }
            },
            orderBy: { createdAt: 'desc' }
        })
    }

    async createCategory(
        tenantId: string,
        data: { title?: string; slug?: string; imageUrl?: unknown }
    ) {
        if (!data.title || !data.slug) {
            throw new Error('Title and Slug are required')
        }

        const existing = await prisma.category.findFirst({
            where: { tenantId, slug: data.slug }
        })
        if (existing) {
            throw new Error('Category with this slug already exists')
        }

        const imageUrl = normalizeImageUrl(data.imageUrl)

        return prisma.category.create({
            data: {
                tenantId,
                title: data.title,
                slug: data.slug,
                imageUrl: imageUrl ?? null
            },
            include: {
                _count: { select: { products: true } }
            }
        })
    }

    async updateCategory(
        tenantId: string,
        categoryId: string,
        data: { title?: string; slug?: string; imageUrl?: unknown }
    ) {
        const category = await prisma.category.findFirst({
            where: { id: categoryId, tenantId }
        })
        if (!category) {
            throw new Error('Category not found')
        }

        if (data.slug && data.slug !== category.slug) {
            const slugExists = await prisma.category.findFirst({
                where: { tenantId, slug: data.slug, NOT: { id: categoryId } }
            })
            if (slugExists) {
                throw new Error('Category with this slug already exists')
            }
        }

        const imageUrl = normalizeImageUrl(data.imageUrl)

        const updateResult = await prisma.category.updateMany({
            where: { id: categoryId, tenantId },
            data: {
                title: data.title ?? category.title,
                slug: data.slug ?? category.slug,
                imageUrl: imageUrl
            }
        })

        if (updateResult.count === 0) {
            throw new Error('Category not found')
        }

        return prisma.category.findFirst({
            where: { id: categoryId, tenantId },
            include: {
                _count: { select: { products: true } }
            }
        })
    }

    async getCategory(tenantId: string, categoryId: string) {
        return prisma.category.findFirst({
            where: { id: categoryId, tenantId },
            include: {
                _count: { select: { products: true } }
            }
        })
    }

    async deleteCategory(tenantId: string, categoryId: string) {
        const deleteResult = await prisma.category.deleteMany({
            where: { id: categoryId, tenantId }
        })

        if (deleteResult.count === 0) {
            throw new Error('Category not found')
        }

        return true
    }
}
