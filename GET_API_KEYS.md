# 🔑 API Keys Setup Guide

Complete guide to getting all required API keys for EVConnect app.

## Progress Checklist
- [ ] Google Maps API Key
- [ ] Stripe API Keys (Test & Live)
- [ ] OpenWeather API Key
- [ ] Update .env file
- [ ] Update Android configuration
- [ ] Update iOS configuration
- [ ] Test all integrations

---

## 1. Google Maps API Key 🗺️

**Time Required:** ~30 minutes  
**Cost:** Free tier includes $200/month credit (covers ~28,000 map loads)

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account
3. If you don't have a project, create one:
   - Click "Select a project" → "New Project"
   - Name: "EVConnect"
   - Click "Create"

### Step 2: Enable Required APIs
You need to enable **4 APIs** for the app to work:

1. **Maps SDK for Android**
   - Go to: https://console.cloud.google.com/apis/library/maps-android-backend.googleapis.com
   - Click "Enable"
   - Wait for confirmation

2. **Maps SDK for iOS**
   - Go to: https://console.cloud.google.com/apis/library/maps-ios-backend.googleapis.com
   - Click "Enable"
   - Wait for confirmation

3. **Places API** (for location search)
   - Go to: https://console.cloud.google.com/apis/library/places-backend.googleapis.com
   - Click "Enable"
   - Wait for confirmation

4. **Geocoding API** (for address lookup)
   - Go to: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com
   - Click "Enable"
   - Wait for confirmation

### Step 3: Create API Key
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "+ CREATE CREDENTIALS" → "API key"
3. Your API key will be created (format: `AIzaSy...`)
4. **Important:** Click "RESTRICT KEY" immediately

### Step 4: Restrict API Key (SECURITY - CRITICAL!)

#### Set Application Restrictions:
1. Choose: **"Android apps"**
2. Click "+ Add an item"
3. Enter:
   - **Package name:** `com.evconnect.app`
   - **SHA-1 fingerprint:** `2D:4A:E5:D1:CC:F7:E4:D2:C5:98:8E:59:E5:B2:8F:11:BB:01:B0:57`
4. Click "Done"

5. Click "+ Add an item" again for iOS
6. Choose: **"iOS apps"**
7. Enter:
   - **Bundle ID:** `com.evconnect.app`
8. Click "Done"

#### Set API Restrictions:
1. Choose: **"Restrict key"**
2. Select these 4 APIs:
   - ✅ Maps SDK for Android
   - ✅ Maps SDK for iOS
   - ✅ Places API
   - ✅ Geocoding API
3. Click "Save"

### Step 5: Enable Billing (Required!)
⚠️ **Google Maps requires billing to be enabled**, but you get $200 free credit/month.

1. Go to: https://console.cloud.google.com/billing
2. Click "Link a billing account"
3. Follow the prompts to add a credit card
4. Your free $200/month credit will be automatically applied

**Monthly Usage Estimate:**
- 10,000 users × 10 map loads/user = 100,000 map loads
- Cost: ~$700/month
- With $200 credit = **$500/month**

### Step 6: Copy Your API Key
1. Go back to: https://console.cloud.google.com/apis/credentials
2. Find your restricted key
3. Click the copy icon
4. **Save it!** Format: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

---

## 2. Stripe API Keys 💳

**Time Required:** ~15 minutes  
**Cost:** Free (payment processing fees: 2.9% + $0.30 per transaction)

### Step 1: Create Stripe Account
1. Visit: https://dashboard.stripe.com/register
2. Sign up with email
3. Verify your email address
4. Complete business information

### Step 2: Get Test Keys (For Development)
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Make sure you're in **"Test mode"** (toggle in top right)
3. Find **"Publishable key"**:
   - Starts with `pk_test_`
   - Example: `pk_test_51Abc123...`
4. Click "Reveal test key"
5. **Copy the publishable key** (NOT the secret key)

⚠️ **Important:** We only need the **publishable key** in the mobile app!
- ✅ Publishable key (pk_test_...) → Mobile app
- ❌ Secret key (sk_test_...) → Backend only (never in mobile app!)

