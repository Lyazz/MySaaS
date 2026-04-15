import { config } from '@vue/test-utils'

config.global.mocks = {
    ...(config.global.mocks || {}),
    $t: (key: string) => key
}

process.env.JWT_SECRET ||= 'test-jwt-secret'
process.env.TRUST_PROXY ||= 'true'
