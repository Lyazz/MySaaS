<script setup lang="ts">
import { useUiStore } from '~/stores/ui';
import { resolveFaviconUrl } from '~/utils/branding';

const uiStore = useUiStore();
const route = useRoute();
onMounted(() => {
  uiStore.initTheme();
});

const BRAND_NAME = 'Swekly';

function toReadableLabel(input: string): string {
  return input
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFallbackRouteTitle(): string {
  const matchedPath =
    route.matched[route.matched.length - 1]?.path || route.path || '/';
  if (!matchedPath || matchedPath === '/') return 'Home';
  const segments = matchedPath
    .split('/')
    .filter(Boolean)
    .filter((segment) => !segment.startsWith('[') && !segment.startsWith(':'));
  if (!segments.length) return 'Home';
  return toReadableLabel(segments[segments.length - 1] || 'Home');
}

function formatTitle(titleChunk?: string | null): string {
  const rawTitle = (titleChunk || '').trim();
  const normalizedTitle = rawTitle.replace(/\s*[|—-]\s*Swekly\s*$/i, '').trim();
  const baseTitle = normalizedTitle || getFallbackRouteTitle();
  return `${baseTitle} | ${BRAND_NAME}`;
}

// Global page-title format
useHead({
  titleTemplate: (titleChunk) => {
    return formatTitle(titleChunk);
  },
});

const { locale } = useI18n({ useScope: 'global' });
const htmlDir = computed(() => (locale.value === 'ar' ? 'rtl' : 'ltr'));
const htmlLang = computed(() => {
  if (locale.value === 'fr') return 'fr-FR';
  if (locale.value === 'ar') return 'ar-DZ';
  return 'en-US';
});

// Initialize tenant state globally
const event = useRequestEvent();
const tenant = useState('tenant', () => event?.context.tenant);
const storeSettings = useState<any>(
  'storeSettings',
  () => event?.context.storeSettings
);
const facebookPixelId = useState<string | null>(
  'facebookPixelId',
  () => (event?.context as any)?.facebookPixelId ?? null
);
// True only when a member of this tenant is previewing their own unpublished
// storefront; the public gets a 404 before ever reaching this component.
useState<boolean>(
  'storefrontDraft',
  () => (event?.context as any)?.storefrontDraft === true
);

const faviconUrl = computed(() =>
  resolveFaviconUrl({
    tenant: tenant.value,
    storeSettings: storeSettings.value,
  })
);
const faviconType = computed(() =>
  faviconUrl.value.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon'
);

useHead({
  htmlAttrs: {
    lang: htmlLang,
    dir: htmlDir,
  },
  link: [{ rel: 'icon', type: faviconType, href: faviconUrl }],
});

// Store default language should be applied when user has no locale cookie yet.
const localeCookie = useCookie<string | null>('i18n_redirected', {
  default: () => null,
});
const i18n = useI18n({ useScope: 'global' });
watchEffect(() => {
  if (localeCookie.value) return;
  const preferred = storeSettings.value?.language;
  if (!preferred) return;
  if (!['en', 'fr', 'ar'].includes(preferred)) return;
  if (i18n.locale.value === preferred) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const composer = i18n as any;
  if (typeof composer.setLocale === 'function') {
    // eslint-disable-next-line no-void
    void composer.setLocale(preferred);
  } else {
    i18n.locale.value = preferred;
  }
});

</script>

<template>
  <NuxtLayout>
    <NuxtPage :keepalive="{ max: 10 }" />
  </NuxtLayout>
  <Toast />
</template>
