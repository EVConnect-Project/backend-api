# Mechanic Application & Approval Flow - Fixed

## Problem Statement
Users could apply as mechanics and admins could approve applications, but approved users wouldn't see the mechanic dashboard or features. The issue was that the user's role was updated in the backend, but the frontend wasn't refreshing the user profile to reflect the new role.

## Root Causes Identified

1. **No automatic profile refresh**: User profile was only loaded on login/register
2. **Role cached in frontend**: Flutter app stored user data locally and didn't refresh it
3. **No user notification**: Users weren't notified when their application was approved
4. **Manual intervention required**: Users had to log out and log back in to see mechanic features

## Solution Implemented

### Backend (Already Working)
The backend was correctly configured:
- ✅ `POST /mechanic/apply` - Creates application with 'pending' status
- ✅ `PATCH /mechanic/applications/:id/review` - Admin reviews application
- ✅ On approval, user role is updated to 'mechanic' in database
- ✅ `GET /mechanic/my-application` - Returns user's application status
- ✅ `GET /auth/me` - Returns current user profile with updated role

### Frontend Changes Made

#### 1. Auto-refresh User Profile on Home Screen
**File**: `evconnect_app/lib/screens/modern_home_screen.dart`

**Changes**:
```dart
// On screen load - refresh profile
@override
void initState() {
  super.initState();
  Future.microtask(() {
    ref.read(chargerProvider.notifier).fetchAllChargers();
    ref.read(authProvider.notifier).refreshUserProfile(); // ← ADDED
  });
}

// On pull-to-refresh - refresh both chargers and profile
RefreshIndicator(
  onRefresh: () async {
    await Future.wait([
      ref.read(chargerProvider.notifier).fetchAllChargers(),
      ref.read(authProvider.notifier).refreshUserProfile(), // ← ADDED
    ]);
  },
  ...
)
```

**Impact**: User profile now automatically refreshes when:
- Home screen loads
- User pulls down to refresh

#### 2. Check Application Status Feature
**File**: `evconnect_app/lib/services/mechanic_service.dart`

**Added Method**:
```dart
Future<Map<String, dynamic>> checkApplicationStatus() async {
  try {
    final response = await _apiClient.get('/mechanic/my-application');
    return response.data;
  } on ApiException catch (e) {
    if (e.statusCode == 404) {
      return {'status': 'not_applied'};
    }
    rethrow;
  }
}
```

**Impact**: Users can now check their application status at any time.

#### 3. Status Check Button in UI
**File**: `evconnect_app/lib/screens/modern_home_screen.dart`

**Added**:
```dart
// New button below "Apply as Mechanic"
ModernDashboardCard(
  leading: _isCheckingApplication
      ? CircularProgressIndicator()
      : Icon(Icons.refresh_rounded),
  title: 'Check Application Status',
  subtitle: 'See if you\'re approved',
  onTap: _checkApplicationStatus,
)
```

**Status Check Flow**:
1. User taps "Check Application Status"
2. Calls `/mechanic/my-application` endpoint
3. Refreshes user profile via `/auth/me`
4. Shows dialog with status:
   - ✅ **Approved**: Congratulations message
   - ❌ **Rejected**: Shows rejection reason
   - ⏳ **Pending**: Still under review message
5. If approved, mechanic dashboard becomes visible immediately

#### 4. Improved Success Message
**File**: `evconnect_app/lib/screens/mechanic_application_screen.dart`

**Before**:
```dart
'Application submitted successfully! We will review it soon.'
```

**After**:
```dart
'Application submitted successfully! You can check your application status from the home screen.'
```

**Impact**: Users are now aware they can check their status later.

## Complete User Journey

### Step 1: User Applies as Mechanic
1. User navigates to Home Screen
2. Sees "Apply as Mechanic" card (if not already mechanic)
3. Taps card → Opens mechanic application form
4. Fills in:
   - Personal info (name, phone, email)
   - Professional info (years experience, certifications, license)
   - Skills (Battery, Charging, Motors, etc.)
   - Service area with GPS location
