import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
    resolve: {
        alias: {
            // @nuxt/test-utils' single e2e bundle imports `bun:test` for its Bun
            // runner. Vite cannot bundle an unknown built-in, so the import took
            // down every suite that touches @nuxt/test-utils. See the stub.
            'bun:test': fileURLToPath(new URL('./tests/stubs/bun-test.ts', import.meta.url))
        }
    },
    test: {
        environment: 'nuxt',
        include: ['tests/unit/**/*.{test,spec}.ts', 'tests/*.test.ts', 'tests/api/**/*.{test,spec}.ts'],
        setupFiles: ['tests/setup.ts'],
        fileParallelism: false,
        hookTimeout: 300_000,
        testTimeout: 300_000
    }
})
