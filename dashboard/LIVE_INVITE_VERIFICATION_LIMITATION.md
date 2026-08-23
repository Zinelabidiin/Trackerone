# Live Invite Verification Limitation

The hosted dashboard redirects unauthenticated visitors to the Manus sign-in page. During the final verification pass, no authenticated owner session was available in the sandbox browser, so a real invitation token could not be created from the production dashboard.

The APK artifact URL was independently verified with a successful HTTP HEAD request, and the hosted `/invite/[token]` route was verified for invalid-token handling. To verify the final live CTA, the owner should sign in to the dashboard, create an invitation, open the resulting link, confirm the **Télécharger l'APK Android** button appears, and install the APK on the physical Android device.
