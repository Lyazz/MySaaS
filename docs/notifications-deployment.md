# Admin Notifications Deployment

This app supports:

- Android, iOS, and macOS push notifications through Firebase Cloud Messaging.
- Windows/Linux desktop notifications while the Flutter admin app is running, through the backend SSE stream plus local OS notifications.

## Server Environment

Set these variables on the production server for `swekly.com`:

```bash
NODE_ENV=production
TRUST_PROXY=true
PLATFORM_BASE_DOMAIN=swekly.com
NUXT_PUBLIC_PLATFORM_BASE_DOMAIN=swekly.com
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

For Firebase push delivery, set one of these:

```bash
# Preferred for Docker/PaaS: one-line service account JSON.
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

or:

```bash
# File mounted on the server/container.
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase-service-account.json
```

`FIREBASE_PROJECT_ID` is optional and only useful when the hosting platform already provides Google credentials.

## Database Migration

The Docker image already runs:

```bash
prisma migrate deploy
```

on container startup. For non-Docker deploys, run:

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
node .output/server/index.mjs
```

## Flutter Firebase Files

Add Firebase app config files before building mobile/macOS releases:

- Android: `admin_app/android/app/google-services.json`
- iOS/macOS: `admin_app/ios/Runner/GoogleService-Info.plist` and `admin_app/macos/Runner/GoogleService-Info.plist`

Then rebuild the admin app:

```bash
cd admin_app
flutter pub get
flutter build apk --release
flutter build ios --release
flutter build macos --release
```

## Production Smoke Test

1. Deploy the backend and confirm migrations:

```bash
npx prisma migrate status
```

2. Log into the Flutter admin app for a tenant.

3. Create an order on the tenant storefront.

4. Confirm rows exist:

```sql
select "type", "entityId", "title", "createdAt"
from "NotificationEvent"
order by "createdAt" desc
limit 5;

select "channel", "status", "error", "sentAt"
from "NotificationDelivery"
order by "createdAt" desc
limit 10;
```

Expected:

- `IN_APP` deliveries are `SENT`.
- `FCM` deliveries are `SENT` if Firebase is configured correctly.
- If Firebase is missing, `FCM` deliveries are `SKIPPED`, and order creation still succeeds.
