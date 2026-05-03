import { google } from 'googleapis'
import prisma from '../../lib/prisma'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

function createOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URI
    )
}

export function getAuthUrl(state: string): string {
    const oauth2Client = createOAuth2Client()
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
        state,
    })
}

export async function exchangeCodeForTokens(
    tenantId: string,
    userId: string,
    code: string
): Promise<void> {
    const oauth2Client = createOAuth2Client()
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
