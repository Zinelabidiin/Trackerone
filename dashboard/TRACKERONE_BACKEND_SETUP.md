# TrackerOne Backend and Mobile Deployment Guide

## Scope

The dashboard now exposes a device registration endpoint and a token-authenticated telemetry endpoint for the TrackerOne mobile companion.

The public dashboard domain is:

`https://trackdash-hxav5snp.manus.space`

The mobile app uses these endpoints:

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/device/register` | POST | Consume an invitation token and register a phone. |
| `/api/device/telemetry` | POST | Store consented location, battery, and network status. |
| `/api/trpc/invitations.validate` | GET/POST through tRPC | Validate invitation links for the web registration page. |

## Database Setup

The latest schema includes the existing `users`, `devices`, and `invitations` tables, plus the following additions:

- `devices.authToken`: a unique token used by the registered mobile app.
- `deviceTelemetry`: timestamped location, battery, network, and device references.

Apply the generated migrations in order. The migration files are stored in `drizzle/` and should be applied through the project database migration workflow. Do not manually delete existing device records when applying later migrations.

## Environment Configuration

The dashboard server must have its normal built-in environment variables configured, including the database connection, session signing secret, OAuth values, and application URL. The mobile build uses:

```text
EXPO_PUBLIC_API_BASE_URL=https://trackdash-hxav5snp.manus.space
```

For a different deployment domain, update this value in `trackerone-mobile/eas.json` before building the application.

## Invitation and Registration Flow

The dashboard owner creates an invitation from **Ajouter un téléphone**. The server generates a random `nanoid` token and stores it with a seven-day expiration. The recipient opens `/invite/[token]` or pastes the invitation URL/token into the mobile app.

The mobile app posts the token, device name, and platform to `/api/device/register`. The server validates that the token exists, has not expired, and has not already been accepted. It then creates the device and returns a device authentication token. The mobile app stores that token in secure device storage.

## Telemetry Flow

The mobile app requests foreground location permission before the first sync. When the user taps **Synchroniser maintenant**, the app collects the current location, battery percentage, and network type, then sends them to `/api/device/telemetry` using the `x-device-token` header.

The server validates the token and payload, writes a record to `deviceTelemetry`, and updates the device status to `Synchronisé à l'instant`.

The current implementation is intentionally consent-first and foreground-only. Background location, call logs, messages, installed applications, and screen-time data require additional platform-specific permissions, app-store declarations, privacy disclosures, and dedicated native integrations. They should not be enabled without explicit user consent and legal review.

## Android Build

The mobile project is located at `/home/ubuntu/trackerone-mobile`. It contains an Expo configuration and an internal-distribution APK profile in `eas.json`.

To build an APK with Expo Application Services:

```bash
cd trackerone-mobile
export EXPO_PUBLIC_API_BASE_URL=https://trackdash-hxav5snp.manus.space
eas login
eas build --platform android --profile preview
```

The build requires an Expo account or an `EXPO_TOKEN` environment variable. The generated APK is downloaded from the Expo build result page after the build completes. This sandbox cannot authenticate to Expo without credentials, so the APK build must be run with the project owner’s Expo credentials.

## Production Checklist

Before distributing the APK, confirm that the dashboard domain is live, the database migration has been applied, invitation creation works for an authenticated owner, the registration endpoint returns a device token, and a telemetry request changes the device status in the dashboard.

For production security, add rate limiting to registration and telemetry endpoints, rotate device tokens, add request replay protection, record consent timestamps, and restrict telemetry retention. Configure an e-mail provider separately if invitations must be sent automatically rather than opened in the sender’s local mail client.

## Invitation-to-App Download Flow

Hosted invitation URLs now open an installation handoff page instead of immediately asking for device details in the browser. The page preserves the invitation token, offers a TrackerOne app deep link, and shows an Android APK download button when `VITE_ANDROID_DOWNLOAD_URL` is configured.

Configure the production environment with the URL of the published APK or Android distribution page:

```text
VITE_ANDROID_DOWNLOAD_URL=https://your-download-host.example/trackerone-mobile.apk
```

After installation, the recipient opens the original invitation link again or taps the app handoff button. Android launches `trackerone://invite/[token]`, and the mobile app restores the token in its registration screen. The app then registers the phone through `/api/device/register` and stores the returned device token securely.

Until `VITE_ANDROID_DOWNLOAD_URL` is configured, the hosted page intentionally shows an administrator notice rather than a broken download button. This prevents recipients from downloading an unknown or stale artifact.
