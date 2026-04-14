# EquipLink Native Android App (Kotlin)

This directory contains the native Android scaffolding for **EquipLink** (`com.equiplink.app`) using a basic **MVVM** structure.

## Open in Android Studio

1. Open Android Studio.
2. Choose **Open** and select:
   - `/home/runner/work/EqiupLink/EqiupLink/android`
3. Let Gradle sync complete.
4. Run the `app` configuration on an emulator/device.

## Add Supabase URL and Anon Key

The app reads Supabase values from Gradle properties and exposes them as `BuildConfig` values.

1. Open `/home/runner/work/EqiupLink/EqiupLink/android/local.properties` (create if missing).
2. Add:

```properties
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

3. Sync Gradle.

Current placeholder auth flow is in:
- `app/src/main/java/com/equiplink/app/viewmodel/AuthViewModel.kt`

## Add Firebase `google-services.json`

1. In Firebase Console, register Android app package: `com.equiplink.app`.
2. Download `google-services.json`.
3. Place it at:
   - `/home/runner/work/EqiupLink/EqiupLink/android/app/google-services.json`

> `google-services.json` is intentionally not committed.

Firebase messaging service:
- `app/src/main/java/com/equiplink/app/service/MyFirebaseMessagingService.kt`

## Included Scaffolding

- Splash screen: `SplashActivity`
- Login screen (Supabase placeholder): `LoginActivity`
- Home screen with motto: `HomeActivity`
- Camera placeholder (CameraX preview): `CameraActivity`
- Retrofit API client for `https://www.equiplink.org`

## Basic Google Play Store Deployment Steps

1. In Android Studio: **Build > Generate Signed Bundle / APK**.
2. Choose **Android App Bundle (AAB)** for Play Store.
3. Create or use an existing keystore.
4. Build release bundle.
5. In Google Play Console:
   - Create app listing
   - Upload AAB
   - Complete store listing + content rating + policy forms
   - Submit for review
