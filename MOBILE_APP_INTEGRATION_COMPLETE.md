# 📱 EVConnect Mobile App - Backend Integration Complete!

**Date:** November 14, 2025  
**Status:** ✅ Ready for Testing

---

## 🎉 What's Been Done

### 1. **API Configuration Fixed**
- ✅ Updated `ApiClient` base URL from `http://localhost:4000` to `http://localhost:4000/api`
- ✅ All API endpoints now correctly point to the backend `/api` routes

### 2. **Data Models Updated**
- ✅ **ChargerModel**: Added robust parsing for PostgreSQL numeric strings (lat, lng, powerKw, pricePerKwh)
- ✅ Added `createdAt` and `updatedAt` timestamp fields
- ✅ **BookingModel**: Already compatible with backend response
- ✅ **AuthService**: Already using correct JWT token handling

### 3. **Services Connected**
- ✅ **AuthService**: Login & Register connected to `/api/auth` endpoints
- ✅ **ChargerService**: Connected to `/api/chargers` endpoints
- ✅ **BookingService**: Connected to `/api/bookings` endpoints
- ✅ All services use `ApiClient` with proper error handling

### 4. **Dependencies**
- ✅ `flutter pub get` completed successfully
- ✅ No critical Dart analysis errors (only minor warnings)

---

## 🧪 Testing Guide

### Prerequisites
- ✅ Backend running on `http://localhost:4000` (currently running)
- ✅ PostgreSQL database populated with data:
  - 8 users (1 admin, 4 regular users, 3 owners)
  - 10 chargers across Bay Area locations
  - 0 bookings (ready for testing)

### Test Credentials

#### Regular Users (for mobile app testing)
```
Email: john.doe@example.com
Password: password123

Email: jane.smith@example.com  
Password: password123

Email: mike.wilson@example.com
Password: password123
```

#### Charger Owners (can also use mobile app)
```
Email: owner1@evconnect.com
Password: password123
```

#### Admin (for admin dashboard only)
```
Email: admin@evconnect.com
Password: admin123
```

---

## 🚀 How to Run & Test

### Step 1: Start the Flutter App

**Choose your testing method:**

#### Option A: iOS Simulator (Mac only)
```bash
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_app
flutter run -d "iPhone"
```

#### Option B: Android Emulator
```bash
# First update the base URL for Android emulator
# Edit: lib/core/api_client.dart
# Change: static const String baseUrl = 'http://localhost:4000/api';
# To:     static const String baseUrl = 'http://10.0.2.2:4000/api';

cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_app
flutter run -d emulator
```

#### Option C: Physical Device (same WiFi network)
```bash
# Update base URL to your computer's IP
# Edit: lib/core/api_client.dart  
# Change: static const String baseUrl = 'http://localhost:4000/api';
# To:     static const String baseUrl = 'http://YOUR_COMPUTER_IP:4000/api';
# 
# Find your IP: System Preferences → Network → WiFi → IP Address

cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_app
flutter run
```

---

### Step 2: Test User Registration (New Account)

1. **Launch app** → Should open on Login screen
2. **Tap "Sign Up"** or "Create Account" button
3. **Fill in details:**
   - Name: Test User
   - Email: testuser@example.com
   - Password: Test123!
4. **Submit** → Should register and navigate to home screen
5. **Verify in database:**
   ```bash
   cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_backend
   PGPASSWORD='evconnect_password' psql -h localhost -U akilanishan -d evconnect \
     -c "SELECT email, name, role FROM users WHERE email = 'testuser@example.com';"
   ```
   Should show: `testuser@example.com | Test User | user`

**Expected Behavior:**
- ✅ No errors during registration
- ✅ Automatic login after registration
- ✅ JWT token saved in secure storage
- ✅ Navigate to home/map screen
- ✅ User appears in database

---

### Step 3: Test User Login (Existing Account)

1. **If already logged in,** log out first
2. **On Login screen, enter:**
   - Email: john.doe@example.com
   - Password: password123
3. **Tap Login** → Should navigate to home screen
4. **Check the logs/console** → Should see API request to `/api/auth/login`

