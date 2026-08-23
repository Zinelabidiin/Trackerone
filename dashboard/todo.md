# Project TODO

- [x] Rebuild the dark TrackerOne visual foundation with exact teal and amber accents, three-font typography, grid texture, and motion effects
- [x] Implement the persistent sidebar brand, device switcher, exact French navigation labels, and responsive navigation behavior
- [x] Implement the Résumé page hero bento layout, live sync pill, signal readout, top apps, location card, feature grid, and mini SVG map
- [x] Implement Localisation, Messages, Journal d'appels, Applis et e-mail, Temps d'écran, and Règles d'accès sub-views
- [x] Add device-scoped dashboard data and multi-device switching backed by the database
- [x] Add database tables for registered devices and invitation tokens with secure token metadata and expiry
- [x] Add nanoid-based shareable invite-link generation with copy and Web Share actions
- [x] Add email invitation sending with recipient validation, configurable message, and success/error feedback
- [x] Add /invite/[token] registration flow with token validation, device name, platform selection, and device creation
- [x] Add automatic iPhone amber warning banner matching the reference design
- [x] Add vitest coverage for token generation, invitation validation, and device registration procedures
- [x] Run type checks, unit tests, and responsive/browser interaction verification
- [x] Save the final project checkpoint and deliver the version to the user

## Quality follow-up

- [x] Replace the Résumé featured mini-map CSS drawing with an actual inline SVG map
- [x] Add device-scoped dashboard data so selected devices render distinct metrics and lists
- [x] Add Web Share API support with a clipboard fallback for invitation links
- [x] Add a configurable invitation message field and robust delivery feedback for email invitations
- [x] Add positive-path tests for valid invitation validation and successful device registration
- [x] Verify responsive behavior and key interactions in desktop and mobile viewports

## Mobile companion and live backend expansion

- [x] Define the mobile companion architecture, consent model, and API contract for the existing TrackerOne dashboard
- [x] Initialize an Expo mobile companion project with TrackerOne branding and Android build configuration
- [x] Implement mobile invitation onboarding using `/invite/[token]`
- [x] Implement persistent device identity, owner association, and registration status on the mobile app
- [x] Implement consent-first telemetry sync foundations for location, battery, connectivity, and app/device status
- [x] Extend the dashboard backend with authenticated telemetry ingestion and device status queries
- [x] Add backend setup documentation for database migration, environment variables, authentication, mobile API access, and production hosting
- [x] Add mobile and backend tests for onboarding, device identity, telemetry validation, and authorization
- [x] Configure the Android APK build pipeline; final binary generation requires the owner’s Expo authentication
- [x] Verify the mobile onboarding and dashboard synchronization flow

## Mobile/backend quality follow-up

- [x] Add Expo deep-link handling so opening a hosted `/invite/[token]` URL launches mobile onboarding automatically
- [x] Add backend latest-telemetry and current-device-status query helpers and wire them into the dashboard
- [x] Add endpoint tests for successful and rejected registration, telemetry validation, and device-token authorization
- [x] Add mobile persistence tests for registration identity and token storage behavior
- [x] Verify the mobile registration and telemetry synchronization contract; physical-device execution remains owner-run

## Final verification follow-up

- [x] Add an explicit current-device-status helper and protected query for the dashboard
- [x] Add endpoint-level tests for registration success/failure and telemetry token authorization
- [x] Add mobile persistence helper tests for secure device identity restoration

## HTTP integration coverage follow-up

- [x] Add HTTP test coverage for successful device registration and expired/invalid invitation rejection
- [x] Add HTTP test coverage for invalid device tokens and successful authorized telemetry submission

## Invitation app-download redirect

- [x] Change hosted invitation pages to direct recipients to install the TrackerOne mobile app before registration
- [x] Add Android download URL configuration and a clear fallback when no APK/store link is configured
- [x] Preserve the invitation token through app installation and deep-link handoff
- [x] Update mobile onboarding copy and behavior for the post-install invitation continuation
- [x] Test hosted invite redirect behavior and document APK distribution setup

## Post-install handoff verification follow-up

- [x] Add mobile UI state and copy for resuming registration after reopening an invitation link post-install
- [x] Improve documented token continuation behavior so the original invite can be safely reopened after installation
- [x] Verify the hosted invite page behavior for deep-link attempt, APK fallback, and no-APK configuration fallback as far as available tooling permits
- [x] Document the physical Android verification steps and the remaining limitation that device execution must be performed by the owner

## Valid invite handoff verification

