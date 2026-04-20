import authMiddleware from '~/middleware/auth'

export default defineNuxtRouteMiddleware((to, from) => {
    if (!to.path.startsWith('/admin')) return
    return authMiddleware(to, from)
})
