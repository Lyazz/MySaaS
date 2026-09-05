# First-Time User Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 728-line single-file wizard at `/admin/onboarding` with a 6-step component-based flow (store info → template → color → language → first product → done), and add a persistent "Getting Started" checklist on the dashboard.

**Architecture:** Each wizard step is an isolated Vue component under `components/admin/onboarding/`. The page `pages/admin/onboarding.vue` becomes a thin orchestrator (~100 lines) that manages step index, shared form state, and API calls. The checklist is a standalone `AdminGettingStartedChecklist.vue` component fed by a new `GET /api/admin/store-settings/onboarding-checklist` endpoint.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, Pinia (`useAuthStore`), `useUploadWithProgress` composable, Express.js backend, Prisma ORM, `shared/content-slug.ts` for slug generation.

---

## File Map

### Backend
- **Modify:** `prisma/schema.prisma` — add `checklistDismissed Boolean @default(false)` to `StoreSettings`
- **Modify:** `backend/src/modules/store-settings/store-settings.service.ts` — add `checklistDismissed` to `StoreSettingsPatchInput`, add `getOnboardingChecklist(tenantId)`, add `publishStore(tenantId)`
- **Modify:** `backend/src/modules/store-settings/store-settings.controller.ts` — add `getChecklist()` and `publish()` handlers
- **Modify:** `backend/src/modules/store-settings/routes.ts` — add `GET /onboarding-checklist` and `POST /publish`

### Frontend — Step Components
- **Create:** `components/admin/onboarding/OnboardingStepStoreInfo.vue`
- **Create:** `components/admin/onboarding/OnboardingStepTemplate.vue`
- **Create:** `components/admin/onboarding/OnboardingStepBrandColor.vue`
- **Create:** `components/admin/onboarding/OnboardingStepLanguage.vue`
- **Create:** `components/admin/onboarding/OnboardingStepFirstProduct.vue`
- **Create:** `components/admin/onboarding/OnboardingStepDone.vue`
- **Create:** `components/admin/AdminGettingStartedChecklist.vue`

### Frontend — Modified Pages
- **Modify:** `pages/admin/onboarding.vue` — replace with thin orchestrator
- **Modify:** `pages/admin/index.vue` — add checklist component above stats grid

### i18n
- **Modify:** `locales/en.json` — add onboarding + gettingStarted keys under `admin.pages`
- **Modify:** `locales/fr.json` — same structure in French
- **Modify:** `locales/ar.json` — same structure in Arabic

---

## Task 1: Schema migration — add `checklistDismissed`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add field to StoreSettings model**

In `prisma/schema.prisma`, after the `isCompleted` line (line 312), add:
```prisma
  checklistDismissed       Boolean  @default(false)
```

The block around line 312 should now read:
```prisma
  isCompleted              Boolean  @default(false)
  checklistDismissed       Boolean  @default(false)
  allowedDeliveryProviders String[] @default(["SELF"])
```

- [ ] **Step 2: Run migration**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS"
npx prisma migrate dev --name add-checklist-dismissed
```

Expected: `The following migration(s) have been created and applied from new schema changes: migrations/..._add_checklist_dismissed`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add checklistDismissed to StoreSettings"
```

---

## Task 2: Backend — extend service with checklist + publish methods

**Files:**
- Modify: `backend/src/modules/store-settings/store-settings.service.ts`

- [ ] **Step 1: Add `checklistDismissed` to `StoreSettingsPatchInput`**

In `store-settings.service.ts`, the `StoreSettingsPatchInput` type definition ends around line 87. Add `checklistDismissed` to the type:

```typescript
export type StoreSettingsPatchInput = Partial<{
    name: string
    slug: string
    logoUrl: string | null
    faviconUrl: string | null
    primaryColor: string
    templateKey: string
    announcementText: string
    announcementScrolling: boolean
    language: string
    cartEnabled: boolean
    codEnabled: boolean
    minimumOrderAmountDzd: number
    hideOptionalAddress: boolean
    currencyCode: string
    currencyCountry: string
    isCompleted: boolean
    checklistDismissed: boolean
    allowedDeliveryProviders: string[]
    storePickupEnabled: boolean
    loyaltyEnabled: boolean
    loyaltyMinRedeemPoints: number
    loyaltyRedeemRateDzdPerPoint: number | string
    loyaltyBasePoints: number | string
    loyaltyMarginFactor: number | string
}>
```

- [ ] **Step 2: Handle `checklistDismissed` in `update()` method**

In the `update()` method of `StoreSettingsService`, after the `isCompleted` handling block (around line 240–250), add:

```typescript
        if (input.checklistDismissed !== undefined) {
            if (typeof input.checklistDismissed !== 'boolean') {
                throw new StoreSettingsValidationError('checklistDismissed must be a boolean')
            }
            updateSettings.checklistDismissed = input.checklistDismissed
        }
```

- [ ] **Step 3: Add `getOnboardingChecklist()` method**

Add this new method to the `StoreSettingsService` class, after the `update()` method:

```typescript
    async getOnboardingChecklist(tenantId: string) {
        const [settings, tenant, productCount, categoryCount] = await Promise.all([
            prisma.storeSettings.findUnique({ where: { tenantId } }),
            prisma.tenant.findUnique({ where: { id: tenantId } }),
            prisma.product.count({ where: { tenantId } }),
            prisma.category.count({ where: { tenantId } })
        ])

        const hasLogo = settings?.logoUrl != null
        const hasProducts = productCount > 0
        const hasCategories = categoryCount > 0
        const hasDelivery = (settings?.allowedDeliveryProviders ?? []).some(
            (p: string) => ['MAYSTRO', 'YALIDINE'].includes(p)
        )
        const isPublished = tenant?.isOffline === false
        const checklistDismissed = settings?.checklistDismissed ?? false

        return { hasLogo, hasProducts, hasCategories, hasDelivery, isPublished, checklistDismissed }
    }
```

- [ ] **Step 4: Add `publishStore()` method**

Add this method after `getOnboardingChecklist()`:

```typescript
    async publishStore(tenantId: string) {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { isOffline: false }
        })
    }
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/store-settings/store-settings.service.ts
git commit -m "feat(store-settings): add checklist query and publishStore methods"
```

---

## Task 3: Backend — controller and routes for checklist + publish

**Files:**
- Modify: `backend/src/modules/store-settings/store-settings.controller.ts`
- Modify: `backend/src/modules/store-settings/routes.ts`

- [ ] **Step 1: Add `getChecklist()` handler to controller**

In `store-settings.controller.ts`, add this method before the closing `}` of the class:

```typescript
    async getChecklist(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const checklist = await service.getOnboardingChecklist(tenant.id)
            res.json(checklist)
        } catch (error) {
            console.error('Get onboarding checklist error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async publish(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            await service.publishStore(tenant.id)
            res.json({ success: true })
        } catch (error) {
            console.error('Publish store error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }
```

- [ ] **Step 2: Register routes**

In `backend/src/modules/store-settings/routes.ts`, the file currently reads:

```typescript
router.get('/', controller.getAdmin.bind(controller))
router.patch('/', controller.patchAdmin.bind(controller))
router.get('/agent-summary', controller.agentSummary.bind(controller))
```

