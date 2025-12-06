# 🔑 Create Separate Google Maps API Keys - Step by Step

## 📍 Your App Details (Copy These!)
```
Package Name (Android): com.evconnect.app
Bundle ID (iOS): com.evconnect.app
SHA-1 Fingerprint: 2D:4A:E5:D1:CC:F7:E4:D2:C5:98:8E:59:E5:B2:8F:11:BB:01:B0:57
```

---

## 🤖 STEP 1: Create Android API Key

### 1.1 Open Google Cloud Console
Go to: https://console.cloud.google.com/apis/credentials

### 1.2 Create New Key
1. Click **"+ CREATE CREDENTIALS"**
2. Select **"API key"**
3. A popup will show your new key → Click **"RESTRICT KEY"**

### 1.3 Name the Key
- In the "Name" field at top, enter: **`EVConnect Android Key`**

### 1.4 Application Restrictions (Android)
1. Under "Application restrictions", select: **Android apps**
2. Click **"+ Add an item"**
3. Enter:
   - **Package name:** `com.evconnect.app`
   - **SHA-1 certificate fingerprint:** `2D:4A:E5:D1:CC:F7:E4:D2:C5:98:8E:59:E5:B2:8F:11:BB:01:B0:57`
4. Click **"Done"**

### 1.5 API Restrictions
1. Under "API restrictions", select: **Restrict key**
2. In the dropdown, check these 4 APIs:
   - ✅ **Maps SDK for Android**
   - ✅ **Places API**
   - ✅ **Geocoding API**
   - ✅ **Directions API** (optional but recommended)

   > **Note:** If you don't see these APIs, you need to enable them first:
   > - Maps SDK for Android: https://console.cloud.google.com/apis/library/maps-android-backend.googleapis.com
   > - Places API: https://console.cloud.google.com/apis/library/places-backend.googleapis.com
   > - Geocoding API: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com

3. Click **"Save"**

### 1.6 Copy Android Key
1. Once saved, you'll see your key on the Credentials page
2. Click the **copy icon** next to "EVConnect Android Key"
3. **SAVE IT!** Format: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

---

## 🍎 STEP 2: Create iOS API Key

### 2.1 Create New Key
1. Still on: https://console.cloud.google.com/apis/credentials
2. Click **"+ CREATE CREDENTIALS"** again
3. Select **"API key"**
4. Click **"RESTRICT KEY"** in the popup

### 2.2 Name the Key
- In the "Name" field at top, enter: **`EVConnect iOS Key`**

### 2.3 Application Restrictions (iOS)
1. Under "Application restrictions", select: **iOS apps**
2. Click **"+ Add an item"**
3. Enter:
   - **Bundle identifier:** `com.evconnect.app`
4. Click **"Done"**

### 2.4 API Restrictions
1. Under "API restrictions", select: **Restrict key**
2. In the dropdown, check these 4 APIs:
   - ✅ **Maps SDK for iOS**
   - ✅ **Places API**
   - ✅ **Geocoding API**
   - ✅ **Directions API** (optional but recommended)

   > **Note:** If you don't see these APIs, enable them first:
   > - Maps SDK for iOS: https://console.cloud.google.com/apis/library/maps-ios-backend.googleapis.com

3. Click **"Save"**

### 2.5 Copy iOS Key
1. Once saved, you'll see your key on the Credentials page
2. Click the **copy icon** next to "EVConnect iOS Key"
3. **SAVE IT!** Format: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

---

## ✅ Verification Checklist

Before proceeding, verify you have:

- [ ] Created "EVConnect Android Key"
- [ ] Set restriction: Android apps only
- [ ] Added package: `com.evconnect.app`
- [ ] Added SHA-1: `2D:4A:E5:D1:CC:F7:E4:D2:C5:98:8E:59:E5:B2:8F:11:BB:01:B0:57`
- [ ] Enabled 4 APIs for Android key
- [ ] Copied Android key (starts with AIzaSy...)

- [ ] Created "EVConnect iOS Key"
- [ ] Set restriction: iOS apps only
- [ ] Added bundle: `com.evconnect.app`
- [ ] Enabled 4 APIs for iOS key
- [ ] Copied iOS key (starts with AIzaSy...)

---

## 📝 Paste Your Keys Here

Once you have both keys, provide them in this format:

```
Android Key: AIzaSy...
iOS Key: AIzaSy...
```

I'll then update all the configuration files automatically!

---

## 🔒 Security Note

These keys are now:
- ✅ Restricted to your specific app package/bundle
- ✅ Restricted to your signing certificate (Android)
- ✅ Restricted to only the Maps APIs you need
- ✅ Cannot be used by other apps or websites

This is **production-grade security** recommended by Google!

---

## ⏱️ Expected Time
- Creating Android key: ~5 minutes
- Creating iOS key: ~5 minutes
- **Total: ~10 minutes**

---

**Ready?** Let me know when you have both keys! 🚀
