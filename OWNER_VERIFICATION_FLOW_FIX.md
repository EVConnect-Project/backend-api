# Charger Owner Verification Flow - Implementation Guide

## Overview

This document describes the complete flow for users to become charger owners and get their charging stations verified. Similar to the mechanic approval flow, this ensures consistent UX across all role upgrade paths.

## Problem Statement

Previously, when users registered charging stations:
- They became "owners" immediately (role updated in backend)
- But their chargers needed admin verification (`verified: false`)
- No way to check charger verification status from the app
- Users had to log out/in to see owner dashboard
- No feedback on pending verification

## Solution Implemented

### Backend Flow (Already Working)

The backend correctly handles charger registration and owner role assignment:

```typescript
// owner.service.ts - registerCharger()
async registerCharger(createChargerDto: CreateChargerDto, userId: string) {
  // 1. Get user
  const user = await this.userRepository.findOne({ where: { id: userId } });
  
  // 2. Upgrade to 'owner' role if currently 'user'
  if (user.role === 'user') {
    user.role = 'owner';
    await this.userRepository.save(user);
  }
  
  // 3. Create charger with verified=false (needs admin approval)
  const charger = this.chargerRepository.create({
    ...createChargerDto,
    ownerId: userId,
    verified: false,      // ← Awaiting admin verification
    status: 'offline',    // Default status
  });
  
  return {
    ...savedCharger,
    message: 'Charger registered successfully. Awaiting admin approval.',
    needsApproval: true,
  };
}
```

### Frontend Changes Made

#### 1. Auto-refresh User Profile on Home Screen
**File**: `evconnect_app/lib/screens/modern_home_screen.dart`

Same as mechanic flow - profile refreshes on:
- Screen load
- Pull-to-refresh

#### 2. Owner Service Integration
**Added**:
```dart
late final OwnerService _ownerService;
bool _isCheckingChargers = false;

@override
void initState() {
  super.initState();
  _mechanicService = MechanicService(ApiClient());
  _ownerService = OwnerService(apiClient: ApiClient()); // ← NEW
  ...
}
```

#### 3. Check Charger Verification Status Feature
**New Method**:
```dart
Future<void> _checkChargerVerificationStatus() async {
  setState(() => _isCheckingChargers = true);
  
  try {
    // Get user's chargers
    final chargers = await _ownerService.getMyChargers();
    
    // Refresh profile (updates role if needed)
    await ref.read(authProvider.notifier).refreshUserProfile();
    
    if (chargers.isEmpty) {
      // No chargers registered yet
      _showStatusDialog(
        title: '📋 No Chargers',
        message: 'You haven\'t registered any charging stations yet.',
        isSuccess: null,
      );
    } else {
      final verified = chargers.where((c) => c.verified).toList();
      final pending = chargers.where((c) => !c.verified).toList();
      
      if (verified.isNotEmpty) {
        // Has verified chargers - can access dashboard
        _showStatusDialog(
          title: '✅ Chargers Verified!',
          message: 'You have ${verified.length} verified charger(s). Access Owner Dashboard.',
          isSuccess: true,
        );
      } else if (pending.isNotEmpty) {
        // Only pending chargers
        _showStatusDialog(
          title: '⏳ Pending Verification',
          message: '${pending.length} charger(s) awaiting admin approval.',
          isSuccess: null,
        );
      }
    }
  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Error: ${e.toString()}')),
    );
  } finally {
    setState(() => _isCheckingChargers = false);
  }
}
```

#### 4. Check Charger Status Button
**File**: `evconnect_app/lib/screens/modern_home_screen.dart`

