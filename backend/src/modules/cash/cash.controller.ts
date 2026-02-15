import type { Request, Response } from 'express'
import { CashService, CashValidationError } from './cash.service'

const service = new CashService()

export class CashController {
    async listCashboxes(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            res.json(await service.listCashboxes(tenant.id))
        } catch (error) {
            console.error('List cashboxes error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async createCashbox(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const cashbox = await service.createCashbox(tenant.id, req.body)
            res.status(201).json(cashbox)
        } catch (error: any) {
            if (error instanceof CashValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Create cashbox error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async updateCashbox(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const updated = await service.updateCashbox(tenant.id, id, req.body)
            if (!updated) return res.status(404).json({ statusCode: 404, statusMessage: 'Cashbox not found' })
            res.json(updated)
        } catch (error: any) {
            if (error instanceof CashValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Update cashbox error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async openSession(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const session = await service.openSession(tenant.id, id, req.body, { userId: user?.id ?? null })
            res.status(201).json(session)
        } catch (error: any) {
            if (error instanceof CashValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Open cash session error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async closeSession(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const session = await service.closeSession(tenant.id, id, req.body, { userId: user?.id ?? null })
            res.json(session)
        } catch (error: any) {
            if (error instanceof CashValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Close cash session error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async listSessions(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { cashboxId, status, startDate, endDate } = req.query as {
                cashboxId?: string
                status?: string
                startDate?: string
                endDate?: string
            }
            const sessions = await service.listSessions(tenant.id, { cashboxId, status, startDate, endDate })
            res.json(sessions)
        } catch (error) {
            console.error('List cash sessions error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getSessionExpectedClosing(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const result = await service.getSessionExpectedClosing(tenant.id, id)
            res.json(result)
        } catch (error: any) {
            if (error instanceof CashValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Get expected closing error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async listTransactions(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { cashboxId, sessionId, type, direction, startDate, endDate } = req.query as {
                cashboxId?: string
                sessionId?: string
                type?: string
                direction?: string
                startDate?: string
                endDate?: string
            }
            const txs = await service.listTransactions(tenant.id, { cashboxId, sessionId, type, direction, startDate, endDate })
            res.json(txs)
        } catch (error) {
            console.error('List cash transactions error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async createTransaction(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const tx = await service.createTransaction(tenant.id, req.body, { userId: user?.id ?? null })
            res.status(201).json(tx)
        } catch (error: any) {
            if (error instanceof CashValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Create cash transaction error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async transfer(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const result = await service.transfer(tenant.id, req.body, { userId: user?.id ?? null })
            res.status(201).json(result)
        } catch (error: any) {
            if (error instanceof CashValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Cash transfer error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
