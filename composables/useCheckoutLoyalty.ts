export const useCheckoutLoyalty = () => {
  const phone = useState<string>('checkout-loyalty-phone', () => '')
  const redeemPointsRequested = useState<number>('checkout-loyalty-redeem-points', () => 0)

  const setRedeemPointsRequested = (value: unknown) => {
    const parsed = Math.trunc(Number(value || 0))
    redeemPointsRequested.value = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }

  const reset = () => {
    phone.value = ''
    redeemPointsRequested.value = 0
  }

  return {
    phone,
    redeemPointsRequested,
    setRedeemPointsRequested,
    reset
  }
}
