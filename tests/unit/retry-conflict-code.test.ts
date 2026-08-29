import { describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

import { RETRY_CONFLICT } from '../../backend/src/lib/conflict-codes'
import { InventoryValidationError } from '../../backend/src/modules/inventory/inventory.service'
import { PosValidationError } from '../../backend/src/modules/pos/pos.service'
import { InventoryController } from '../../backend/src/modules/inventory/inventory.controller'
import { PosController } from '../../backend/src/modules/pos/pos.controller'

/**
 * The Flutter admin's outbox classifies a bare 409 as a conflict a human has to
 * review, which is terminal: retrying cannot clear it. Optimistic-concurrency
 * failures are the opposite — the same payload succeeds on the next attempt —
 * so they carry `RETRY_CONFLICT`, and the client keys off it.
 *
 * These assert the code survives the HTTP boundary. Both controllers used to
 * answer with `{statusCode, statusMessage}` only, dropping it silently, which
 * is the exact regression that would put those writes back in the recovery list
 * with nothing to distinguish them.
 */
const mockResponse = () => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    }
  }
  return res as unknown as Response & { body: any; statusCode: number }
}

describe('RETRY_CONFLICT reaches the client', () => {
  it('is forwarded by the inventory controller', async () => {
    const controller = new InventoryController()
    const res = mockResponse()

    // Drive the real catch block by making the service throw the way the
    // optimistic update does.
    const service = (await import(
      '../../backend/src/modules/inventory/inventory.service'
    )) as any
    const spy = vi
      .spyOn(service.InventoryService.prototype, 'updateVariantInventory')
      .mockRejectedValue(
        new InventoryValidationError(
          409,
          'Variant was updated by another request, please retry',
          { code: RETRY_CONFLICT }
        )
      )

    const req = {
      tenant: { id: 'tenant-1' },
      user: { id: 'user-1' },
      params: { id: 'variant-1' },
      body: {}
    } as unknown as Request

    await controller.updateVariantInventory(req, res)
    spy.mockRestore()

    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe(RETRY_CONFLICT)
    expect(res.body.statusMessage).toContain('please retry')
  })

  it('is forwarded by the POS controller', async () => {
    const controller = new PosController()
    const res = mockResponse()

    const service = (await import(
      '../../backend/src/modules/pos/pos.service'
    )) as any
    const spy = vi
      .spyOn(service.PosService.prototype, 'createSale')
      .mockRejectedValue(
        new PosValidationError(409, 'Inventory conflict, please retry', {
          code: RETRY_CONFLICT
        })
      )

    const req = {
      tenant: { id: 'tenant-1' },
      user: { id: 'user-1' },
      get: () => undefined,
      body: { items: [] }
    } as unknown as Request

    await controller.createSale(req, res)
    spy.mockRestore()

    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe(RETRY_CONFLICT)
  })

  it('is absent from a conflict a human must resolve', () => {
    // A duplicate name is not replayable: the same payload fails the same way
    // forever, so it must NOT be tagged and must reach the user.
    const error = new PosValidationError(409, 'Insufficient stock for Mug')
    expect(error.code).toBeUndefined()
  })
})
