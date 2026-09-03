export function useStorefrontContent() {
  const i18n = useI18n({ useScope: 'global' })
  const year = computed(() => new Date().getFullYear())

  return computed(() => {
    // Track locale changes even if `locale` is exposed as a getter.
    // eslint-disable-next-line no-void
    void i18n.locale

    return ({
    algeria: {
      wilayas: {
        16: i18n.t('storefront.algeria.wilayas.16'),
        31: i18n.t('storefront.algeria.wilayas.31')
      } as Record<number, string>
    },
    common: {
      productsCount: (count: number) => i18n.t('storefront.common.productsCount', { count }),
      collection: i18n.t('storefront.common.collection'),
      selectPlaceholder: i18n.t('storefront.common.selectPlaceholder')
    },
    actions: {
      addToCart: i18n.t('storefront.actions.addToCart'),
      adding: i18n.t('storefront.actions.adding'),
      outOfStock: i18n.t('storefront.actions.outOfStock'),
      quickView: i18n.t('storefront.actions.quickView'),
      addToWishlist: i18n.t('storefront.actions.addToWishlist'),
      removeFromWishlist: i18n.t('storefront.actions.removeFromWishlist'),
      viewCart: i18n.t('storefront.actions.viewCart'),
      checkout: i18n.t('storefront.actions.checkout'),
      continueShopping: i18n.t('storefront.actions.continueShopping'),
      startBrowsing: i18n.t('storefront.actions.startBrowsing'),
      orderNow: i18n.t('storefront.actions.orderNow'),
      apply: i18n.t('storefront.actions.apply'),
      reset: i18n.t('storefront.actions.reset'),
      clearAll: i18n.t('storefront.actions.clearAll'),
      filters: i18n.t('storefront.actions.filters'),
      search: i18n.t('storefront.actions.search')
    },
    badges: {
      new: i18n.t('storefront.badges.new')
    },
    nav: {
      home: i18n.t('storefront.nav.home'),
      shop: i18n.t('storefront.nav.shop'),
      contact: i18n.t('storefront.nav.contact'),
      categories: i18n.t('storefront.nav.categories')
    },
    cart: {
      label: i18n.t('storefront.cart.label'),
      title: i18n.t('storefront.cart.title'),
      itemsCount: (count: number) => i18n.t('storefront.cart.itemsCount', { count }),
      item: {
        variantSelected: i18n.t('storefront.cart.item.variantSelected'),
        standardItem: i18n.t('storefront.cart.item.standardItem'),
        variant: i18n.t('storefront.cart.item.variant'),
        remove: i18n.t('storefront.cart.item.remove')
      },
      sections: {
        items: i18n.t('storefront.cart.sections.items')
      },
      empty: {
        title: i18n.t('storefront.cart.empty.title'),
        subtitle: i18n.t('storefront.cart.empty.subtitle'),
        cta: i18n.t('storefront.cart.empty.cta')
      },
      actions: {
        proceedToCheckout: i18n.t('storefront.cart.actions.proceedToCheckout')
      },
      summary: {
        title: i18n.t('storefront.cart.summary.title'),
        subtotal: i18n.t('storefront.cart.summary.subtotal'),
        shipping: i18n.t('storefront.cart.summary.shipping'),
        shippingHint: i18n.t('storefront.cart.summary.shippingHint'),
        tax: i18n.t('storefront.cart.summary.tax'),
        total: i18n.t('storefront.cart.summary.total')
      }
    },
    checkout: {
      title: i18n.t('storefront.checkout.title'),
      disabled: i18n.t('storefront.checkout.disabled'),
      disabledShort: i18n.t('storefront.checkout.disabledShort'),
      required: i18n.t('storefront.checkout.required'),
      help: {
        deliveryOptions: i18n.t('storefront.checkout.help.deliveryOptions')
      },
      coupon: {
        title: i18n.t('storefront.checkout.coupon.title'),
        badge: i18n.t('storefront.checkout.coupon.badge'),
        placeholder: i18n.t('storefront.checkout.coupon.placeholder')
      },
      summary: {
        deliveryOption: i18n.t('storefront.checkout.summary.deliveryOption'),
        shippingFee: i18n.t('storefront.checkout.summary.shippingFee'),
        quantityShort: i18n.t('storefront.checkout.summary.quantityShort')
      },
      minimumOrder: (amount: string | number, currency: string) =>
        i18n.t('storefront.checkout.minimumOrder', { amount, currency }),
      secureTransaction: i18n.t('storefront.checkout.secureTransaction'),
      errors: {
        emptyCart: i18n.t('storefront.checkout.errors.emptyCart'),
        fullNameRequired: i18n.t('storefront.checkout.errors.fullNameRequired'),
        phoneRequired: i18n.t('storefront.checkout.errors.phoneRequired'),
        deliveryRequired: i18n.t('storefront.checkout.errors.deliveryRequired'),
        requiredFields: i18n.t('storefront.checkout.errors.requiredFields'),
        submitFailed: i18n.t('storefront.checkout.errors.submitFailed')
      },
      actions: {
        returnToCart: i18n.t('storefront.checkout.actions.returnToCart'),
        placeOrder: i18n.t('storefront.checkout.actions.placeOrder'),
        placingOrder: i18n.t('storefront.checkout.actions.placingOrder')
      },
      form: {
        fullName: {
          label: i18n.t('storefront.checkout.form.fullName.label'),
          placeholder: i18n.t('storefront.checkout.form.fullName.placeholder')
        },
        phone: {
          label: i18n.t('storefront.checkout.form.phone.label'),
          placeholder: i18n.t('storefront.checkout.form.phone.placeholder')
        },
        wilaya: {
          label: i18n.t('storefront.checkout.form.wilaya.label'),
          placeholder: i18n.t('storefront.checkout.form.wilaya.placeholder')
        },
        commune: {
          label: i18n.t('storefront.checkout.form.commune.label'),
          placeholder: i18n.t('storefront.checkout.form.commune.placeholder')
        },
        address: {
          label: i18n.t('storefront.checkout.form.address.label'),
          placeholder: i18n.t('storefront.checkout.form.address.placeholder')
        }
      },
      sections: {
        customerInformation: i18n.t('storefront.checkout.sections.customerInformation'),
        deliveryOptions: i18n.t('storefront.checkout.sections.deliveryOptions'),
        deliveryMethod: i18n.t('storefront.checkout.sections.deliveryMethod'),
        orderSummary: i18n.t('storefront.checkout.sections.orderSummary')
      },
      itemsInCart: (count: number) => i18n.t('storefront.checkout.itemsInCart', { count }),
      delivery: {
        free: i18n.t('storefront.checkout.delivery.free'),
        mode: {
          homeDelivery: i18n.t('storefront.checkout.delivery.mode.homeDelivery'),
          pickupPoint: i18n.t('storefront.checkout.delivery.mode.pickupPoint'),
          storePickup: i18n.t('storefront.checkout.delivery.mode.storePickup')
        },
        description: {
          homeDelivery: i18n.t('storefront.checkout.delivery.description.homeDelivery'),
          pickupPoint: i18n.t('storefront.checkout.delivery.description.pickupPoint'),
          storePickup: i18n.t('storefront.checkout.delivery.description.storePickup')
        },
        noPickupPoints: i18n.t('storefront.checkout.delivery.noPickupPoints'),
        provider: {
          self: i18n.t('storefront.checkout.delivery.provider.self'),
          storePickup: i18n.t('storefront.checkout.delivery.provider.storePickup'),
          homeDelivery: i18n.t('storefront.checkout.delivery.provider.homeDelivery')
        }
      }
    },
    shop: {
      title: i18n.t('storefront.shop.title'),
      catalogTitle: i18n.t('storefront.shop.catalogTitle'),
      filteredTitle: i18n.t('storefront.shop.filteredTitle'),
      searchPlaceholder: i18n.t('storefront.shop.searchPlaceholder'),
      searchWithinResultsPlaceholder: i18n.t('storefront.shop.searchWithinResultsPlaceholder'),
      categories: i18n.t('storefront.shop.categories'),
      categoryFallback: i18n.t('storefront.shop.categoryFallback'),
      allProducts: i18n.t('storefront.shop.allProducts'),
      filtersAndSort: i18n.t('storefront.shop.filtersAndSort'),
      sortBy: i18n.t('storefront.shop.sortBy'),
      showResults: (count: number) => i18n.t('storefront.shop.showResults', { count }),
      sort: {
        label: i18n.t('storefront.shop.sort.label'),
        relevance: i18n.t('storefront.shop.sort.relevance'),
        priceLowToHigh: i18n.t('storefront.shop.sort.priceLowToHigh'),
        priceHighToLow: i18n.t('storefront.shop.sort.priceHighToLow')
      },
      view: {
        gridTitle: i18n.t('storefront.shop.view.gridTitle'),
        listTitle: i18n.t('storefront.shop.view.listTitle')
      },
      priceRange: {
        label: i18n.t('storefront.shop.priceRange.label'),
        min: i18n.t('storefront.shop.priceRange.min'),
        max: i18n.t('storefront.shop.priceRange.max')
      },
      results: {
        noResults: i18n.t('storefront.shop.results.noResults'),
        noResultsHint: i18n.t('storefront.shop.results.noResultsHint')
      },
      sidebar: {
        bestSellers: i18n.t('storefront.shop.sidebar.bestSellers')
      }
    },
    category: {
      label: i18n.t('storefront.category.label'),
      description: i18n.t('storefront.category.description'),
      productsAvailableLabel: i18n.t('storefront.category.productsAvailableLabel'),
      productsAvailable: (count: number) => i18n.t('storefront.category.productsAvailable', { count }),
      showingResults: (count: number) => i18n.t('storefront.category.showingResults', { count }),
      sortBy: i18n.t('storefront.category.sortBy'),
      sort: {
        mostPopular: i18n.t('storefront.category.sort.mostPopular'),
        newest: i18n.t('storefront.category.sort.newest'),
        priceLowToHigh: i18n.t('storefront.category.sort.priceLowToHigh'),
        priceHighToLow: i18n.t('storefront.category.sort.priceHighToLow')
      },
      emptyHint: i18n.t('storefront.category.emptyHint')
    },
    product: {
      addedToCart: (title: string) => i18n.t('storefront.product.addedToCart', { title }),
      inStock: i18n.t('storefront.product.inStock'),
      perUnit: i18n.t('storefront.product.perUnit'),
      detailsTitle: i18n.t('storefront.product.detailsTitle'),
      descriptionTitle: i18n.t('storefront.product.descriptionTitle'),
      descriptionFallback: i18n.t('storefront.product.descriptionFallback'),
      viewFullDetails: i18n.t('storefront.product.viewFullDetails')
    },
    productForm: {
      quantity: {
        label: i18n.t('storefront.productForm.quantity.label')
      },
      stock: {
        unavailable: i18n.t('storefront.productForm.stock.unavailable'),
        outOfStock: i18n.t('storefront.productForm.stock.outOfStock'),
        lowStock: (count: number) => i18n.t('storefront.productForm.stock.lowStock', { count }),
        selectOptions: i18n.t('storefront.productForm.stock.selectOptions')
      },
      cod: {
        title: i18n.t('storefront.productForm.cod.title'),
        badge: i18n.t('storefront.productForm.cod.badge'),
        submit: i18n.t('storefront.productForm.cod.submit'),
        submitting: i18n.t('storefront.productForm.cod.submitting')
      },
      totalPrice: i18n.t('storefront.productForm.totalPrice'),
      chooseOptionsPrompt: i18n.t('storefront.productForm.chooseOptionsPrompt'),
      errors: {
        outOfStockVariant: i18n.t('storefront.productForm.errors.outOfStockVariant'),
        selectOptions: i18n.t('storefront.productForm.errors.selectOptions')
      }
    },
    toasts: {
      orderReceived: {
        title: i18n.t('storefront.toasts.orderReceived.title'),
        message: i18n.t('storefront.toasts.orderReceived.message')
      },
      addedToCart: {
        title: i18n.t('storefront.toasts.addedToCart.title'),
        message: i18n.t('storefront.toasts.addedToCart.message')
      },
      addedToWishlist: {
        message: i18n.t('storefront.toasts.addedToWishlist.message')
      },
      removedFromWishlist: {
        message: i18n.t('storefront.toasts.removedFromWishlist.message')
      },
      outOfStock: {
        message: i18n.t('storefront.toasts.outOfStock.message')
      }
    },
    home: {
      welcomeTo: (tenantName: string) => i18n.t('storefront.home.welcomeTo', { tenant: tenantName }),
      cta: {
        shopNow: i18n.t('storefront.home.cta.shopNow')
      }
    },
    search: {
      placeholder: i18n.t('storefront.search.placeholder'),
      searching: i18n.t('storefront.search.searching'),
      noResults: i18n.t('storefront.search.noResults'),
      seeMore: i18n.t('storefront.search.seeMore')
    },
    wishlist: {
      title: i18n.t('storefront.wishlist.title'),
      emptyTitle: i18n.t('storefront.wishlist.emptyTitle'),
      emptySubtitle: i18n.t('storefront.wishlist.emptySubtitle')
    },
    header: {
      wishlistTitle: i18n.t('storefront.header.wishlistTitle'),
      accountTitle: i18n.t('storefront.header.accountTitle')
    },
    footer: {
      contact: i18n.t('storefront.footer.contact'),
      contactUs: i18n.t('storefront.footer.contactUs'),
      aboutUs: i18n.t('storefront.footer.aboutUs'),
      termsPrivacy: i18n.t('storefront.footer.termsPrivacy'),
      termsOfService: i18n.t('storefront.footer.termsOfService'),
      privacyPolicy: i18n.t('storefront.footer.privacyPolicy'),
      returnPolicy: i18n.t('storefront.footer.returnPolicy'),
      help: i18n.t('storefront.footer.help'),
      faq: i18n.t('storefront.footer.faq'),
      shippingInfo: i18n.t('storefront.footer.shippingInfo'),
      copyright: (tenantName: string) =>
        i18n.t('storefront.footer.copyright', { year: year.value, tenant: tenantName })
    }
    })
  })
}
