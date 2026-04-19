import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  getIntegration: vi.fn(),
  findTenant: vi.fn()
}))

vi.mock('telegraf', () => ({
  Telegraf: vi.fn().mockImplementation(() => ({
    telegram: { sendMessage: mocks.sendMessage }
  }))
}))

vi.mock('../../backend/src/modules/integrations/integrations.service', () => ({
  IntegrationsService: vi.fn().mockImplementation(() => ({
    getIntegration: mocks.getIntegration
  }))
}))

vi.mock('../../backend/src/lib/prisma', () => ({
  default: {
    tenant: {
      findUnique: mocks.findTenant
    }
  }
}))

import { TelegramService } from '../../backend/src/modules/integrations/telegram.service'

const baseOrder = {
  id: 'order-12345678',
  customerName: 'Alice',
  customerPhone: '0555000000',
  totalAmount: 3500,
  deliveryMode: 'home',
  shippingWilayaCode: '16',
  items: [
    {
      quantity: 1,
      product: { title: 'Product A' },
      variant: null
    }
  ]
}

describe('TelegramService.sendOrderNotification order link', () => {
  const originalPlatformBaseDomain = process.env.PLATFORM_BASE_DOMAIN
  const originalPlatformDomain = process.env.PLATFORM_DOMAIN

  beforeEach(() => {
    mocks.sendMessage.mockReset()
    mocks.getIntegration.mockReset()
    mocks.findTenant.mockReset()

    mocks.getIntegration.mockResolvedValue({
      isActive: true,
      config: { botToken: '123:ABC', chatId: 'chat-1' }
    })

    delete process.env.PLATFORM_BASE_DOMAIN
    delete process.env.PLATFORM_DOMAIN
  })

  afterEach(() => {
    if (originalPlatformBaseDomain === undefined) {
      delete process.env.PLATFORM_BASE_DOMAIN
    } else {
      process.env.PLATFORM_BASE_DOMAIN = originalPlatformBaseDomain
    }

    if (originalPlatformDomain === undefined) {
      delete process.env.PLATFORM_DOMAIN
    } else {
      process.env.PLATFORM_DOMAIN = originalPlatformDomain
    }
  })

  it('uses tenant custom domain when configured', async () => {
    mocks.findTenant.mockResolvedValue({ slug: 'alpha', domains: [{ domain: 'store.example.com' }] })

    const service = new TelegramService()
    await service.sendOrderNotification('tenant-1', baseOrder)

    expect(mocks.sendMessage).toHaveBeenCalledTimes(1)
    const [, message] = mocks.sendMessage.mock.calls[0]
    expect(message).toContain('(https://store.example.com/admin/orders/order-12345678)')
  })

  it('falls back to platform base domain when no custom domain exists', async () => {
    process.env.PLATFORM_BASE_DOMAIN = 'swekly.com'
    mocks.findTenant.mockResolvedValue({ slug: 'alpha', domains: [] })

    const service = new TelegramService()
    await service.sendOrderNotification('tenant-1', baseOrder)

    expect(mocks.sendMessage).toHaveBeenCalledTimes(1)
    const [, message] = mocks.sendMessage.mock.calls[0]
    expect(message).toContain('(https://alpha.swekly.com/admin/orders/order-12345678)')
  })

  it('falls back to localhost only when no public domain is configured', async () => {
    mocks.findTenant.mockResolvedValue({ slug: 'alpha', domains: [] })

    const service = new TelegramService()
    await service.sendOrderNotification('tenant-1', baseOrder)

    expect(mocks.sendMessage).toHaveBeenCalledTimes(1)
    const [, message] = mocks.sendMessage.mock.calls[0]
    expect(message).toContain('(http://alpha.localhost:3000/admin/orders/order-12345678)')
  })
})
