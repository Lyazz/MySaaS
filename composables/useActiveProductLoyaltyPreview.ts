export type PublicLoyaltyPreview = {
  enabled: boolean
  basePoints: number
  productPoints: number
  totalPoints: number
  displayText: string
  mode?: string | null
} | null

export const useActiveProductLoyaltyPreview = () => {
  const preview = useState<PublicLoyaltyPreview>('active-product-loyalty-preview', () => null)

  const setPreview = (value: PublicLoyaltyPreview) => {
    preview.value = value
  }

  const reset = () => {
    preview.value = null
  }

  return {
    preview,
    setPreview,
    reset
  }
}
