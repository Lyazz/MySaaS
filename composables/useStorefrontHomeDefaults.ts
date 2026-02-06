import { DEFAULT_STOREFRONT_HOME_CONFIG, type StorefrontHomeConfig } from '~/shared/storefront/homepage'

export function useStorefrontHomeDefaults() {
  const { t, locale } = useI18n({ useScope: 'global' })

  return computed<StorefrontHomeConfig>(() => {
    void locale.value

    return ({
    carousel: [
      {
        ...DEFAULT_STOREFRONT_HOME_CONFIG.carousel[0],
        title: t('storefront.home.carousel.newCollection.title'),
        subtitle: t('storefront.home.carousel.newCollection.subtitle'),
        buttonText: t('storefront.home.carousel.newCollection.buttonText')
      },
      {
        ...DEFAULT_STOREFRONT_HOME_CONFIG.carousel[1],
        title: t('storefront.home.carousel.bestSellers.title'),
        subtitle: t('storefront.home.carousel.bestSellers.subtitle'),
        buttonText: t('storefront.home.carousel.bestSellers.buttonText')
      },
      {
        ...DEFAULT_STOREFRONT_HOME_CONFIG.carousel[2],
        title: t('storefront.home.carousel.specialOffers.title'),
        subtitle: t('storefront.home.carousel.specialOffers.subtitle'),
        buttonText: t('storefront.home.carousel.specialOffers.buttonText')
      }
    ],
    sections: {
      browseByCategory: {
        ...DEFAULT_STOREFRONT_HOME_CONFIG.sections.browseByCategory,
        eyebrow: t('storefront.home.sections.browseByCategory.eyebrow'),
        title: t('storefront.home.sections.browseByCategory.title')
      },
      newArrivals: {
        ...DEFAULT_STOREFRONT_HOME_CONFIG.sections.newArrivals,
        eyebrow: t('storefront.home.sections.newArrivals.eyebrow'),
        title: t('storefront.home.sections.newArrivals.title')
      },
      bestSellers: {
        ...DEFAULT_STOREFRONT_HOME_CONFIG.sections.bestSellers,
        eyebrow: t('storefront.home.sections.bestSellers.eyebrow'),
        title: t('storefront.home.sections.bestSellers.title')
      }
    }
    })
  })
}
