import type { Request, Response } from 'express'
import { FacebookPixelService } from './facebook-pixel.service'

const service = new FacebookPixelService()

const BOOTSTRAP =
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};` +
    `if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
    `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}` +
    `(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');`

const buildPixelScript = (pixelId: string | null) => {
    // Always bootstrap so product-specific pixels can use trackSingle/init later.
    if (!pixelId) return BOOTSTRAP
    return `${BOOTSTRAP}fbq('init','${pixelId}');`
}

export class FacebookPixelController {
    async script(req: Request, res: Response) {
        try {
            const tenant = req.tenant
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')
            res.setHeader('X-Content-Type-Options', 'nosniff')

            if (!tenant) return res.send('/* facebook pixel: tenant not resolved */')

            const pixelId = await service.getActivePixelId(tenant.id)
            res.send(buildPixelScript(pixelId))
        } catch (error) {
            console.error('Facebook pixel script error:', error)
            res.status(200).send(BOOTSTRAP)
        }
    }

    async config(req: Request, res: Response) {
        try {
            const tenant = req.tenant
            if (!tenant) return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })

            const pixelId = await service.getActivePixelId(tenant.id)
            res.setHeader('Cache-Control', 'no-store')
            res.json({ pixelId: pixelId ?? null })
        } catch (error) {
            console.error('Facebook pixel config error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
