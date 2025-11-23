# Firebase Setup Guide - EVConnect Push Notifications

## Prerequisites
- Firebase account (free tier is sufficient)
- Flutter project configured
- Access to Firebase Console

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Project name: `EVConnect` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click **Create project**

---

## Step 2: Add Android App

### 2.1 Register Android App
1. In Firebase Console, click **Add app** → Select **Android**
2. Enter Android package name: `com.evconnect.app`
   - Find in: `evconnect_app/android/app/build.gradle` → `applicationId`
3. App nickname (optional): `EVConnect Android`
4. Debug signing certificate SHA-1 (optional for FCM)
5. Click **Register app**

### 2.2 Download google-services.json
1. Download `google-services.json`
2. Move to: `evconnect_app/android/app/google-services.json`

### 2.3 Update Android build.gradle

**File**: `evconnect_app/android/build.gradle`
```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:7.3.0'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.7.10'
        classpath 'com.google.gms:google-services:4.4.0'  // Add this line
    }
}
```

**File**: `evconnect_app/android/app/build.gradle`
```gradle
apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'
apply plugin: 'com.google.gms.google-services'  // Add this line

// ... rest of the file
```

### 2.4 Update AndroidManifest.xml

**File**: `evconnect_app/android/app/src/main/AndroidManifest.xml`

Add inside `<application>` tag:
```xml
<application>
    <!-- Existing content -->
    
    <!-- Firebase Messaging Service -->
    <service
        android:name="io.flutter.plugins.firebase.messaging.FlutterFirebaseMessagingService"
        android:exported="false">
        <intent-filter>
            <action android:name="com.google.firebase.MESSAGING_EVENT" />
        </intent-filter>
    </service>
    
    <!-- Notification Channel (for Android 8.0+) -->
    <meta-data
        android:name="com.google.firebase.messaging.default_notification_channel_id"
        android:value="charging_updates" />
    
    <!-- Notification Icon -->
    <meta-data
        android:name="com.google.firebase.messaging.default_notification_icon"
        android:resource="@drawable/ic_notification" />
        
    <!-- Notification Color -->
    <meta-data
        android:name="com.google.firebase.messaging.default_notification_color"
        android:resource="@color/notification_color" />
</application>
```

Add permissions before `<application>`:
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

---

## Step 3: Add iOS App

### 3.1 Register iOS App
1. In Firebase Console, click **Add app** → Select **iOS**
2. Enter iOS bundle ID: `com.evconnect.app`
   - Find in Xcode: Open `evconnect_app/ios/Runner.xcworkspace` → Target → Bundle Identifier
3. App nickname (optional): `EVConnect iOS`
4. App Store ID (optional)
5. Click **Register app**

### 3.2 Download GoogleService-Info.plist
1. Download `GoogleService-Info.plist`
2. Open Xcode: `evconnect_app/ios/Runner.xcworkspace`
3. Drag `GoogleService-Info.plist` into `Runner/Runner` folder in Xcode
4. ✅ Ensure "Copy items if needed" is checked
5. ✅ Ensure "Runner" target is selected

### 3.3 Enable Push Notifications Capability
1. In Xcode, select `Runner` target
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **Push Notifications**
5. Add **Background Modes** → Check **Remote notifications**

### 3.4 Update AppDelegate.swift

**File**: `evconnect_app/ios/Runner/AppDelegate.swift`
```swift
import UIKit
import Flutter
import Firebase  // Add this

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FirebaseApp.configure()  // Add this
    
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self as? UNUserNotificationCenterDelegate
    }
    
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

### 3.5 Update Info.plist

**File**: `evconnect_app/ios/Runner/Info.plist`

Add notification permission descriptions:
```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required to scan QR codes and take charger photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Photo library access is required to select charger photos</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Location access is required for navigation and finding nearby chargers</string>
<key>UIBackgroundModes</key>
<array>
    <string>fetch</string>
    <string>remote-notification</string>
