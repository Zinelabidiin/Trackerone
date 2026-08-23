# My Trivia Hub

This repository contains the current **My Trivia Hub** source code in two independently runnable projects:

| Directory | Purpose | Primary stack |
|---|---|---|
| `dashboard/` | Admin dashboard, invitation flow, device telemetry ingestion, trivia bank, and Ask Mariah | React, TypeScript, Express, tRPC, Drizzle, MySQL-compatible database |
| `mobile/` | Expo companion application with invitation onboarding, trivia, score ladder, location flow, and Android-native source | Expo SDK 54, React Native, TypeScript |

## Current stable release baseline

The dashboard and Android invitation download target are restored to **My Trivia Hub 1.8.0**. The dashboard has administrator sign-in, device-scoped telemetry views, location history, calls, contacts, app-usage, notifications, a 152-question French trivia bank, and the constrained Ask Mariah follow-up feature.

The mobile app source is configured as version **1.8.0** and keeps the stable hostname `trackdash-hxav5snp.manus.space`. Android-specific capabilities are kept behind platform checks. The iOS companion source supports the shared trivia, invitation, and location experiences, but it intentionally does not implement Android-only call logs, contacts, notification-listener, app-usage, or call-screening integrations.

## Local setup

### Dashboard

Install dependencies and start the development server from `dashboard/`:

```bash
pnpm install
pnpm run dev
```

Run the dashboard checks with:

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run
```

The dashboard expects its production credentials, database connection, signing secret, and third-party keys to be supplied as environment variables. They are intentionally **not** included in this repository. Consult `dashboard/TRACKERONE_BACKEND_SETUP.md`, `dashboard/ADMIN_ACCESS_SETUP.md`, and the Drizzle schema/migrations before running against a production database.

### Mobile

Install dependencies and validate the mobile app from `mobile/`:

```bash
pnpm install
pnpm run typecheck
pnpm test
```

For Android development, use an Expo-compatible Android environment and follow the native plugin setup in `mobile/plugins/`. For iPhone internal testing, first configure an Apple Developer team, an ad hoc provisioning profile, and the target device in Expo. The step-by-step owner procedure is in `mobile/IOS_26_6_INSTALL.md`.

## Repository safety

This export excludes `.env` files, production API keys, database URLs, local logs, generated dependency folders, local mobile build folders, and binary APK/IPA artifacts. Add deployment secrets through your hosting platform or local secret manager; do not commit them.
