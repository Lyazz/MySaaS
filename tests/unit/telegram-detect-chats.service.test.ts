import { describe, it, expect, vi } from 'vitest'
import { TelegramService } from '../../backend/src/modules/integrations/telegram.service'

describe('TelegramService.detectChats', () => {
  it('returns unique chats with string chatId and bot info', async () => {
    const fetchMock = vi.fn(async (input: any) => {
      const url = String(input)
      if (url.includes('/getMe')) {
        return {
          json: async () => ({
            ok: true,
            result: { id: 123, is_bot: true, first_name: 'MyBot', username: 'my_bot' }
          })
        } as any
      }
      if (url.includes('/getUpdates')) {
        return {
          json: async () => ({
            ok: true,
            result: [
              {
                update_id: 1,
                message: { date: 1710000000, chat: { id: 111, type: 'private', first_name: 'Alice' } }
              },
              {
                update_id: 2,
                message: { date: 1710000005, chat: { id: 111, type: 'private', first_name: 'Alice' } }
              },
              {
                update_id: 3,
                message: { date: 1710000001, chat: { id: -222, type: 'group', title: 'Orders Group' } }
              }
            ]
          })
        } as any
      }
      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    const originalFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock as any
    try {
      const service = new TelegramService()
      const result = await service.detectChats('123:ABC', { limit: 50 })

      expect(result.bot).toEqual({ id: '123', username: 'my_bot', name: 'MyBot' })
      expect(result.chats.map((c) => c.chatId).sort()).toEqual(['-222', '111'])
      expect(result.chats[0]?.chatId).toBe('111')
    } finally {
      ;(globalThis as any).fetch = originalFetch
    }
  })
})