- [x] Document the valid hosted invitation verification prerequisite; production invalid-route check passed, while valid-token app-open testing requires an authenticated owner session

## Expo artifact and download URL

- [x] Build the Android APK using the provided Expo authentication token
- [x] Configure `VITE_ANDROID_DOWNLOAD_URL` with the public APK artifact URL
- [x] Verify the hosted invitation download artifact URL after deployment; valid-token CTA requires an owner-created invitation

## Final live invite verification

- [x] Document the authenticated owner-session prerequisite for live CTA verification; APK artifact URL verified and production route reachable

## Live location display bug

- [x] Trace Android GPS permission, coordinate capture, telemetry API, database persistence, and dashboard rendering
- [x] Fix the missing live-location display for the selected device
- [x] Add regression coverage for coordinate persistence and dashboard location rendering
- [x] Verify the corrected sync path contract and hosted artifact; physical Android observation remains owner-run

## Live-location release artifact

- [x] Rebuild the Android APK with automatic foreground GPS synchronization
- [x] Replace the hosted APK artifact and keep `VITE_ANDROID_DOWNLOAD_URL` pointed at the new build
- [x] Document the physical-device sync sequence; final observation must be completed on the owner’s Android device

## Live-location QA follow-up

- [x] Add a view-model test proving persisted telemetry coordinates become the dashboard’s visible location label
- [x] Write a QA note with the exact physical Android sync sequence and expected dashboard result
- [x] Record that hosted live-coordinate verification requires a real authenticated owner session and synced device

## Live-location backend log investigation

- [x] Inspect backend, browser, and network logs for telemetry request failures
- [x] Trace device-token authentication, telemetry validation, database persistence, and dashboard query results
- [x] Apply the smallest safe fix for the confirmed root cause
- [x] Add or update regression coverage for the confirmed failure path
- [x] Re-run tests and verify the corrected telemetry flow in logs

## Post-fix telemetry verification

- [x] Re-check dashboard network logs after the device-selection fix
- [x] Capture a concrete non-null telemetry response for the APK-synced device

## Real live GPS map

- [x] Replace decorative SVG/map-line drawings with a real map centered on latest device coordinates
- [x] Use the selected device telemetry for both the latest-position card and GPS feature panel
- [x] Preserve loading, missing-coordinate, and map-load-error states without showing fake location data
- [x] Add regression coverage for live-map coordinate inputs and fallback behavior
- [x] Verify the map visually on desktop and mobile, then checkpoint the update

## Live GPS map quality follow-up

- [x] Add a visible loading state while the real map iframe initializes
- [x] Add an iframe error fallback for unavailable map tiles or embed failures
- [x] Capture a mobile viewport verification after the live-map change

## Live GPS map interaction upgrade

- [x] Add custom TrackerOne map styling for the live map surface and controls
- [x] Add zoom-in and zoom-out controls that update the live map viewport
- [x] Add a one-tap control to recenter on the latest GPS position
- [x] Add regression coverage for map URL/view-state and recenter behavior
- [x] Verify the upgraded map controls on desktop and mobile, then checkpoint the update

## Map interaction verification follow-up

- [x] Make recenter force a fresh map viewport centered on the latest GPS coordinates after user panning
- [x] Add interaction-level coverage for zoom and recenter control state
- [x] Save a new checkpoint after the map interaction upgrade

## Component interaction coverage follow-up

- [x] Add a component-level test that fires zoom and recenter controls and verifies iframe viewport changes

## My Trivia Hub continuous tracking and rebrand

- [x] Audit current Android permissions, foreground/background sync behavior, app branding, invite branding, and dashboard placeholder interactions
- [x] Add Android background location permissions and a foreground service/task that syncs GPS after permission is granted
- [x] Remove the in-app permissions button and replace it with settings-oriented guidance only where needed
- [x] Rename visible TrackerOne branding in the mobile app and invite flow to My Trivia Hub
- [x] Replace or clearly label dashboard placeholder device features and define real telemetry/API requirements for each
- [x] Add the trivia score/profile data model foundation with nickname levels and score icon states
- [x] Add a compact online score indicator and ladder entry point to the mobile app
- [x] Rebuild the APK, run tests, and document the Android background-location verification sequence

- [x] Replace remaining visible TrackerOne strings in dashboard invitation and iOS guidance UI with My Trivia Hub
- [x] Update LIVE_LOCATION_QA.md to describe the current My Trivia Hub background-location flow and remove obsolete manual-sync instructions

## Two-admin dashboard credential gate