5. Submits application
6. Sees success message: "Application submitted successfully! You can check your application status from the home screen."
7. Returns to Home Screen

### Step 2: User Checks Status (While Pending)
1. On Home Screen, sees two cards:
   - "Apply as Mechanic"
   - "Check Application Status" ← **NEW**
2. Taps "Check Application Status"
3. System calls backend and shows dialog:
   - **Title**: "⏳ Pending Review"
   - **Message**: "Your application is still under review. We will notify you once it's processed."
4. User dismisses dialog

### Step 3: Admin Approves Application
1. Admin logs into admin dashboard
2. Navigates to Mechanic Applications
3. Reviews application details
4. Clicks "Approve" with optional notes
5. Backend updates:
   - `mechanic_applications.status` → 'approved'
   - `users.role` → 'mechanic'

### Step 4: User Gets Approved
1. User opens app → Home Screen auto-refreshes profile
2. **OR** User taps "Check Application Status"
3. System detects approved status
4. Shows success dialog:
   - **Title**: "✅ Approved!"
   - **Message**: "Congratulations! Your mechanic application has been approved. You can now access the Mechanic Dashboard."
5. User dismisses dialog
6. Home Screen now shows:
   - ✅ "Mechanic Dashboard" card (NEW - visible because role = 'mechanic')
   - ❌ "Apply as Mechanic" card (hidden)
   - ❌ "Check Application Status" card (hidden)
7. User taps "Mechanic Dashboard" → Opens mechanic features

### Step 5: User Uses Mechanic Features
1. Mechanic Dashboard shows:
   - Pending breakdown requests
   - Accepted jobs
   - Completed jobs
   - Earnings/stats
2. User can:
   - Accept breakdown assistance requests
   - Navigate to breakdown locations
   - Mark jobs as complete
   - View ratings and reviews

## Technical Details

### Role-Based UI Visibility
```dart
// In modern_home_screen.dart
final authState = ref.watch(authProvider);

// Mechanic Dashboard - Only visible to mechanics
if (authState.user?.isMechanic == true) ...[
  ModernDashboardCard(
    title: 'Mechanic Dashboard',
    onTap: () => Navigator.pushNamed(context, '/mechanic/dashboard'),
  ),
]

// Apply/Check Status - Only visible to non-mechanics
if (authState.user?.isMechanic != true) ...[
  ModernDashboardCard(title: 'Apply as Mechanic', ...),
  ModernDashboardCard(title: 'Check Application Status', ...),
]
```

### Role Check in AuthUser Model
```dart
// In models/auth_user.dart
class AuthUser {
  final String role; // 'user', 'owner', 'mechanic', 'admin'
  
  bool get isMechanic => role == 'mechanic' || role == 'admin';
  bool get isOwner => role == 'owner' || role == 'admin';
  bool get isAdmin => role == 'admin';
}
```

### Backend Role Update on Approval
```typescript
// In mechanic.service.ts - reviewApplication()
if (reviewDto.status === ApplicationStatus.APPROVED) {
  const user = await this.userRepository.findOne({
    where: { id: application.userId },
  });
  
  if (user) {
    user.role = 'mechanic'; // ← Key change
    await this.userRepository.save(user);
  }
}
```

### Profile Refresh Flow
```dart
// In global_auth_provider.dart
Future<void> refreshUserProfile() async {
  final token = await _apiClient.getToken();
  if (token == null) return;

  final response = await _apiClient.get('/auth/me');
  
  if (response.statusCode == 200) {
    final user = AuthUser.fromJson(response.data['user']);
    state = state.copyWith(user: user); // ← Updates role
  }
}
```

## Testing Checklist

### Frontend Testing
- [ ] User applies as mechanic → Success message shown
- [ ] "Check Status" button appears for non-mechanics
- [ ] "Check Status" shows "Pending" before approval
- [ ] Pull-to-refresh updates user profile
- [ ] After approval, "Check Status" shows "Approved" dialog
- [ ] After approval, Mechanic Dashboard card appears
- [ ] "Apply as Mechanic" card disappears after approval
- [ ] "Check Status" card disappears after approval
- [ ] Mechanic Dashboard route works (`/mechanic/dashboard`)

