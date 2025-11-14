# 🏢 Charger Owner Integration - Complete Implementation

## 📋 Overview

This document describes the complete **Charger Owner** feature integration that allows users to register chargers, automatically become owners, and manage their chargers and bookings.

---

## 🎯 Feature Concept

### User Journey:
1. **Regular User** → Creates a charger
2. **System** → Automatically upgrades user to "Owner" role
3. **Owner** → Can view/manage their chargers and see bookings
4. **Owner** → Gets access to revenue & utilization statistics

---

## 🏗️ Backend Implementation (NestJS)

### 📁 New Files Created

#### 1. **Owner Module** (`src/owner/owner.module.ts`)
- Imports: Charger, BookingEntity, User entities
- Exports: OwnerService for use in other modules

#### 2. **Owner Controller** (`src/owner/owner.controller.ts`)
**Authentication:** Requires JWT + Owner/Admin role

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Charger Management** |
| POST | `/api/owner/chargers` | Register new charger |
| GET | `/api/owner/chargers` | Get all my chargers |
| GET | `/api/owner/chargers/:id` | Get specific charger details |
| PATCH | `/api/owner/chargers/:id` | Update charger details |
| PATCH | `/api/owner/chargers/:id/status` | Update charger status |
| DELETE | `/api/owner/chargers/:id` | Deactivate charger |
| **Booking Management** |
| GET | `/api/owner/bookings` | Get all bookings for my chargers |
| GET | `/api/owner/bookings/:id` | Get specific booking details |
| **Statistics** |
| GET | `/api/owner/stats/bookings` | Booking statistics |
| GET | `/api/owner/stats/revenue` | Revenue statistics |
| GET | `/api/owner/stats/utilization` | Charger utilization stats |

#### 3. **Owner Service** (`src/owner/owner.service.ts`)
**Key Features:**
- ✅ Auto-upgrade user to 'owner' role on first charger registration
- ✅ Chargers require admin approval (verified=false by default)
- ✅ Ownership verification for all operations
- ✅ Prevent deletion of chargers with active bookings
- ✅ Revenue and utilization tracking
- ✅ Booking statistics per charger

---

## 🔐 Security Features

### 1. **Role-Based Access Control**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin')
```
- Only owners and admins can access owner endpoints
- JWT token required for all requests

### 2. **Ownership Verification**
Every operation verifies:
```typescript
if (charger.ownerId !== userId) {
  throw new ForbiddenException('You can only update your own chargers');
}
```

### 3. **Automatic Role Upgrade**
```typescript
if (user.role === 'user') {
  user.role = 'owner';
  await this.userRepository.save(user);
}
```
- User becomes owner automatically when registering first charger
- No manual role assignment needed

### 4. **Admin Approval Flow**
```typescript
verified: false  // Requires admin approval
status: 'offline' // Default until verified
```
- New chargers start as unverified
- Admin must approve before charger goes live

---

## 📊 API Usage Examples

### 1. Register a New Charger

**Request:**
```bash
POST /api/owner/chargers
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "My Charging Station",
  "address": "123 Main St, San Francisco, CA",
  "lat": 37.7749,
  "lng": -122.4194,
  "powerKw": 150,
  "pricePerKwh": 0.35,
  "description": "Fast charging station in downtown"
}
```

**Response:**
```json
{
  "id": "charger-uuid",
  "name": "My Charging Station",
  "address": "123 Main St, San Francisco, CA",
  "lat": "37.7749",
  "lng": "-122.4194",
  "powerKw": "150",
  "pricePerKwh": "0.35",
  "status": "offline",
  "verified": false,
  "ownerId": "user-uuid",
  "message": "Charger registered successfully. Awaiting admin approval.",
  "needsApproval": true
}
```

### 2. Get My Chargers

**Request:**
```bash
GET /api/owner/chargers
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
[
  {
    "id": "charger-1",
    "name": "My Charging Station",
    "status": "available",
    "verified": true,
    "stats": {
      "totalBookings": 45,
      "activeBookings": 2,
      "pendingBookings": 3
    }
  },
  {
    "id": "charger-2",
    "name": "Another Station",
    "status": "offline",
    "verified": false,
    "stats": {
      "totalBookings": 0,
      "activeBookings": 0,
      "pendingBookings": 0
    }
  }
]
```

### 3. Get Bookings for My Chargers

**Request:**
```bash
GET /api/owner/bookings?status=active
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
[
  {
    "id": "booking-1",
    "userId": "user-123",
    "chargerId": "charger-1",
    "startTime": "2025-11-15T10:00:00Z",
    "endTime": "2025-11-15T12:00:00Z",
    "status": "active",
    "price": "105.00",
    "user": {
      "id": "user-123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "charger": {
      "id": "charger-1",
      "name": "My Charging Station"
    }
  }
]
```

### 4. Get Revenue Statistics

**Request:**
```bash
GET /api/owner/stats/revenue?startDate=2025-11-01&endDate=2025-11-30
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "totalRevenue": 2500.00,
  "completedBookingsRevenue": 2300.00,
  "pendingRevenue": 200.00
}
```

### 5. Update Charger Status

**Request:**
```bash
PATCH /api/owner/chargers/:id/status
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "status": "available"
}
```

**Response:**
```json
{
  "id": "charger-1",
  "status": "available",
  "message": "Charger status updated to available"
}
```

---

## 🔄 User Role Workflow

### Before Charger Registration:
```
User Role: "user"
Can Do: Book chargers, view map
```

### After Charger Registration:
```
User Role: "owner"
Can Do: 
  - Everything a user can do
  - Register chargers
  - View bookings for their chargers
  - Manage charger status
  - View revenue statistics