**Expected Behavior:**
- ✅ Successful login
- ✅ JWT token saved
- ✅ Navigate to home/map screen
- ✅ No error messages

**If login fails:**
- Check backend is running: `lsof -i :4000`
- Check network connectivity
- For Android emulator: Verify using `10.0.2.2` instead of `localhost`
- Check logs: `flutter logs` in terminal

---

### Step 4: Test Charger Map Display

1. **After logging in** → Should be on Map Screen
2. **Map should display:**
   - ✅ Google Map (or default map view)
   - ✅ 10 charger markers across Bay Area
   - ✅ Your current location (if permissions granted)

3. **Tap on a charger marker:**
   - ✅ Should show charger details
   - ✅ Name, address, price, power rating
   - ✅ Status (available, in-use, etc.)

4. **Test nearby chargers:**
   - Map should center on San Francisco Bay Area
   - Chargers should be visible at various locations

**Expected Behavior:**
- ✅ All 10 chargers load from backend
- ✅ Markers appear on map at correct locations
- ✅ Charger details display when tapped
- ✅ No mock/fake data

**If chargers don't show:**
- Check console for API errors
- Verify backend endpoint: `curl http://localhost:4000/api/chargers`
- Check if location permissions are granted
- Check map initialization

---

### Step 5: Test Booking Creation

1. **On Map Screen**, tap a charger with status "available"
2. **Tap "Book Now"** or similar button
3. **Select booking details:**
   - Start time (e.g., now or future time)
   - End time (e.g., 1-2 hours later)
4. **Confirm booking**
5. **Verify in database:**
   ```bash
   cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_backend
   PGPASSWORD='evconnect_password' psql -h localhost -U akilanishan -d evconnect \
     -c "SELECT * FROM bookings ORDER BY \"createdAt\" DESC LIMIT 1;"
   ```

**Expected Behavior:**
- ✅ Booking created successfully
- ✅ Booking appears in database
- ✅ User receives confirmation
- ✅ Can view booking in "My Bookings" section

---

### Step 6: Test My Bookings View

1. **Navigate to "My Bookings"** (usually in menu or bottom nav)
2. **Should display:**
   - ✅ List of user's bookings
   - ✅ Booking status (pending, confirmed, completed)
   - ✅ Charger details
   - ✅ Time and date
3. **Try to cancel a booking:**
   - ✅ Should update status to "cancelled"
   - ✅ Verify in database

---

## 🔍 Debugging Tips

### Network Errors

**Problem:** "Network Error" or "Connection refused"

**Solutions:**
1. **Check backend is running:**
   ```bash
   lsof -i :4000 | grep LISTEN
   # Should show: node ... TCP *:terabase (LISTEN)
   ```

2. **Test backend directly:**
   ```bash
   curl http://localhost:4000/api/chargers
   # Should return JSON array of chargers
   ```

3. **For Android Emulator:**
   - Must use `10.0.2.2` instead of `localhost`
   - Update `lib/core/api_client.dart` baseUrl

4. **For Physical Device:**
   - Must use computer's actual IP address (e.g., `192.168.1.x`)
   - Ensure device and computer on same WiFi network
   - Check firewall allows port 4000

### Authentication Errors

**Problem:** "Unauthorized" or "401" errors

**Solutions:**
1. **Token might be expired** (expires after 7 days):
   ```bash
   # Check token in app storage or re-login
   ```

2. **Verify user exists:**
   ```bash
   PGPASSWORD='evconnect_password' psql -h localhost -U akilanishan -d evconnect \
     -c "SELECT email, role, \"isBanned\" FROM users WHERE email = 'john.doe@example.com';"
   ```

3. **Check if user is banned:**
   - If `isBanned = true`, cannot login
   - Unban user: `UPDATE users SET "isBanned" = false WHERE email = 'email@example.com';`

### Parsing Errors

**Problem:** "type 'String' is not a subtype of type 'double'"

**Solutions:**
- ChargerModel already handles string-to-double conversion
- If still occurs, check backend response format:
  ```bash
  curl http://localhost:4000/api/chargers | python3 -m json.tool | head -50
  ```

