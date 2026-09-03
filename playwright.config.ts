import { defineConfig, devices } from '@playwright/test';

process.env.JWT_SECRET ||= 'test-jwt-secret'
process.env.TRUST_PROXY ||= 'true'
// The signup spec completes a real OTP round trip and has no inbox, so the dev
// server echoes the code back in the send response. `isDevEchoEnabled()` also
// requires a non-production NODE_ENV, so this cannot leak from here.
process.env.OTP_DEV_ECHO ||= 'true'
const port = process.env.PLAYWRIGHT_PORT || '3000'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === 'true' || (!process.env.CI && port === '3000')

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        },
    ],
    webServer: {
        command: `npm run dev:no-fork -- --port ${port}`,
        url: baseURL,
        reuseExistingServer,
    },
});