**Added Card**:
```dart
// For non-owners
if (authState.user?.isOwner != true) ...[
  ModernDashboardCard(
    title: 'Become Charger Owner',
    subtitle: 'Register stations',
    onTap: () => Navigator.pushNamed(context, '/register-charger'),
  ),
  
  // NEW: Check status button
  ModernDashboardCard(
    leading: _isCheckingChargers
        ? CircularProgressIndicator()
        : Icon(Icons.verified_rounded, color: AppTheme.success),
    title: 'Check Charger Status',
    subtitle: 'See verification status',
    onTap: _checkChargerVerificationStatus,
  ),
]
```

#### 5. Improved Success Message
**File**: `evconnect_app/lib/screens/register_charger_screen.dart`

**Before**:
```dart
'Charger registered successfully! You are now a charger owner.'
```

**After**:
```dart
'Charger registered successfully! Check its verification status from the home screen.'
```

## Complete User Journey

### Step 1: User Registers a Charging Station

1. User navigates to Home Screen
2. Sees "Become Charger Owner" card (if not already owner)
3. Taps card → Opens charger registration form
4. Fills in:
   - Station name
   - GPS location (captured via Geolocator)
   - Power capacity (kW)
   - Price per kWh
   - Optional description
5. Submits registration
6. Backend:
   - Updates user role from 'user' to 'owner'
   - Creates charger with `verified: false`
   - Returns success message
7. Frontend:
   - Refreshes user profile (role now 'owner')
   - Shows success: "Charger registered successfully! Check its verification status from the home screen."
8. Returns to Home Screen

### Step 2: User Checks Charger Status (Pending)

1. On Home Screen, user now sees:
   - "Become Charger Owner" card (can register more)
   - "Check Charger Status" card ← **NEW**
2. Taps "Check Charger Status"
3. System calls `/owner/chargers` endpoint
4. Shows dialog:
   - **Title**: "⏳ Pending Verification"
   - **Message**: "You have 1 charger(s) awaiting admin approval. Your chargers will be available once verified."
5. User dismisses dialog

### Step 3: Admin Verifies Charger

1. Admin logs into admin dashboard
2. Navigates to Charger Management
3. Reviews charger details:
   - Location on map
   - Power capacity
   - Pricing
   - Owner information
4. Clicks "Verify" or "Approve"
5. Backend updates:
   - `chargers.verified` → `true`
   - `chargers.status` → `available`

### Step 4: User Gets Verified

1. User opens app → Home Screen auto-refreshes profile
2. **OR** User taps "Check Charger Status"
3. System detects verified charger(s)
4. Shows success dialog:
   - **Title**: "✅ Chargers Verified!"
   - **Message**: "You have 1 verified charger(s). You can now access the Owner Dashboard to manage them."
5. User dismisses dialog
6. Home Screen now shows:
   - ✅ "Owner Dashboard" card (NEW - visible because role = 'owner')
   - ✅ "Register Charger" card (can add more)
   - ✅ "Check Charger Status" card (still available)
7. User taps "Owner Dashboard" → Opens owner features

### Step 5: User Uses Owner Features

1. Owner Dashboard shows:
   - List of all chargers (verified + pending)
   - Each charger shows:
     - Name, location, power, price
     - Verification badge (✅ verified or ⏳ pending)
     - Booking statistics
     - Revenue data
   - Total stats across all chargers
2. User can:
   - View charger details
   - Update charger status (available/offline/in-use)
   - Edit charger information
   - View bookings for each charger
   - See revenue reports
   - Delete chargers (if no active bookings)

## Key Differences from Mechanic Flow

| Aspect | Mechanic Flow | Owner Flow |
|--------|---------------|------------|
| **Role Grant** | After admin approves application | Immediately after first charger registration |
| **Verification** | User approval | Charger approval |
| **Application Table** | `mechanic_applications` | No separate table (embedded in `chargers`) |
| **Status Field** | `status: 'pending' \| 'approved' \| 'rejected'` | `verified: boolean` |
| **Can Apply Again** | No (one application per user) | Yes (can register multiple chargers) |
| **Dashboard Access** | After approval | After role upgrade (immediate) |
| **Dashboard Shows** | Breakdown requests, jobs, earnings | Chargers, bookings, revenue |