### Step 3: Get Live Keys (For Production)
⚠️ **Do this AFTER testing!** Don't use live keys until ready.

1. Complete Stripe account verification:
   - Business details
   - Bank account information
   - Tax information
2. Go to: https://dashboard.stripe.com/apikeys
3. Toggle to **"Live mode"** (top right)
4. Find **"Publishable key"**:
   - Starts with `pk_live_`
   - Example: `pk_live_51Abc123...`
5. **Copy the publishable key**

### Step 4: Configure Webhook (Backend)
For the backend to receive payment confirmations:

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. Enter endpoint URL:
   - **Test:** `https://your-test-backend.com/api/payments/webhook`
   - **Live:** `https://api.evconnect.app/api/payments/webhook`
4. Select events:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to backend .env: `STRIPE_WEBHOOK_SECRET=whsec_...`

### What You Need:
- ✅ **Test Publishable Key** (pk_test_...) → Mobile app .env
- ✅ **Live Publishable Key** (pk_live_...) → Mobile app .env (production)
- ✅ **Webhook Secret** (whsec_...) → Backend .env

---

## 3. OpenWeather API Key 🌤️

**Time Required:** ~10 minutes  
**Cost:** Free tier (60 calls/minute, 1,000,000 calls/month)

### Step 1: Create Account
1. Visit: https://openweathermap.org/api
2. Click "Sign Up" (top right)
3. Fill in:
   - Username
   - Email
   - Password
4. Accept terms and conditions
5. Click "Create Account"

### Step 2: Verify Email
1. Check your email inbox
2. Click verification link
3. Account will be activated

### Step 3: Get API Key
1. Log in to: https://home.openweathermap.org/api_keys
2. You'll see a default API key already created
3. **Copy the API key** (format: `a1b2c3d4e5f6g7h8i9j0...`)
4. If you want to create a new key:
   - Enter a name: "EVConnect App"
   - Click "Generate"

### Step 4: Wait for Activation
⚠️ **Important:** New API keys take ~10 minutes to activate.

- Status check: https://openweathermap.org/api
- Try a test call:
  ```bash
  curl "https://api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_API_KEY"
  ```
- If you get a 401 error, wait a few more minutes

### API Usage:
The weather widget will call:
- **Current Weather API:** https://api.openweathermap.org/data/2.5/weather
- Parameters: `lat`, `lon`, `appid`, `units=metric`
- Example response:
  ```json
  {
    "weather": [{"main": "Clear", "description": "clear sky"}],
    "main": {"temp": 28.5, "feels_like": 30.2},
    "name": "Colombo"
  }
  ```

### Free Tier Limits:
- **60 calls/minute** (1 call/second)
- **1,000,000 calls/month**
- **Enough for:** 10,000 users checking weather 100 times/month

---

## 4. Update Configuration Files 📝

### Update .env File
```bash
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_app
```

Edit `.env` and replace placeholders:
```env
# Google Maps API Key
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Stripe Publishable Key (Test)
STRIPE_PUBLISHABLE_KEY=pk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Stripe Publishable Key (Live - use in production)
# STRIPE_PUBLISHABLE_KEY=pk_live_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# OpenWeather API Key
OPENWEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Backend URLs
API_BASE_URL=http://localhost:3000
CHARGING_SERVICE_URL=http://localhost:3001
AI_SERVICE_URL=http://localhost:8000
```

### Update AndroidManifest.xml
```bash
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_app
```

Edit `android/app/src/main/AndroidManifest.xml`:

Add inside `<application>` tag (before `<activity>`):
```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"/>
```

Full example:
```xml
<application
    android:label="EVConnect"
    android:name="${applicationName}"
    android:icon="@mipmap/ic_launcher">
    
    <!-- Google Maps API Key -->
    <meta-data
        android:name="com.google.android.geo.API_KEY"
        android:value="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"/>
    
    <activity
        android:name=".MainActivity"
        ...>
```

### Update iOS Configuration

Edit `ios/Runner/AppDelegate.swift`:

