/** The wizard's whole working state, shared by every step and the preview. */
export interface OnboardingDraft {
  name: string
  logoUrl: string | null
  description: string
  language: string
  templateKey: string
  primaryColor: string
  deliveryProviders: string[]
  storePickupEnabled: boolean
  product: {
    name: string
    price: number | null
    imageUrl: string | null
    /** Set once the product has actually been created, so a back-and-forth
     *  through the step does not create it twice. */
    createdId: string | null
  }
}
