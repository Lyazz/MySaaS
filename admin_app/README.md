# admin_app

Flutter admin workspace for the multi-tenant SaaS platform. The app is
provisioned per tenant workspace and supports online, offline-only, and hybrid
sync operation modes.

## API base URL (Android + iOS)

`admin_app` currently uses:

- Mobile (Android/iOS): `http://192.168.1.4:3000/api`
- Desktop (macOS/Windows/Linux): `http://localhost:3000/api`

## Test Matrix

Run the main Flutter coverage locally from `admin_app/`:

- `flutter test`
- `flutter test integration_test/sync_integration_test.dart`

Golden baselines live under `test/goldens/`. Refresh them intentionally with:

- `flutter test --update-goldens`

## Windows Smoke

The Windows desktop target is checked into `windows/` and has a lightweight
smoke test in `test/windows_target_smoke_test.dart`.

On a Windows host, validate the target end to end with:

- `flutter test test/windows_target_smoke_test.dart`
- `flutter build windows --debug`

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
