/**
 * Composable for handling product images with main image support
 */

export interface ProductImage {
    id?: string | null
    url: string
    alt?: string
    position: number
    isMain: boolean
}

export interface ProductWithImages {
    images?: string[]
    productImages?: ProductImage[]
}

export const useProductImage = () => {
    /**
     * Get the main image URL from a product
     * Tries productImages array first (new structure), then falls back to legacy images array
     */
    const getMainImage = (product: ProductWithImages): string | null => {
        // Check productImages array first (new structure with isMain support)
        if (product.productImages && product.productImages.length > 0) {
            const mainImage = product.productImages.find(img => img.isMain)
            return mainImage ? mainImage.url : product.productImages[0].url
        }

        // Fallback to legacy images array
        if (product.images && product.images.length > 0) {
            return product.images[0]
        }

        return null
    }

    /**
     * Get all images from a product, ordered by main first, then by position
     */
    const getAllImages = (product: ProductWithImages): string[] => {
        if (product.productImages && product.productImages.length > 0) {
            // Sort: main image first, then by position
            const sorted = [...product.productImages].sort((a, b) => {
                if (a.isMain && !b.isMain) return -1
                if (!a.isMain && b.isMain) return 1
                return a.position - b.position
            })
            return sorted.map(img => img.url)
        }

        return product.images || []
    }

    return {
        getMainImage,
        getAllImages
    }
}
