# iOS companion build notes

- The stable 1.8.0 Android APK was retrieved from the managed dashboard download path for source-artwork recovery.
- Two large Android resources inspected from that package (`res/S7.png` and `res/St.png`) are Android fallback/placeholder artwork rather than the My Trivia Hub launcher icon, so they will not be used as the iOS icon.
- The iOS companion will preserve the same application name, bundle identifier, invitation host, trivia flow, and compatible location consent descriptions. Android-only call log, notification listener, usage access, and call-screening features will remain unavailable on iOS.
