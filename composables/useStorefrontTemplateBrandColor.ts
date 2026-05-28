import { hexToRgb, resolveStorefrontTemplateBrandColor } from '~/shared/storefront/template-brand'

export const useStorefrontTemplateBrandColor = (templateKey: string) => {
  const storeSettings = useState<any>('storeSettings')

  return computed(() => {
    const color = resolveStorefrontTemplateBrandColor(templateKey, storeSettings.value)

    return {
      color,
      rgb: hexToRgb(color)
    }
  })
}
