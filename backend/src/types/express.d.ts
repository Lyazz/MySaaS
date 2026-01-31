import type { Tenant, TenantSubscription, User } from '@prisma/client'

declare global {
    namespace Express {
        interface Request {
            tenant?: Tenant
            user?: User
            subscription?: TenantSubscription
        }
    }
}

export {}
