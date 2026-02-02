import type { CapacitorConfig } from '@capacitor/cli'

const appId = process.env.CAPACITOR_APP_ID ?? 'com.swekly.app'
const appName = process.env.CAPACITOR_APP_NAME ?? 'Swekly'

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: '.output/public',
  bundledWebRuntime: false,
  server: process.env.CAPACITOR_SERVER_URL
    ? {
        url: process.env.CAPACITOR_SERVER_URL,
        cleartext: process.env.CAPACITOR_CLEARTEXT === 'true'
      }
    : {
        hostname: process.env.CAPACITOR_HOSTNAME ?? 'app.local'
      }
}

export default config

