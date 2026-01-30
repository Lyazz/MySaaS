import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
    test: {
        environment: 'nuxt',
        include: ['tests/unit/**/*.{test,spec}.ts', 'tests/*.test.ts', 'tests/api/**/*.{test,spec}.ts'],
        setupFiles: ['tests/setup.ts'],
        fileParallelism: false,
        hookTimeout: 300_000,
        testTimeout: 300_000
    }
})