Add two new routes after `agent-summary`:

```typescript
router.get('/', controller.getAdmin.bind(controller))
router.patch('/', controller.patchAdmin.bind(controller))
router.get('/agent-summary', controller.agentSummary.bind(controller))
router.get('/onboarding-checklist', controller.getChecklist.bind(controller))
router.post('/publish', controller.publish.bind(controller))
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/store-settings/store-settings.controller.ts \
        backend/src/modules/store-settings/routes.ts
git commit -m "feat(store-settings): add onboarding-checklist and publish endpoints"
```

---

## Task 4: i18n keys

**Files:**
- Modify: `locales/en.json`
- Modify: `locales/fr.json`
- Modify: `locales/ar.json`

- [ ] **Step 1: Add keys to `en.json`**

In `locales/en.json`, find the existing `"onboarding"` block (around line 3271) under `admin.pages.onboarding`. Replace the entire block with:

```json
      "onboarding": {
        "metaTitle": "Store setup",
        "title": "Store setup",
        "subtitle": "Set up your store in a few quick steps.",
        "loadingSettings": "Loading your store settings…",
        "progress": {
          "stepOf": "Step {current} of {total}"
        },
        "steps": {
          "storeInfo": "Store Info",
          "template": "Choose Template",
          "brandColor": "Brand Color",
          "language": "Language",
          "firstProduct": "First Product",
          "done": "All Done"
        },
        "storeInfo": {
          "title": "Tell us about your store",
          "nameLabel": "Store name",
          "namePlaceholder": "My Store",
          "logoLabel": "Store logo",
          "logoHint": "Recommended: 200×200px PNG or SVG",
          "logoUpload": "Upload logo",
          "logoChange": "Change logo",
          "descriptionLabel": "Short description (optional)",
          "descriptionPlaceholder": "A few words about your store…"
        },
        "brand": {
          "title": "Brand color",
          "pickColor": "Pick a color",
          "hexValue": "Hex value",
          "example": "Example: {value}",
          "preview": "Preview",
          "primaryButton": "Primary button"
        },
        "template": {
          "title": "Store template"
        },
        "language": {
          "title": "Language",
          "label": "Language",
          "rtlHint": "Selecting Arabic will enable right-to-left layout."
        },
        "firstProduct": {
          "title": "Add your first product",
          "subtitle": "You can always add more from the Products section.",
          "nameLabel": "Product name",
          "namePlaceholder": "e.g. T-Shirt, Phone Case…",
          "priceLabel": "Price (DZD)",
          "imageLabel": "Product image (optional)",
          "imageUpload": "Upload image",
          "imageChange": "Change image",
          "skipLink": "Skip for now",
          "errorCreate": "Failed to create product. You can skip and add it later."
        },
        "done": {
          "title": "Your store is ready!",
          "subtitle": "Here's what you set up:",
          "storeUrlLabel": "Your store URL",
          "offlineNote": "Your store is currently offline. Publish it from the dashboard when you're ready.",
          "ctaDashboard": "Go to Dashboard",
          "ctaProducts": "Add More Products"
        },
        "saveFinish": "Finish Setup",
        "errors": {
          "loadFailed": "Failed to load store settings.",
          "saveFailed": "Failed to save store settings."
        }
      },
```

Also add, at the same level as `"onboarding"` inside `admin.pages` (after the onboarding block):

```json
      "gettingStarted": {
        "title": "Getting Started",
        "progress": "{done} of {total} completed",
        "dismiss": "Dismiss",
        "complete": "Setup complete",
        "items": {
          "logo": "Upload your logo",
          "product": "Add your first product",
          "category": "Create a category",
          "delivery": "Configure delivery",
          "publish": "Publish your store"
        },
        "publishBtn": "Publish now",
        "publishing": "Publishing…"
      }
```

- [ ] **Step 2: Add keys to `fr.json`**

Find the same `"onboarding"` block in `locales/fr.json` and replace with:

```json
      "onboarding": {
        "metaTitle": "Configuration de la boutique",
        "title": "Configuration de la boutique",
        "subtitle": "Configurez votre boutique en quelques étapes.",
        "loadingSettings": "Chargement des paramètres…",
        "progress": {
          "stepOf": "Étape {current} sur {total}"
        },
        "steps": {
          "storeInfo": "Infos boutique",
          "template": "Choisir un template",
          "brandColor": "Couleur de marque",
          "language": "Langue",
          "firstProduct": "Premier produit",
          "done": "C'est fait !"
        },
        "storeInfo": {
          "title": "Parlez-nous de votre boutique",
          "nameLabel": "Nom de la boutique",
          "namePlaceholder": "Ma Boutique",
          "logoLabel": "Logo de la boutique",
          "logoHint": "Recommandé : PNG ou SVG 200×200px",
          "logoUpload": "Télécharger le logo",
          "logoChange": "Changer le logo",
          "descriptionLabel": "Courte description (optionnel)",
          "descriptionPlaceholder": "Quelques mots sur votre boutique…"
        },
        "brand": {
          "title": "Couleur principale",
          "pickColor": "Choisir une couleur",
          "hexValue": "Valeur hexadécimale",
          "example": "Exemple : {value}",
          "preview": "Aperçu",
          "primaryButton": "Bouton principal"
        },
        "template": {
          "title": "Template de boutique"
        },
        "language": {
          "title": "Langue",
          "label": "Langue",
          "rtlHint": "L'arabe activera la mise en page de droite à gauche."
        },
        "firstProduct": {
          "title": "Ajoutez votre premier produit",
          "subtitle": "Vous pourrez en ajouter d'autres depuis la section Produits.",
          "nameLabel": "Nom du produit",
          "namePlaceholder": "ex. T-Shirt, Coque de téléphone…",
          "priceLabel": "Prix (DZD)",
          "imageLabel": "Image du produit (optionnel)",
          "imageUpload": "Télécharger une image",
          "imageChange": "Changer l'image",
          "skipLink": "Passer pour l'instant",
          "errorCreate": "Échec de la création du produit. Vous pouvez passer et l'ajouter plus tard."
        },
        "done": {
          "title": "Votre boutique est prête !",
          "subtitle": "Voici ce que vous avez configuré :",
          "storeUrlLabel": "URL de votre boutique",
          "offlineNote": "Votre boutique est actuellement hors ligne. Publiez-la depuis le tableau de bord quand vous serez prêt.",
          "ctaDashboard": "Aller au tableau de bord",
          "ctaProducts": "Ajouter des produits"
        },
        "saveFinish": "Terminer la configuration",
        "errors": {
          "loadFailed": "Impossible de charger les paramètres.",
          "saveFailed": "Impossible de sauvegarder les paramètres."
        }
      },
```

Add `gettingStarted` in French at the same level:

```json
      "gettingStarted": {
        "title": "Démarrage rapide",
        "progress": "{done} sur {total} complétés",
        "dismiss": "Ignorer",
        "complete": "Configuration terminée",
        "items": {
          "logo": "Télécharger votre logo",
          "product": "Ajouter un premier produit",
          "category": "Créer une catégorie",
          "delivery": "Configurer la livraison",
          "publish": "Publier votre boutique"
        },
        "publishBtn": "Publier maintenant",
        "publishing": "Publication…"
      }
```

