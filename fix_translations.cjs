const fs = require('fs');
const path = require('path');

const flutterTranslationsDir = path.join(__dirname, 'admin_app/assets/translations');
const webTranslationsDir = path.join(__dirname, 'locales');

// Helper to deep set a value in an object
function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

// Helper to deep get a value from an object
function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length; i++) {
    if (!current) return undefined;
    current = current[parts[i]];
  }
  return current;
}

const locales = ['en', 'fr', 'ar'];

const missingInEn = [
  'admin.forms.product.isPromotionActive.label',
  'admin.forms.product.promotionalPrice.label',
  'admin.forms.product.showCountdown.label',
  'admin.actions.logoutConfirmTitle',
  'admin.actions.logoutConfirmMessage',
  'admin.pages.sale.detail.metaTitle'
];

const missingInFr = [
  'admin.forms.product.isPromotionActive.label',
  'admin.forms.product.promotionalPrice.label',
  'admin.forms.product.showCountdown.label',
  'admin.forms.supplier.notes.label',
  'admin.forms.supplier.notes.placeholder',
  'admin.actions.logoutConfirmTitle',
  'admin.actions.logoutConfirmMessage',
  'admin.pages.sale.detail.metaTitle',
  'admin.pages.pos.alerts.saleCreated',
  'admin.pages.pos.alerts.saleFailed',
  'admin.pages.pos.alerts.unknownError',
  'admin.pages.pos.alerts.featureComingSoon',
  'admin.pages.pos.alerts.reprintNotImplemented'
];

const missingInAr = [
  'admin.forms.product.isPromotionActive.label',
  'admin.forms.product.promotionalPrice.label',
  'admin.forms.product.showCountdown.label',
  'admin.forms.supplier.notes.label',
  'admin.forms.supplier.notes.placeholder',
  'admin.actions.logoutConfirmTitle',
  'admin.actions.logoutConfirmMessage',
  'admin.pages.sale.detail.metaTitle',
  'admin.pages.pos.alerts.saleCreated',
  'admin.pages.pos.alerts.saleFailed',
  'admin.pages.pos.alerts.unknownError',
  'admin.pages.pos.alerts.featureComingSoon',
  'admin.pages.pos.alerts.reprintNotImplemented',
  'superAdmin.layout.brand',
  'superAdmin.layout.role',
  'superAdmin.layout.closeSidebar',
  'superAdmin.layout.toggleSidebar',
  'superAdmin.layout.defaultTitle',
  'superAdmin.actions.logout',
  'superAdmin.nav.dashboard',
  'superAdmin.nav.tenants',
  'superAdmin.nav.analytics',
  'superAdmin.nav.auditLogs',
  'superAdmin.login.title',
  'superAdmin.login.subtitle',
  'superAdmin.login.backToSite',
  'superAdmin.login.form.email.label',
  'superAdmin.login.form.email.placeholder',
  'superAdmin.login.form.password.label',
  'superAdmin.login.form.submit.signingIn',
  'superAdmin.login.form.submit.signIn',
  'superAdmin.login.errors.superAdminRequired',
  'superAdmin.login.errors.loginFailed',
  'superAdmin.dashboard.overview.title',
  'superAdmin.dashboard.overview.subtitle',
  'superAdmin.dashboard.stats.tenants',
  'superAdmin.dashboard.stats.users',
  'superAdmin.dashboard.stats.products',
  'superAdmin.dashboard.stats.revenue',
  'superAdmin.dashboard.recentActivity.title',
  'superAdmin.dashboard.recentActivity.viewAll',
  'superAdmin.dashboard.recentActivity.empty',
  'superAdmin.dashboard.quickActions.title',
  'superAdmin.dashboard.quickActions.createTenant.title',
  'superAdmin.dashboard.quickActions.createTenant.subtitle',
  'superAdmin.dashboard.quickActions.manageTenants.title',
  'superAdmin.dashboard.quickActions.manageTenants.subtitle',
  'superAdmin.dashboard.quickActions.viewAnalytics.title',
  'superAdmin.dashboard.quickActions.viewAnalytics.subtitle',
  'superAdmin.audit.actions.createTenant',
  'superAdmin.audit.actions.updateTenant',
  'superAdmin.audit.actions.deleteTenant',
  'superAdmin.audit.actions.suspendTenant',
  'superAdmin.audit.actions.unsuspendTenant',
  'superAdmin.audit.actions.impersonateUser',
  'superAdmin.tenants.title',
  'superAdmin.tenants.actions.createTenant',
  'superAdmin.tenants.actions.payments',
  'superAdmin.tenants.actions.suspend',
  'superAdmin.tenants.actions.activate',
  'superAdmin.tenants.search.placeholder',
  'superAdmin.tenants.loading',
  'superAdmin.tenants.empty',
  'superAdmin.tenants.table.name',
  'superAdmin.tenants.table.slug',
  'superAdmin.tenants.table.status',
  'superAdmin.tenants.table.users',
  'superAdmin.tenants.table.products',
  'superAdmin.tenants.table.orders',
  'superAdmin.tenants.table.created',
  'superAdmin.tenants.table.actions',
  'superAdmin.tenants.status.active',
  'superAdmin.tenants.status.suspended',
  'superAdmin.tenants.modal.createTitle',
  'superAdmin.tenants.modal.editTitle',
  'superAdmin.tenants.modal.fields.name.label',
  'superAdmin.tenants.modal.fields.name.placeholder',
  'superAdmin.tenants.modal.fields.slug.label',
  'superAdmin.tenants.modal.fields.slug.placeholder',
  'superAdmin.tenants.modal.fields.slug.slugFallback',
  'superAdmin.tenants.modal.fields.slug.hint',
  'superAdmin.tenants.modal.fields.ownerEmail.label',
  'superAdmin.tenants.modal.fields.ownerEmail.placeholder',
  'superAdmin.tenants.modal.fields.ownerPassword.label',
  'superAdmin.tenants.errors.generic',
  'superAdmin.tenants.errors.suspendFailed',
  'superAdmin.tenants.errors.activateFailed',
  'superAdmin.tenants.errors.deleteFailed',
  'superAdmin.tenants.confirm.suspend',
  'superAdmin.tenants.confirm.delete'
];

