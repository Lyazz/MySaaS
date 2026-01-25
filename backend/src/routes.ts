import { Router } from 'express'
import authRouter from './modules/auth/routes'
import productsRouter from './modules/products/routes'
import categoriesRouter from './modules/products/categories.routes'
import variantsRouter from './modules/products/variants.routes'
import ordersRouter from './modules/orders/routes'
import tenantsRouter from './modules/tenants/routes'
import superAdminRouter from './modules/superadmin/routes'
import publicProductsRouter from './modules/products/public.routes'
import publicCategoriesRouter from './modules/products/public-categories.routes'
import publicOrdersRouter from './modules/orders/public.routes'
import uploadRouter from './modules/upload/routes'
import storeSettingsRouter from './modules/store-settings/routes'
import publicStoreSettingsRouter from './modules/store-settings/public.routes'

const router = Router()

// Public / Auth
router.use('/', authRouter)

// Public product/category routes (no auth required)
router.use('/products', publicProductsRouter)
router.use('/categories', publicCategoriesRouter)
router.use('/orders', publicOrdersRouter)
router.use('/store', publicStoreSettingsRouter)

// Admin Modules
// Note: These modules have internal RBAC checks, but we could wrap them here too.
// Products includes variants creation but we separated routes.
// We probably want to mount them logically.
router.use('/admin/products', productsRouter)
router.use('/admin/categories', categoriesRouter)
router.use('/admin/variants', variantsRouter)
router.use('/admin/orders', ordersRouter)
router.use('/admin/store-settings', storeSettingsRouter)
router.use('/upload', uploadRouter)

// Super Admin
router.use('/super-admin', superAdminRouter)
router.use('/super-admin/tenants', tenantsRouter)

export default router
