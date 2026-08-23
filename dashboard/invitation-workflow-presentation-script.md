# TrackerOne Invitation and Device Registration Workflow

## Presentation Script

### Slide 1 — Title: Connect a Phone to TrackerOne

“Today I’ll explain how TrackerOne connects a new mobile phone to the parental monitoring dashboard. The workflow is designed around a secure invitation: the dashboard owner creates an invitation, the recipient opens a time-limited link, registers the phone, and the new device becomes available in the owner’s device switcher.”

### Slide 2 — Starting from the Dashboard

“The workflow begins inside the TrackerOne dashboard. In the left sidebar, the owner opens the device switcher and selects **Ajouter un appareil**. The interface presents two options: create a shareable activation link, or prepare an invitation by e-mail.”

“This keeps the onboarding action close to the device list. The owner does not need to navigate to a separate administration page to add a phone.”

### Slide 3 — Creating a Secure Invitation

“When the owner creates an invitation, the server generates a unique token using `nanoid`. The token is not a device identifier and does not expose the owner’s account information. It is stored in the invitations table together with the owner, optional recipient e-mail address, creation time, expiration time, and acceptance status.”

“Each invitation is valid for seven days and is intended to be used once. The generated URL follows the route pattern `/invite/[token]`.”

### Slide 4 — Sharing the Link

“For a shareable invitation, TrackerOne first uses the device’s native Web Share capability when it is available. This is useful on mobile devices because the owner can send the invitation through an installed messaging or communication application.”

“If native sharing is not available, TrackerOne falls back to copying the URL to the clipboard. The interface confirms that the link was copied so the owner can paste it into a message, chat, or another secure channel.”

### Slide 5 — Invitation by E-Mail

“The e-mail option asks for the recipient’s e-mail address and allows the owner to customize the invitation message. TrackerOne creates the same secure, time-limited invitation token and prepares an e-mail containing the activation URL.”

“In the current implementation, the message is opened in the sender’s local mail client using a prefilled mail composition. Fully automatic server-side delivery would require connecting an e-mail provider such as SMTP, Resend, or SendGrid and configuring the corresponding production secret.”

### Slide 6 — Opening the Registration Page

“The recipient opens the hosted invitation URL on the phone that should be connected. TrackerOne routes the request to `/invite/[token]` and validates the token against the database.”

“If the token is valid, unused, and not expired, the recipient sees the registration form. If the token is invalid, expired, or already accepted, TrackerOne displays an unavailable-link message and does not create a device.”

### Slide 7 — Registering the Phone

“The registration form asks for two pieces of information: a device name and the platform. The recipient can select Android or iPhone, then submits the form.”

“The platform selection is important because TrackerOne uses it to display the appropriate device type in the dashboard. When an iPhone is selected, the dashboard can also show the iOS-specific amber configuration warning.”

### Slide 8 — Saving the Device

“After submission, the server validates the invitation one more time before creating the device. It creates a device record containing the invitation owner, the submitted name, the selected platform, and a generated TrackerOne device identifier.”

“Once the device is created, the invitation is marked as accepted. This prevents the same invitation from being reused to register another phone.”

### Slide 9 — Returning to the Dashboard

“The owner can now open the device switcher and see the newly registered phone alongside the existing devices. Selecting a device scopes the dashboard to that device, including its headline metrics, monitoring pages, and platform-specific state.”

“This provides a single control center for multiple registered phones while keeping each device distinguishable by name, platform, status, and device identifier.”

### Slide 10 — Production Requirements

“For the invitation flow to work in production, the application must be hosted with its production database connected. The devices and invitations tables must be migrated, the server must be able to read and write those tables, and the production application URL must be configured so generated links point to the hosted site.”

“The shareable link flow does not require an e-mail provider. Automatic e-mail delivery does require an additional provider and a securely configured server-side API key or SMTP credential.”

### Slide 11 — Security and Failure States

“The workflow has several safeguards. Tokens are randomly generated, time-limited, stored server-side, and invalidated after acceptance. The registration procedure does not trust the URL alone; it checks the invitation state before creating the device.”

“The user also receives clear feedback for common failure states: an invalid or expired link, a missing e-mail address, or an unsuccessful invitation operation. These checks help prevent accidental registrations and make the onboarding process understandable for non-technical users.”

### Slide 12 — Closing Summary

“To summarize, TrackerOne uses an invitation-based onboarding model. The owner creates a secure link or e-mail invitation, the recipient registers the phone through a dedicated page, the server validates and consumes the invitation, and the device is then added to the owner’s multi-device dashboard.”

“The result is a simple user experience backed by an explicit database workflow: invitation creation, token validation, device registration, invitation acceptance, and dashboard availability.”

## Presenter Notes: Suggested Demonstration

“During the demonstration, I will first open the device switcher and select **Ajouter un appareil**. I will generate a link and show the confirmation state. Next, I will open the `/invite/[token]` route, select a platform, enter a device name, and submit the registration form. Finally, I will return to the dashboard, open the device switcher, select the new device, and show the updated device context.”

## Key Terms to Emphasize

| Term | Explanation |
| --- | --- |
| Invitation token | A random, time-limited identifier used to authorize one device registration. |
| Shareable link | The hosted `/invite/[token]` URL that the recipient opens on the phone. |
| Device registration | The form submission that records the phone name and platform. |
| Invitation acceptance | The server-side state change that prevents token reuse. |
| Device switcher | The dashboard control used to select among registered phones. |

## Final Caveat for the Presentation

“TrackerOne currently supports secure link generation, native sharing or clipboard fallback, and e-mail composition. Direct automatic e-mail delivery is an additional production integration that must be configured with an e-mail service before it can send messages without opening the user’s mail client.”
