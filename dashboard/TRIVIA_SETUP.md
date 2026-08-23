# My Trivia Hub Trivia Setup

My Trivia Hub now uses a backend-managed question bank. The starter release contains curated French questions stored in `triviaQuestions`; the mobile app does not contain the answer key and never calculates score locally.

## Question delivery

A registered phone requests a question with its device token:

```http
GET /api/device/trivia/next?language=fr
x-device-token: <device-token>
```

The response contains the question, category, difficulty, four answer options, and explanation. It deliberately excludes `correctOptionIndex` until the answer has been submitted. The server avoids the device's ten most recently answered questions when possible.

## Answer validation and scoring

The phone submits the selected option:

```http
POST /api/device/trivia/answer
Content-Type: application/json
x-device-token: <device-token>

{
  "questionId": 4,
  "selectedOptionIndex": 0
}
```

The server verifies the device token, question, option count, correct answer, and whether the question was previously answered. Correct answers award 10 points for easy questions, 20 for medium questions, and 30 for hard questions. Each question can award points only once per device. The response returns correctness, points, the correct option index, an explanation, and the updated score.

## Content strategy

The production source is a curated database rather than live model generation. New questions can be added in batches after editorial review. A language model may be used later as an admin-assisted draft generator, but generated questions should be reviewed for factual accuracy, duplicates, ambiguity, age suitability, and language quality before being marked active. API keys must remain server-side.

The `language` field supports future English or additional translations without mixing languages in the app. The initial mobile flow requests French questions because the current interface is French.

## First-launch behavior

After a phone is registered and the app has started its location synchronization, the registered-device screen opens directly to the trivia card. The card shows one random question with four options. Selecting an option submits it to the server, displays immediate feedback and the explanation, refreshes the online score and ladder nickname, and reveals the next-question action. The GPS background task runs independently of this trivia flow.

## Android verification

Build and install the new APK on a physical Android device. Open the registered app, confirm that the first registered screen displays a trivia question, select an answer, and verify feedback and score change. Press the score chip to confirm the ladder reflects the updated score. Repeat a question request to confirm questions rotate. Finally, background the app and verify that location synchronization continues while trivia state remains available when the app is reopened.

If the question request fails because of a network or server error, the app shows a retry action rather than silently displaying an empty bank. A genuine `404` empty-bank response is shown separately with an refresh action. The mobile regression suite covers both states and the complete rendered question-answer-next-question flow.

The device must remain connected to the hosted backend, and the invitation registration must have completed successfully before question requests can authenticate.

The current shipped APK is EAS build `dd34386c-b153-4e7c-83bc-66813722b2dc`, app version `1.1.0`, with managed artifact path `/manus-storage/my-trivia-hub-1.1.0_54104e28.apk`. The hosted invitation configuration now points to this artifact. The managed artifact endpoint was validated with a successful `HEAD` request after the secret update.

## Physical Android verification for build 1.1.0

Open a fresh hosted invitation and confirm that its Android download action resolves to the new APK. Install the APK, reopen the invitation link if necessary, and complete registration. After location permission is accepted, confirm that the first registered screen opens directly to a trivia question with exactly four options. Select an answer and verify that feedback, the explanation, points gained, and the refreshed score appear. Tap the score chip and confirm that the current emoji nickname, progress bar, next nickname, and ladder milestones are visible.

Background the app and wait for the configured sync interval. Confirm in the dashboard that the selected device receives a newer GPS timestamp and coordinates. Reopen My Trivia Hub and verify that trivia remains available and the score is retained. If location does not continue, inspect Android Settings for background location permission and battery-optimization restrictions; do not expect a new in-app permission button.

## Trivia-first experience and ladder retention

After registration and the operating-system location flow, the mobile app shows a one-time curiosity-driven welcome screen before the first question. The user then enters a four-option trivia question directly. The score chip remains visible in the header and shows the current emoji and playful nickname; tapping it opens the full ladder. The main trivia screen also shows the points needed for the next nickname so progress is visible without opening the ladder.

The current ladder uses playful French names such as Curieux en herbe, Détective du dimanche, Renard à neurones, Machine à devinettes, Maître du presque-sûr, Oracle du goûter, Sherlock du canapé, Boss du quiz, Légende qui chipote, and Grand maître du “je le savais”. Background GPS continues silently and is not presented as the app’s primary feature.

The dashboard’s live widgets are GPS position, telemetry, device registration, online trivia profile, and score-ladder metadata. Messages, calls, app usage, screen time, and access rules remain explicitly unavailable until their corresponding native APIs, backend contracts, permissions, privacy disclosures, and platform review are completed. The current mobile permission surface remains limited to foreground/background location; battery and network telemetry require no runtime permission.

The registered app now waits for the SecureStore welcome-state lookup to resolve before rendering trivia. A first registered launch therefore always shows the welcome screen; later launches proceed directly to trivia. The ladder also displays a persisted personal-best score. Each accepted answer updates the cumulative score and raises the personal best only when the new score exceeds the stored record.
