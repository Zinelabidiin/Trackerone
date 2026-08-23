# My Trivia Hub 1.8.0 — iPhone installation guide

The iOS companion source is prepared and validated, but an installable IPA cannot be issued until the Expo account is connected to an **Apple Developer Program team** with a distribution certificate and an ad hoc provisioning profile. The current Expo account has no Apple teams configured, so the build service cannot sign the application yet.

> This companion keeps the My Trivia Hub name, invitation host, trivia flow, and approved location descriptions. Android-only call logs, contacts, notification-listener, usage-access, and call-screening features are intentionally unavailable on iPhone.

## One-time owner setup

| Step | What to do |
|---|---|
| 1 | Enrol in the paid Apple Developer Program, or ask the Apple team’s Account Holder to grant the Expo build account a suitable role. |
| 2 | In the mobile project folder, run `eas build --platform ios --profile preview` **interactively** and sign in to the Apple Developer account when requested. EAS can then create or use the distribution certificate and ad hoc provisioning profile. |
| 3 | Register the target iPhone before building. Run `eas device:create`, open the displayed registration link on that iPhone, and follow the on-screen enrollment steps. The phone must be included in the provisioning profile before it can install the IPA. |
| 4 | Run the preview build again. The `preview` profile is already configured as internal distribution, which produces an ad hoc iOS build link. |

## Install on the iPhone

After the build completes, open the Expo build link **in Safari on the enrolled iPhone**, select the install option, and accept the download/install prompts. Open **My Trivia Hub** from the Home Screen when installation completes.

If iOS reports that the app cannot be verified or installed, confirm that the phone was registered before the build was created. Then rebuild with the phone included in the ad hoc provisioning profile. If a device is added after a build is created, the older IPA cannot be installed on it.

## First test

Open the app, use an invitation link from the dashboard to connect the phone, and allow location only if the device owner chooses to do so. The iOS app can display trivia, score progress, invitation onboarding, and location-supported dashboard synchronization. It will not request or collect Android-specific native data.

## Important distribution limits

An ad hoc IPA installs only on iPhones added to its provisioning profile and requires a paid Apple Developer Program membership. Apple permits a limited number of registered test devices per membership year. For wider tester distribution, use TestFlight instead of sharing an IPA. [1] [2]

## References

[1]: https://docs.expo.dev/build/internal-distribution/ "Expo — Internal distribution"
[2]: https://docs.expo.dev/app-signing/app-credentials/ "Expo — App credentials"