// Fallback AI translations just in case they are not in the web app
const aiFallbacks = {
  'en': {
    'admin.forms.product.isPromotionActive.label': 'Active Promotion',
    'admin.forms.product.promotionalPrice.label': 'Promotional Price',
    'admin.forms.product.showCountdown.label': 'Show Countdown Timer',
    'admin.forms.supplier.notes.label': 'Notes',
    'admin.forms.supplier.notes.placeholder': 'Enter supplier notes...',
    'admin.actions.logoutConfirmTitle': 'Logout',
    'admin.actions.logoutConfirmMessage': 'Are you sure you want to logout?',
    'admin.pages.sale.detail.metaTitle': 'Sale Details',
    'admin.pages.pos.alerts.saleCreated': 'Sale created successfully',
    'admin.pages.pos.alerts.saleFailed': 'Failed to create sale',
    'admin.pages.pos.alerts.unknownError': 'An unknown error occurred',
    'admin.pages.pos.alerts.featureComingSoon': 'Feature coming soon',
    'admin.pages.pos.alerts.reprintNotImplemented': 'Reprint is not implemented yet'
  },
  'fr': {
    'admin.forms.product.isPromotionActive.label': 'Promotion Active',
    'admin.forms.product.promotionalPrice.label': 'Prix Promotionnel',
    'admin.forms.product.showCountdown.label': 'Afficher le compte à rebours',
    'admin.forms.supplier.notes.label': 'Notes',
    'admin.forms.supplier.notes.placeholder': 'Entrer des notes...',
    'admin.actions.logoutConfirmTitle': 'Déconnexion',
    'admin.actions.logoutConfirmMessage': 'Voulez-vous vraiment vous déconnecter ?',
    'admin.pages.sale.detail.metaTitle': 'Détails de la vente',
    'admin.pages.pos.alerts.saleCreated': 'Vente créée avec succès',
    'admin.pages.pos.alerts.saleFailed': 'Échec de la création de la vente',
    'admin.pages.pos.alerts.unknownError': 'Une erreur inconnue s\'est produite',
    'admin.pages.pos.alerts.featureComingSoon': 'Fonctionnalité à venir',
    'admin.pages.pos.alerts.reprintNotImplemented': 'La réimpression n\'est pas encore implémentée'
  },
  'ar': {
    'admin.forms.product.isPromotionActive.label': 'ترويج نشط',
    'admin.forms.product.promotionalPrice.label': 'السعر الترويجي',
    'admin.forms.product.showCountdown.label': 'إظهار مؤقت التنازلي',
    'admin.forms.supplier.notes.label': 'ملاحظات',
    'admin.forms.supplier.notes.placeholder': 'أدخل الملاحظات...',
    'admin.actions.logoutConfirmTitle': 'تسجيل خروج',
    'admin.actions.logoutConfirmMessage': 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
    'admin.pages.sale.detail.metaTitle': 'تفاصيل البيع',
    'admin.pages.pos.alerts.saleCreated': 'تم إنشاء عملية البيع بنجاح',
    'admin.pages.pos.alerts.saleFailed': 'فشل إنشاء عملية البيع',
    'admin.pages.pos.alerts.unknownError': 'حدث خطأ غير معروف',
    'admin.pages.pos.alerts.featureComingSoon': 'الميزة قريباً',
    'admin.pages.pos.alerts.reprintNotImplemented': 'إعادة الطباعة غير مدعومة بعد'
  }
};