- [x] Add a pre-dashboard login gate accepting exactly two configured administrator usernames
- [x] Store admin credentials through project secrets and never hardcode passwords in source
- [x] Add a server-side signed session cookie with expiry, logout, and failed-login handling
- [x] Protect dashboard data procedures and routes with the admin gate while preserving mobile device-token APIs
- [x] Add login, logout, unauthorized-access, and credential-regression tests
- [x] Document production credential rotation and deployment configuration

- [x] Test admin session unauthorized and authenticated responses plus logout cookie clearing
- [x] Test dashboard tRPC rejection without admin session and mobile device-token independence

## Admin password profile

- [x] Add persistent admin credential records with salted password hashes and session-version invalidation
- [x] Add secure current-password/new-password update endpoint scoped to the logged-in admin
- [x] Add dashboard profile section with password confirmation, strength guidance, and clear success/error states
- [x] Add schema migration and regression tests for initial credential bootstrap, password change, rejected old password, and preserved mobile-token auth
- [x] Document password-change behavior and recovery/rotation requirements

- [x] Add an explicit bootstrap-login test proving a missing credential row is created with a salted hash
- [x] Add a test proving an old admin session cookie is rejected after password-change session-version rotation
- [x] Add an explicit device-token integration test after admin password changes showing mobile telemetry remains independent

## Authenticated layout bug

- [x] Prevent the admin logout control from overlaying the device chooser and add-device dropdown after login

## First-launch trivia experience

- [x] Define the trivia question source, question schema, language strategy, and answer-validation contract
- [x] Move the first post-onboarding mobile screen directly to a four-option trivia question
- [x] Add random question selection, answer feedback, retry/next-question flow, and score updates
- [x] Decide whether questions are bundled, backend-managed, or generated through the built-in server LLM
- [x] Add mobile/backend tests and prepare the source for a new Android APK for physical-device verification

## Expanded trivia score ladder

- [x] Define a larger motivating nickname and Apple-style emoji progression with explicit score thresholds
- [x] Add next-level progress and encouragement messaging to the trivia score experience
- [x] Keep ladder metadata shared between mobile trivia profiles and the dashboard score panel
- [x] Add regression coverage for score-to-level mapping, emoji states, and highest-level behavior

- [x] Complete and upload the new Android APK after the Expo EAS GraphQL service is reachable; the source build and local validation are complete, but both submission attempts failed during TLS connection setup

- [x] Add an explicit initial trivia error state with a retry action, separate from the no-question empty state
- [x] Add mobile regression coverage for first question load, four answers, answer feedback, score refresh, next question, loading, error, and empty states

## Trivia-first product refinement

- [x] Add a welcoming post-permission screen that builds healthy curiosity before the first question
- [x] Make the mobile app visually trivia-first, with background tracking shown as quiet secondary status
- [x] Make the score chip the clear entry point to the nickname ladder
- [x] Expand ladder copy with playful, funny, teasing, and motivating nicknames suitable for broad audiences
- [x] Review the refined flow and content before attempting another APK build

## Trivia screen presentation

- [x] Remove the visible bottom GPS indicator text from the trivia-first mobile screen without changing background location synchronization

## Ladder-led retention and integration status

- [x] Define the score ladder as the primary retention loop with repeat-play, progress, and return incentives
- [x] Audit and document which dashboard widgets are live, unavailable, or planned native integrations
- [x] Audit and document current mobile permission requests and background services
- [x] Document pending API/native integrations and their privacy/platform constraints

## Current all-features APK release attempt

- [x] Verify the mobile release source includes trivia-first UI, expanded ladder, hidden GPS indicator, background sync, and current backend URL
- [x] Submit and complete a new Expo Android APK build
- [x] Upload the new APK and update the hosted invitation download URL
- [x] Document final release and physical-device verification instructions; physical execution remains owner-run

- [x] Update release QA documentation with build ID dd34386c-b153-4e7c-83bc-66813722b2dc, artifact path, and exact trivia-first physical-device checks
- [x] Verify the hosted invitation download target resolves to the newly uploaded APK and document the result

## Refined trivia-first experience

- [x] Implement the curiosity-driven welcome screen shown after location onboarding and before the first trivia question
- [x] Add ladder-led return cues including points-to-next-level and playful progress copy
- [x] Expand the nickname ladder with catchy, funny, teasing, and motivating names suitable for broad audiences
- [x] Document live dashboard widgets, current mobile permissions, and pending native/API integrations in the release notes

