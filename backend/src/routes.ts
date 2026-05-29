import { Router } from 'express';
import authRouter from './modules/auth/routes';
import productsRouter from './modules/products/routes';
import categoriesRouter from './modules/products/categories.routes';
import variantsRouter from './modules/products/variants.routes';
import ordersRouter from './modules/orders/routes';
import tenantsRouter from './modules/tenants/routes';
import superAdminRouter from './modules/superadmin/routes';
import publicProductsRouter from './modules/products/public.routes';
import publicCategoriesRouter from './modules/products/public-categories.routes';
import publicOrdersRouter from './modules/orders/public.routes';
import uploadRouter from './modules/upload/routes';
import storeSettingsRouter from './modules/store-settings/routes';
import publicStoreSettingsRouter from './modules/store-settings/public.routes';
import customDomainsRouter from './modules/custom-domains/routes';
import homepageSettingsRouter from './modules/homepage-settings/routes';
import publicHomepageSettingsRouter from './modules/homepage-settings/public.routes';
import publicContactInfosRouter from './modules/contact-infos/public.routes';
import deliveryRouter from './modules/delivery/routes';
import dashboardRouter from './modules/dashboard/routes';
import billingRouter from './modules/billing/routes';
import billingAdminRouter from './modules/billing-admin/routes';
import inventoryRouter from './modules/inventory/routes';
import suppliersRouter from './modules/suppliers/routes';
import purchasesRouter from './modules/purchases/routes';
import salesRouter from './modules/sales/routes';
import customersRouter from './modules/customers/routes';
import posRouter from './modules/pos/routes';
import contactInfosRouter from './modules/contact-infos/routes';
import integrationsRouter from './modules/integrations/routes';
import metaPixelsRouter from './modules/meta-pixels/routes';
import integrationsPublicRouter from './modules/integrations/public.routes';
import cashRouter from './modules/cash/routes';
import usersRouter from './modules/users/routes';
import adminAuditLogsRouter from './modules/audit-logs/routes';
import staffRolesRouter from './modules/staff-roles/routes';
import filesRouter from './modules/files/routes';
import loyaltyRouter from './modules/loyalty/routes';
import googleOAuthRouter from './modules/google-oauth/routes';
import syncRouter from './modules/sync/routes';
import provisioningRouter from './modules/provisioning/routes';
import activationRouter from './modules/activation/routes';

const router = Router();

// Public / Auth
router.use('/', authRouter);
router.use('/', provisioningRouter);

// Token-based file downloads (local dev fallback)
router.use('/files', filesRouter);

// Public product/category routes (no auth required)
router.use('/products', publicProductsRouter);
router.use('/categories', publicCategoriesRouter);
router.use('/orders', publicOrdersRouter);
router.use('/store', publicStoreSettingsRouter);
router.use('/store', publicHomepageSettingsRouter);
router.use('/store', publicContactInfosRouter);
router.use('/pixel', integrationsPublicRouter);
router.use('/activation', activationRouter);

// Admin Modules
// Note: These modules have internal RBAC checks, but we could wrap them here too.
// Products includes variants creation but we separated routes.
// We probably want to mount them logically.
router.use('/admin/products', productsRouter);
router.use('/admin/categories', categoriesRouter);
router.use('/admin/variants', variantsRouter);
// Google OAuth for orders export — must be registered before /admin/orders to avoid route shadowing
router.use('/admin/orders/export', googleOAuthRouter);
router.use('/admin/orders', ordersRouter);
router.use('/admin/sales', salesRouter);
router.use('/admin/customers', customersRouter);
router.use('/admin/contact-infos', contactInfosRouter);
router.use('/admin/pos', posRouter);
router.use('/admin', cashRouter);
router.use('/admin/dashboard', dashboardRouter);
router.use('/admin/inventory', inventoryRouter);
router.use('/admin/suppliers', suppliersRouter);
router.use('/admin/purchases', purchasesRouter);
router.use('/admin/billing', billingRouter);
router.use('/admin/store-settings', storeSettingsRouter);
router.use('/admin/custom-domains', customDomainsRouter);
router.use('/admin/homepage-settings', homepageSettingsRouter);
router.use('/upload', uploadRouter);
router.use('/', deliveryRouter);
router.use('/admin/integrations', integrationsRouter);
router.use('/admin/meta-pixels', metaPixelsRouter);
router.use('/admin/users', usersRouter);
router.use('/admin/staff-roles', staffRolesRouter);
router.use('/admin/audit-logs', adminAuditLogsRouter);
router.use('/admin/loyalty', loyaltyRouter);
router.use('/admin/sync', syncRouter);

// Super Admin
router.use('/super-admin', superAdminRouter);
router.use('/super-admin/billing', billingAdminRouter);
router.use('/super-admin/tenants', tenantsRouter);

export default router;
