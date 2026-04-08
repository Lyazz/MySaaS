export type StorefrontHomeSectionType = 'BROWSE_BY_CATEGORY' | 'NEW_ARRIVALS' | 'BEST_SELLERS'

export type StorefrontHomeCarouselSlide = {
    imageUrl: string
    title: string
    subtitle?: string
    buttonText?: string
    buttonHref?: string
}

export type StorefrontHomeSectionBase = {
    enabled: boolean
    eyebrow: string
    title: string
}

export type StorefrontHomeSections = {
    browseByCategory: StorefrontHomeSectionBase
    newArrivals: StorefrontHomeSectionBase & { limit: number }
    bestSellers: StorefrontHomeSectionBase & { limit: number }
}

export type StorefrontHomeConfig = {
    carousel: StorefrontHomeCarouselSlide[]
    sections: StorefrontHomeSections
}

export const DEFAULT_STOREFRONT_HOME_CONFIG: StorefrontHomeConfig = {
    carousel: [
        {
            title: 'New Collection 2026',
            subtitle: 'Discover the latest trends in books and stationery.',
            buttonText: 'Shop Now',
            buttonHref: '/products',
            imageUrl: '/blank.svg'
        },
        {
            title: 'Best Sellers',
            subtitle: 'Get your hands on the most popular items this week.',
            buttonText: 'Browse',
            buttonHref: '/products',
            imageUrl: '/blank.svg'
        },
        {
            title: 'Special Offers',
            subtitle: 'Up to 50% off on selected items.',
            buttonText: 'View Deals',
            buttonHref: '/products',
            imageUrl: '/blank.svg'
        }
    ],
    sections: {
        browseByCategory: { enabled: true, eyebrow: 'Collections', title: 'Browse by Category' },
        newArrivals: { enabled: true, eyebrow: 'New Arrivals', title: 'Trending Now', limit: 6 },
        bestSellers: { enabled: false, eyebrow: 'Best Sellers', title: 'Most Popular', limit: 6 }
    }
}

export const isDefaultStorefrontHomeConfig = (value: StorefrontHomeConfig | null | undefined): boolean => {
    if (!value) return true
    try {
        return JSON.stringify(value) === JSON.stringify(DEFAULT_STOREFRONT_HOME_CONFIG)
    } catch {
        return false
    }
}
