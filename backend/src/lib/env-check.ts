/**
 * Boot-time environment validation.
 *
 * Every secret listed here used to have a hardcoded fallback somewhere in the
 * source tree. That is how `ACTIVATION_PRIVATE_KEY` ended up with a working
 * RS256 private key committed to git: the code ran fine without the variable,
 * so nobody noticed it was missing until the key was already public.
 *
 * The fix is to make a missing secret impossible to ignore. This runs once, at
 * import time of `app.ts`, and takes the whole process down with a message that
 * says how to fix it -- rather than failing later, on one request, in a code
 * path nobody is watching.
 *
 * It reports *every* missing variable at once. Failing one at a time turns a
 * first-time setup into a guessing game.
 */

const GENERATE_KEYPAIR_HINT = [
    'Generate an activation keypair with:',
    '  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out activation-private.pem',
    '  openssl rsa -pubout -in activation-private.pem -out activation-public.pem',
    'Then set ACTIVATION_PRIVATE_KEY / ACTIVATION_PUBLIC_KEY to the file contents',
    '(newlines may be escaped as \\n -- both forms are accepted).'
].join('\n')

type RequiredVar = {
    name: string
    /** Why the process cannot start without it, shown in the error. */
    reason: string
    /** Extra setup guidance, appended once even if several vars share it. */
    hint?: string
}

const REQUIRED_VARS: RequiredVar[] = [
    {
        name: 'JWT_SECRET',
        reason: 'signs and verifies user access tokens'
    },
    {
        name: 'ACTIVATION_PRIVATE_KEY',
        reason: 'signs device activation licenses (RS256 private key, PEM)',
        hint: GENERATE_KEYPAIR_HINT
    },
    {
        name: 'ACTIVATION_PUBLIC_KEY',
        reason: 'verifies device activation licenses (RS256 public key, PEM)',
        hint: GENERATE_KEYPAIR_HINT
    }
]

export class MissingEnvironmentError extends Error {
    constructor(public readonly missing: string[], message: string) {
        super(message)
        this.name = 'MissingEnvironmentError'
    }
}

export const assertRequiredEnv = (env: NodeJS.ProcessEnv = process.env): void => {
    const missing = REQUIRED_VARS.filter((entry) => !env[entry.name]?.trim())

    if (missing.length === 0) return

    const lines = [
        `Missing required environment variable${missing.length > 1 ? 's' : ''}:`,
        ...missing.map((entry) => `  - ${entry.name}: ${entry.reason}`)
    ]

    // Dedupe hints -- the two activation keys share one.
    const hints = [...new Set(missing.map((entry) => entry.hint).filter(Boolean))]
    if (hints.length > 0) {
        lines.push('', ...hints as string[])
    }

    const names = missing.map((entry) => entry.name)
    throw new MissingEnvironmentError(names, lines.join('\n'))
}
