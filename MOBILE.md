# Mobile app (Capacitor)

This repo can be wrapped as a native mobile app using Capacitor (Android/iOS).

## Quick start

### 1) Install native tooling
- Android: Android Studio (SDK + emulator)
- Android (build): JDK 21 (Capacitor Android currently compiles with Java 21)
- iOS: Xcode (macOS only)

### 2) Install JS deps
```bash
npm install
```

### 3) Add a native platform (one-time)
```bash
npm run mobile:add:android
# or
npm run mobile:add:ios
```

### 4) Build + sync web assets into native projects
```bash
npm run mobile:sync
```

### 5) Run
```bash
npm run mobile:run:android
# or
npm run mobile:run:ios
```

## Android build requirements
- Ensure the Android SDK is configured (`ANDROID_HOME` or `android/local.properties` with `sdk.dir=...`).
- Ensure `JAVA_HOME` points to a JDK 21 installation when running Gradle builds.

## Tenancy note (Host header)
Tenant resolution is based on the HTTP Host header. In a Capacitor “bundled web assets” build, the app runs from an internal local web server.

Options:
- **Remote-hosted app (recommended for multi-tenant):** set `CAPACITOR_SERVER_URL` to a tenant domain and rebuild native.
  - Example: `CAPACITOR_SERVER_URL=https://tenant.platform.com npm run mobile:run:android`
- **Bundled assets for a single tenant:** map `CAPACITOR_HOSTNAME` (default `app.local`) as a custom domain for the tenant in your DB.

## Config knobs
- `CAPACITOR_APP_ID` (default `com.swekly.app`)
- `CAPACITOR_APP_NAME` (default `Swekly`)
- `CAPACITOR_SERVER_URL` (when set, the app loads that URL instead of bundled assets)
- `CAPACITOR_CLEARTEXT=true` (allow http URLs for Android dev)
- `CAPACITOR_HOSTNAME` (default `app.local`, used when bundled assets are served)
