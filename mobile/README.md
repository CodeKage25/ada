# Ada — native mobile app (Expo / React Native)

The Ada career agent as a native iOS/Android app. Talks to the FastAPI backend
through the same endpoints as the web app; set `EXPO_PUBLIC_API_URL` to the
backend origin (defaults to `http://localhost:8080` for local dev).

## Run it on your phone right now (no build)

```bash
cd mobile
npm install
npx expo start
```

Install **Expo Go** from the App Store / Play Store and scan the QR code.
The app uses only Expo-bundled native modules, so it runs in Expo Go as-is.
To reach a locally running backend from the phone, start the app with your
machine's LAN address: `EXPO_PUBLIC_API_URL=http://<your-ip>:8080 npx expo start`.

## Build an installable APK (Android)

One command via EAS (free Expo account required):

```bash
npx eas-cli build -p android --profile preview
```

The `preview` profile produces an APK and a shareable install link. Set the
real backend URL first in `eas.json` (`build.preview.env.EXPO_PUBLIC_API_URL`).

## iOS (TestFlight)

```bash
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios
```

Requires an Apple Developer account. Bundle id is `app.ada.mobile`.

## Local native builds (instead of EAS)

```bash
npx expo run:android   # needs Android Studio / SDK
npx expo run:ios       # needs a Mac with Xcode
```

## Notes

- Magic-link auth: the app exchanges the emailed token via `ada://login?token=…`
  (or paste-the-token on the login screen). Session cookies persist through the
  native networking stack.
- Payments: Stripe opens hosted checkout in the system browser; Paystack runs
  inline in a WebView.
- Voice: the session UI, WebSocket transcript, and intake handoff are wired;
  native microphone frame capture is a known TODO.
