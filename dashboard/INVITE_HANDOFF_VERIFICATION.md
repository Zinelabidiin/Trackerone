# Invitation Handoff Verification

The hosted route `https://trackdash-hxav5snp.manus.space/invite/test-token` was opened successfully and rendered the expected invalid-token state: “Lien indisponible” with a return-to-dashboard action. This confirms that the production route is reachable and the invitation validation guard is active.

A valid invitation page could not be exercised in the sandbox because creating one requires an authenticated dashboard owner session, and the hosted dashboard did not expose an authenticated interactive session during verification. The valid path is covered by backend integration tests and must be completed on an owner device using a real invitation token.

The hosted valid-token behavior is configured to show the app-open deep link, the configured APK download CTA when `VITE_ANDROID_DOWNLOAD_URL` is present, and an administrator fallback notice when that URL is absent.
