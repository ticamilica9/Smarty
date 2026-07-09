# Smarty Mobile — Deployment Guide

## Quick Start

### Prerequisites

- **Node.js 20+** installed
- **Android Studio** (for Android builds on Windows)
- **Xcode 16+** (for iOS builds on macOS)
- **Capacitor CLI:** `npm install -g @capacitor/cli`

### Build Commands

```bash
# Install dependencies
npm install

# Sync web code to native projects
npx cap sync

# Open native IDE
npx cap open android     # Opens Android Studio
npx cap open ios         # Opens Xcode (macOS only)
```

---

## Android Play Store (from Windows)

### 1. Generate Keystore (one-time)

```bash
cd android/app
keytool -genkey -v -keystore smarty-release.keystore -alias smarty \
  -keyalg RSA -keysize 2048 -validity 10000 -storepass smarty123 -keypass smarty123
```

> **IMPORTANT:** Change `smarty123` to a strong password before production release.

### 2. Configure Signing

Edit `android/app/build.gradle` and add inside `android { ... }`:

```groovy
signingConfigs {
    release {
        storeFile file('smarty-release.keystore')
        storePassword 'smarty123'
        keyAlias 'smarty'
        keyPassword 'smarty123'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 3. Build Release Bundle

```bash
cd android
./gradlew bundleRelease   # Generates AAB (Google Play format)
./gradlew assembleRelease # Generates APK (side-loading)
```

Outputs:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

### 4. Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app with bundle ID `ro.smarty.app`
3. Go to **Production > Create new release**
4. Upload the `.aab` file
5. Fill in store listing details (see `store-listing/` for content)
6. Complete app signing and pricing distribution

### 5. Privacy Policy

Upload the privacy policy URL in Play Console:
```
https://smarty-3nz5tzm7f-ticamilicas-projects.vercel.app/privacy
```

---

## iOS App Store (from macOS)

### 1. Prerequisites

- macOS with Xcode 16+ installed
- Apple Developer account ($99/year)
- App Store Connect setup with bundle ID `ro.smarty.app`

### 2. Open in Xcode

```bash
npx cap open ios
```

### 3. Configure Xcode Project

- **Signing & Capabilities:** Select your Apple Developer team under "Signing"
- **Bundle Identifier:** `ro.smarty.app` (already set)
- **Deployment Target:** iOS 16.0+
- **Version:** Set MARKETING_VERSION to `1.0.0` in project settings
- **Build:** Set CURRENT_PROJECT_VERSION to `1`

### 4. Archive & Upload

1. Select **Any iOS Device (arm64)** as the target device
2. Go to **Product > Archive**
3. In the Organizer window, select the archive and click **Distribute App**
4. Choose **App Store Connect** > **Upload**
5. Follow the prompts to sign and upload

### 5. App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app with the bundle ID `ro.smarty.app`
3. Fill in app information (see `store-listing/` for Romanian content)
4. Submit for review

### 6. TestFlight (Beta Testing)

Before App Store submission, distribute via TestFlight:
1. In Xcode Organizer, select **Distribute App > TestFlight Internal Only**
2. Add testers in App Store Connect > TestFlight
3. Max 100 internal testers, up to 10,000 external (with Beta App Review)

---

## Credentials

| Item | Path | Notes |
|------|------|-------|
| Keystore | `android/app/smarty-release.keystore` | Generate before Android release |
| Keystore Alias | `smarty` | |
| Keystore Password | `smarty123` | **CHANGE BEFORE PRODUCTION** |
| Key Password | `smarty123` | **CHANGE BEFORE PRODUCTION** |
| Bundle ID | `ro.smarty.app` | Both platforms |
| App Name | `Smarty` | |

---

## After Deployment

### Custom Domain

When you acquire a custom domain, update `capacitor.config.ts`:

```ts
server: {
  url: 'https://yourdomain.com',
  // ...
}
```

Then run `npx cap sync` for both platforms.

### Google OAuth for Mobile

1. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Add the SHA-1 fingerprint from your keystore to the credential
3. Install `@capacitor/google-auth` plugin
4. Configure in `capacitor.config.ts`

### Push Notifications

- **Android:** Firebase Cloud Messaging setup in Firebase Console
- **iOS:** APNs certificate configuration in Apple Developer Portal
- Both configured via `@capacitor/push-notifications` plugin

### Production Checklist

- [ ] Change keystore passwords from defaults
- [ ] Set up proper error monitoring (Sentry)
- [ ] Configure analytics
- [ ] Test payments integration
- [ ] Review app privacy settings
- [ ] Run full QA on both platforms
- [ ] Update screenshots for store listings

---

## Troubleshooting

### iOS

| Issue | Solution |
|-------|----------|
| CocoaPods errors | Run `gem install cocoapods && pod repo update` |
| Code signing failed | Check Apple Developer team in Xcode |
| Push capability missing | Enable Push Notifications in Xcode Capabilities |
| ITMS-90078 | Ensure `ITSAppUsesNonExemptEncryption` is set to `false` in Info.plist |

### Android

| Issue | Solution |
|-------|----------|
| Gradle build fails | Run `./gradlew clean` then rebuild |
| Keystore not found | Place `smarty-release.keystore` in `android/app/` |
| Play Console error | Verify bundle ID `ro.smarty.app` matches exactly |