- [ ] **Step 3: Add keys to `ar.json`**

Find the same `"onboarding"` block in `locales/ar.json` and replace with:

```json
      "onboarding": {
        "metaTitle": "إعداد المتجر",
        "title": "إعداد المتجر",
        "subtitle": "أعدّ متجرك في خطوات بسيطة.",
        "loadingSettings": "جارٍ تحميل الإعدادات…",
        "progress": {
          "stepOf": "الخطوة {current} من {total}"
        },
        "steps": {
          "storeInfo": "معلومات المتجر",
          "template": "اختر القالب",
          "brandColor": "لون العلامة التجارية",
          "language": "اللغة",
          "firstProduct": "المنتج الأول",
          "done": "تم !"
        },
        "storeInfo": {
          "title": "أخبرنا عن متجرك",
          "nameLabel": "اسم المتجر",
          "namePlaceholder": "متجري",
          "logoLabel": "شعار المتجر",
          "logoHint": "موصى به: PNG أو SVG بحجم 200×200 بكسل",
          "logoUpload": "رفع الشعار",
          "logoChange": "تغيير الشعار",
          "descriptionLabel": "وصف قصير (اختياري)",
          "descriptionPlaceholder": "بضع كلمات عن متجرك…"
        },
        "brand": {
          "title": "اللون الأساسي",
          "pickColor": "اختر لوناً",
          "hexValue": "قيمة اللون (Hex)",
          "example": "مثال: {value}",
          "preview": "معاينة",
          "primaryButton": "زر أساسي"
        },
        "template": {
          "title": "قالب المتجر"
        },
        "language": {
          "title": "اللغة",
          "label": "اللغة",
          "rtlHint": "اختيار العربية سيفعّل تخطيط من اليمين إلى اليسار."
        },
        "firstProduct": {
          "title": "أضف منتجك الأول",
          "subtitle": "يمكنك إضافة المزيد من قسم المنتجات.",
          "nameLabel": "اسم المنتج",
          "namePlaceholder": "مثال: قميص، غطاء هاتف…",
          "priceLabel": "السعر (دج)",
          "imageLabel": "صورة المنتج (اختياري)",
          "imageUpload": "رفع صورة",
          "imageChange": "تغيير الصورة",
          "skipLink": "تخطي الآن",
          "errorCreate": "فشل إنشاء المنتج. يمكنك التخطي وإضافته لاحقاً."
        },
        "done": {
          "title": "متجرك جاهز !",
          "subtitle": "إليك ما قمت بإعداده:",
          "storeUrlLabel": "رابط متجرك",
          "offlineNote": "متجرك غير منشور حالياً. انشره من لوحة التحكم عندما تكون مستعداً.",
          "ctaDashboard": "الذهاب إلى لوحة التحكم",
          "ctaProducts": "إضافة منتجات"
        },
        "saveFinish": "إنهاء الإعداد",
        "errors": {
          "loadFailed": "فشل تحميل الإعدادات.",
          "saveFailed": "فشل حفظ الإعدادات."
        }
      },
```

Add `gettingStarted` in Arabic:

```json
      "gettingStarted": {
        "title": "البدء السريع",
        "progress": "{done} من {total} مكتملة",
        "dismiss": "تجاهل",
        "complete": "اكتمل الإعداد",
        "items": {
          "logo": "رفع شعارك",
          "product": "إضافة منتجك الأول",
          "category": "إنشاء تصنيف",
          "delivery": "ضبط التوصيل",
          "publish": "نشر متجرك"
        },
        "publishBtn": "نشر الآن",
        "publishing": "جارٍ النشر…"
      }
```

- [ ] **Step 4: Commit**

```bash
git add locales/en.json locales/fr.json locales/ar.json
git commit -m "feat(i18n): add onboarding wizard and getting-started checklist keys"
```

---

## Task 5: Step component — `OnboardingStepStoreInfo.vue`

**Files:**
- Create: `components/admin/onboarding/OnboardingStepStoreInfo.vue`

- [ ] **Step 1: Create the component**

```vue
<template>
  <div class="space-y-5">
    <div>
      <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
        {{ t('admin.pages.onboarding.storeInfo.title') }}
      </h3>
    </div>

    <!-- Store name -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.storeInfo.nameLabel') }}</label>
      <input
        :value="modelValue.name"
        type="text"
        class="ui-input w-full px-3 py-2"
        :placeholder="t('admin.pages.onboarding.storeInfo.namePlaceholder')"
        @input="emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })"
      >
    </div>

    <!-- Logo upload -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.storeInfo.logoLabel') }}</label>
      <div class="flex items-center gap-4">
        <div
          v-if="modelValue.logoUrl"
          class="w-16 h-16 rounded-lg overflow-hidden border shrink-0"
          style="border-color: var(--surface-border)"
        >
          <img :src="modelValue.logoUrl" alt="logo" class="w-full h-full object-contain">
        </div>
        <div v-else class="w-16 h-16 rounded-lg flex items-center justify-center shrink-0" style="background: var(--surface-3); border: 1px dashed var(--surface-border)">
          <Icon name="lucide:image" class="w-6 h-6" style="color: var(--text-muted)" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="ui-btn ui-btn--secondary px-3 py-1.5 text-sm cursor-pointer inline-flex items-center gap-2">
            <Icon name="lucide:upload" class="w-3.5 h-3.5" />
            {{ modelValue.logoUrl ? t('admin.pages.onboarding.storeInfo.logoChange') : t('admin.pages.onboarding.storeInfo.logoUpload') }}
            <input type="file" accept="image/*" class="sr-only" @change="onLogoChange">
          </label>
          <p class="text-xs" style="color: var(--text-muted)">{{ t('admin.pages.onboarding.storeInfo.logoHint') }}</p>
        </div>
        <div v-if="uploading" class="text-sm" style="color: var(--text-secondary)">
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 [border-color:var(--brand)]" />
        </div>
      </div>
      <p v-if="uploadError" class="mt-1 text-sm text-red-500">{{ uploadError }}</p>
    </div>

    <!-- Description -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.storeInfo.descriptionLabel') }}</label>
      <textarea
        :value="modelValue.description"
        rows="3"
        class="ui-input w-full px-3 py-2"
        :placeholder="t('admin.pages.onboarding.storeInfo.descriptionPlaceholder')"
        @input="emit('update:modelValue', { ...modelValue, description: ($event.target as HTMLTextAreaElement).value })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useUploadWithProgress } from '~/composables/useUploadWithProgress'

interface OnboardingForm {
  name: string
  logoUrl: string | null
  description: string
  templateKey: string
  primaryColor: string
  language: string
  product: { name: string; price: number | null; imageUrl: string | null }
}

const props = defineProps<{ modelValue: OnboardingForm }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingForm] }>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const { uploadWithProgress } = useUploadWithProgress()

const uploading = ref(false)
const uploadError = ref('')

async function onLogoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    const result = await uploadWithProgress<{ url: string }>({
      url: '/api/upload',
      file,
      token: authStore.token
    })
    emit('update:modelValue', { ...props.modelValue, logoUrl: result.url })
  } catch (e: any) {
    uploadError.value = e.message || 'Upload failed'
  } finally {
    uploading.value = false
  }
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/onboarding/OnboardingStepStoreInfo.vue
git commit -m "feat(onboarding): add StoreInfo step component"
```

