# My Trivia Hub background-location QA

## Expected flow

Install the latest **My Trivia Hub** Android APK from the hosted invitation page or the managed APK artifact. Open the invitation link, launch the app, and complete registration with a valid invitation token. The app requests location access through the Android system prompts; there is no in-app permissions button. If Android has already denied or limited access, change the permission from the phone’s App info → Permissions → Location settings.

For continuous tracking, choose the Android option that allows location access in the background when it is offered, then enable the system location service. The app starts an Expo background location task after registration and permission approval. It also performs an immediate foreground sync and continues periodic background sync while the app is backgrounded or closed, subject to Android battery optimization, network availability, and the operating system’s background-execution rules.

The task sends latitude, longitude, battery percentage, and network type to `POST /api/device/telemetry` using the registered device authentication token. The dashboard polls the selected device’s latest telemetry approximately every 10 seconds. The Résumé card should change from **En attente du GPS** to **Position actuelle**, show the latest coordinate pair, and update the last-ping time. The Localisation page and both live OpenStreetMap surfaces should show the same position. The My Trivia Hub score indicator is loaded separately from the online trivia profile endpoint.

## Background verification sequence

After the first successful sync, lock the phone and leave My Trivia Hub in the background for at least two to five minutes. Move to a different location only where this is safe and permitted. Open the dashboard and confirm that the selected device’s latest-ping timestamp and coordinates change. Re-open My Trivia Hub and confirm the app still shows the registered identity and current score. If Android pauses the task, open the phone’s battery settings and exclude My Trivia Hub from aggressive battery optimization, then repeat the test.

## Troubleshooting

If the dashboard remains in the waiting state, confirm that the phone has internet access, that the installed APK is the latest My Trivia Hub build, that Location is enabled in Android system settings, and that the dashboard has the same registered device selected. Confirm that the invitation token was completed successfully and that the app has not been revoked or cleared from the device. The backend rejects missing or invalid device tokens and validates coordinate ranges before writing telemetry.

If foreground updates work but background updates do not, check Android’s Location permission level, battery optimization, background-data restrictions, and whether the user force-stopped the app. A force-stopped Android app may not restart background tasks until the user opens it again. The app cannot override these operating-system controls.

The sandbox can validate the mobile code path, API contract, artifact URL, and dashboard rendering mapping, but it cannot observe the owner’s physical Android GPS or authenticated production session. Final background observation must therefore be performed on the owner’s Android device using the steps above.
