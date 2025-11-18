# Testing Guide - Settings & Vehicle Profiles

## Prerequisites

### 1. Run Database Migration
```bash
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_backend

# Execute the migration SQL in your PostgreSQL database
# You can use pgAdmin, psql, or your preferred tool
# File: migrations/create-vehicle-profiles-table.sql
```

### 2. Start Backend Server
```bash
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_backend
npm run start:dev

# Verify server is running on http://localhost:3001
# Check logs for any errors
```

## Flutter App Testing

### Test 1: General Settings

```bash
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_app
flutter run
```

**Steps:**
1. Login to the app
2. Navigate to **Profile** tab
3. Tap **Settings** → **General Settings**
4. Test each setting:
   - **Theme**: Switch between Light/Dark/System
   - **Distance Unit**: Switch between Kilometers/Miles
   - **Energy Unit**: Switch between kWh/MWh
   - **Language**: Select English/Sinhala/Tamil
   - **Charging Limit**: Slide between 50-100%
   - **Show Only Available**: Toggle on/off
   - **Auto-start Charging**: Toggle on/off
   - **Location Sharing**: Toggle on/off
   - **Analytics**: Toggle on/off
5. Close app and reopen
6. Verify settings are **persisted** (same values as before)

**Expected Results:**
- ✅ Theme changes immediately
- ✅ All toggles work smoothly
- ✅ Slider updates value in real-time
- ✅ Settings persist across app restarts
- ✅ No errors in console

### Test 2: Vehicle Profiles

**Test 2.1: Add First Vehicle**
1. Navigate to **Profile** tab
2. Tap **My Vehicles**
3. Should see empty state with message
4. Tap **+** button in app bar
5. Fill in vehicle details:
   - Make: Tesla
   - Model: Model 3
   - Year: 2023
   - Battery Capacity: 75.0 kWh
   - Connector Type: CCS
   - Range: 500 km
6. Tap **Save**

**Expected:**
- ✅ Vehicle appears in list
- ✅ **PRIMARY** badge appears (first vehicle auto-primary)
- ✅ No errors

**Test 2.2: Add Second Vehicle**
1. Tap **+** button
2. Fill in details:
   - Make: Nissan
   - Model: Leaf
   - Year: 2022
   - Battery Capacity: 40.0 kWh
   - Connector Type: CHAdeMO
   - Range: 270 km
3. Tap **Save**

**Expected:**
- ✅ Both vehicles appear in list
- ✅ Only first vehicle has PRIMARY badge
- ✅ Vehicles sorted with primary first

**Test 2.3: Set Primary Vehicle**
1. Tap **⋮** (three dots) on Nissan Leaf
2. Tap **Set as Primary**

**Expected:**
- ✅ PRIMARY badge moves to Nissan Leaf
- ✅ Tesla Model 3 no longer has badge
- ✅ List reorders (primary first)

**Test 2.4: Edit Vehicle**
1. Tap **⋮** on Tesla Model 3
2. Tap **Edit**
3. Change Range to 450 km
4. Tap **Save**

**Expected:**
- ✅ Range updates in list
- ✅ No errors

**Test 2.5: Delete Vehicle**
1. Tap **⋮** on Tesla Model 3
2. Tap **Delete**
3. Confirm deletion

**Expected:**
- ✅ Tesla removed from list
- ✅ Only Nissan Leaf remains
- ✅ Nissan still has PRIMARY badge

**Test 2.6: Delete Primary Vehicle**
1. Add another vehicle (any details)
2. Tap **⋮** on Nissan Leaf (current primary)
3. Tap **Delete**

**Expected:**
- ✅ Nissan removed
- ✅ The other vehicle **automatically becomes primary**
- ✅ PRIMARY badge appears on remaining vehicle

### Test 3: Persistence & Navigation

**Test 3.1: App Restart**
1. Close app completely
2. Reopen app
3. Navigate to **My Vehicles**

**Expected:**
- ✅ All vehicles still there
- ✅ Primary vehicle badge correct
- ✅ Settings retained

