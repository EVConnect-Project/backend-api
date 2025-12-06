# 🔥 Firebase Setup - Step by Step

## ✅ What We Just Prepared

I've updated your Android build configuration:
- Added Google Services plugin to `android/app/build.gradle.kts`
- Added Google Services dependency to `android/settings.gradle.kts`
- Updated namespace to `com.evconnect.app`

---

## 🚀 NOW DO THESE STEPS

### Step 1: Open Firebase Console

**Open this link**: https://console.firebase.google.com/

---

### Step 2: Create/Select Project

1. **If you don't have a project**:
   - Click "Add project" or "Create a project"
   - Project name: `EVConnect` (or your preferred name)
   - Click Continue
   - Google Analytics: Optional (you can enable it)
   - Click "Create project"
   - Wait for it to finish, then click "Continue"

2. **If you already have a project**:
   - Click on your existing project
   - Note the **Project ID** (e.g., `evconnect-12345`)

---

### Step 3: Add Android App

1. In your Firebase project, click the **Android icon** (robot icon)
2. Fill in the form:
   - **Android package name**: `com.evconnect.app` ⚠️ **MUST BE EXACT**
   - **App nickname**: `EVConnect Android` (optional)
   - **Debug signing certificate SHA-1**: Leave blank for now (optional for FCM)
3. Click "Register app"

4. **Download `google-services.json`**:
   - Click "Download google-services.json"
   - **SAVE IT** - we'll place it next

5. Click "Next" → "Next" → "Continue to console"

---

### Step 4: Place Android Config File

**Run this command** (replace the path with where you downloaded it):

```bash
# If downloaded to Downloads folder:
cp ~/Downloads/google-services.json /Users/akilanishan/Documents/EVConnect-Project/evconnect_app/android/app/

# Verify it's there:
ls -la /Users/akilanishan/Documents/EVConnect-Project/evconnect_app/android/app/google-services.json
```

---

### Step 5: Add iOS App

1. Back in Firebase Console, click "Add app" → **iOS icon** (Apple icon)
2. Fill in the form:
   - **iOS bundle ID**: `com.evconnect.app` ⚠️ **MUST BE EXACT**
   - **App nickname**: `EVConnect iOS` (optional)
   - **App Store ID**: Leave blank for now
3. Click "Register app"

4. **Download `GoogleService-Info.plist`**:
   - Click "Download GoogleService-Info.plist"
   - **SAVE IT** - we'll add it via Xcode

5. Click "Next" → "Next" → "Next" → "Continue to console"

---

### Step 6: Add iOS Config File via Xcode

**Important**: iOS config file MUST be added through Xcode, not Finder!

```bash
# 1. Open Xcode workspace
open /Users/akilanishan/Documents/EVConnect-Project/evconnect_app/ios/Runner.xcworkspace
```

**In Xcode**:
1. **Drag and drop** the `GoogleService-Info.plist` file from Finder into:
   - Left sidebar → `Runner` folder (the yellow folder icon, not the project)
   
2. A dialog will appear - **IMPORTANT**:
   - ✅ **Check** "Copy items if needed"
   - ✅ **Check** "Runner" under "Add to targets"
   - Click "Finish"

3. Verify it's in the right place:
   - In Xcode left sidebar: `Runner` → `Runner` → should see `GoogleService-Info.plist`

---

### Step 7: Update iOS Bundle ID in Xcode

**Still in Xcode**:
1. Click on **"Runner"** (top of left sidebar, blue icon)
2. Select **"Runner"** target (under TARGETS)
3. Go to **"Signing & Capabilities"** tab
4. Under "Bundle Identifier", change to: `com.evconnect.app`
5. **Select your Team** (you need an Apple Developer account)
   - If you don't have one, you can use personal team for testing
   - For App Store, you'll need paid account ($99/year)

---

### Step 8: Run FlutterFire Configure

This will update `firebase_options.dart` with your real Firebase project details:

```bash
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_app

# Install FlutterFire CLI (if not already installed)
dart pub global activate flutterfire_cli

# Make sure it's in PATH
export PATH="$PATH:$HOME/.pub-cache/bin"

# Configure Firebase (replace PROJECT_ID with your actual Firebase project ID)
flutterfire configure --project=YOUR_FIREBASE_PROJECT_ID

# Example: flutterfire configure --project=evconnect-12345
```

**What this does**:
- Reads your `google-services.json` and `GoogleService-Info.plist`
- Generates proper `lib/firebase_options.dart` with real API keys
- Sets up the correct configuration for all platforms

---

### Step 9: Verify Everything

```bash
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_app

# Clean and get dependencies
flutter clean
flutter pub get

# Try to build (should work without Firebase errors)
flutter build apk --debug

# Or run on a device/emulator
flutter run
```

---

## ✅ Verification Checklist

- [ ] Firebase project created/selected
- [ ] Android app added with package `com.evconnect.app`
- [ ] `android/app/google-services.json` exists
- [ ] iOS app added with bundle `com.evconnect.app`
- [ ] `ios/Runner/GoogleService-Info.plist` added via Xcode
- [ ] iOS bundle ID changed to `com.evconnect.app` in Xcode
- [ ] Ran `flutterfire configure` successfully
- [ ] `lib/firebase_options.dart` updated with real values
- [ ] App builds without Firebase errors

---

## 🔑 Get Your Firebase Project ID

**Where to find it**:
1. Go to Firebase Console
2. Click the ⚙️ gear icon → Project settings
3. Look for **Project ID** (e.g., `evconnect-12345`)
4. Use this in the `flutterfire configure` command

---

## 🆘 Troubleshooting

### "google-services.json not found"
```bash
# Check if file exists:
ls -la android/app/google-services.json

# If not, download again from Firebase Console and place it there
```

### "GoogleService-Info.plist not found" (iOS)
- **DO NOT** just copy the file via Finder
- **MUST** add via Xcode (drag & drop with "Copy items if needed")
- Verify it's in the correct Runner target

### "Package name mismatch"
- Ensure Firebase Android app uses: `com.evconnect.app`
- Ensure `android/app/build.gradle.kts` has: `applicationId = "com.evconnect.app"`
- Both must match exactly!

### "Bundle ID mismatch" (iOS)
- Ensure Firebase iOS app uses: `com.evconnect.app`
- Ensure Xcode Runner target has: `com.evconnect.app`
- Both must match exactly!

### FlutterFire CLI not found
```bash
# Install it:
dart pub global activate flutterfire_cli

# Add to PATH (add this to ~/.zshrc):
export PATH="$PATH:$HOME/.pub-cache/bin"

# Reload shell:
source ~/.zshrc
```

---

## 📱 Test Push Notifications (After Setup)

Once Firebase is configured, test notifications:

```bash
# Run the app
flutter run

# In another terminal, send test notification from Firebase Console:
# Firebase Console → Cloud Messaging → Send test message
# Enter FCM token from app logs
```

---

## 🎯 What's Next After Firebase

Once Firebase is set up, continue with:
1. ✅ Firebase Setup (YOU'RE HERE)
2. 🔑 Generate Android signing key
3. 🗝️ Get API keys (Google Maps, Stripe, etc.)
4. ⚙️ Configure backend `.env`
5. 🧪 Test everything locally

See `GETTING_STARTED.md` for full checklist!

---

**When you're done, let me know and I'll help you with the signing key setup!** 🚀
