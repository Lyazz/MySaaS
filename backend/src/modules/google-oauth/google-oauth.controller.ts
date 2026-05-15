import type { Request, Response } from 'express'
import {
    getAuthUrl,
    exchangeCodeForTokens,
    getValidAccessToken,
    createSheetAndWrite,
    createGoogleOAuthState,
    GoogleOAuthConfigurationError,
    sanitizeGoogleReturnParams,
    verifyGoogleOAuthState,
} from './google-oauth.service'
import {
    fetchForExport,
    toRows,
    DEFAULT_COLUMNS,
    EXPORT_COLUMNS,
} from '../orders/orders-export.service'

function getRequestOrigin(req: Request): string {
    const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0]?.trim()
    const proto = forwardedProto || req.protocol || 'http'
    const forwardedHost = String(req.get('x-forwarded-host') || '').split(',')[0]?.trim()
    const host = forwardedHost || req.get('host') || 'localhost:3000'
    return `${proto}://${host}`
}

function getGoogleRedirectUri(req: Request): string {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI || `${getRequestOrigin(req)}/api/admin/orders/export/google-callback`
}

export class GoogleOAuthController {
    async getAuthUrl(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user!
            const { returnParams } = req.query as { returnParams?: string }
            const redirectUri = getGoogleRedirectUri(req)

            const state = createGoogleOAuthState({
                tenantId: tenant.id,
                userId: user.id,
                returnParams: sanitizeGoogleReturnParams(returnParams),
                redirectUri,
            })

            const url = getAuthUrl(state, redirectUri)
            return res.json({ url })
        } catch (error) {
            if (error instanceof GoogleOAuthConfigurationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                })
            }
            console.error('Google OAuth getAuthUrl error:', error)
            return res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async handleCallback(req: Request, res: Response) {
        try {
            const { code, state, error } = req.query as Record<string, string>

            if (error) {
                return res.redirect(`/admin/orders?gauth=error&reason=${encodeURIComponent(error)}`)
            }

            if (!code || !state) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Missing code or state' })
            }

            const decoded = verifyGoogleOAuthState(state)
            if (!decoded) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid state' })
            }

            await exchangeCodeForTokens(decoded.tenantId, decoded.userId, code, decoded.redirectUri)

            const params = new URLSearchParams(decoded.returnParams)
            params.set('gauth', 'success')
            const redirect = `/admin/orders?${params.toString()}`
            return res.redirect(redirect)
        } catch (error) {
            console.error('Google OAuth callback error:', error)
            return res.redirect('/admin/orders?gauth=error&reason=token_exchange_failed')
        }
    }

    async exportToSheet(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user!
            const { columns, status, search, startDate, endDate } = req.query as Record<string, string>

            const selectedColumns = columns
                ? columns.split(',').map(c => c.trim()).filter(c => EXPORT_COLUMNS.some(ec => ec.key === c))
                : DEFAULT_COLUMNS

            if (selectedColumns.length === 0) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'No valid columns specified' })
            }

            const accessToken = await getValidAccessToken(tenant.id, user.id)
            if (!accessToken) {
                return res.status(401).json({
                    statusCode: 401,
                    statusMessage: 'Google account not connected. Please authorize via /api/admin/orders/export/google-auth-url',
                })
            }

            const { orders, truncated } = await fetchForExport(
                tenant.id,
                { status, search, startDate, endDate },
                selectedColumns
            )

            const headers = selectedColumns.map(k => EXPORT_COLUMNS.find(c => c.key === k)!.label)
            const rows = toRows(orders, selectedColumns)

            const title = `Orders Export — ${tenant.name ?? tenant.id} — ${new Date().toISOString().split('T')[0]}`
            const sheetUrl = await createSheetAndWrite(accessToken, title, headers, rows)

            if (truncated) {
                res.setHeader('X-Export-Truncated', 'true')
            }

            return res.json({ sheetUrl })
        } catch (error) {
            if (error instanceof GoogleOAuthConfigurationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                })
            }
            console.error('Google Sheets export error:', error)
            return res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