## Role-Based UI Visibility

```dart
// In modern_home_screen.dart
final authState = ref.watch(authProvider);

// Owner Dashboard - Visible to owners
if (authState.user?.isOwner == true) ...[
  ModernDashboardCard(
    title: 'Owner Dashboard',
    onTap: () => Navigator.pushNamed(context, '/owner/dashboard'),
  ),
  ModernDashboardCard(
    title: 'Register Charger',
    onTap: () => Navigator.pushNamed(context, '/register-charger'),
  ),
]

// Become Owner / Check Status - Visible to non-owners
if (authState.user?.isOwner != true) ...[
  ModernDashboardCard(title: 'Become Charger Owner', ...),
  ModernDashboardCard(title: 'Check Charger Status', ...),
]
```

## Technical Details

### Backend Endpoints

```typescript
// User endpoints
POST   /owner/chargers              // Register new charger
GET    /owner/chargers              // Get my chargers (with stats)
GET    /owner/chargers/:id          // Get charger details
PATCH  /owner/chargers/:id          // Update charger
PATCH  /owner/chargers/:id/status   // Update charger status
DELETE /owner/chargers/:id          // Delete charger

GET    /owner/bookings              // Get bookings for my chargers
GET    /owner/bookings/:id          // Get booking details
GET    /owner/stats/bookings        // Booking statistics
GET    /owner/stats/revenue         // Revenue statistics
GET    /owner/stats/utilization     // Utilization statistics

// Admin endpoints
GET    /admin/chargers              // List all chargers
PATCH  /admin/chargers/:id/verify   // Verify/reject charger
```

### Database Schema

#### chargers Table
```sql
id              UUID PRIMARY KEY
owner_id        UUID REFERENCES users(id)
name            VARCHAR NOT NULL
address         VARCHAR
lat             DECIMAL(10,7) NOT NULL
lng             DECIMAL(10,7) NOT NULL
power_kw        DECIMAL(5,2) NOT NULL
price_per_kwh   DECIMAL(5,2) NOT NULL
description     TEXT
verified        BOOLEAN DEFAULT false    -- Admin approval status
status          VARCHAR DEFAULT 'offline' -- 'available', 'in-use', 'offline'
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

#### users Table (Role)
```sql
id       UUID PRIMARY KEY
email    VARCHAR UNIQUE
name     VARCHAR NOT NULL
role     VARCHAR DEFAULT 'user'  -- 'user', 'owner', 'mechanic', 'admin'
...
```

### Owner Service Flutter

```dart
class OwnerService {
  final ApiClient _apiClient;
  
  // Get all chargers owned by current user
  Future<List<ChargerWithStats>> getMyChargers() async {
    final response = await _apiClient.get('/owner/chargers');
    return (response.data as List)
        .map((json) => ChargerWithStats.fromJson(json))
        .toList();
  }
  
  // Register new charger
  Future<Map<String, dynamic>> registerCharger({...}) async {
    final response = await _apiClient.post('/owner/chargers', data: {...});
    return response.data;
  }
  
  // ... other methods
}
```

### ChargerWithStats Model

```dart
class ChargerWithStats {
  final String id;
  final String name;
  final String address;
  final String status;
  final bool verified;       // ← Key field
  final double powerKw;
  final double pricePerKwh;
  final ChargerStats stats;
}

