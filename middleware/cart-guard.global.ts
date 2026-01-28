export default defineNuxtRouteMiddleware((to, from) => {
    const storeSettings = useState<any>('storeSettings')

    if (storeSettings.value?.cartEnabled === false) {
        if (to.path.startsWith('/cart') || to.path.startsWith('/checkout')) {
            return navigateTo('/')
        }
    }
})