```

### Admin Approval Process:
```
1. Owner registers charger
   ↓
2. Charger created with verified=false, status='offline'
   ↓
3. Admin reviews charger
   ↓
4. Admin approves: POST /api/admin/chargers/:id/approve
   ↓
5. Charger verified=true
   ↓
6. Owner can set status to 'available'
   ↓
7. Charger visible to all users for booking
```

---

## 📱 Frontend Integration (Flutter)

### Next Steps for Mobile App:

#### 1. **Owner Dashboard Screen**
```dart
// lib/screens/owner/owner_dashboard_screen.dart

- Show list of owned chargers
- Display stats: total bookings, active, pending
- Quick status toggle buttons
- Revenue summary
```

#### 2. **Register Charger Screen**
```dart
// lib/screens/owner/register_charger_screen.dart

- Form with:
  * Name
  * Address
  * Location (map picker)
  * Power (kW)
  * Price per kWh
  * Description
- Submit to POST /api/owner/chargers
- Show approval pending message
```

#### 3. **My Bookings Screen**
```dart
// lib/screens/owner/owner_bookings_screen.dart

- List all bookings for owned chargers
- Filter by status (pending, active, completed)
- Filter by charger
- Show user details
- Display revenue per booking
```

#### 4. **Owner Service** 
```dart
// lib/services/owner_service.dart

class OwnerService {
  Future<List<Charger>> getMyChargers();
  Future<Charger> registerCharger(ChargerData data);
  Future<void> updateChargerStatus(String id, String status);
  Future<List<Booking>> getMyBookings({String? status});
  Future<RevenueStats> getRevenueStats();
}
```

---

## 🧪 Testing Guide

### 1. **Test User Upgrade to Owner**

```bash
# Step 1: Register as regular user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@test.com",
    "password": "password123",
    "name": "Test Owner"
  }'

# Step 2: Login and get token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@test.com",
    "password": "password123"
  }'

# Save the access_token from response

# Step 3: Register a charger (user will be upgraded to owner)
curl -X POST http://localhost:4000/api/owner/chargers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Charging Station",
    "address": "123 Test St",
    "lat": 37.7749,
    "lng": -122.4194,
    "powerKw": 100,
    "pricePerKwh": 0.30
  }'

