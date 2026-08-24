export type DeliveryCredentialField = {
  key: string
  label: string
  required: boolean
  secret: boolean
}

export type DeliveryProviderAdminView = {
  provider: string
  name: string
  supports: {
    quote: boolean
    createShipment: boolean
    track: boolean
    webhooks: boolean
  }
  credentialFields: DeliveryCredentialField[]
  offered: boolean
  account: null | {
    isActive: boolean
    updatedAt: string
    config: Record<string, unknown>
    secrets: Record<string, boolean>
  }
}

export type DeliveryMode = 'home' | 'office'

export const DELIVERY_MODES: DeliveryMode[] = ['home', 'office']

/** Rate maps are keyed by wilaya code, one map per delivery mode. */
export type DeliveryRateMap<T> = Record<DeliveryMode, Record<string, T>>

export function emptyRateMap<T>(): DeliveryRateMap<T> {
  return { home: {}, office: {} }
}
