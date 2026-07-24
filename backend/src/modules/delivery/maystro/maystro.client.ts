import axios from 'axios'
import type { AxiosError, AxiosInstance } from 'axios'
import { MaystroIntegrationError, mapMaystroOrderErrorCode } from './maystro.errors'

const DEFAULT_BASE_URL = 'https://orders-management.maystro-delivery.com/api'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isRetryableAxiosError = (error: AxiosError) => {
    if (!error) return false
    if (!error.response) return true
    const status = error.response.status
    return status >= 500
}

const asMaystroOrderErrorCode = (data: any): number | null => {
    const candidates = [
        data?.error_code,
        data?.code,
        data?.errorCode,
        data?.error?.code,
        ...(Array.isArray(data?.errors) ? data.errors.map((e: any) => e?.code) : [])
    ]
    for (const c of candidates) {
        const n = typeof c === 'string' ? Number.parseInt(c, 10) : typeof c === 'number' ? c : NaN
        if (Number.isFinite(n)) return n
    }
    return null
}

export class MaystroClient {
    private http: AxiosInstance
    private apiTokenRaw: string

    constructor(input: { apiToken: string; baseURL?: string; timeoutMs?: number; http?: AxiosInstance }) {
        if (input.http) {
            this.http = input.http
            this.apiTokenRaw = input.apiToken
            return
        }

        const baseURL = input.baseURL || process.env.MAYSTRO_BASE_URL || DEFAULT_BASE_URL
        this.apiTokenRaw = input.apiToken
        this.http = axios.create({
            baseURL,
            headers: {
                // Maystro requires "Token <token>" scheme. Auto-prepend if no scheme given.
                Authorization: this.buildAuthHeader(input.apiToken),
                'Content-Type': 'application/json'
            },
            timeout: input.timeoutMs ?? 15_000,
            // Follow redirects automatically (e.g. /orders → /orders/)
            maxRedirects: 5
        })
    }

    private buildAuthHeader(token: string): string {
        const t = token.trim()
        if (this.hasAuthScheme(t)) return t
        return `Token ${t}`
    }

    private hasAuthScheme(token: string) {
        const t = token.trim().toLowerCase()
        return t.startsWith('bearer ') || t.startsWith('token ')
    }

    async request<T>(opts: {
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
        path: string
        params?: Record<string, any>
        data?: any
        responseType?: 'json' | 'arraybuffer'
    }): Promise<T> {
        const maxAttempts = 3
        let lastError: unknown

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const res = await this.http.request({
                    method: opts.method,
                    url: opts.path,
                    params: opts.params,
                    data: opts.data,
                    responseType: opts.responseType
                })
                return res.data as T
            } catch (err: any) {
                const error = err as AxiosError
                lastError = error

                const retryable = axios.isAxiosError(error) && isRetryableAxiosError(error)
                const isLast = attempt === maxAttempts - 1
                if (!retryable || isLast) break

                const backoffMs = 200 * Math.pow(2, attempt) + Math.floor(Math.random() * 100)
                await sleep(backoffMs)
            }
        }

        if (axios.isAxiosError(lastError)) {
            const status = lastError.response?.status ?? 502
            const data = lastError.response?.data
            const code = asMaystroOrderErrorCode(data)

            if (code != null) {
                const mapped = mapMaystroOrderErrorCode(code)
                throw new MaystroIntegrationError({
                    statusCode: mapped.statusCode,
                    statusMessage: mapped.statusMessage,
                    code: code as import('./maystro.errors').MaystroOrderErrorCode,
                    details: data
                })
            }

            if (status === 401) {
                throw new MaystroIntegrationError({
                    statusCode: 401,
                    statusMessage: 'Maystro: unauthorized (check api token)',
                    details: {
                        baseURL: this.http.defaults.baseURL,
                        path: opts.path,
                        method: opts.method,
                        response: data
                    }
                })
            }

            throw new MaystroIntegrationError({
                statusCode: status >= 400 && status <= 599 ? status : 502,
                statusMessage: 'Maystro request failed',
                details: data
            })
        }

        throw new MaystroIntegrationError({
            statusCode: 502,
            statusMessage: 'Maystro request failed',
            details: lastError
        })
    }
}