# Step 4: Verify user role changed
# Check database or call /api/users/me
```

### 2. **Test Ownership Verification**

```bash
# Try to update another owner's charger (should fail)
curl -X PATCH http://localhost:4000/api/owner/chargers/SOMEONE_ELSES_CHARGER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pricePerKwh": 0.50}'

# Expected: 403 Forbidden
```

### 3. **Test Booking Retrieval**

```bash
# Create a booking for your charger (as a different user)
# Then as owner, get all bookings:

curl -X GET "http://localhost:4000/api/owner/bookings?status=pending" \
  -H "Authorization: Bearer OWNER_TOKEN"
```

### 4. **Test Statistics**

```bash
# Get revenue stats
curl -X GET "http://localhost:4000/api/owner/stats/revenue" \
  -H "Authorization: Bearer OWNER_TOKEN"

# Get booking stats
curl -X GET "http://localhost:4000/api/owner/stats/bookings" \
  -H "Authorization: Bearer OWNER_TOKEN"

# Get utilization stats
curl -X GET "http://localhost:4000/api/owner/stats/utilization" \
  -H "Authorization: Bearer OWNER_TOKEN"
```

---

## 📊 Database Impact

### No Schema Changes Required! ✅

This feature uses existing tables:
- `users` (role field already supports 'owner')
- `chargers` (ownerId already exists)
- `bookings` (no changes needed)

### Data Flow:
```sql
-- User becomes owner
UPDATE users SET role = 'owner' WHERE id = 'user-id';

-- Charger created with ownership
INSERT INTO chargers (name, address, lat, lng, powerKw, pricePerKwh, ownerId, verified)
VALUES ('Station Name', '123 St', 37.77, -122.41, 150, 0.35, 'user-id', false);

-- Get bookings for owner's chargers
SELECT b.* FROM bookings b
JOIN chargers c ON b.chargerId = c.id
WHERE c.ownerId = 'user-id';
```

---

## 🎯 Key Features Summary

✅ **Auto Role Upgrade** - Users become owners automatically  
✅ **Admin Approval Required** - New chargers await verification  
✅ **Ownership Protection** - Can only manage own chargers  
✅ **Booking Visibility** - See all bookings for owned chargers  
✅ **Revenue Tracking** - Calculate earnings from bookings  
✅ **Utilization Stats** - See how often chargers are used  
✅ **Status Management** - Control charger availability  
✅ **Secure Access** - JWT + role-based guards  

---

## 🚀 Next Steps

### Immediate:
1. ✅ Backend implementation complete
2. ⏳ Build Flutter owner dashboard
3. ⏳ Create charger registration form
4. ⏳ Implement booking management UI

### Future Enhancements:
- 📊 Advanced analytics dashboard
- 📧 Email notifications for new bookings
- 💰 Payment reconciliation
- 📱 Push notifications for charger status
- 🔔 Alerts for maintenance needs
- 📈 Predictive analytics for demand
- 🌐 Public charger page/QR code
- ⭐ Rating and review system

---

## 🐛 Common Issues & Solutions

### Issue: "You can only view your own chargers"
**Cause:** Trying to access charger not owned by you  
**Solution:** Verify charger ID belongs to your account

### Issue: "Cannot delete charger with active bookings"
**Cause:** Charger has bookings in 'active' status  
**Solution:** Wait for bookings to complete or cancel them first

### Issue: "Charger registered successfully. Awaiting admin approval."
**Cause:** This is normal - not an error  
**Solution:** Admin must approve charger via admin dashboard

---

## 📞 API Quick Reference

```
/api/owner/chargers                    - Charger CRUD
/api/owner/chargers/:id/status         - Update status
/api/owner/bookings                    - View bookings
/api/owner/stats/bookings              - Booking stats
/api/owner/stats/revenue               - Revenue stats
/api/owner/stats/utilization           - Usage stats
```

All endpoints require:
- `Authorization: Bearer <JWT_TOKEN>`
- User role: `owner` or `admin`

---

**Implementation Date:** November 15, 2025  
**Status:** ✅ Backend Complete - Ready for Frontend Integration  
**Module:** OwnerModule loaded in app.module.ts
