import { describe, it, expect, afterAll, vi } from 'vitest'
import request from 'supertest'
import prisma from '../backend/src/lib/prisma'
import app from '../backend/src/app'
import { signAccessToken } from '../backend/src/lib/jwt'

let dbReady = true
try {
  await prisma.$queryRaw`SELECT 1`
} catch {
  dbReady = false
}

const suite = dbReady ? describe : describe.skip

suite('Telegram integration - detect chats', () => {
  const createdSlugs: string[] = []

  afterAll(async () => {
    if (!dbReady) return
    if (createdSlugs.length === 0) return
    await prisma.user.deleteMany({ where: { tenant: { slug: { in: createdSlugs } } } })
    await prisma.tenant.deleteMany({ where: { slug: { in: createdSlugs } } })
  })

  it('detects chats from Telegram updates and stays tenant-isolated', async () => {
    const slug1 = `tg-detect-${Date.now()}-a`
    const email1 = `owner-${slug1}@example.com`
    createdSlugs.push(slug1)

    const reg1 = await request(app)
      .post('/api/register')
      .set('X-Forwarded-Host', 'localhost:3000')
      .send({ name: 'Tenant A', slug: slug1, email: email1, password: 'password123' })
    expect(reg1.status).toBe(200)

    const user1 = await prisma.user.findFirst({ where: { email: email1 } })
    expect(user1?.id).toBeTruthy()
    const token1 = signAccessToken({ userId: user1!.id })

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
                message: {
                  date: 1710000000,
                  chat: { id: 111, type: 'private', first_name: 'Alice' }
                }
              },
              {
                update_id: 2,
                message: {
                  date: 1710000001,
                  chat: { id: -222, type: 'group', title: 'Orders Group' }
                }
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
      const detectRes = await request(app)
        .post('/api/admin/integrations/TELEGRAM/detect-chats')
        .set('X-Forwarded-Host', `${slug1}.localhost:3000`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ botToken: '123:ABC' })
      expect(detectRes.status).toBe(200)
      expect(detectRes.body.bot.username).toBe('my_bot')
      expect(Array.isArray(detectRes.body.chats)).toBe(true)
      expect(detectRes.body.chats.map((c: any) => c.chatId).sort()).toEqual(['-222', '111'])

      const slug2 = `tg-detect-${Date.now()}-b`
      const email2 = `owner-${slug2}@example.com`
      createdSlugs.push(slug2)

      const reg2 = await request(app)
        .post('/api/register')
        .set('X-Forwarded-Host', 'localhost:3000')
        .send({ name: 'Tenant B', slug: slug2, email: email2, password: 'password123' })
      expect(reg2.status).toBe(200)

      const forbidden = await request(app)
        .post('/api/admin/integrations/TELEGRAM/detect-chats')
        .set('X-Forwarded-Host', `${slug2}.localhost:3000`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ botToken: '123:ABC' })
      expect(forbidden.status).toBe(403)
    } finally {
      ;(globalThis as any).fetch = originalFetch
    }
  })
})