</array>
```

---

## Step 4: Configure Cloud Messaging

### 4.1 Get FCM Server Key
1. Firebase Console → Project Settings → Cloud Messaging
2. Copy **Server key** (for backend API)
3. Copy **Sender ID**

### 4.2 Upload iOS APNs Certificate (Production)
1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Certificates, Identifiers & Profiles → Keys
3. Create new key with **Apple Push Notifications service (APNs)** enabled
4. Download `.p8` key file
5. Go to Firebase Console → Project Settings → Cloud Messaging → iOS app
6. Upload APNs Authentication Key (.p8)
7. Enter Key ID and Team ID

---

## Step 5: Initialize Firebase in Flutter

**File**: `evconnect_app/lib/main.dart`

```dart
import 'package:firebase_core/firebase_core.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Initialize Notification Service
  final notificationService = NotificationService();
  await notificationService.initialize();
  
  runApp(const ProviderScope(child: MyApp()));
}
```

---

## Step 6: Test Push Notifications

### 6.1 Get FCM Token
Add temporary debug code in your app:
```dart
final token = await FirebaseMessaging.instance.getToken();
print('FCM Token: $token');
```

### 6.2 Send Test Notification via Firebase Console
1. Firebase Console → Cloud Messaging
2. Click **Send your first message**
3. Notification title: `Test Notification`
4. Notification text: `Testing EVConnect notifications`
5. Click **Send test message**
6. Paste FCM token from step 6.1
7. Click **Test**

### 6.3 Send Test via Backend API
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_FCM_TOKEN",
    "notification": {
      "title": "Charging Started",
      "body": "Your EV is now charging at Downtown Station"
    },
    "data": {
      "type": "charging_started",
      "chargerId": "123",
      "sessionId": "456"
    }
  }'
```

---

## Step 7: Backend Integration

### 7.1 Store FCM Tokens
Create endpoint to save user's FCM token:

**Endpoint**: `POST /api/users/:userId/fcm-token`
```json
{
  "fcmToken": "fKJ8h9...",
  "platform": "ios" // or "android"
}
```

**Database Schema**:
```sql
CREATE TABLE user_fcm_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  fcm_token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);
```

### 7.2 Send Notifications from Backend

**Node.js Example** (using `firebase-admin`):
```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./path/to/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Send notification
async function sendChargingNotification(userId, type, data) {
  const fcmToken = await getUserFcmToken(userId);
  
  const message = {
    token: fcmToken,
    notification: {
      title: getNotificationTitle(type),
      body: getNotificationBody(type, data)
    },
    data: {
      type: type,
      chargerId: data.chargerId,
      sessionId: data.sessionId
    }
  };
  
  await admin.messaging().send(message);
}
```

---

## Step 8: Production Checklist

- [ ] `google-services.json` added to `android/app/`
- [ ] `GoogleService-Info.plist` added to iOS Runner in Xcode
- [ ] Android build.gradle updated with google-services plugin
- [ ] iOS Push Notifications capability enabled
- [ ] iOS Background Modes enabled
- [ ] APNs Authentication Key uploaded to Firebase
- [ ] Firebase initialized in main.dart
- [ ] NotificationService initialized
- [ ] FCM token saved to backend
- [ ] Test notification received on Android
- [ ] Test notification received on iOS
- [ ] Notification tap navigation works
- [ ] Background notifications work
- [ ] Foreground notifications work

---

## Troubleshooting

### Android Issues

**Issue**: "google-services.json not found"
- **Solution**: Ensure file is in `android/app/google-services.json`
- Run: `flutter clean && flutter pub get`

**Issue**: "Default FirebaseApp is not initialized"
- **Solution**: Add `apply plugin: 'com.google.gms.google-services'` to `android/app/build.gradle`

**Issue**: Notifications not showing
- **Solution**: Check notification channel is created in NotificationService
- Verify `POST_NOTIFICATIONS` permission granted (Android 13+)

### iOS Issues

**Issue**: "GoogleService-Info.plist not found"
- **Solution**: Add file via Xcode (drag & drop), not Finder
- Ensure "Copy items if needed" is checked
- Ensure target is selected

**Issue**: Notifications not received
- **Solution**: Verify APNs certificate uploaded to Firebase
- Check Push Notifications capability enabled in Xcode
- Test on real device (not simulator)

**Issue**: App crashes on launch
- **Solution**: Ensure `FirebaseApp.configure()` is called before other Firebase calls
- Check GoogleService-Info.plist is properly added to target

---

## Next Steps

After Firebase setup is complete:
1. Test all notification types (charging started, complete, 80%, etc.)
2. Implement backend endpoints for sending notifications
3. Add notification preferences in user settings
4. Test notification navigation flows
5. Monitor FCM delivery reports in Firebase Console

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [FlutterFire](https://firebase.flutter.dev/)
- [FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/http-server-ref)
- [Apple Push Notifications](https://developer.apple.com/notifications/)

---

*Last Updated: 23 November 2025*
