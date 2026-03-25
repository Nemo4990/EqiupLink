# EquipLink Mobile App Setup Guide

Your EquipLink web app has been successfully configured as a mobile app using Capacitor!

## Overview

The app is now ready to be built and deployed to Android and iOS devices. Your existing React/Tailwind/Supabase code works as-is with minimal changes.

## Prerequisites

### For Android Development
- **Android Studio** (latest version)
- **Java Development Kit (JDK)** 17 or higher
- **Android SDK** (installed via Android Studio)

### For iOS Development (Mac only)
- **Xcode** 14+ (from Mac App Store)
- **CocoaPods** (`sudo gem install cocoapods`)
- **Active Apple Developer Account** (for deployment)

## Quick Start

### 1. Build for Mobile

```bash
npm run mobile:build
```

This will:
- Build your web app (`npm run build`)
- Sync assets to Android and iOS (`npx cap sync`)

### 2. Open in Native IDE

**For Android:**
```bash
npm run mobile:android
```
This opens Android Studio with your project.

**For iOS (Mac only):**
```bash
npm run mobile:ios
```
This opens Xcode with your project.

## Development Workflow

### Making Changes

1. Edit your React code as usual
2. Run `npm run mobile:build` to rebuild
3. The changes will sync to both platforms
4. Rebuild in Android Studio / Xcode

### Testing on Device/Emulator

**Android:**
```bash
npm run mobile:run:android
```

**iOS (Mac only):**
```bash
npm run mobile:run:ios
```

### Live Reload (Development)

For faster development, you can use live reload:

1. Update `capacitor.config.ts`:
```typescript
server: {
  url: 'http://YOUR_IP:5173',  // Your dev machine IP
  cleartext: true
}
```

2. Run `npm run dev` on your computer
3. Build and run the app on your device
4. Changes will reflect instantly

**Remember to remove this before production builds!**

## App Configuration

### App Icons & Splash Screen

**Required assets (create these):**
- `/public/icon-192.png` - 192x192px app icon
- `/public/icon-512.png` - 512x512px app icon
- Splash screen background color: `#030712` (configured in `capacitor.config.ts`)

**Generate all required sizes:**
```bash
npm install -g @capacitor/assets
npx capacitor-assets generate
```

### App Details

Edit `capacitor.config.ts` to customize:
- `appId`: "com.equiplink.app" (change for production)
- `appName`: "EquipLink"

### Version & Build Numbers

**Android:** Edit `android/app/build.gradle`
```gradle
versionCode 1
versionName "1.0.0"
```

**iOS:** Edit `ios/App/App.xcodeproj/project.pbxproj` or use Xcode

## Building for Release

### Android Release Build

1. Open Android Studio (`npm run mobile:android`)
2. Go to **Build > Generate Signed Bundle / APK**
3. Select **Android App Bundle** (for Google Play) or **APK**
4. Create a keystore if you don't have one
5. Build release bundle
6. Upload to Google Play Console

### iOS Release Build

1. Open Xcode (`npm run mobile:ios`)
2. Select your development team
3. Set your Bundle Identifier (must be unique)
4. Go to **Product > Archive**
5. Distribute to App Store Connect
6. Submit for review in App Store Connect

## Adding Native Features

Capacitor has plugins for native features:

```bash
# Camera
npm install @capacitor/camera

# Geolocation
npm install @capacitor/geolocation

# Push Notifications
npm install @capacitor/push-notifications

# Local Notifications
npm install @capacitor/local-notifications

# Share
npm install @capacitor/share
```

After installing plugins, run `npm run mobile:build` to sync.

## Supabase Configuration

Your Supabase connection works automatically! The environment variables from `.env` are bundled during build.

**For production:**
- Update `.env` with production Supabase URL and keys
- Rebuild: `npm run mobile:build`

## Testing

### Android Testing
- Use Android Studio's built-in emulator
- Or connect a physical Android device with USB debugging enabled

### iOS Testing
- Use Xcode Simulator
- Or connect a physical iOS device

## Troubleshooting

### Build fails
```bash
# Clean and rebuild
rm -rf dist node_modules android/app/build ios/App/build
npm install
npm run mobile:build
```

### Capacitor sync errors
```bash
npx cap sync --force
```

### iOS CocoaPods issues
```bash
cd ios/App
pod install --repo-update
cd ../..
```

### White screen on launch
- Check browser console in dev tools (Android Studio or Safari Web Inspector)
- Ensure all assets are in `/dist` folder
- Run `npm run mobile:build` again

## File Structure

```
├── android/              # Android native project
├── ios/                  # iOS native project
├── public/               # Static assets (icons, manifest)
│   ├── icon-192.png      # Android icon
│   ├── icon-512.png      # iOS icon
│   └── manifest.json     # PWA manifest
├── src/                  # Your React app (unchanged)
├── capacitor.config.ts   # Capacitor configuration
└── package.json          # Updated with mobile scripts
```

## Publishing

### Google Play Store
1. Create a developer account ($25 one-time fee)
2. Create app listing
3. Upload AAB file from Android Studio
4. Complete store listing (screenshots, description)
5. Submit for review

### Apple App Store
1. Create Apple Developer account ($99/year)
2. Create app in App Store Connect
3. Archive and upload from Xcode
4. Complete app information
5. Submit for review

## Next Steps

1. **Create app icons**: Design 192x192 and 512x512 icons
2. **Test on device**: Run on a physical phone
3. **Add native features**: Camera, GPS, push notifications as needed
4. **Submit to stores**: Follow the publishing guides above

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/studio)
- [iOS Developer Guide](https://developer.apple.com/xcode/)
- [Supabase Mobile Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-ionic-react)

## Support

Your web app is now a mobile app! All your existing features work:
- Authentication with Supabase
- Database operations
- Real-time updates
- File uploads
- Everything else

The UI is responsive and ready for mobile screens.