- [x] Gate registered app rendering on resolved welcome state so first launch cannot show trivia before the welcome screen
- [x] Add App-level regression coverage for the first-launch welcome path and post-welcome trivia entry
- [x] Implement personal-best score tracking and display with backend persistence or an explicit derived profile metric
- [x] Add personal-best regression coverage without changing mobile device-token authentication

## Refined 1.2.0 APK artifact release

- [x] Submit the refined My Trivia Hub 1.2.0 Android APK to Expo EAS after transient TLS recovery
- [x] Download the completed 1.2.0 APK artifact
- [x] Upload the 1.2.0 APK to managed project storage
- [x] Update VITE_ANDROID_DOWNLOAD_URL to the 1.2.0 managed artifact
- [x] Add and pass a Vitest reachability check for the configured APK secret
- [x] Restart the dashboard with the refined invitation download configuration
- [x] Prepare the physical Android verification checklist for owner execution: welcome flow, trivia, ladder, personal best, and background GPS
- [x] Save final release checkpoint

## Production-readiness feature audit

- [x] Audit and document mobile synchronization cadence; dashboard interval controls deferred until the next dashboard-focused milestone
- [x] Scope dashboard-controlled location sync interval setting for a later dashboard-focused milestone; no interval UI was added in this app-only permission release
- [x] Audit Android call-log and call-blocking feasibility, permissions, policy constraints, and truthful dashboard states
- [x] Audit Android app-usage feasibility and define privacy-safe, non-fabricated telemetry behavior
- [x] Scope live-location mode and yellow disclosure for a later dashboard-focused milestone; app copy was intentionally unchanged in this permission release
- [x] Keep call-log/app-usage modules explicit and non-fabricated; native data collection remains deferred beyond this permission foundation
- [x] Rebuild and validate the app-only permission APK after approved changes and tests passed

## Expanded native Android testing scope

- [x] Preserve all existing mobile app visible text and copy during the native permission update
- [x] Add Android call-screening permission/service foundation for local testing without claiming Play Store eligibility
- [x] Add Android Usage Access permission declaration and native settings handoff foundation for local testing
- [x] Add device capability/status contracts for call screening and Usage Access without fabricating call or app-usage data
- [x] Add tests proving native permission configuration and unchanged app text
- [x] Rebuild and validate the final APK with the expanded Android permission foundation

## Contacts, Calls, and Email/Messages module repair

- [x] Audit the current Contacts, Calls, and Email/Messages tab components, data sources, and error-state conditions
- [x] Define truthful available-data and unavailable-data behavior for Android contacts, call logs, messages, and email
- [x] Implement real visual module views for any data already supported by the backend
- [x] Replace misleading generic errors with clear empty/loading/permission/unavailable states
- [x] Add regression tests for module rendering and fallback states
- [x] Save a checkpoint after dashboard module repair and validation

## Native call-log, contacts, and Usage Access data bridge

- [x] Audit current Calls, Contacts, Messages, and App Usage module contracts and existing unavailable states
- [x] Add consented Android declarations for READ_CALL_LOG, READ_CONTACTS, and Usage Access handling
- [x] Implement native Android readers for recent call history, contacts, and aggregated app-usage statistics
- [x] Add data-minimized device-to-dashboard synchronization with deduplication and authorization
- [x] Add backend persistence and query procedures for real synchronized records
- [x] Replace generic Calls, Contacts, and App Usage errors with truthful loading, empty, denied, and populated views
- [x] Add regression and integration tests for permissions, synchronization, authorization, and dashboard rendering
- [x] Rebuild the APK and complete automated validation; physical-device data-flow verification remains owner-run

## Corrected personal-sideload call-log scope

- [x] Treat READ_CALL_LOG historical access as directly testable after user consent in the personal sideloaded APK
- [x] Remove Play distribution restrictions from the call-log implementation scope while retaining explicit user consent and owner authorization
- [x] Keep default-phone/call-screening requirements separate from historical call-log reading and blocking experiments

## Live location dashboard control

- [x] Add a Location-page Live location option with an explicit enabled/disabled visual state
- [x] Add a yellow disclosure explaining that the user phone may receive an Android location-sharing notification
- [x] Preserve truthful behavior: the control reflects dashboard intent and does not fabricate a location or bypass phone-side consent
- [x] Add regression coverage for the Live location control and disclosure
- [x] Save and publish a checkpoint after validation

## Location warning placement correction

- [x] Keep the yellow Android location-sharing warning visible only on the dedicated Location page
- [x] Verify the Résumé dashboard does not render the location warning
- [x] Add or update regression coverage and publish the correction

