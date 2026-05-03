export type NBAActionId =
  | 'call'
  | 'confirm'
  | 'markAttempt'
  | 'pushProvider'
  | 'choosePickupOrConfirm'
  | 'printBordereau'
  | 'trackShipment'
  | 'viewSale'
  | 'editItems'
  | 'editCustomer'
  | 'cancel'
  | 'delete'
  | 'reopen'
  | 'updateStatus'
  | 'markShipped'
  | 'markDelivered'
  | 'blacklistCustomer'
  | 'blacklistIp'
  | 'blacklistPhone'

export interface NBAAction {
  id: NBAActionId
  label: string
  icon: string
  tone?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
  href?: string
  disabled?: boolean
  hint?: string
}

export interface NBAModel {
  primary: NBAAction | null
  secondary: NBAAction[]
  pulse: boolean
  lockedNote: string | null
}

interface OrderLite {
  id: string
  status: string
  callStatus?: string | null
  shippingProvider?: string | null
  customerPhone?: string | null
  shipments?: Array<{ id: string; provider?: string | null }> | null
}

const PROVIDER_LABELS: Record<string, string> = {
  MAYSTRO: 'Maystro',
  YALIDINE: 'Yalidine',
  SELF: 'Self delivery'
}

function providerLabel(code?: string | null): string {
  if (!code) return ''
  const upper = String(code).toUpperCase()
  return PROVIDER_LABELS[upper] || upper.charAt(0) + upper.slice(1).toLowerCase()
}

function isCarrierLocked(order: OrderLite): boolean {
  const provider = String(order.shippingProvider || order.shipments?.[0]?.provider || '').toUpperCase()
  return Boolean(provider) && provider !== 'SELF' && order.status !== 'PENDING'
}

function buildBlacklistActions(t: (k: string, f?: string) => string): NBAAction[] {
  return [
    {
      id: 'blacklistCustomer',
      label: t('admin.pages.orders.detail.actions.blacklistCustomer', 'Blacklist customer'),
      icon: 'lucide:user-x',
      tone: 'danger'
    },
    {
      id: 'blacklistPhone',
      label: t('admin.pages.orders.detail.actions.blacklistPhone', 'Blacklist phone'),
      icon: 'lucide:phone-off',
      tone: 'danger'
    },
    {
      id: 'blacklistIp',
      label: t('admin.pages.orders.detail.actions.blacklistIp', 'Blacklist IP'),
      icon: 'lucide:globe-lock',
      tone: 'danger'
    }
  ]
}