### Map Not Loading

**Problem:** Map shows blank or crashes

**Solutions:**
1. **Check Google Maps API key:**
   - Android: `android/app/src/main/AndroidManifest.xml`
   - iOS: `ios/Runner/AppDelegate.swift`
2. **Grant location permissions** when prompted
3. **Check map widget initialization** in `map_screen.dart`

---

## 📊 Current Backend Data

### Users (8 total)
- **Admin:** 1 (admin@evconnect.com)
- **Regular Users:** 4 (john, jane, mike, sarah)
- **Owners:** 3 (owner1, owner2, owner3)

### Chargers (10 total)
- **Locations:** San Francisco, Palo Alto, Mountain View, San Jose
- **Status:**
  - Available: 6
  - In-use: 1
  - Offline: 1
  - Maintenance: 1
  - Pending approval: 1
- **Power Range:** 50kW - 350kW
- **Price Range:** $0.25 - $0.50 per kWh

### Bookings
- **Current Count:** 0 (ready for testing)

---

## 🎯 What to Test Next

### Phase 1: Core Functionality (Today)
- [x] User registration
- [x] User login
- [x] Charger listing on map
- [ ] Booking creation
- [ ] Booking cancellation
- [ ] My bookings view

### Phase 2: Advanced Features (Next)
- [ ] Charger owner registration (create charger)
- [ ] Real-time charger status updates
- [ ] Payment integration
- [ ] Trip planner
- [ ] Breakdown assistance
- [ ] Notifications

### Phase 3: Polish (Later)
- [ ] Dark mode
- [ ] Offline mode
- [ ] Better error messages
- [ ] Loading states
- [ ] Animations

---

## 🐛 Known Issues

1. **WebSocket removed** - Real-time updates disabled for now
2. **Deprecated warnings** in Flutter code (non-critical):
   - `desiredAccuracy` in location services
   - `withOpacity` in color utilities
3. **Android emulator** requires `10.0.2.2` instead of `localhost`

---

## 📝 Quick Reference Commands

### Start Backend
```bash
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_backend
npm run start:dev
```

### Start Frontend (Admin Dashboard)
```bash
cd /Users/akilanishan/Documents/EVConnect-Project/admin-dashboard  
npm run dev
```

### Start Mobile App
```bash
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_app
flutter run
```

### Check Backend Status
```bash
lsof -i :4000 | grep LISTEN
curl http://localhost:4000/api/chargers | python3 -m json.tool | head -20
```

### Database Queries
```bash
# Connect to database
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_backend
PGPASSWORD='evconnect_password' psql -h localhost -U akilanishan -d evconnect

# Useful queries
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM chargers WHERE verified = true;
SELECT COUNT(*) FROM bookings;
SELECT email, role FROM users WHERE role = 'user';
```

---

## 🎉 Success Criteria

Your mobile app integration is successful if:

- ✅ Backend API running on port 4000
- ✅ Mobile app starts without errors
- ✅ User can register a new account
- ✅ User can login with existing credentials
- ✅ Map displays 10 real chargers from database
- ✅ User can create a booking
- ✅ Booking appears in database
- ✅ No mock/fake data being used

---

## 🚀 Next Steps After Testing

1. **Test all features** using the guide above
2. **Report any issues** you encounter
3. **Once working**, we can implement:
   - Payment integration (Stripe/PayPal)
   - Push notifications
   - Real-time updates (alternative to WebSocket)
   - Advanced map features
   - Dark mode
   - Offline mode

---

## 📞 Need Help?

If you encounter any issues:

1. **Check the logs:**
   ```bash
   flutter logs
   ```

2. **Check backend logs:**
   ```bash
   # In the backend terminal where you ran npm run start:dev
   ```

3. **Verify API endpoints:**
   ```bash
   curl -v http://localhost:4000/api/chargers
   ```

4. **Check database:**
   ```bash
   PGPASSWORD='evconnect_password' psql -h localhost -U akilanishan -d evconnect -c "SELECT COUNT(*) FROM chargers;"
   ```

---

**Happy Testing! 🎉**