const missingByLocale = {
  en: missingInEn,
  fr: missingInFr,
  ar: missingInAr
};

locales.forEach(loc => {
  console.log(`\nProcessing ${loc}.json...`);
  const appFilePath = path.join(flutterTranslationsDir, `${loc}.json`);
  const webFilePath = path.join(webTranslationsDir, `${loc}.json`);
  
  if (!fs.existsSync(appFilePath)) {
    console.log(`Skipping ${loc}, app file not found.`);
    return;
  }
  
  let appData = JSON.parse(fs.readFileSync(appFilePath, 'utf8'));
  let webData = {};
  if (fs.existsSync(webFilePath)) {
    webData = JSON.parse(fs.readFileSync(webFilePath, 'utf8'));
  }
  
  const missingKeys = missingByLocale[loc] || [];
  let addedCount = 0;
  
  missingKeys.forEach(key => {
    // 1. Try web app translations first
    let val = getNestedValue(webData, key);
    
    // 2. Try english web app translations as fallback if not superAdmin
    if (!val && loc !== 'en') {
      const enWebData = JSON.parse(fs.readFileSync(path.join(webTranslationsDir, 'en.json'), 'utf8'));
      val = getNestedValue(enWebData, key);
    }
    
    // 3. Fallback to AI translations
    if (!val && aiFallbacks[loc] && aiFallbacks[loc][key]) {
      val = aiFallbacks[loc][key];
    }
    
    // 4. Ultimate fallback (just the last part of the key)
    if (!val) {
      // If it's a superAdmin key, try to copy from english web app if it's there
      if (key.startsWith('superAdmin.') && loc !== 'en') {
         const enApp = JSON.parse(fs.readFileSync(path.join(flutterTranslationsDir, 'en.json'), 'utf8'));
         val = getNestedValue(enApp, key);
         if (!val) {
             const enWeb = JSON.parse(fs.readFileSync(path.join(webTranslationsDir, 'en.json'), 'utf8'));
             val = getNestedValue(enWeb, key);
         }
      }
      
      if (!val) {
        val = key.split('.').pop().replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        console.log(`[WARN] Using default fallback for ${loc}: ${key} -> ${val}`);
      }
    }
    
    setNestedValue(appData, key, val);
    addedCount++;
  });
  
  fs.writeFileSync(appFilePath, JSON.stringify(appData, null, 2));
  console.log(`Added ${addedCount} missing keys to ${loc}.json.`);
});