---

## Task 6: Step component — `OnboardingStepTemplate.vue`

**Files:**
- Create: `components/admin/onboarding/OnboardingStepTemplate.vue`

- [ ] **Step 1: Create the component**

This is the template picker grid extracted from the current `pages/admin/onboarding.vue` (step index 1). The `templates` computed array is moved here.

```vue
<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
      {{ t('admin.pages.onboarding.template.title') }}
    </h3>
    <p class="text-sm" style="color: var(--text-tertiary)">
      {{ t('admin.pages.onboarding.template.title') }}
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div
        v-for="tpl in templates"
        :key="tpl.key"
        class="group relative rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col overflow-hidden"
        :class="modelValue.templateKey === tpl.key ? '[border-color:var(--brand)] ring-4 [--tw-ring-color:var(--brand)]/20 shadow-md' : ''"
        :style="modelValue.templateKey !== tpl.key ? 'background: var(--surface-2); border-color: var(--surface-border)' : 'background: var(--surface-2)'"
        @click="emit('update:modelValue', { ...modelValue, templateKey: tpl.key })"
      >
        <div
          class="relative w-full border-b overflow-hidden flex flex-col"
          style="height: 200px;"
          :style="{ background: tpl.bg, borderColor: tpl.border }"
        >
          <div class="h-1 w-full shrink-0" :style="{ background: tpl.color }"></div>
          <div class="flex-1 flex items-center justify-center p-4">
            <div
              class="w-full max-w-[140px] overflow-hidden shadow-sm"
              :style="{ background: tpl.cardBg, borderRadius: tpl.radius, border: `1px solid ${tpl.border}` }"
            >
              <div class="w-full flex items-center justify-center text-3xl" style="height: 80px;" :style="{ background: tpl.imgBg }">
                {{ tpl.emoji }}
              </div>
              <div class="px-2.5 py-2" :style="{ fontFamily: tpl.fontStyle }">
                <p class="text-[11px] font-semibold leading-tight truncate" :style="{ color: tpl.textColor }">{{ tpl.sampleDesc }}</p>
                <p class="text-[11px] mt-0.5 font-bold" :style="{ color: tpl.color }">{{ tpl.samplePrice }}</p>
                <div class="mt-2 w-full text-center text-[9px] font-bold py-1 leading-none" :style="{ background: tpl.color, color: tpl.btnText, borderRadius: tpl.radius }">BUY</div>
              </div>
            </div>
          </div>
          <div class="absolute inset-0 z-10 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-end p-3">
            <NuxtLink
              :to="`/admin/preview?template=${tpl.key}`"
              target="_blank"
              class="pointer-events-auto py-2 px-4 backdrop-blur-sm font-medium text-sm rounded-lg shadow flex items-center justify-center gap-2 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300"
              style="background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border)"
              @click.stop
            >
              <Icon name="lucide:external-link" class="w-4 h-4" />
              Prévisualiser
            </NuxtLink>
          </div>
        </div>
        <div class="p-3 flex flex-col gap-2" style="background: var(--surface-3); border-top: 1px solid var(--surface-border)">
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm" :class="tpl.fontClass" style="color: var(--text-primary)">{{ tpl.label }}</span>
            <div v-if="modelValue.templateKey === tpl.key" class="[color:rgba(var(--brand-rgb)/0.85)]">
              <Icon name="lucide:check-circle-2" class="w-5 h-5" />
            </div>
          </div>
          <div class="flex flex-col gap-0.5">
            <p class="text-[11px] font-medium leading-snug" style="color: var(--text-secondary)">{{ tpl.storeTypes }}</p>
            <p class="text-[11px] leading-snug" style="color: var(--text-tertiary)">{{ tpl.description }}</p>
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border" :style="{ borderColor: tpl.color + '40', background: tpl.color + '12', color: tpl.color }">
              <span class="w-2 h-2 rounded-full inline-block" :style="{ background: tpl.color }"></span>
              {{ tpl.color.toUpperCase() }}
            </span>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style="background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-tertiary)">
              <Icon name="lucide:type" class="w-2.5 h-2.5" />
              {{ tpl.fontName }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface OnboardingForm {
  name: string; logoUrl: string | null; description: string
  templateKey: string; primaryColor: string; language: string
  product: { name: string; price: number | null; imageUrl: string | null }
}

const props = defineProps<{ modelValue: OnboardingForm }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingForm] }>()
const { t } = useI18n({ useScope: 'global' })

const templates = computed(() => [
  { key: 'classic', label: 'Classic', description: t('admin.appearanceSettingsForm.templates.options.classic.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.classic.storeTypes'), fontClass: 'font-serif', fontName: 'Alice', fontStyle: "'Alice', serif", color: '#0f172a', bg: '#f8fafc', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#e2e8f0,#cbd5e1)', border: '#e2e8f0', textColor: '#0f172a', btnText: '#ffffff', radius: '4px', emoji: '🖼️', sampleDesc: 'Élégant & intemporel', samplePrice: '189 DA' },
  { key: 'modern', label: 'Modern', description: t('admin.appearanceSettingsForm.templates.options.modern.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.modern.storeTypes'), fontClass: 'font-sans', fontName: 'Outfit', fontStyle: "'Outfit', ui-sans-serif, system-ui, sans-serif", color: '#65A30D', bg: '#f8fafc', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#ECFCCB,#D9F99D)', border: '#e2e8f0', textColor: '#475569', btnText: '#ffffff', radius: '8px', emoji: '🛍️', sampleDesc: 'Minimaliste & moderne', samplePrice: '129 DA' },
  { key: 'street', label: 'Street', description: t('admin.appearanceSettingsForm.templates.options.street.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.street.storeTypes'), fontClass: 'font-street', fontName: 'Anton', fontStyle: "'Anton', sans-serif", color: '#FACC15', bg: '#ffffff', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#fef9c3,#fde68a)', border: '#FACC15', textColor: '#000000', btnText: '#000000', radius: '0px', emoji: '👟', sampleDesc: 'Limited drop', samplePrice: '99 DA' },
  { key: 'cozy', label: 'Cozy', description: t('admin.appearanceSettingsForm.templates.options.cozy.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.cozy.storeTypes'), fontClass: 'font-cozy', fontName: 'Nunito', fontStyle: "'Nunito', sans-serif", color: '#A4C3B2', bg: '#F5F2EA', cardBg: '#F5F2EA', imgBg: 'linear-gradient(135deg,#d1fae5,#bbf7d0)', border: '#e8f0eb', textColor: '#475569', btnText: '#ffffff', radius: '16px', emoji: '🕯️', sampleDesc: 'Doux & chaleureux', samplePrice: '24 DA' },
  { key: 'cyber', label: 'Cyber', description: t('admin.appearanceSettingsForm.templates.options.cyber.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.cyber.storeTypes'), fontClass: 'font-cyber', fontName: 'Orbitron', fontStyle: "'Orbitron', sans-serif", color: '#F43F5E', bg: '#0d0515', cardBg: '#1a0a2e', imgBg: 'linear-gradient(135deg,#2d1b5e,#1a0a2e)', border: '#F43F5E', textColor: '#e9d5ff', btnText: '#ffffff', radius: '4px', emoji: '🤖', sampleDesc: 'Next-gen tech', samplePrice: '499 DA' },
  { key: 'stationnery', label: 'Stationery', description: t('admin.appearanceSettingsForm.templates.options.stationnery.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.stationnery.storeTypes'), fontClass: 'font-stationery', fontName: 'Merriweather', fontStyle: "'Merriweather', serif", color: '#334155', bg: '#fdfbf7', cardBg: '#fdfbf7', imgBg: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', border: '#cbd5e1', textColor: '#1e293b', btnText: '#fdfbf7', radius: '2px', emoji: '📓', sampleDesc: 'Élégance papeterie', samplePrice: '18 DA' },
  { key: 'food', label: 'Food', description: t('admin.appearanceSettingsForm.templates.options.food.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.food.storeTypes'), fontClass: 'font-food', fontName: 'Nunito', fontStyle: "'Nunito', sans-serif", color: '#ea580c', bg: '#f5f5f4', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#ffedd5,#fed7aa)', border: '#e7e5e4', textColor: '#292524', btnText: '#ffffff', radius: '12px', emoji: '🍕', sampleDesc: 'Saveurs artisanales', samplePrice: '14 DA' },
  { key: 'wellness', label: 'Wellness', description: t('admin.appearanceSettingsForm.templates.options.wellness.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.wellness.storeTypes'), fontClass: 'font-wellness', fontName: 'Solway', fontStyle: "'Solway', ui-serif, Georgia, serif", color: '#84CC16', bg: '#f8fafc', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#ECFCCB,#a7f3d0)', border: '#ECFCCB', textColor: '#475569', btnText: '#ffffff', radius: '12px', emoji: '🌿', sampleDesc: 'Bio & naturel', samplePrice: '22 DA' },
  { key: 'playful', label: 'Playful', description: t('admin.appearanceSettingsForm.templates.options.playful.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.playful.storeTypes'), fontClass: 'font-sans', fontName: 'Nunito', fontStyle: "'Nunito', sans-serif", color: '#9333EA', bg: '#faf5ff', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#f3e8ff,#e9d5ff)', border: '#e9d5ff', textColor: '#334155', btnText: '#ffffff', radius: '20px', emoji: '🧸', sampleDesc: 'Toys & Fun', samplePrice: '15 DA' },
  { key: 'activewear', label: 'Activewear', description: t('admin.appearanceSettingsForm.templates.options.activewear.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.activewear.storeTypes'), fontClass: 'font-activewear', fontName: 'Teko', fontStyle: "'Teko', sans-serif", color: '#EAB308', bg: '#000000', cardBg: '#111111', imgBg: 'linear-gradient(135deg,#1f2937,#000000)', border: '#333333', textColor: '#d1d5db', btnText: '#000000', radius: '0px', emoji: '⚡', sampleDesc: 'High Performance', samplePrice: '89 DA' },
  { key: 'chrono', label: 'Chrono Luxe', description: t('admin.appearanceSettingsForm.templates.options.chrono.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.chrono.storeTypes'), fontClass: 'font-serif', fontName: 'Cormorant Garamond', fontStyle: "'Cormorant Garamond', serif", color: '#A67C52', bg: '#0E1117', cardBg: '#131720', imgBg: 'linear-gradient(135deg,#1A1F2E,#0B0E16)', border: 'rgba(212,197,169,0.18)', textColor: '#E8E0D5', btnText: '#ffffff', radius: '2px', emoji: '⌚', sampleDesc: 'Luxury Accessories', samplePrice: '3 500 DA' },
  { key: 'maison', label: 'Maison', description: t('admin.appearanceSettingsForm.templates.options.maison.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.maison.storeTypes'), fontClass: 'font-serif', fontName: 'Playfair Display', fontStyle: "'Playfair Display', serif", color: '#8B6F47', bg: '#FAF7F2', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#f5ebe0,#e8d8c4)', border: '#e8d8c4', textColor: '#3d2b1f', btnText: '#ffffff', radius: '4px', emoji: '🏡', sampleDesc: 'Intérieur & Déco', samplePrice: '250 DA' },
])
</script>
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/onboarding/OnboardingStepTemplate.vue
git commit -m "feat(onboarding): add Template step component"
```

