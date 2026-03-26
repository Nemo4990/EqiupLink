# Building Android App Without Android Studio

This guide shows you how to build your EquipLink Android app without installing Android Studio.

## Option 1: Command Line Build (Recommended for Local Development)

### Prerequisites

1. **Install Java JDK 17**
   - Windows: Download from [Oracle JDK Downloads](https://www.oracle.com/java/technologies/downloads/#java17)
   - Mac: `brew install openjdk@17`
   - Linux: `sudo apt install openjdk-17-jdk`

2. **Verify Java Installation**
   ```bash
   java -version
   # Should show version 17.x.x
   ```

3. **Set JAVA_HOME Environment Variable**

   **Windows:**
   ```cmd
   setx JAVA_HOME "C:\Program Files\Java\jdk-17"
   ```

   **Mac/Linux:**
   Add to `~/.bashrc` or `~/.zshrc`:
   ```bash
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
   export PATH=$JAVA_HOME/bin:$PATH
   ```

4. **Install Android SDK Command Line Tools**
   - Download from: https://developer.android.com/studio#command-tools
   - Extract to a folder (e.g., `~/Android/cmdline-tools`)
   - Set ANDROID_HOME:

   **Windows:**
   ```cmd
   setx ANDROID_HOME "C:\Users\YourName\Android"
   setx PATH "%PATH%;%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\platform-tools"
   ```

   **Mac/Linux:**
   ```bash
   export ANDROID_HOME=$HOME/Android
   export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH
   ```

5. **Install Required SDK Components**
   ```bash
   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
   ```

### Build Your App

1. **Build the Web App**
   ```bash
   npm run build
   ```

2. **Sync Capacitor**
   ```bash
   npx cap sync android
   ```

3. **Build the APK**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

   On Windows:
   ```cmd
   cd android
   gradlew.bat assembleDebug
   ```

4. **Find Your APK**
   The APK will be located at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

5. **Install on Your Phone**
   - Connect phone via USB
   - Enable USB debugging on your phone
   - Run: `adb install app/build/outputs/apk/debug/app-debug.apk`
   - Or transfer the APK file to your phone and install manually

### Build Release APK (for Production)

```bash
cd android
./gradlew assembleRelease
```

The release APK will be at: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

---

## Option 2: EAS Build (Cloud Building - No Setup Required)

This option builds your app in the cloud without any local Android setup.

### Setup

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```
   Create a free account at https://expo.dev if you don't have one.

3. **Configure EAS**
   ```bash
   eas build:configure
   ```

4. **Build Android APK**
   ```bash
   eas build --platform android --profile preview
   ```

5. **Download Your APK**
   - EAS will provide a download link
   - Download the APK to your computer
   - Transfer to your phone and install

### Advantages of EAS Build
- No local Android setup needed
- Works on any computer (Windows, Mac, Linux)
- Handles signing and configuration automatically
- Free tier available (limited builds per month)

---

## Option 3: Browser Testing (Fastest for Development)

Test most features without building an APK:

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Open in Browser**
   - Go to http://localhost:5173
   - Press F12 to open DevTools
   - Click the mobile device icon (or Ctrl+Shift+M)
   - Select a phone model from the dropdown

3. **Test on Your Real Phone**
   - Find your computer's local IP address
     - Windows: `ipconfig`
     - Mac/Linux: `ifconfig` or `ip addr`
   - On your phone's browser, visit: `http://YOUR_IP:5173`
   - Make sure your phone is on the same WiFi network

---

## Option 4: Lightweight VS Code Setup

1. **Install VS Code Extensions**
   - Android for VS Code (by Arlack)
   - Gradle for Java (by Microsoft)

2. **Build from VS Code Terminal**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

3. **View Build Output**
   - VS Code will show build progress
   - Errors will be highlighted

---

## Troubleshooting

### "JAVA_HOME not set" Error
Make sure you've set the JAVA_HOME environment variable and restarted your terminal.

### "SDK not found" Error
Install Android SDK command line tools and set ANDROID_HOME.

### "Build failed" Error
1. Clean the build:
   ```bash
   cd android
   ./gradlew clean
   ```
2. Try building again

### Permission Denied (Mac/Linux)
Make gradlew executable:
```bash
chmod +x android/gradlew
```

---

## Recommended Workflow

**For quick testing:** Use browser (Option 3)

**For real device testing:** Use command line build (Option 1) or EAS build (Option 2)

**For production:** Use command line build with release configuration

---

## Next Steps

1. Choose your preferred method above
2. Follow the setup instructions
3. Build your first APK
4. Test on your device

Need help? Check the [Capacitor Documentation](https://capacitorjs.com/docs/android) or [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
