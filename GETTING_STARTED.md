# 🚀 GETTING STARTED - Quick Setup Guide

This guide will help you complete the critical setup tasks to make your EVConnect app production-ready.

## ⚡ What We Just Fixed

✅ **Created `lib/config/api_config.dart`** - API configuration file  
✅ **Fixed import paths** - Bank account setup screen imports corrected  
✅ **Changed package name** - From `com.example.evconnect_app` to `com.evconnect.app`  
✅ **Created `.env` file** - Environment variables template  

---

## 🔥 CRITICAL NEXT STEPS (Do These Now)

### 1. Set Up Firebase (Required for Push Notifications)

**Time**: ~2 hours

#### Android Setup

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Create or select your project**: `EVConnect`
3. **Add Android App**:
   - Click "Add app" → Android icon
   - **Android package name**: `com.evconnect.app` (we just changed it!)
   - **App nickname**: `EVConnect Android`
   - Click "Register app"

4. **Download `google-services.json`**:
   ```bash
   # Place the downloaded file here:
   # evconnect_app/android/app/google-services.json
   ```

5. **Update Android build.gradle**:

   **File**: `android/build.gradle.kts`
   ```kotlin
   buildscript {
       dependencies {
           classpath("com.google.gms:google-services:4.4.0")  // Add this
       }
   }
   ```

   **File**: `android/app/build.gradle.kts` (add at the end)
   ```kotlin
   plugins {
       id("com.android.application")
       id("kotlin-android")
       id("dev.flutter.flutter-gradle-plugin")
       id("com.google.gms.google-services")  // Add this line
   }
   ```

#### iOS Setup

1. **Add iOS App in Firebase**:
   - Click "Add app" → iOS icon
   - **iOS bundle ID**: `com.evconnect.app`
   - **App nickname**: `EVConnect iOS`
   - Click "Register app"

2. **Download `GoogleService-Info.plist`**:
   ```bash
   # Open Xcode first
   open ios/Runner.xcworkspace
   
   # Then drag GoogleService-Info.plist into Runner/Runner folder in Xcode
   # ✅ Check "Copy items if needed"
   # ✅ Select "Runner" target
   ```

3. **Update iOS Bundle ID in Xcode**:
   - Open: `ios/Runner.xcworkspace`
   - Select "Runner" project
   - Go to: Signing & Capabilities
   - Change Bundle Identifier to: `com.evconnect.app`

4. **Update `firebase_options.dart`**:
   ```bash
   # After adding both config files, run:
   cd evconnect_app
   flutter pub global activate flutterfire_cli
   flutterfire configure --project=evconnect  # Use your Firebase project ID
   ```

**✅ Verification**:
```bash
cd evconnect_app
flutter clean
flutter pub get
flutter run  # Should build without Firebase errors
```

---

### 2. Generate Android Release Signing Key

**Time**: ~1 hour

```bash
# Generate keystore
keytool -genkey -v -keystore ~/evconnect-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias evconnect

# You'll be prompted for:
# - Keystore password (remember this!)
# - Your name and organization details
# - Key password (can be same as keystore password)
```

**Create `android/key.properties`**:
```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=evconnect
storeFile=/Users/akilanishan/evconnect-release-key.jks
```

**Update `android/app/build.gradle.kts`**:

Add before `android {` block:
```kotlin
// Load keystore properties
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config

    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String?
            keyPassword = keystoreProperties["keyPassword"] as String?
            storeFile = keystoreProperties["storeFile"]?.let { file(it) }
            storePassword = keystoreProperties["storePassword"] as String?
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            // ... existing config
        }
    }
}
```

**Update `.gitignore`**:
```bash
# Add these lines to evconnect_app/.gitignore
**/key.properties
**/*.jks
**/*.keystore
```

---

### 3. Get Required API Keys

**Time**: ~3-4 hours

#### Google Maps API Key

1. Go to: https://console.cloud.google.com/
2. Create new project or select existing
3. Enable APIs:
   - Maps SDK for Android
   - Maps SDK for iOS  
   - Places API
   - Geocoding API
4. Create API Key (Credentials → Create Credentials → API Key)
5. Add restrictions:
   - Android: Add package `com.evconnect.app`
   - iOS: Add bundle ID `com.evconnect.app`

**Update `.env`**:
```env
GOOGLE_MAPS_API_KEY=AIzaSyD...your_actual_key
```

**Update Android**:
**File**: `android/app/src/main/AndroidManifest.xml`
```xml
<application>
    <meta-data
        android:name="com.google.android.geo.API_KEY"
        android:value="AIzaSyD...your_actual_key"/>
</application>
```

**Update iOS**:
**File**: `ios/Runner/AppDelegate.swift`
```swift
import GoogleMaps

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GMSServices.provideAPIKey("AIzaSyD...your_actual_key")
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

#### Stripe API Keys

1. Go to: https://dashboard.stripe.com/
2. Get test keys: Dashboard → Developers → API keys
3. Copy **Publishable key** (starts with `pk_test_`)

**Update `.env`**:
```env
STRIPE_PUBLISHABLE_KEY=pk_test_...your_actual_key
```

For production, you'll need to get **live keys** (`pk_live_...`)

#### OpenWeather API Key

1. Go to: https://openweathermap.org/api
2. Sign up for free tier (60 calls/min)
3. Get API key from account

**Update `.env`**:
```env
OPENWEATHER_API_KEY=...your_actual_key
```

#### PayHere (Sri Lanka Payments)

1. Go to: https://www.payhere.lk/
2. Sign up for merchant account
3. Get Merchant ID and Merchant Secret

**Update backend** `.env`:
```env
PAYHERE_MERCHANT_ID=...
PAYHERE_MERCHANT_SECRET=...
```

---

### 4. Create Backend Environment File

**Time**: ~1 hour

```bash
cd evconnect_backend
cp .env.example .env
```

**Generate secure secrets**:
```bash
# JWT Secret
openssl rand -base64 32