---

## Task 7: Step components — BrandColor, Language, Done

**Files:**
- Create: `components/admin/onboarding/OnboardingStepBrandColor.vue`
- Create: `components/admin/onboarding/OnboardingStepLanguage.vue`
- Create: `components/admin/onboarding/OnboardingStepDone.vue`

- [ ] **Step 1: Create `OnboardingStepBrandColor.vue`**

```vue
<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
      {{ t('admin.pages.onboarding.brand.title') }}
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.brand.pickColor') }}</label>
        <input
          :value="modelValue.primaryColor"
          type="color"
          class="h-12 w-full rounded-lg"
          style="border: 1px solid var(--surface-border); background: var(--surface-2)"
          @input="emit('update:modelValue', { ...modelValue, primaryColor: ($event.target as HTMLInputElement).value })"
        >
      </div>
      <div>
        <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.brand.hexValue') }}</label>
        <input
          :value="modelValue.primaryColor"
          type="text"
          placeholder="#4F46E5"
          class="ui-input w-full px-3 py-2"
          @input="emit('update:modelValue', { ...modelValue, primaryColor: ($event.target as HTMLInputElement).value })"
        >
        <p class="mt-1 text-xs" style="color: var(--text-muted)">
          {{ t('admin.pages.onboarding.brand.example', { value: '#4F46E5' }) }}
        </p>
      </div>
    </div>
    <div class="rounded-lg p-4" style="border: 1px solid var(--surface-border)">
      <p class="text-sm mb-2" style="color: var(--text-secondary)">{{ t('admin.pages.onboarding.brand.preview') }}</p>
      <button type="button" class="px-4 py-2 rounded-lg text-white font-medium" :style="{ backgroundColor: modelValue.primaryColor }">
        {{ t('admin.pages.onboarding.brand.primaryButton') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface OnboardingForm {
  name: string; logoUrl: string | null; description: string
  templateKey: string; primaryColor: string; language: string
  product: { name: string; price: number | null; imageUrl: string | null }
}
const props = defineProps<{ modelValue: OnboardingForm }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingForm] }>()
const { t } = useI18n({ useScope: 'global' })
</script>
```

- [ ] **Step 2: Create `OnboardingStepLanguage.vue`**