class ChargerStats {
  final int totalBookings;
  final int activeBookings;
  final int pendingBookings;
}
```

## Testing Checklist

### Frontend Testing
- [ ] User registers charger → Success message mentions checking status
- [ ] "Check Charger Status" button appears for all users
- [ ] "Check Status" shows "Pending" for unverified chargers
- [ ] Pull-to-refresh updates user profile
- [ ] After verification, "Check Status" shows "Verified" dialog
- [ ] Owner Dashboard card appears after first charger registration
- [ ] Owner Dashboard shows all chargers with verification badges
- [ ] Can register multiple chargers
- [ ] Each charger shows separate verification status

### Backend Testing
- [ ] `POST /owner/chargers` creates charger with `verified: false`
- [ ] User role updates from 'user' to 'owner' on first registration
- [ ] `GET /owner/chargers` returns user's chargers with stats
- [ ] Admin can verify chargers via admin dashboard
- [ ] Verified chargers have `verified: true` and `status: 'available'`
- [ ] `GET /auth/me` returns updated role

### Integration Testing
1. Create new user account (role: 'user')
2. Register charging station
3. Verify user role is now 'owner' in database
4. Verify charger has `verified: false` in database
5. User taps "Check Status" → sees "Pending" message
6. Admin verifies charger in admin dashboard
7. Verify charger has `verified: true` in database
8. User taps "Check Status" → sees "Verified" message
9. Owner Dashboard shows charger with green verified badge
10. User can manage charger from dashboard

## Benefits of This Implementation

1. **Consistent UX**: Matches mechanic approval flow pattern
2. **No Manual Intervention**: Users don't need to log out/in
3. **Real-time Updates**: Profile and chargers refresh automatically
4. **User Awareness**: Clear feedback on verification status
5. **Immediate Role Access**: Owner dashboard visible after registration
6. **Multiple Chargers**: Can register and track many chargers
7. **Transparent Process**: Users know exactly where they stand

## Future Enhancements

1. **Push Notifications**: Notify when charger is verified/rejected
2. **Email Notifications**: Send email on verification status change
3. **Rejection Reasons**: Show admin notes if charger is rejected
4. **Resubmission**: Allow editing and resubmitting rejected chargers
5. **Charger Analytics**: Show utilization, revenue trends per charger
6. **Bulk Operations**: Verify multiple chargers at once (admin)
7. **Auto-verification**: For trusted owners with verified history
8. **Verification Checklist**: Show what admins verify (location, pricing, etc.)

## Files Modified

### Flutter App
- ✅ `evconnect_app/lib/screens/modern_home_screen.dart`
  - Added owner service import
  - Added `_isCheckingChargers` state
  - Added `_checkChargerVerificationStatus()` method
  - Added "Check Charger Status" card
- ✅ `evconnect_app/lib/screens/register_charger_screen.dart`
  - Updated success message

### Backend (No Changes - Already Working)
- `evconnect_backend/src/owner/owner.service.ts`
- `evconnect_backend/src/owner/owner.controller.ts`
- `evconnect_backend/src/charger/entities/charger.entity.ts`

### Services (Already Implemented)
- `evconnect_app/lib/services/owner_service.dart`
  - `getMyChargers()` method
  - `registerCharger()` method
  - All stats methods

## Comparison: Mechanic vs Owner Flows

### Similarities
- ✅ Both auto-refresh user profile on home screen
- ✅ Both have "Check Status" buttons
- ✅ Both show status dialogs (pending/approved/verified)
- ✅ Both require admin action (approval/verification)
- ✅ Both update user role in backend
- ✅ Both provide immediate feedback to users

### Differences
- Mechanics: Single application, one-time approval
- Owners: Multiple chargers, each needs verification
- Mechanics: Can't reapply if rejected
- Owners: Can register more chargers anytime
- Mechanics: Dashboard shows jobs and requests
- Owners: Dashboard shows chargers and revenue

## Conclusion

The owner verification flow is now fully aligned with the mechanic approval flow. Users can:

1. Register charging station(s)
2. Become owner immediately (role upgrade)
3. Check charger verification status anytime
4. See clear feedback (pending/verified)
5. Access owner dashboard after role upgrade
6. Manage all chargers from dashboard

The implementation maintains consistency with the mechanic flow while adapting to the unique needs of charger ownership (multiple assets, ongoing verification).
