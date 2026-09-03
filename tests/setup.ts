import { generateKeyPairSync } from 'node:crypto'

import { config } from '@vue/test-utils'

config.global.mocks = {
    ...(config.global.mocks || {}),
    $t: (key: string) => key
}

process.env.JWT_SECRET ||= 'test-jwt-secret'
process.env.TRUST_PROXY ||= 'true'

// Self-serve registration is gated in real deployments: `REGISTRATIONS_OPEN`
// closes signups outright and `REGISTER_PHONE_LOCK_ENABLED` narrows them to one
// whitelisted phone number. Both are go-live switches, not behaviour the suite
// should inherit from whichever .env the machine happens to have — a developer
// with the lock on saw every e2e suite that registers a tenant fail with 403.
// A test that wants to exercise a gate sets it for itself.
process.env.REGISTRATIONS_OPEN = 'true'
process.env.REGISTER_PHONE_LOCK_ENABLED = 'false'

// Signup now demands a verified email or phone. The suite has no inbox and no
// SMS gateway, so it registers with the gate off -- exactly as it does for the
// phone lock above. `tests/api/account-verification.test.ts` turns it back on
// for the cases that are about the gate itself.
process.env.REGISTER_REQUIRE_VERIFICATION = 'false'

// Activation licenses are RS256-signed and `assertRequiredEnv()` refuses to boot
// without a keypair. Generate an ephemeral one per test worker rather than
// committing a fixture: a checked-in test key is exactly the mistake that put a
// real private key in this repo's history. The guard keeps it to one generation
// per worker, since env vars persist across sequential test files.
if (!process.env.ACTIVATION_PRIVATE_KEY || !process.env.ACTIVATION_PUBLIC_KEY) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' }
    })

    process.env.ACTIVATION_PRIVATE_KEY = privateKey
    process.env.ACTIVATION_PUBLIC_KEY = publicKey
}