```vue
<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
      {{ t('admin.pages.onboarding.language.title') }}
    </h3>
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.language.label') }}</label>
      <BaseSelect :value="modelValue.language" @change="onLanguageChange">
        <option v-for="l in languages" :key="l.key" :value="l.key">{{ l.label }}</option>
      </BaseSelect>
      <p class="mt-1 text-xs" style="color: var(--text-muted)">
        {{ t('admin.pages.onboarding.language.rtlHint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseSelect from '~/components/ui/BaseSelect.vue'

interface OnboardingForm {
  name: string; logoUrl: string | null; description: string
  templateKey: string; primaryColor: string; language: string
  product: { name: string; price: number | null; imageUrl: string | null }
}
const props = defineProps<{ modelValue: OnboardingForm }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingForm] }>()
const { t, setLocale } = useI18n({ useScope: 'global' })

const languages = [
  { key: 'ar', label: `${t('i18n.locales.ar')} (AR)` },
  { key: 'fr', label: `${t('i18n.locales.fr')} (FR)` },
  { key: 'en', label: `${t('i18n.locales.en')} (EN)` },
]

async function onLanguageChange(event: Event) {
  const lang = (event.target as HTMLSelectElement).value
  emit('update:modelValue', { ...props.modelValue, language: lang })
  try { await setLocale(lang as any) } catch {}
}
</script>
```

- [ ] **Step 3: Create `OnboardingStepDone.vue`**

```vue
<template>
  <div class="space-y-6 text-center py-4">
    <div class="flex justify-center">
      <div class="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-100">
        <Icon name="lucide:check" class="w-8 h-8 text-emerald-600" />
      </div>
    </div>

    <div>
      <h3 class="text-2xl font-bold" style="color: var(--text-primary)">
        {{ t('admin.pages.onboarding.done.title') }}
      </h3>
      <p class="mt-1 text-sm" style="color: var(--text-secondary)">
        {{ t('admin.pages.onboarding.done.subtitle') }}
      </p>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
      <div class="rounded-xl p-3" style="border: 1px solid var(--surface-border)">
        <p class="text-xs" style="color: var(--text-tertiary)">Template</p>
        <p class="font-semibold text-sm capitalize" style="color: var(--text-primary)">{{ modelValue.templateKey }}</p>
      </div>
      <div class="rounded-xl p-3" style="border: 1px solid var(--surface-border)">
        <p class="text-xs" style="color: var(--text-tertiary)">Color</p>
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded" :style="{ background: modelValue.primaryColor }"></span>
          <p class="font-semibold text-sm" style="color: var(--text-primary)">{{ modelValue.primaryColor }}</p>
        </div>
      </div>
      <div class="rounded-xl p-3" style="border: 1px solid var(--surface-border)">
        <p class="text-xs" style="color: var(--text-tertiary)">Language</p>
        <p class="font-semibold text-sm uppercase" style="color: var(--text-primary)">{{ modelValue.language }}</p>
      </div>
    </div>

    <!-- Store URL -->
    <div class="rounded-xl p-4" style="border: 1px solid var(--surface-border); background: var(--surface-2)">
      <p class="text-xs mb-1" style="color: var(--text-tertiary)">{{ t('admin.pages.onboarding.done.storeUrlLabel') }}</p>
      <p class="font-mono font-semibold text-sm" style="color: var(--text-primary)">
        https://{{ tenantSlug }}.swekly.dz
      </p>
    </div>

    <p class="text-xs" style="color: var(--text-muted)">
      {{ t('admin.pages.onboarding.done.offlineNote') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

interface OnboardingForm {
  name: string; logoUrl: string | null; description: string
  templateKey: string; primaryColor: string; language: string
  product: { name: string; price: number | null; imageUrl: string | null }
}
const props = defineProps<{ modelValue: OnboardingForm }>()
const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const tenantSlug = computed(() => authStore.user?.tenant?.slug ?? '')
</script>
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/onboarding/OnboardingStepBrandColor.vue \
        components/admin/onboarding/OnboardingStepLanguage.vue \
        components/admin/onboarding/OnboardingStepDone.vue
git commit -m "feat(onboarding): add BrandColor, Language, Done step components"
```

---

## Task 8: Step component — `OnboardingStepFirstProduct.vue`

**Files:**
- Create: `components/admin/onboarding/OnboardingStepFirstProduct.vue`

Note: Product creation (API call) is handled by the parent orchestrator. This component only manages form state and image upload. The parent calls `POST /api/admin/products` then `POST /api/admin/products/:id/images` after the user clicks "Next". If the user clicks "Skip", `emit('skip')` fires and the parent advances without creating a product.

- [ ] **Step 1: Create the component**

```vue
<template>
  <div class="space-y-5">
    <div>
      <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
        {{ t('admin.pages.onboarding.firstProduct.title') }}
      </h3>
      <p class="text-sm mt-1" style="color: var(--text-secondary)">
        {{ t('admin.pages.onboarding.firstProduct.subtitle') }}
      </p>
    </div>

    <!-- Product name -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.firstProduct.nameLabel') }}</label>
      <input
        :value="modelValue.product.name"
        type="text"
        class="ui-input w-full px-3 py-2"
        :placeholder="t('admin.pages.onboarding.firstProduct.namePlaceholder')"
        @input="updateProduct('name', ($event.target as HTMLInputElement).value)"
      >
    </div>

    <!-- Price -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.firstProduct.priceLabel') }}</label>
      <input
        :value="modelValue.product.price ?? ''"
        type="number"
        min="0"
        class="ui-input w-full px-3 py-2"
        placeholder="0"
        @input="updateProduct('price', Number(($event.target as HTMLInputElement).value) || null)"
      >
    </div>

    <!-- Image upload -->
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.firstProduct.imageLabel') }}</label>
      <div class="flex items-center gap-4">
        <div
          v-if="modelValue.product.imageUrl"
          class="w-16 h-16 rounded-lg overflow-hidden border shrink-0"
          style="border-color: var(--surface-border)"
        >
          <img :src="modelValue.product.imageUrl" alt="product" class="w-full h-full object-cover">
        </div>
        <div v-else class="w-16 h-16 rounded-lg flex items-center justify-center shrink-0" style="background: var(--surface-3); border: 1px dashed var(--surface-border)">
          <Icon name="lucide:image" class="w-6 h-6" style="color: var(--text-muted)" />
        </div>
        <div>
          <label class="ui-btn ui-btn--secondary px-3 py-1.5 text-sm cursor-pointer inline-flex items-center gap-2">
            <Icon name="lucide:upload" class="w-3.5 h-3.5" />
            {{ modelValue.product.imageUrl ? t('admin.pages.onboarding.firstProduct.imageChange') : t('admin.pages.onboarding.firstProduct.imageUpload') }}
            <input type="file" accept="image/*" class="sr-only" @change="onImageChange">
          </label>
        </div>
        <div v-if="uploading" class="text-sm" style="color: var(--text-secondary)">
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 [border-color:var(--brand)]" />
        </div>
      </div>
      <p v-if="uploadError" class="mt-1 text-sm text-red-500">{{ uploadError }}</p>
    </div>

    <!-- Error from parent product creation -->
    <p v-if="productError" class="text-sm text-red-500">{{ productError }}</p>

    <!-- Skip link -->
    <div class="pt-1">
      <button type="button" class="text-sm underline" style="color: var(--text-muted)" @click="emit('skip')">
        {{ t('admin.pages.onboarding.firstProduct.skipLink') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useUploadWithProgress } from '~/composables/useUploadWithProgress'

interface OnboardingForm {
  name: string; logoUrl: string | null; description: string
  templateKey: string; primaryColor: string; language: string
  product: { name: string; price: number | null; imageUrl: string | null }
}

const props = defineProps<{
  modelValue: OnboardingForm
  productError?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: OnboardingForm]
  'skip': []
}>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const { uploadWithProgress } = useUploadWithProgress()

const uploading = ref(false)
const uploadError = ref('')

function updateProduct(field: 'name' | 'price' | 'imageUrl', value: any) {
  emit('update:modelValue', {
    ...props.modelValue,
    product: { ...props.modelValue.product, [field]: value }
  })
}

async function onImageChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    const result = await uploadWithProgress<{ url: string }>({
      url: '/api/upload',
      file,
      token: authStore.token
    })
    updateProduct('imageUrl', result.url)
  } catch (e: any) {
    uploadError.value = e.message || 'Upload failed'
  } finally {
    uploading.value = false
  }
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/onboarding/OnboardingStepFirstProduct.vue
git commit -m "feat(onboarding): add FirstProduct step component"
```

