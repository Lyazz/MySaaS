import axios from 'axios'
import type { AxiosError, AxiosInstance } from 'axios'
import { YalidineIntegrationError } from './yalidine.errors'

const DEFAULT_BASE_URL = 'https://api.yalidine.app/v1'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isRetryableAxiosError = (error: AxiosError) => {
    if (!error.response) return true
    if (error.response.status === 429) return true
    return error.response.status >= 500
}

export class YalidineClient {
    private http: AxiosInstance

    constructor(input: { apiId: string; apiToken: string; baseURL?: string; timeoutMs?: number; http?: AxiosInstance }) {
        if (input.http) {
            this.http = input.http
            return
        }

        const baseURL = input.baseURL || process.env.YALIDINE_BASE_URL || DEFAULT_BASE_URL
        this.http = axios.create({
            baseURL,
            headers: {
                'X-API-ID': input.apiId,
                'X-API-TOKEN': input.apiToken,
                'Content-Type': 'application/json'
            },
            timeout: input.timeoutMs ?? 15_000,
            maxRedirects: 5
        })
    }

    async request<T>(opts: {
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
        path: string
        params?: Record<string, any>
        data?: any
    }): Promise<T> {
        const maxAttempts = 3
        let lastError: unknown

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const res = await this.http.request({
                    method: opts.method,
                    url: opts.path,
                    params: opts.params,
                    data: opts.data
                })
                return res.data as T
            } catch (err: any) {
                const error = err as AxiosError
                lastError = error

                const retryable = axios.isAxiosError(error) && isRetryableAxiosError(error)
                const isLast = attempt === maxAttempts - 1
                if (!retryable || isLast) break

                const retryAfter = Number(error.response?.headers?.['retry-after'])
                const backoffMs = Number.isFinite(retryAfter)
                    ? retryAfter * 1000
                    : 200 * Math.pow(2, attempt) + Math.floor(Math.random() * 100)
                await sleep(backoffMs)
            }
        }

        if (axios.isAxiosError(lastError)) {
            const status = lastError.response?.status ?? 502
            const data = lastError.response?.data

            if (status === 401 || status === 403) {
                throw new YalidineIntegrationError({
                    statusCode: status,
                    statusMessage: 'Yalidine: unauthorized (check API ID/token)',
                    details: data
                })
            }

            if (status === 429) {
                throw new YalidineIntegrationError({
                    statusCode: 429,
                    statusMessage: 'Yalidine: rate limit exceeded',
                    details: data
                })
            }

            throw new YalidineIntegrationError({
                statusCode: status >= 400 && status <= 599 ? status : 502,
                statusMessage: 'Yalidine request failed',
                details: data
            })
        }

        throw new YalidineIntegrationError({
            statusCode: 502,
            statusMessage: 'Yalidine request failed',
            details: lastError
        })
    }
}