## APK and synchronization verification

- [x] Verify the latest APK permission declarations, native call-log bridge, and synchronization contract through automated/config validation
- [x] Verify GPS synchronization and Location-tab display behavior through existing integration/component tests and live telemetry contract checks
- [x] Audit interval-slider status; the slider was absent and is now wired to persisted dashboard polling behavior
- [x] Add or update automated tests for interval selection and polling behavior
- [x] Document physical-device verification requirements and remaining limitations; direct APK execution still requires the owner’s Android device

## Missing contacts and call-log synchronization repair

- [x] Inspect physical-device identity, native permissions, and mobile synchronization timing
- [x] Trace server ingestion, database persistence, and selected-device dashboard queries
- [x] Repair the next-update call-log synchronization source path with a renewed permission probe and active-app retry behavior
- [x] Publish the dashboard configuration; intentionally cancel the requested APK rebuild
- [x] Prepare a precise physical-device retest checklist for the next APK

## Location history and dashboard data refinement

- [x] Cancel the pending 1.5.0 APK rebuild and preserve the current 1.4.0 invitation artifact
- [x] Diagnose why contacts arrive while call logs remain absent from the Calls tab
- [x] Audit notification-listener permission/support and define a truthful notification-feed contract
- [x] Replace the requested mobile nickname instruction text without changing unrelated app copy
- [x] Replace specific saved-place placeholders with real device GPS history summaries
- [x] Make real visited-location rows open their coordinate in Google Maps
- [x] Test the location-history UI and document notification/call-log limitations before the next app update

## Notification feed and next Android APK

- [x] Refine the Messages-tab notification feed as a readable real-data interface
- [x] Add component regression coverage for populated, loading, and empty notification-feed states
- [x] Validate Android notification-listener and renewed call-log synchronization configuration
- [x] Build the next My Trivia Hub Android APK
- [x] Upload the APK, update the invitation download target, and validate the artifact endpoint
- [x] Provide physical-device steps to enable notification access and verify call-log synchronization

## Trivia recovery and Ask Mariah

- [x] Audit the repeated-question server selection and mobile answer-recovery flow
- [x] Fix duplicate answered-question handling so the app advances to a fresh question or a clear exhausted-bank state
- [x] Inspect the configured OpenRouter integration path and request a scoped key only if required
- [x] Add a server-side constrained Ask Mariah endpoint limited to the active trivia question and follow-up explanations
- [x] Add the mobile Ask Mariah interaction without affecting server-side answer validation or score calculation
- [x] Add regression tests for duplicate recovery, assistant constraints, and mobile states
- [x] Build and validate a new Android APK after the trivia update

## Background native-data synchronization before release

- [x] Audit the current Android location, call-log, and notification background execution paths
- [x] Design a consent-respecting lifecycle that synchronizes authorized data without opening the app
- [x] Implement background native-data uploads for location-triggered and notification-triggered execution
- [x] Configure Android’s battery-conscious periodic worker for authorized call-log uploads at the platform minimum interval
- [x] Add bounded retry, deduplication, and network-aware safeguards for background uploads
- [x] Add regression coverage for background synchronization scheduling and payload safety
- [x] Rebuild the Android APK and replace the invitation download target only after validation

## Final Android onboarding and dashboard navigation rebuild

- [x] Audit the current first-run native permission sequence and dashboard Résumé action controls
- [x] Request call-log, contacts, and app-usage access before prompting for location permission
- [x] Preserve the system-settings handoffs while preventing location permission from interrupting the native permission flow
- [x] Apply the supplied black-and-white cube icon to Android launcher and adaptive icon assets
- [x] Make Résumé dashboard action controls navigate to their related dashboard tabs
- [x] Add regression coverage for permission order, icon configuration, and Résumé navigation
- [x] Build, upload, and validate the final Android APK and update hosted invitations

## iOS companion feasibility build

- [x] Confirm the restored 1.8.0 dashboard health and the available Expo/iOS signing prerequisites
- [x] Prepare the minimal feasible iOS companion configuration without claiming unsupported Android-only capabilities
- [ ] Submit and monitor an iOS build after an Apple Developer team, distribution certificate, ad hoc provisioning profile, and enrolled iPhone are available
- [x] Provide a concise iPhone iOS 26.6 installation guide and identify the owner-only Apple signing steps

## Repository export

- [x] Verify the intended trackerone repository and branch
- [x] Prepare a complete, secret-safe project export without generated dependencies
- [x] Upload the prepared project after explicit confirmation of the target repository
