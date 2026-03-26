# EAS Build Guide - Build Android APK in the Cloud

This guide will help you build your EquipLink Android app using EAS (Expo Application Services) - no Android Studio or local setup required!

## What is EAS Build?

EAS Build compiles your app in the cloud, so you don't need to install Android Studio, Java, or Android SDK on your computer. It works on Windows, Mac, and Linux.

## Prerequisites

- Node.js installed on your computer
- An Expo account (free - you'll create one in the steps below)

## Step-by-Step Instructions

### Step 1: Install EAS CLI

The EAS CLI is already installed globally. Verify it works:

```bash
eas --version
```

You should see a version number like `5.x.x` or higher.

### Step 2: Login to Expo

Create a free Expo account and login:

```bash
eas login
```

- If you don't have an account, choose the option to create one
- Enter your email and create a password
- Verify your email address if prompted

### Step 3: Configure Your Project

Link your project to EAS:

```bash
eas build:configure
```

This command will:
- Ask you to select a platform (choose Android)
- Create necessary configuration files
- Link your project to your Expo account

### Step 4: Build Your First APK

Now build your app in the cloud:

```bash
eas build --platform android --profile preview
```

**What happens next:**
1. Your code will be uploaded to Expo's servers
2. EAS will build your app in the cloud (takes 5-15 minutes)
3. You'll get a link to download your APK

**Build Profiles:**
- `development` - For testing during development
- `preview` - For internal testing (recommended for first build)
- `production` - For publishing to Google Play Store

### Step 5: Download Your APK

When the build completes:

1. EAS will show a download link in the terminal
2. Click the link or visit https://expo.dev/accounts/[your-username]/projects/equiplink/builds
3. Download the APK file
4. Transfer it to your Android phone
5. Install it (you may need to enable "Install from unknown sources")

## Alternative: Install Directly on Your Phone

You can also install the APK directly on your phone:

1. Install the Expo app on your Android phone from the Play Store
2. Scan the QR code shown after the build completes
3. The app will download and install automatically

## Building for Production (Google Play Store)

When you're ready to publish to the Google Play Store:

```bash
eas build --platform android --profile production
```

You'll need to:
1. Generate a keystore (EAS can do this automatically)
2. Follow the prompts to configure signing
3. Upload the AAB file to Google Play Console

## Troubleshooting

### "Not logged in" Error

Run `eas login` again and make sure you complete the login process.

### "Project not configured" Error

Run `eas build:configure` to set up the project.

### Build Failed

1. Check the build logs at https://expo.dev
2. Make sure your app builds locally first: `npm run build`
3. Check that all required dependencies are in package.json

### "Quota exceeded" Error

Free Expo accounts have limited builds per month. You can:
- Wait for your quota to reset
- Upgrade to a paid plan
- Use a different account

## Useful Commands

```bash
# Check build status
eas build:list

# View detailed build logs
eas build:view [build-id]

# Cancel a running build
eas build:cancel

# Submit to Google Play Store
eas submit --platform android
```

## Cost

- **Free tier**: Limited builds per month (usually 30 builds)
- **Paid plans**: Start at $29/month for unlimited builds

## Next Steps

1. **Test your app**: Install the APK on your phone and test all features
2. **Iterate**: Make changes, run `eas build` again
3. **Publish**: When ready, build with `--profile production` and submit to Play Store

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Dashboard](https://expo.dev)
- [EAS Pricing](https://expo.dev/pricing)

## Quick Reference

```bash
# Build for testing
eas build --platform android --profile preview

# Build for production
eas build --platform android --profile production

# Check build status
eas build:list

# View builds in browser
open https://expo.dev
```

---

**Need help?** Visit the Expo Discord: https://chat.expo.dev
