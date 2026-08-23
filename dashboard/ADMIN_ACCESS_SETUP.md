# My Trivia Hub administrator access

The dashboard now requires one of two configured administrator credentials before the main dashboard route is rendered. The credential check runs on the server, and successful login creates an HTTP-only signed session cookie named `my-trivia-hub-admin`. The cookie expires after eight hours and can be revoked with the dashboard’s admin logout control.

The two allowed accounts are configured through project secrets rather than source code:

| Secret | Purpose |
|---|---|
| `DASHBOARD_ADMIN_1_USERNAME` | First administrator username |
| `DASHBOARD_ADMIN_1_PASSWORD` | First administrator password |
| `DASHBOARD_ADMIN_2_USERNAME` | Second administrator username |
| `DASHBOARD_ADMIN_2_PASSWORD` | Second administrator password |

The requested values are currently configured in the project secret store. Passwords are not sent to the browser, included in the APK, or written into the repository. To rotate a credential, update the corresponding secret and restart the application. Existing sessions should be allowed to expire or can be revoked through logout.

## API routes

`POST /api/admin/login` accepts `{ username, password }` and returns a signed session cookie on success. `GET /api/admin/session` reports whether the current browser has a valid administrator session. `POST /api/admin/logout` clears the session cookie. `POST /api/admin/password` accepts `{ currentPassword, newPassword, confirmPassword }` and is available only to the logged-in administrator; it verifies the current password, requires at least 12 characters with uppercase, lowercase, and a digit, stores a salted scrypt hash, increments the administrator session version, and refreshes the current session cookie.

The dashboard’s device, telemetry, trivia, and invitation-management tRPC procedures require the administrator session. The profile trigger in the dashboard header opens the password-change form for the current admin. Password hashes and salts are stored in the `adminCredentials` table; plaintext replacement passwords are never persisted. Incrementing the session version invalidates older cookies after a password change. The public invitation validation and mobile registration routes remain available because a phone must be able to complete onboarding before it has a dashboard session. Mobile telemetry continues to use its separate `x-device-token` header and cannot be used as a dashboard-admin credential.

## Hosting checklist

Before production use, confirm that the deployment has HTTPS enabled, the project secret store contains all four administrator bootstrap variables, and `JWT_SECRET` is a long random value. Log in with each bootstrap account once and change its password from the profile section. Test the current-password check, weak-password rejection, confirmation mismatch, successful re-login with the new password, logout, and an unauthenticated request to the dashboard procedures. If an administrator forgets a changed password, update that administrator’s corresponding project secret and restart the application only after removing the matching `adminCredentials` row or performing an approved recovery migration; the bootstrap secret is used only when a credential row does not yet exist.