---

## Task 9: Rewrite `pages/admin/onboarding.vue` as thin orchestrator

**Files:**
- Modify: `pages/admin/onboarding.vue`

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `pages/admin/onboarding.vue` with:

```vue
<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-8">
      <h2 class="text-2xl font-bold" style="color: var(--text-primary)">
        {{ t('admin.pages.onboarding.title') }}
      </h2>
      <p class="mt-1" style="color: var(--text-secondary)">
        {{ t('admin.pages.onboarding.subtitle') }}
      </p>
    </div>

    <div v-if="loading" class="rounded-xl p-8" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
      <div class="flex items-center gap-3" style="color: var(--text-secondary)">
        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 [border-color:var(--brand)]" />
        <span>{{ t('admin.pages.onboarding.loadingSettings') }}</span>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- Progress bar -->
      <div class="rounded-xl p-6" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-medium" style="color: var(--text-secondary)">
            {{ t('admin.pages.onboarding.progress.stepOf', { current: step + 1, total: STEPS.length }) }}
          </p>
          <p class="text-sm" style="color: var(--text-tertiary)">{{ STEPS[step].label }}</p>
        </div>
        <div class="h-2 rounded-full overflow-hidden" style="background: var(--surface-3)">
          <div class="h-2 [background:var(--brand)] transition-all" :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>

      <!-- Step content -->
      <div class="rounded-xl p-6" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <AdminOnboardingOnboardingStepStoreInfo v-if="step === 0" v-model="form" />
        <AdminOnboardingOnboardingStepTemplate v-else-if="step === 1" v-model="form" />
        <AdminOnboardingOnboardingStepBrandColor v-else-if="step === 2" v-model="form" />
        <AdminOnboardingOnboardingStepLanguage v-else-if="step === 3" v-model="form" />
        <AdminOnboardingOnboardingStepFirstProduct v-else-if="step === 4" v-model="form" :product-error="productError" @skip="skipProduct" />
        <AdminOnboardingOnboardingStepDone v-else v-model="form" />

        <div v-if="error" class="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {{ error }}
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="ui-btn ui-btn--secondary px-4 py-2 disabled:opacity-50"
          :disabled="step === 0 || saving"
          @click="step--"
        >
          {{ t('admin.common.back') }}
        </button>

        <div class="flex items-center gap-3">
          <button
            v-if="step < STEPS.length - 1"
            type="button"
            class="px-4 py-2 rounded-lg [background:var(--brand)] hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] text-white font-medium disabled:opacity-50"
            :disabled="saving"
            @click="nextStep"
          >
            {{ saving ? t('admin.common.saving') : t('admin.common.next') }}
          </button>
          <button
            v-else
            type="button"
            class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
            :disabled="saving"
            @click="finish"
          >
            {{ saving ? t('admin.common.saving') : t('admin.pages.onboarding.saveFinish') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { normalizeContentSlug } from '~/shared/content-slug'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.onboarding.metaTitle'
})

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const STEPS = computed(() => [
  { key: 'storeInfo',     label: t('admin.pages.onboarding.steps.storeInfo') },
  { key: 'template',      label: t('admin.pages.onboarding.steps.template') },
  { key: 'brandColor',    label: t('admin.pages.onboarding.steps.brandColor') },
  { key: 'language',      label: t('admin.pages.onboarding.steps.language') },
  { key: 'firstProduct',  label: t('admin.pages.onboarding.steps.firstProduct') },
  { key: 'done',          label: t('admin.pages.onboarding.steps.done') },
])

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const productError = ref('')
const step = ref(0)
const progressPercent = computed(() => Math.round(((step.value + 1) / STEPS.value.length) * 100))

const form = reactive({
  name: authStore.user?.tenant?.name ?? '',
  logoUrl: null as string | null,
  description: '',
  templateKey: 'modern',
  primaryColor: '#65A30D',
  language: 'fr',
  product: { name: '', price: null as number | null, imageUrl: null as string | null }
})

async function loadSettings() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<any>('/api/admin/store-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    form.name = data.name || form.name
    form.logoUrl = data.logoUrl ?? null
    form.templateKey = data.templateKey || form.templateKey
    form.primaryColor = data.primaryColor || form.primaryColor
    form.language = data.language || form.language
    useState<any>('storeSettings').value = data
  } catch (e: any) {
    error.value = e.data?.statusMessage || t('admin.pages.onboarding.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

async function save(extra?: Record<string, unknown>) {
  saving.value = true
  error.value = ''
  try {
    const updated = await $fetch<any>('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        name: form.name,
        logoUrl: form.logoUrl,
        templateKey: form.templateKey,
        primaryColor: form.primaryColor,
        language: form.language,
        ...extra
      }
    })
    useState<any>('storeSettings').value = updated
    return true
  } catch (e: any) {
    error.value = e.data?.statusMessage || t('admin.pages.onboarding.errors.saveFailed')
    return false
  } finally {
    saving.value = false
  }
}

async function createFirstProduct() {
  if (!form.product.name || form.product.price === null) return null
  productError.value = ''
  try {
    const slug = normalizeContentSlug(form.product.name) || `product-${Date.now()}`
    const product = await $fetch<any>('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { title: form.product.name, slug, price: form.product.price, isActive: true }
    })
    if (form.product.imageUrl && product?.id) {
      await $fetch(`/api/admin/products/${product.id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: { url: form.product.imageUrl, isMain: true }
      }).catch(() => {})
    }
    return product
  } catch (e: any) {
    productError.value = t('admin.pages.onboarding.firstProduct.errorCreate')
    return null
  }
}

async function nextStep() {
  // Step 4 (firstProduct): attempt product creation, allow skip on error
  if (step.value === 4) {
    if (form.product.name && form.product.price !== null) {
      const created = await createFirstProduct()
      if (!created && productError.value) return // block advance, show error with skip option
    }
    step.value++
    return
  }
  const ok = await save()
  if (ok) step.value++
}

function skipProduct() {
  productError.value = ''
  step.value++
}

async function finish() {
  const ok = await save({ isCompleted: true })
  if (ok) await navigateTo('/admin')
}