**Test 3.2: Navigation Flow**
1. Profile → Settings → General Settings → Back → Back
2. Profile → My Vehicles → Add Vehicle → Cancel → Back
3. Profile → My Vehicles → Edit Vehicle → Save → Back

**Expected:**
- ✅ All navigation works smoothly
- ✅ No crashes
- ✅ Data retained across navigations

### Test 4: Error Handling

**Test 4.1: Invalid Vehicle Data**
1. Navigate to Add Vehicle
2. Leave fields empty
3. Tap **Save**

**Expected:**
- ✅ Validation errors appear
- ✅ Red text shows "Please enter..."
- ✅ Form doesn't submit

**Test 4.2: Backend Offline**
1. Stop backend server
2. Try to add/edit/delete vehicle

**Expected:**
- ✅ Error message appears
- ✅ App doesn't crash
- ✅ User sees meaningful error

**Test 4.3: Network Issues**
1. Disconnect internet
2. Try vehicle operations

**Expected:**
- ✅ Timeout error shown
- ✅ App handles gracefully

## Backend API Testing

### Using cURL or Postman

**1. Get JWT Token**
```bash
# Login first to get token
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Save the "access_token" from response
```

**2. Test Vehicle Endpoints**

**Get All Vehicles**
```bash
curl http://localhost:3001/auth/vehicle-profiles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Create Vehicle**
```bash
curl -X POST http://localhost:3001/auth/vehicle-profiles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Tesla",
    "model": "Model 3",
    "year": 2023,
    "batteryCapacity": 75.0,
    "connectorType": "CCS",
    "rangeKm": 500.0
  }'
```

**Update Vehicle**
```bash
curl -X PATCH http://localhost:3001/auth/vehicle-profiles/{vehicle-id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rangeKm": 450.0
  }'
```

**Set Primary**
```bash
curl -X PATCH http://localhost:3001/auth/vehicle-profiles/{vehicle-id}/primary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Delete Vehicle**
```bash
curl -X DELETE http://localhost:3001/auth/vehicle-profiles/{vehicle-id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Success Criteria

### Settings
- [ ] Theme changes persist
- [ ] All units selectable and persist
- [ ] Language selector works
- [ ] All toggles functional
- [ ] Charging limit slider works
- [ ] Settings survive app restart

### Vehicle Profiles
- [ ] Can add multiple vehicles
- [ ] First vehicle auto-primary
- [ ] Can set any vehicle as primary
- [ ] Only one vehicle primary at a time
- [ ] Can edit vehicle details
- [ ] Can delete vehicles
- [ ] Deleting primary auto-promotes next
- [ ] All 6 connector types selectable
- [ ] Validation prevents invalid data
- [ ] Empty state shows when no vehicles

### Integration
- [ ] No existing features broken
- [ ] Profile screen shows My Vehicles option
- [ ] Navigation flows work
- [ ] Backend endpoints respond correctly
- [ ] JWT authentication works
- [ ] Database stores vehicles correctly

### Error Handling
- [ ] Form validation works
- [ ] Network errors handled
- [ ] Backend errors shown to user
- [ ] App doesn't crash on errors
- [ ] Loading states shown during API calls

## Known Issues

None - all features implemented and tested during development.

## Troubleshooting

### Settings not persisting
- **Check**: SharedPreferences initialized in main.dart
- **Fix**: Ensure `await WidgetsFlutterBinding.ensureInitialized()` before SharedPreferences.getInstance()

### Vehicle endpoints 401 Unauthorized
- **Check**: JWT token valid and not expired
- **Fix**: Login again to get fresh token

### Vehicle list empty after creation
- **Check**: Backend logs for errors
- **Check**: Database migration ran successfully
- **Fix**: Verify table exists: `SELECT * FROM vehicle_profiles;`

### Theme not changing
- **Check**: MaterialApp.themeMode using themeModeProvider
- **Fix**: Ensure provider is watched in MaterialApp

### Compilation errors in providers
- **Check**: flutter_riverpod version is 3.0.3
- **Fix**: Run `flutter pub get` to ensure dependencies synced
