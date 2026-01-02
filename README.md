# Courses Platform

This is a simple courses platform built with Ionic and Angular.

## Getting Started

To get started with the app, clone the repo and then install the dependencies:

```bash
npm install
```

Once the dependencies are installed, you can run the app in your browser:

```bash
ionic serve
```

## Features

- **Login:** A simple login page.
- **Dashboard:** A dashboard with statistics about the courses.
- **Courses:** A list of all available courses.
- **Course Detail:** A page with the details of a single course.
- **Upload:** A page for teachers to upload new courses.

## Push Notifications (Capacitor)

This app includes a client-side push notification integration (Android/iOS) via Capacitor.

### What it’s used for

- Real-time updates (ex: course changes, announcements)
- Reminders / alerts (ex: upcoming quizzes, events)
- Marketing / informational messages (if you connect a backend sender)

### Install + sync

```bash
npm install
npx cap sync
```

### Android (FCM)

1. Create a Firebase project and add an **Android app**.
2. Download `google-services.json` and place it in `android/app/google-services.json`.
3. Run `npx cap sync android`.

Then build/run from Android Studio.

### iOS (APNs)

1. Enable **Push Notifications** + **Background Modes → Remote notifications** in Xcode.
2. Configure APNs key/cert in your Apple Developer account and connect it to Firebase (if using FCM) or your provider.
3. Run `npx cap sync ios`.

### Code location

- Push setup service: `src/app/services/push-notifications.service.ts`
- Initialized at startup in `src/app/app.component.ts`

### Backend (optional)

If you set `apiConfig.apiUrl` in `src/environments/environment.ts`, the app will POST device tokens to:

- `POST {apiUrl}/device-tokens` with `{ userId, token, platform }`

If you don’t have a backend yet, tokens are still stored locally in `localStorage` under `pushToken:<userId>`.