export function useOrderNBA(
  order: OrderLite | null | undefined,
  t: (key: string, fallback?: string | Record<string, unknown>, params?: Record<string, unknown>) => string
): NBAModel {
  if (!order) {
    return { primary: null, secondary: [], pulse: false, lockedNote: null }
  }

  const status = String(order.status || '').toUpperCase()
  const callStatus = String(order.callStatus || 'not_called')
  const provider = String(order.shippingProvider || '').toUpperCase()
  const hasShipment = Boolean(order.shipments && order.shipments.length > 0)
  const locked = isCarrierLocked(order)

  const lockedNote = locked
    ? t('admin.pages.orders.detail.nba.lockedNote', 'Status is managed by the carrier.')
    : null

  const bl = buildBlacklistActions(t as any)

  // PENDING
  if (status === 'PENDING') {
    if (callStatus === 'not_called') {
      return {
        primary: order.customerPhone
          ? {
              id: 'call',
              label: t('admin.pages.orders.detail.nba.callCustomer', 'Call customer'),
              icon: 'lucide:phone',
              tone: 'primary',
              href: `tel:${order.customerPhone}`
            }
          : {
              id: 'confirm',
              label: t('admin.pages.orders.detail.nba.confirm', 'Confirm order'),
              icon: 'lucide:check',
              tone: 'success'
            },
        secondary: [
          {
            id: 'confirm',
            label: t('admin.pages.orders.detail.nba.confirm', 'Confirm order'),
            icon: 'lucide:check',
            tone: 'success'
          },
          {
            id: 'editItems',
            label: t('common.edit', 'Edit'),
            icon: 'lucide:pencil',
            tone: 'secondary'
          },
          {
            id: 'cancel',
            label: t('admin.pages.orders.detail.nba.cancelOrder', 'Cancel order'),
            icon: 'lucide:x-circle',
            tone: 'danger'
          },
          {
            id: 'delete',
            label: t('common.delete', 'Delete'),
            icon: 'lucide:trash-2',
            tone: 'danger'
          },
          ...bl
        ],
        pulse: true,
        lockedNote
      }
    }

    if (callStatus === 'called') {
      return {
        primary: {
          id: 'confirm',
          label: t('admin.pages.orders.detail.nba.confirm', 'Confirm order'),
          icon: 'lucide:check',
          tone: 'success'
        },
        secondary: [
          {
            id: 'call',
            label: t('admin.pages.orders.detail.nba.callAgain', 'Call again'),
            icon: 'lucide:phone',
            tone: 'secondary',
            href: order.customerPhone ? `tel:${order.customerPhone}` : undefined
          },
          {
            id: 'editItems',
            label: t('common.edit', 'Edit'),
            icon: 'lucide:pencil',
            tone: 'secondary'
          },
          {
            id: 'cancel',
            label: t('admin.pages.orders.detail.nba.cancelOrder', 'Cancel order'),
            icon: 'lucide:x-circle',
            tone: 'danger'
          },
          ...bl
        ],
        pulse: true,
        lockedNote
      }
    }

    // attempt_* / no_answer / switched_off
    return {
      primary: {
        id: 'call',
        label: t('admin.pages.orders.detail.nba.callAgain', 'Call again'),
        icon: 'lucide:phone',
        tone: 'primary',
        href: order.customerPhone ? `tel:${order.customerPhone}` : undefined
      },
      secondary: [
        {
          id: 'confirm',
          label: t('admin.pages.orders.detail.nba.confirmAnyway', 'Confirm anyway'),
          icon: 'lucide:check',
          tone: 'success'
        },
        {
          id: 'editItems',
          label: t('common.edit', 'Edit'),
          icon: 'lucide:pencil',
          tone: 'secondary'
        },
        {
          id: 'cancel',
          label: t('admin.pages.orders.detail.nba.cancelOrder', 'Cancel order'),
          icon: 'lucide:x-circle',
          tone: 'danger'
        },
        ...bl
      ],
      pulse: false,
      lockedNote
    }
  }

  // CONFIRMED
  if (status === 'CONFIRMED') {
    if (provider === 'MAYSTRO' && !hasShipment) {
      return {
        primary: {
          id: 'pushProvider',
          label: t('admin.pages.orders.detail.nba.pushTo', `Push to ${providerLabel(provider)}`, { provider: providerLabel(provider) }),
          icon: 'lucide:send',
          tone: 'primary'
        },
        secondary: [
          {
            id: 'printBordereau',
            label: t('admin.pages.orders.detail.printBordereau', 'Print bordereau'),
            icon: 'lucide:printer',
            tone: 'secondary'
          },
          {
            id: 'markShipped',
            label: t('admin.pages.orders.detail.nba.markShipped', 'Mark shipped'),
            icon: 'lucide:truck',
            tone: 'secondary'
          },
          {
            id: 'cancel',
            label: t('admin.pages.orders.detail.nba.cancelOrder', 'Cancel order'),
            icon: 'lucide:x-circle',
            tone: 'danger'
          },
          ...bl
        ],
        pulse: true,
        lockedNote
      }
    }

    return {
      primary: {
        id: 'printBordereau',
        label: t('admin.pages.orders.detail.printBordereau', 'Print bordereau'),
        icon: 'lucide:printer',
        tone: 'primary'
      },
      secondary: [
        {
          id: 'markShipped',
          label: t('admin.pages.orders.detail.nba.markShipped', 'Mark shipped'),
          icon: 'lucide:truck',
          tone: 'secondary'
        },
        {
          id: 'cancel',
          label: t('admin.pages.orders.detail.nba.cancelOrder', 'Cancel order'),
          icon: 'lucide:x-circle',
          tone: 'danger'
        },
        ...bl
      ],
      pulse: false,
      lockedNote
    }
  }

  // SHIPPED
  if (status === 'SHIPPED') {
    return {
      primary: {
        id: 'markDelivered',
        label: t('admin.pages.orders.detail.nba.markDelivered', 'Mark delivered'),
        icon: 'lucide:check-circle-2',
        tone: 'success',
        disabled: locked,
        hint: locked ? lockedNote || undefined : undefined
      },
      secondary: [
        {
          id: 'printBordereau',
          label: t('admin.pages.orders.detail.printBordereau', 'Print bordereau'),
          icon: 'lucide:printer',
          tone: 'secondary'
        },
        ...bl
      ],
      pulse: false,
      lockedNote
    }
  }

  // DELIVERED
  if (status === 'DELIVERED') {
    return {
      primary: {
        id: 'viewSale',
        label: t('admin.pages.orders.detail.viewSale', 'View sale'),
        icon: 'lucide:badge-dollar-sign',
        tone: 'primary',
        href: `/admin/sales/${order.id}`
      },
      secondary: [
        {
          id: 'printBordereau',
          label: t('admin.pages.orders.detail.printBordereau', 'Print bordereau'),
          icon: 'lucide:printer',
          tone: 'secondary'
        },
        ...bl
      ],
      pulse: false,
      lockedNote
    }
  }

  // CANCELLED / RETURNED / fallback
  return {
    primary: null,
    secondary: [
      {
        id: 'printBordereau',
        label: t('admin.pages.orders.detail.printBordereau', 'Print bordereau'),
        icon: 'lucide:printer',
        tone: 'secondary'
      },
      {
        id: 'reopen',
        label: t('admin.pages.orders.detail.nba.reopen', 'Reopen order'),
        icon: 'lucide:rotate-ccw',
        tone: 'secondary'
      },
      ...bl
    ],
    pulse: false,
    lockedNote
  }
}
