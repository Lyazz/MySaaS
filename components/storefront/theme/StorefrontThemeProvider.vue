<script setup lang="ts">
/**
 * The one theme provider.
 *
 * Binds a template's `theme.tokens.ts` to the DOM as custom properties, with
 * the tenant's overrides applied on top. Every tokenised template's own
 * ThemeProvider delegates here and keeps only its structural CSS — the
 * scrollbars, the heading face, the `::selection` colour — so there is a
 * single place where a theme becomes pixels.
 *
 * Backward compatibility matters here: `--brand` and `--brand-rgb` are still
 * emitted because `tailwind.config.ts` builds its whole `brand.*` scale from
 * them and every untokenised template still reads them.
 */
import {
  applyColorOverrides,
  hexToRgbChannels,
  tokensToCssVars,
  type ThemeColorOverrides,
  type ThemeTokens
} from '~/shared/storefront/theme/tokens'
import { resolveStorefrontTemplateBrandColor } from '~/shared/storefront/template-brand'
import { useCartStore } from '~/stores/cart'

const props = defineProps<{
  tokens: ThemeTokens
  /** Root class the template's own stylesheet is namespaced under. */
  rootClass: string
  /**
   * Draft overrides from the template creator's preview. Live edits arrive
   * here; saved ones arrive through store settings.
   */
  previewOverrides?: ThemeColorOverrides | null
}>()

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')

/**
 * The tenant's colours, in precedence order: a live preview edit beats saved
 * settings, and saved settings only apply when the tenant opted in through
 * `useBrandColor`. `resolveStorefrontTemplateBrandColor` already encodes that
 * last rule, so we defer to it rather than re-deriving it.
 */
const overrides = computed<ThemeColorOverrides>(() => {
  if (props.previewOverrides) return props.previewOverrides

  const brand = resolveStorefrontTemplateBrandColor(props.tokens.key, storeSettings.value)

  // An unchanged brand is not an override; returning it would needlessly
  // regenerate brandDeep and brandSoft away from the author's values.
  return brand.toLowerCase() === props.tokens.color.brand.toLowerCase() ? {} : { brand }
})

const resolved = computed(() => applyColorOverrides(props.tokens, overrides.value))

const themeStyle = computed<Record<string, string>>(() => ({
  ...tokensToCssVars(resolved.value),
  '--brand': resolved.value.color.brand,
  '--brand-rgb': hexToRgbChannels(resolved.value.color.brand),
  fontFamily: resolved.value.type.body.stack
}))

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div
    :class="[rootClass, 'min-h-screen antialiased']"
    :style="themeStyle"
  >
    <slot />
  </div>
</template>
