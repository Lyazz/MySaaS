import Anthropic from '@anthropic-ai/sdk'
import { getAiSettings } from './platform-settings'
import { DEFAULT_AI_DOCUMENT_MODEL } from '../../../shared/ai/models'

/**
 * Lazily-built Anthropic client for AI document import.
 *
 * The API key is the one piece that stays in the environment: it is a
 * deployment secret, not an operator setting, and putting it in a table only
 * moves it somewhere a database dump can reach. Everything around it — the
 * on/off switch, the model, the page ceiling — is super-admin-editable and lives
 * in `platform-settings.ts`, which falls back to these same env vars.
 *
 * The key is deliberately NOT in `env-check.ts`'s required list: a deployment
 * without it boots fine and simply serves 503 on the AI routes, the same way
 * the WhatsApp scheduler no-ops without its integration rows.
 */

export { DEFAULT_AI_DOCUMENT_MODEL }
export { DEFAULT_AI_DOCUMENT_MAX_PAGES } from './platform-settings'

let client: Anthropic | null = null

/** True when the deployment carries a key at all, regardless of the switch. */
export const hasAnthropicKey = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY?.trim())

export const aiDocumentModel = async (): Promise<string> => (await getAiSettings()).model

export const aiDocumentMaxPages = async (): Promise<number> => (await getAiSettings()).maxPagesPerJob

/** True when a key is present *and* a super-admin has not switched the feature off. */
export const isAiEnabled = async (): Promise<boolean> =>
    hasAnthropicKey() && (await getAiSettings()).enabled

export class AiUnavailableError extends Error {
    statusCode = 503
    statusMessage = 'AI document import is not configured on this server'

    constructor() {
        super('AI document import is not configured on this server')
    }
}

export const getAnthropicClient = async (): Promise<Anthropic> => {
    if (!(await isAiEnabled())) throw new AiUnavailableError()
    if (!client) {
        client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY as string, maxRetries: 2 })
    }
    return client
}

/** Test seam: drops the memoized client so a new key/env takes effect. */
export const resetAnthropicClient = () => {
    client = null
}
