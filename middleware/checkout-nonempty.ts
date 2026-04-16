import { useCartStore } from '~/stores/cart'

export default defineNuxtRouteMiddleware(() => {
  const storeSettings = useState<any>('storeSettings')

  if (storeSettings.value?.cartEnabled === false) {
    return navigateTo('/', { redirectCode: 302 })
  }

  if (process.server) {
    const cartItemCount = useCookie<number | null>('cart_item_count', { default: () => null })
    if (cartItemCount.value === 0) {
      return navigateTo('/cart', { redirectCode: 302 })
    }
    return
  }

  const cartStore = useCartStore()
  cartStore.loadFromLocalStorage()

  if (!cartStore.hasItems) {
    return navigateTo('/cart')
  }
})