onMounted(() => loadSettings())
</script>
```

- [ ] **Step 2: Commit**

```bash
git add pages/admin/onboarding.vue
git commit -m "feat(onboarding): rewrite as 6-step orchestrator with extracted step components"
```

---

## Task 10: `AdminGettingStartedChecklist.vue`

**Files:**
- Create: `components/admin/AdminGettingStartedChecklist.vue`

- [ ] **Step 1: Create the component**

```vue
<template>
  <div v-if="!dismissed" class="rounded-xl p-5 mb-4" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="font-semibold text-sm" style="color: var(--text-primary)">
          {{ t('admin.pages.gettingStarted.title') }}
        </h3>
        <p class="text-xs mt-0.5" style="color: var(--text-secondary)">
          {{ t('admin.pages.gettingStarted.progress', { done: completedCount, total: items.length }) }}
        </p>
      </div>
      <button
        v-if="!allDone"
        type="button"
        class="text-xs px-2 py-1 rounded" style="color: var(--text-muted); background: var(--surface-3)"
        @click="dismiss"
      >
        {{ t('admin.pages.gettingStarted.dismiss') }}
      </button>
      <span v-else class="text-xs font-medium text-emerald-600 flex items-center gap-1">
        <Icon name="lucide:check-circle" class="w-4 h-4" />
        {{ t('admin.pages.gettingStarted.complete') }}
      </span>
    </div>

    <!-- Progress bar -->
    <div class="h-1.5 rounded-full mb-4 overflow-hidden" style="background: var(--surface-3)">
      <div
        class="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
        :style="{ width: `${(completedCount / items.length) * 100}%` }"
      />
    </div>

    <!-- Items -->
    <ul class="space-y-2">
      <li v-for="item in items" :key="item.key" class="flex items-center gap-3">
        <div
          class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
          :class="item.done ? 'bg-emerald-500' : ''"
          :style="item.done ? '' : 'border: 2px solid var(--surface-border)'"
        >
          <Icon v-if="item.done" name="lucide:check" class="w-3 h-3 text-white" />
        </div>
        <span
          class="text-sm flex-1"
          :class="item.done ? 'line-through' : ''"
          :style="item.done ? 'color: var(--text-muted)' : 'color: var(--text-primary)'"
        >{{ item.label }}</span>
        <component
          :is="item.key === 'publish' ? 'button' : NuxtLink"
          v-if="!item.done"
          v-bind="item.key === 'publish' ? { type: 'button', disabled: publishing } : { to: item.href }"
          class="text-xs px-2.5 py-1 rounded-lg font-medium [background:var(--brand)] text-white disabled:opacity-50"
          @click="item.key === 'publish' ? publishStore() : undefined"
        >
          {{ item.key === 'publish' ? (publishing ? t('admin.pages.gettingStarted.publishing') : t('admin.pages.gettingStarted.publishBtn')) : '→' }}
        </component>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const NuxtLink = resolveComponent('NuxtLink')

interface ChecklistData {
  hasLogo: boolean
  hasProducts: boolean
  hasCategories: boolean
  hasDelivery: boolean
  isPublished: boolean
  checklistDismissed: boolean
}

const data = ref<ChecklistData | null>(null)
const dismissed = ref(false)
const publishing = ref(false)

const items = computed(() => [
  { key: 'logo',     done: data.value?.hasLogo ?? false,       label: t('admin.pages.gettingStarted.items.logo'),     href: '/admin/settings' },
  { key: 'product',  done: data.value?.hasProducts ?? false,   label: t('admin.pages.gettingStarted.items.product'),  href: '/admin/products/create' },
  { key: 'category', done: data.value?.hasCategories ?? false, label: t('admin.pages.gettingStarted.items.category'), href: '/admin/categories' },
  { key: 'delivery', done: data.value?.hasDelivery ?? false,   label: t('admin.pages.gettingStarted.items.delivery'), href: '/admin/settings' },
  { key: 'publish',  done: data.value?.isPublished ?? false,   label: t('admin.pages.gettingStarted.items.publish'),  href: '' },
])

const completedCount = computed(() => items.value.filter(i => i.done).length)
const allDone = computed(() => completedCount.value === items.value.length)

async function fetchChecklist() {
  try {
    data.value = await $fetch<ChecklistData>('/api/admin/store-settings/onboarding-checklist', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    if (data.value.checklistDismissed) dismissed.value = true
  } catch {}
}

async function dismiss() {
  dismissed.value = true
  await $fetch('/api/admin/store-settings', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authStore.token}` },
    body: { checklistDismissed: true }
  }).catch(() => {})
}

async function publishStore() {
  publishing.value = true
  try {
    await $fetch('/api/admin/store-settings/publish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await fetchChecklist()
  } catch {} finally {
    publishing.value = false
  }
}

onMounted(fetchChecklist)
</script>
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/AdminGettingStartedChecklist.vue
git commit -m "feat(dashboard): add AdminGettingStartedChecklist component"
```

---

## Task 11: Integrate checklist into dashboard

**Files:**
- Modify: `pages/admin/index.vue`

- [ ] **Step 1: Add checklist above stats grid**

In `pages/admin/index.vue`, find the stats grid div (around line 65):

```vue
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
```

Add the checklist component immediately before it. First, find the block around lines 32–39 that has the `NuxtLink` for "finishSetup" — the checklist replaces the raw "Finish Setup" link for completed-onboarding users. Add the checklist below the error block and above the stats grid:

```vue
    <!-- Getting Started checklist (shown to tenants that completed onboarding) -->
    <AdminGettingStartedChecklist v-if="storeSettings?.isCompleted" />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
```

The existing `NuxtLink` for `!storeSettings?.isCompleted` stays — it redirects incomplete onboarding back to the wizard.

- [ ] **Step 2: Commit**

```bash
git add pages/admin/index.vue
git commit -m "feat(dashboard): integrate getting-started checklist"
```

---

## Task 12: Verification

- [ ] **Step 1: Start the dev server**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS"
npm run dev
```

- [ ] **Step 2: Register a new tenant and verify wizard flow**

1. Go to `/register`, create a new tenant
2. After login, confirm redirect to `/admin/onboarding`
3. Complete step 1 (Store Info): enter name, upload a logo, add description — click Next
4. Complete step 2 (Template): select a template — click Next
5. Complete step 3 (Brand Color): pick a color — click Next
6. Complete step 4 (Language): select language — click Next
7. Complete step 5 (First Product): enter name + price, optionally upload image — click Next. Also test "Skip for now" link.
8. Step 6 (Done): verify store URL shows correctly, click "Finish Setup"
9. Confirm redirect to `/admin` dashboard

- [ ] **Step 3: Verify checklist on dashboard**

1. On the dashboard, confirm `AdminGettingStartedChecklist` appears
2. If logo was uploaded in step 1, item 1 should be checked
3. If product was created in step 5, item 2 should be checked
4. Click "→" on "Add your first product" — confirm redirect to `/admin/products/create`
5. Create a product — return to dashboard — confirm item 2 checks off (may need refresh)
6. Click "Publish now" — confirm `POST /api/admin/store-settings/publish` fires, item 5 checks off
7. Click "Dismiss" — confirm checklist disappears and doesn't reappear on refresh

- [ ] **Step 4: Run type check**

```bash
npm run typecheck
```

Expected: no type errors in the new/modified files.