Add at the top:
```swift
import GoogleMaps
```

Update the `application` function:
```swift
override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
) -> Bool {
    // Google Maps API Key
    GMSServices.provideAPIKey("AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
    
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
}
```

---

## 5. Verification ✅

### Test Google Maps
```bash
cd evconnect_app
flutter run
```

- Navigate to charger map screen
- Map should load with markers
- Search should work
- If you see "For development purposes only" watermark → billing not enabled

### Test Stripe
```bash
flutter run
```

- Go to payment screen
- Use test card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., 12/26)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)
- Payment should process successfully

### Test OpenWeather
```bash
flutter run
```

- Check weather widget on home screen
- Should show current temperature and conditions
- If error → check API key activation (wait 10 mins)

---

## 6. Security Checklist 🔒

- [ ] Google Maps API key is **restricted** to your app package and SHA-1
- [ ] Stripe: Only using **publishable key** in mobile app (not secret key!)
- [ ] OpenWeather API key has reasonable rate limits
- [ ] `.env` file is in `.gitignore` (never commit!)
- [ ] All API keys are different for test vs production
- [ ] Backend webhook secrets are secure

---

## 7. Backend Configuration 🖥️

Don't forget to update backend `.env` too!

```bash
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_backend
```

Create/update `.env`:
```env
# Stripe (Backend - Secret Keys!)
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXX

# For production:
# STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXXXXXXXXXX

# Firebase Admin (for push notifications)
FIREBASE_PROJECT_ID=evconnect-13044
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@evconnect-13044.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/evconnect

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
JWT_REFRESH_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# PayHere (Sri Lankan payment gateway)
PAYHERE_MERCHANT_ID=XXXXXXX
PAYHERE_MERCHANT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 8. Cost Summary 💰

### Monthly Costs (Estimated for 10,000 users):

**Google Maps:**
- Free credit: $200/month
- Estimated usage: ~$700/month
- **Your cost: $500/month**

**Stripe:**
- No monthly fee
- Per transaction: 2.9% + $0.30
- Example: $10 charge = $0.59 fee
- **Cost: Per transaction only**

**OpenWeather:**
- Free tier: 1M calls/month
- Estimated usage: 100K calls/month
- **Your cost: $0/month**

**Firebase:**
- Free tier: Generous limits
- Push notifications: Free (unlimited)
- Storage: 5GB free
- **Your cost: $0-10/month**

**Total Monthly Cost: ~$500-520** (mostly Google Maps)

---

## 9. Next Steps 🚀

After getting all API keys:

1. ✅ Update `.env` file
2. ✅ Update `AndroidManifest.xml`
3. ✅ Update `AppDelegate.swift`
4. ✅ Test all integrations locally
5. ✅ Fix remaining code warnings (888 warnings)
6. ✅ Build release APK: `flutter build apk --release`
7. ✅ Test release build thoroughly
8. ✅ Deploy backend to production server
9. ✅ Update production API URLs in app
10. ✅ Submit to Google Play Store and App Store

---

## Troubleshooting 🔧

### Google Maps not showing:
- Check billing is enabled
- Verify API key in AndroidManifest.xml matches console
- Check SHA-1 fingerprint is correct in restrictions
- Wait 5 minutes after enabling APIs

### Stripe payment failing:
- Verify using test publishable key (pk_test_...)
- Check test card number: 4242 4242 4242 4242
- Ensure Stripe package is properly initialized

### Weather not loading:
- Wait 10 minutes for API key activation
- Check API key is correct in .env
- Verify network connection
- Check OpenWeather API status

### "For development purposes only" on map:
- Enable billing in Google Cloud Console
- Add credit card (you still get $200 free/month)

---

## Support Resources 📚

- **Google Maps:** https://developers.google.com/maps/documentation
- **Stripe:** https://stripe.com/docs/testing
- **OpenWeather:** https://openweathermap.org/faq
- **Flutter env:** https://pub.dev/packages/flutter_dotenv

---

**Status:** Ready to get all three API keys! Follow the guides above. 🚀