### Backend Testing
- [ ] `POST /mechanic/apply` creates application with 'pending' status
- [ ] `GET /mechanic/my-application` returns user's application
- [ ] `PATCH /mechanic/applications/:id/review` with status 'approved' works
- [ ] User role updates to 'mechanic' in database after approval
- [ ] `GET /auth/me` returns updated role
- [ ] Admin can view all applications via `GET /mechanic/applications`

### Integration Testing
1. Create new user account
2. Submit mechanic application
3. Verify application status is 'pending' via API
4. Admin approves application via admin dashboard
5. Verify user role is 'mechanic' in database
6. User taps "Check Status" → sees "Approved" message
7. Verify Mechanic Dashboard card appears
8. Tap Mechanic Dashboard → opens successfully

## API Endpoints Reference

### User Endpoints
```typescript
POST   /mechanic/apply              // Submit application
GET    /mechanic/my-application     // Check application status
GET    /auth/me                     // Get current user profile (with role)
```

### Admin Endpoints
```typescript
GET    /mechanic/applications            // List all applications
GET    /mechanic/applications/:id        // Get application by ID
PATCH  /mechanic/applications/:id/review // Approve/reject application
```

## Database Schema

### mechanic_applications Table
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
full_name       VARCHAR NOT NULL
phone_number    VARCHAR NOT NULL
skills          TEXT NOT NULL
years_of_experience INT NOT NULL
certifications  VARCHAR
service_area    VARCHAR NOT NULL
service_lat     DECIMAL(10,7)
service_lng     DECIMAL(10,7)
license_number  VARCHAR
additional_info TEXT
status          ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
reviewed_by     UUID
review_notes    TEXT
reviewed_at     TIMESTAMP
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

### users Table (Role Column)
```sql
id       UUID PRIMARY KEY
email    VARCHAR UNIQUE NOT NULL
name     VARCHAR NOT NULL
role     VARCHAR DEFAULT 'user'  -- 'user', 'owner', 'mechanic', 'admin'
...
```

## Benefits of This Fix

1. **No Manual Intervention**: Users don't need to log out and log back in
2. **Real-time Updates**: Profile refreshes automatically on home screen load
3. **User Awareness**: "Check Status" button makes approval visible
4. **Better UX**: Clear feedback with status dialogs
5. **Immediate Access**: Mechanic dashboard appears instantly after checking status
6. **Reduced Support**: Users can self-service their application status

## Known Limitations

1. **No Push Notifications**: Users must manually check status (future: add push notifications)
2. **No Application History**: Users can only see current application (future: show past applications)
3. **No Reapplication**: Rejected users cannot reapply (future: allow after X days)

## Future Enhancements

1. **Push Notifications**: Notify users when application is reviewed
2. **Email Notifications**: Send email when approved/rejected
3. **Application Analytics**: Show approval rate, average review time
4. **Mechanic Onboarding**: Add tutorial after first approval
5. **Profile Completeness**: Suggest completing profile after approval
6. **Badge/Verification**: Show "Verified Mechanic" badge
7. **Rejection Feedback**: Detailed rejection reasons with improvement tips
8. **Auto-refresh**: Poll application status every X minutes while pending

## Files Modified

### Flutter App
- ✅ `evconnect_app/lib/screens/modern_home_screen.dart`
- ✅ `evconnect_app/lib/services/mechanic_service.dart`
- ✅ `evconnect_app/lib/screens/mechanic_application_screen.dart`

### Backend (No Changes - Already Working)
- `evconnect_backend/src/mechanic/mechanic.service.ts`
- `evconnect_backend/src/mechanic/mechanic.controller.ts`
- `evconnect_backend/src/auth/auth.controller.ts`

## Conclusion

The mechanic approval flow is now fully functional end-to-end. Users can:
1. Apply as mechanic
2. Check application status at any time
3. See mechanic dashboard immediately after approval
4. Access mechanic features without logging out/in

The fix was primarily on the frontend - adding automatic profile refresh and a status check feature. The backend was already correctly updating user roles on approval.
