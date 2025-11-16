# EVConnect Testing Guide

## System Status ✅

- **Backend API**: Running on http://localhost:4000/api
- **Database**: PostgreSQL with existing user data
- **Role System**: Fully implemented with dynamic UI

## How to Test the Role-Based System

### Step 1: Test as Normal User

The database already contains user accounts. To test:

1. **Open the Flutter app** and sign up with a new email, or login with an existing account
2. **Default Role**: All new users start as `role: "user"`
3. **What You'll See**:
   - ✅ Find Chargers
   - ✅ My Bookings
   - ✅ Trip Planner
   - ✅ Breakdown Assistance
   - ✅ "Become a Charger Owner" button
   - ✅ "Apply as Mechanic" button
   - ❌ Owner Dashboard (hidden)
   - ❌ Mechanic Dashboard (hidden)

### Step 2: Test Role Upgrade (User → Owner)

1. **Click "Become a Charger Owner"**
2. **Register a charger** with these details:
   ```
   Name: My Test Charger
   Latitude: 6.9271
   Longitude: 79.8612
   Power (kW): 50
   Price per kWh: 25 LKR
   Description: My first charging station
   ```
3. **Submit the form**
4. **Automatic Role Change**: Backend automatically upgrades your role to `"owner"`
5. **Profile Refresh**: App calls `/auth/me` to get updated role
6. **UI Updates Immediately**:
   - ✅ Owner Dashboard now appears
   - ✅ Register Charger option stays visible
   - ❌ "Become a Charger Owner" button disappears

### Step 3: Test Owner Features

After becoming an owner, you can:

1. **View Owner Dashboard**: See your chargers and earnings
2. **Manage Chargers**: 
   - View all your registered chargers
   - Update charger details
   - Change charger status (available/offline/in-use)
3. **View Bookings**: See bookings for your chargers
4. **View Statistics**:
   - Revenue tracking
   - Charger utilization
   - Booking analytics

### Step 4: Test Mechanic Application

1. **Click "Apply as Mechanic"** (available to both users and owners)
2. **Fill Application Form**:
   ```
   Services: Battery Repair, Tire Service
   Experience: 5 years
   License Number: MEC12345
   Contact: 0771234567
   ```
3. **Submit Application**
4. **Application Status**: "pending"
5. **Wait for Admin Approval**

### Step 5: Test Admin Approval (Admin Dashboard)

To approve the mechanic application:

1. **Open Admin Dashboard**: http://localhost:3000
2. **Login as Admin**:
   ```
   Email: admin@evconnect.com
   Password: [Use your admin password]
   ```
3. **Navigate to**: Mechanic Applications
4. **Approve the application**
5. **Backend Changes Role**: `user/owner` → `mechanic`

### Step 6: Test Mechanic Features

After admin approval:

1. **App Refreshes Profile**: Next time user opens app, `/auth/me` returns updated role
2. **UI Updates**:
   - ✅ Mechanic Dashboard appears
   - ❌ "Apply as Mechanic" button disappears
3. **Mechanic Features Available**:
   - View nearby breakdown requests
   - Accept breakdown assignments
   - Update service status
   - View earnings from repairs

## Role Hierarchy

```
┌─────────────┐
│    Admin    │ ← Full system access
└─────────────┘
      ↑
      │ (assigned manually)
      │
┌─────────────┐
│  Mechanic   │ ← Admin approval required
└─────────────┘
      ↑
      │ (application + approval)
      │
┌─────────────┐
│    Owner    │ ← Auto-assigned on first charger registration
└─────────────┘
      ↑
      │ (automatic on charger registration)
      │
┌─────────────┐
│    User     │ ← Default role on signup
└─────────────┘
```

## Testing Role Transitions

### User → Owner (Automatic)
- **Trigger**: Register first charger via `/api/owner/chargers` (POST)
- **Backend**: `owner.service.ts` checks if `user.role === 'user'`, then sets `role = 'owner'`
- **Frontend**: Calls `refreshUserProfile()` after registration
- **Result**: Owner Dashboard appears immediately

### User/Owner → Mechanic (Admin Approval)
- **Trigger**: Submit mechanic application via `/api/mechanic/apply` (POST)
- **Admin Action**: Approve via `/api/admin/mechanic-applications/:id/approve` (POST)
- **Backend**: `admin.service.ts` sets `application.user.role = 'mechanic'`
- **Frontend**: Next app launch or manual refresh calls `/auth/me`
- **Result**: Mechanic Dashboard appears

## API Endpoints for Testing

### Authentication
```bash
# Register new user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get current user profile (with fresh role data)
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Owner - Register Charger
```bash
curl -X POST http://localhost:4000/api/owner/chargers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Charger",
    "lat": 6.9271,
    "lng": 79.8612,
    "powerKw": 50,
    "pricePerKwh": 25,
    "description": "Fast charging station"
  }'
```

### Mechanic Application
```bash
curl -X POST http://localhost:4000/api/mechanic/apply \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "services": ["Battery Repair", "Tire Service"],
    "experience": "5 years",
    "licenseNumber": "MEC12345",
    "contact": "0771234567"
  }'
```

## Verification Checklist

### UI Conditional Rendering
- [ ] Normal user sees "Become a Charger Owner" button
- [ ] Owner does NOT see "Become a Charger Owner" button
- [ ] Normal user sees "Apply as Mechanic" button
- [ ] Mechanic does NOT see "Apply as Mechanic" button
- [ ] Owner Dashboard only visible to owners
- [ ] Mechanic Dashboard only visible to mechanics
- [ ] All users see: Find Chargers, Bookings, Trip Planner, Breakdown

### Role Transitions
- [ ] Registering charger upgrades user → owner
- [ ] UI refreshes immediately after charger registration
- [ ] Owner Dashboard appears without logout/login
- [ ] Mechanic application creates pending application
- [ ] Admin can approve mechanic application
- [ ] Approved mechanic sees Mechanic Dashboard

### Profile Refresh
- [ ] `/auth/me` endpoint returns current user data
- [ ] `refreshUserProfile()` updates state correctly
- [ ] UI re-renders when role changes
- [ ] No errors during profile refresh

## Common Issues

### 1. UI Not Updating After Role Change
**Solution**: Check if `refreshUserProfile()` is being called after the action that changes the role.

### 2. Backend Says "User Not Owner"
**Solution**: Verify that the user has registered at least one charger, which should auto-upgrade them to owner role.

### 3. Mechanic Dashboard Not Showing
**Solution**: 
1. Check mechanic application status in database
2. Ensure admin has approved the application
3. Restart the Flutter app to fetch fresh user data

### 4. Port 4000 Already in Use
**Solution**: 
```bash
lsof -ti:4000 | xargs kill -9
npm run start:dev
```

## Database Seeding

If you need sample users, the seed script is available but the database already has users. To reset and re-seed:

```bash
# WARNING: This will delete all data!
# Drop all tables and re-run migrations first
npm run seed
```

The seed creates:
- 1 admin (admin@evconnect.com)
- 5 normal users (user1-5@example.com)
- 3 owners (owner1-3@example.com)
- 3 mechanics (mechanic1-3@example.com)
- 6 sample chargers

All passwords: `password123`

## Support

For detailed role system documentation, see: `evconnect_app/ROLE_SYSTEM.md`
cd /Users/akilanishan/Documents/EVConnect-Project/evconnect_app && flutter run -d chrome

Email: admin@evconnect.com
Password: password123