# JWT Refresh Secret
openssl rand -base64 32

# Database password (for production)
openssl rand -base64 24

# Charging service API key
openssl rand -base64 24
```

**Update `evconnect_backend/.env`**:
```env
# Database (for now, keep localhost for development)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=akilanishan
DATABASE_PASSWORD=
DATABASE_NAME=evconnect

# JWT Secrets (replace with generated values)
JWT_SECRET=<paste-generated-secret-1>
JWT_REFRESH_SECRET=<paste-generated-secret-2>
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Server
PORT=3000
NODE_ENV=development

# Charging Service
CHARGING_SERVICE_URL=http://localhost:4000
CHARGING_SERVICE_API_KEY=<paste-generated-api-key>

# Stripe (Test keys for now)
STRIPE_SECRET_KEY=sk_test_...your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_secret

# PayHere
PAYHERE_BASE_URL=https://sandbox.payhere.lk  # sandbox for testing
PAYHERE_MERCHANT_ID=...your_merchant_id
PAYHERE_MERCHANT_SECRET=...your_merchant_secret
PAYHERE_NOTIFY_URL=http://localhost:3000/api/payments/webhook
PAYHERE_RETURN_URL=http://localhost:3000/payment/success
PAYHERE_CANCEL_URL=http://localhost:3000/payment/cancel

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8080,http://localhost:5173

# Firebase Admin SDK (get from Firebase Console → Project Settings → Service Accounts)
FIREBASE_PROJECT_ID=evconnect
FIREBASE_PRIVATE_KEY=...from_service_account_json
FIREBASE_CLIENT_EMAIL=...from_service_account_json

# Cloudinary (optional, for image uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

### 5. Fix Remaining Compilation Warnings

**Time**: ~2-3 hours

```bash
cd evconnect_app

# Run analysis
flutter analyze

# Auto-fix what can be fixed
dart fix --apply

# Clean unused imports
flutter pub run import_sorter:main
```

**Manual fixes needed**:
- Remove null-check operators (`!`) on non-nullable values
- Remove unused imports
- Fix duplicate imports

---

### 6. Test Everything Locally

**Time**: ~2 hours

**Start Backend**:
```bash
cd evconnect_backend
npm run start:dev
```

**Start Flutter App**:
```bash
cd evconnect_app
flutter run -d chrome  # or your device
```

**Test Critical Flows**:
- [ ] User registration
- [ ] Login
- [ ] View chargers on map
- [ ] Create booking
- [ ] Payment flow
- [ ] Owner charger registration

---

## 📋 WHAT'S NEXT (After Critical Setup)

### Week 1 Remaining Tasks:
- [ ] Create privacy policy document
- [ ] Create terms of service document  
- [ ] Set up Apple Developer account (for iOS)
- [ ] Deploy backend to staging environment
- [ ] Configure SSL certificates

### Week 2 Tasks:
- [ ] Implement social logins (Google, Apple)
- [ ] Complete all TODO items
- [ ] End-to-end testing
- [ ] Performance optimization

### Week 3 Tasks:
- [ ] Device testing (multiple iOS/Android versions)
- [ ] Load testing backend
- [ ] Security audit
- [ ] Beta testing with users

### Week 4 Tasks:
- [ ] Create App Store/Play Store listings
- [ ] Upload screenshots and videos
- [ ] Submit for review
- [ ] Production deployment
- [ ] Launch! 🎉

---

## 🆘 TROUBLESHOOTING

### Firebase Issues

**"google-services.json not found"**:
- Ensure file is in `android/app/google-services.json`
- Run `flutter clean && flutter pub get`

**"GoogleService-Info.plist not found"**:
- Add via Xcode (drag & drop), not Finder
- Check "Copy items if needed"
- Ensure "Runner" target is selected

### Build Issues

**"Execution failed for task ':app:processDebugGoogleServices'"**:
- Package name mismatch between `build.gradle.kts` and Firebase
- Verify both use `com.evconnect.app`

**iOS build fails**:
- Clean build folder in Xcode: Product → Clean Build Folder
- Delete Pods: `cd ios && rm -rf Pods Podfile.lock && pod install`

---

## 📞 NEED HELP?

Check these existing guides:
- `FIREBASE_SETUP_GUIDE.md` - Detailed Firebase setup
- `SETUP_GUIDE.md` - General setup instructions
- `TESTING_GUIDE.md` - Testing procedures
- `PRODUCTION_READINESS_CHECKLIST.md` - Complete checklist

---

## ✅ PROGRESS TRACKER

**Critical Setup** (Do These First):
- [x] Fix compilation errors
- [x] Create API config file
- [x] Change package name
- [x] Create `.env` file
- [ ] Set up Firebase (Android + iOS)
- [ ] Generate release signing key
- [ ] Get Google Maps API key
- [ ] Get Stripe API keys
- [ ] Get OpenWeather API key
- [ ] Configure backend `.env`
- [ ] Fix compilation warnings
- [ ] Test locally

**Once you complete these 12 tasks above**, your app will be in a much better state and you can move to the next phase!

---

**Last Updated**: December 6, 2025  
**Your Current Progress**: 4/12 Critical Tasks Complete ✅
