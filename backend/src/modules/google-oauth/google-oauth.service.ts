import { google } from 'googleapis'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import prisma from '../../lib/prisma'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const STATE_TTL = '10m'

export class GoogleOAuthConfigurationError extends Error {
    statusCode = 503
    statusMessage = 'Google Sheets export is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.'
}

type GoogleOAuthState = {
    tenantId: string
    userId: string
    returnParams: string
    redirectUri: string
}

const ALLOWED_RETURN_PARAM_KEYS = new Set([
    'gsheet_columns',
    'gsheet_status',
    'gsheet_search',
    'gsheet_startDate',
    'gsheet_endDate',
])

function getStateSecret(): string {
    const secret = process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.JWT_SECRET
    if (!secret) {
        throw new Error('GOOGLE_OAUTH_STATE_SECRET or JWT_SECRET is required')
    }
    return secret
}

function createOAuth2Client(redirectUri?: string) {
    assertGoogleOAuthConfigured()
    return new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirectUri ?? process.env.GOOGLE_OAUTH_REDIRECT_URI
    )
}

export function assertGoogleOAuthConfigured(): void {
    if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
        throw new GoogleOAuthConfigurationError()
    }
}

export function getAuthUrl(state: string, redirectUri: string): string {
    const oauth2Client = createOAuth2Client(redirectUri)
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
        state,
    })
}

export function sanitizeGoogleReturnParams(raw: string | undefined): string {
    if (!raw) return ''

    const params = new URLSearchParams(raw)
    const safe = new URLSearchParams()
    for (const [key, value] of params.entries()) {
        if (ALLOWED_RETURN_PARAM_KEYS.has(key)) {
            safe.set(key, value)
        }
    }
    return safe.toString()
}

export function createGoogleOAuthState(input: GoogleOAuthState): string {
    return jwt.sign(input, getStateSecret(), {
        algorithm: 'HS256',
        expiresIn: STATE_TTL,
    })
}

export function verifyGoogleOAuthState(state: string): GoogleOAuthState | null {
    try {
        const decoded = jwt.verify(state, getStateSecret(), { algorithms: ['HS256'] }) as JwtPayload
        if (
            typeof decoded.tenantId !== 'string' ||
            typeof decoded.userId !== 'string' ||
            typeof decoded.returnParams !== 'string' ||
            typeof decoded.redirectUri !== 'string'
        ) {
            return null
        }

        return {
            tenantId: decoded.tenantId,
            userId: decoded.userId,
            returnParams: sanitizeGoogleReturnParams(decoded.returnParams),
            redirectUri: decoded.redirectUri,
        }
    } catch {
        return null
    }
}

export async function exchangeCodeForTokens(
    tenantId: string,
    userId: string,
    code: string,
    redirectUri: string
): Promise<void> {
    const oauth2Client = createOAuth2Client(redirectUri)
    const { tokens } = await oauth2Client.getToken(code)

    await prisma.googleOAuthToken.upsert({
        where: { tenantId_userId: { tenantId, userId } },
        create: {
            tenantId,
            userId,
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token ?? null,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
        update: {
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token ?? undefined,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
    })
}

export async function getValidAccessToken(tenantId: string, userId: string): Promise<string | null> {
    const record = await prisma.googleOAuthToken.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
    })

    if (!record) return null

    const isExpired = record.expiresAt && record.expiresAt < new Date()

    if (!isExpired) return record.accessToken

    if (!record.refreshToken) return null

    const oauth2Client = createOAuth2Client()
    oauth2Client.setCredentials({ refresh_token: record.refreshToken })

    const { credentials } = await oauth2Client.refreshAccessToken()

    await prisma.googleOAuthToken.update({
        where: { tenantId_userId: { tenantId, userId } },
        data: {
            accessToken: credentials.access_token!,
            expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
    })

    return credentials.access_token!
}

export async function createSheetAndWrite(
    accessToken: string,
    title: string,
    headers: string[],
    rows: string[][]
): Promise<string> {
    const oauth2Client = createOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

    const createRes = await sheets.spreadsheets.create({
        requestBody: {
            properties: { title },
            sheets: [{ properties: { title: 'Orders' } }],
        },
    })

    const spreadsheetId = createRes.data.spreadsheetId!
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`

    const values = [headers, ...rows]
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Orders!A1',
        valueInputOption: 'RAW',
        requestBody: { values },
    })

    // Bold header row
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    repeatCell: {
                        range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                        cell: {
                            userEnteredFormat: {
                                textFormat: { bold: true },
                                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                            },
                        },
                        fields: 'userEnteredFormat(textFormat,backgroundColor)',
                    },
                },
            ],
        },
    })

    return sheetUrl
}
