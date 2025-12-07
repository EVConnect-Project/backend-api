# Admin Control System API Documentation

## Overview
Complete API documentation for the Admin Control System that enables admins to manage users, chargers, sellers, and mechanics through a centralized dashboard.

**Key Features:**
- Direct chat with any user (owners, sellers, mechanics, drivers)
- Charger control (suspend, hold/release, status override, price override)
- Marketplace management (approve, reject, edit, hold/release)
- Mechanic management (verify, suspend, hold/release)
- Complete audit trail with IP tracking and reasons

---

## Authentication
All admin endpoints require:
- Bearer token authentication
- Admin role permission
- Headers: `Authorization: Bearer <token>`

---

## 1. ADMIN CHAT APIS

### Initialize Chat with User
**POST** `/api/admin/chat/initiate`

Start a direct conversation with any user (owner/seller/mechanic/driver).

**Request Body:**
```json
{
  "targetUserId": "uuid",
  "initialMessage": "Hello, this is admin support." // optional
}
```

**Response:**
```json
{
  "conversation": {
    "id": "uuid",
    "userId": "admin-uuid",
    "participantId": "target-uuid",
    "type": "direct"
  },
  "message": {
    "id": "uuid",
    "content": "Hello...",
    "isAdminMessage": true
  }
}
```

---

### Get Admin Conversations
**GET** `/api/admin/chat/conversations?page=1&limit=20`

List all admin conversations.

**Response:**
```json
{
  "conversations": [...],
  "total": 45,
  "page": 1,
  "pages": 3
}
```

---

### Get Conversation Messages
**GET** `/api/admin/chat/conversations/:id/messages?page=1&limit=50`

Retrieve message history for a conversation.

---

### Send Message
**POST** `/api/admin/chat/conversations/:id/send`

Send a message as admin.

**Request Body:**
```json
{
  "content": "Your message",
  "type": "text",
  "priority": "normal" // or "high", "urgent"
}
```

---

### Broadcast Message
**POST** `/api/admin/chat/broadcast`

Send message to multiple users simultaneously.

**Request Body:**
```json
{
  "userIds": ["uuid1", "uuid2", "uuid3"],
  "message": "System maintenance scheduled...",
  "priority": "high"
}
```

**Response:**
```json
{
  "sent": 3,
  "messages": [...]
}
```

---

### Set Conversation Priority
**PUT** `/api/admin/chat/conversations/:id/priority`

Mark conversation as urgent/high/normal.

**Request Body:**
```json
{
  "priority": "urgent"
}
```

---

### Get User Context
**GET** `/api/admin/chat/users/:id/context`

Get user details for chat context.

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+94771234567",
  "role": "owner",
  "isBanned": false,
  "createdAt": "2025-01-01"
}
```

---

## 2. CHARGER CONTROL APIS

### Suspend/Resume Charger
**PUT** `/api/admin/chargers/:id/suspend`

Admin override to suspend or resume a charger.

**Request Body:**
```json
{
  "suspend": true,
  "reason": "Maintenance required"
}
```

---

### Override Charger Status
**PUT** `/api/admin/chargers/:id/status`

Force change charger status.

**Request Body:**
```json
{
  "status": "offline", // "available", "in-use", "offline"
  "reason": "Emergency shutdown"
}
```

---

### Set Price Override
**PUT** `/api/admin/chargers/:id/price-override`

Temporarily override charger pricing.

**Request Body:**
```json
{
  "pricePerKwh": 0.15,
  "reason": "Promotional pricing"
}
```

---

### Get Charger Owner
**GET** `/api/admin/chargers/:id/owner`

Get owner details for a specific charger.

**Response:**
```json
{
  "id": "owner-uuid",
  "name": "Jane Owner",
  "email": "jane@example.com",
  "phone": "+94771234568",
  "role": "owner",
  "createdAt": "2024-12-01"
}
```

---

### Contact Charger Owner
**POST** `/api/admin/chargers/:id/contact-owner`

Initiate chat with charger owner directly.

**Request Body:**
```json
{
  "message": "Please check your charger configuration"
}
```

---

### Hold Charger
**PUT** `/api/admin/chargers/:id/hold`

Temporarily hold an approved charger (disables while keeping verified status).

**Request Body:**
```json
{
  "reason": "Under investigation for reported issues"
}
```

**Response:**
```json
{
  "id": "charger-uuid",
  "status": "offline",
  "verified": true,
  "metadata": {
    "adminHeld": true,
    "holdReason": "Under investigation...",
    "heldAt": "2024-12-07T10:30:00Z",
    "previousStatus": "available"
  }
}
```

---

### Release Charger
**PUT** `/api/admin/chargers/:id/release`

Release a held charger and restore previous status.

**Request Body:**
```json
{
  "notes": "Investigation completed, no issues found" // optional
}
```

**Response:**
```json
{
  "id": "charger-uuid",
  "status": "available",
  "verified": true,
  "metadata": {
    "adminHeld": false,
    "releasedAt": "2024-12-07T14:30:00Z",
    "releaseNotes": "Investigation completed..."
  }
}
```

---

## 3. MARKETPLACE MANAGEMENT APIS

### Get Marketplace Listings
**GET** `/api/admin/marketplace/listings?status=pending&page=1&limit=20`

Get all marketplace listings with admin filters.

**Query Parameters:**
- `status`: pending, approved, rejected, sold
- `search`: search in title/description
- `page`, `limit`: pagination

---

### Approve Listing
**PUT** `/api/admin/marketplace/listings/:id/approve`

Approve a marketplace listing.

**Request Body:**
```json
{
  "adminNotes": "Verified and approved" // optional
}
```

---

### Reject Listing
**PUT** `/api/admin/marketplace/listings/:id/reject`

Reject a marketplace listing.

**Request Body:**
```json
{
  "reason": "Inappropriate content"
}
```

---

### Edit Listing (Admin Override)
**PUT** `/api/admin/marketplace/listings/:id/edit`

Admin can directly edit any listing field.

**Request Body:**
```json
{
  "title": "Corrected Title",
  "price": 150.00,
  "description": "Updated description"
}
```

---

### Contact Seller
**POST** `/api/admin/marketplace/sellers/:id/contact`

Initiate chat with seller.

**Request Body:**
```json
{
  "message": "Question about your listing"
}
```

---

### Suspend Seller
**PUT** `/api/admin/marketplace/sellers/:id/suspend`

Suspend or resume a seller account.

**Request Body:**
```json
{
  "suspend": true,
  "reason": "Multiple policy violations"
}
```

---

### Hold Listing
**PUT** `/api/admin/marketplace/listings/:id/hold`

Temporarily hold an approved listing (removes from marketplace while keeping approved status).

**Request Body:**
```json
{
  "reason": "Verifying listing authenticity"
}
```

**Response:**
```json
{
  "id": "listing-uuid",
  "status": "pending",
  "adminNotes": "HELD by admin: Verifying listing authenticity\n\nPrevious notes: None"
}
```

---

### Release Listing
**PUT** `/api/admin/marketplace/listings/:id/release`

Release a held listing and restore to marketplace.

**Request Body:**
```json
{
  "notes": "Verification complete" // optional
}
```

**Response:**
```json
{
  "id": "listing-uuid",
  "status": "approved",
  "adminNotes": "RELEASED by admin: Verification complete"
}
```

---

## 4. MECHANIC MANAGEMENT APIS

### Verify Mechanic
**PUT** `/api/admin/mechanics/:id/verify`

Verify mechanic credentials.

**Request Body:**
```json
{
  "verified": true,
  "notes": "Credentials verified, license valid"
}
```

---

### Suspend Mechanic
**PUT** `/api/admin/mechanics/:id/suspend`

Suspend or resume mechanic account.

**Request Body:**
```json
{
  "suspend": true,
  "reason": "Customer complaints"
}
```

---

### Contact Mechanic
**POST** `/api/admin/mechanics/:id/contact`

Initiate chat with mechanic.

**Request Body:**
```json
{
  "message": "Please update your service hours"
}
```

---

### Get Mechanic Jobs
**GET** `/api/admin/mechanics/:id/jobs?page=1&limit=20`

View mechanic job history.

**Response:**
```json
{
  "jobs": [...],
  "total": 120,
  "page": 1,
  "pages": 6
}
```

---

### Hold Mechanic
**PUT** `/api/admin/mechanics/:id/hold`

Temporarily hold a mechanic account (disables while keeping verified status).

**Request Body:**
```json
{
  "reason": "Reviewing customer complaints"
}
```

**Response:**
```json
{
  "id": "mechanic-uuid",
  "available": false,
  "description": "[HELD BY ADMIN] Reviewing customer complaints\n\nExperienced mechanic..."
}
```

---

### Release Mechanic
**PUT** `/api/admin/mechanics/:id/release`

Release a held mechanic and restore availability.

**Request Body:**
```json
{
  "notes": "Review completed, cleared to work" // optional
}
```

**Response:**
```json
{
  "id": "mechanic-uuid",
  "available": true,
  "description": "[RELEASED] Review completed, cleared to work\n\nExperienced mechanic..."
}
```

---

## 5. AUDIT LOG APIS

### Get Audit Log
**GET** `/api/admin/audit/actions`

Retrieve admin action history with filters.

**Query Parameters:**
- `adminId`: filter by specific admin
- `targetType`: user, charger, listing, mechanic
- `targetId`: specific target entity
- `actionType`: ban_user, approve_listing, etc.
- `startDate`, `endDate`: date range
- `page`, `limit`: pagination

**Response:**
```json
{
  "actions": [
    {
      "id": "uuid",
      "adminId": "admin-uuid",
      "admin": {
        "name": "Admin User"
      },
      "actionType": "suspend_charger",
      "targetType": "charger",
      "targetId": "charger-uuid",
      "details": {
        "reason": "Maintenance"
      },
      "reason": "Maintenance required",
      "ipAddress": "192.168.1.1",
      "createdAt": "2025-12-07T10:30:00Z"
    }
  ],
  "total": 500,
  "page": 1,
  "pages": 25
}
```

---

## Action Types Reference

### User Actions
- `ban_user` - Ban user account
- `unban_user` - Unban user account
- `change_user_role` - Modify user role
- `initiate_chat` - Start chat with user

### Charger Actions
- `suspend_charger` - Suspend charger
- `resume_charger` - Resume charger
- `change_charger_status` - Override status
- `override_charger_price` - Change pricing
- `verify_charger` - Verify charger

### Marketplace Actions
- `approve_listing` - Approve listing
- `reject_listing` - Reject listing
- `edit_listing` - Edit listing details
- `suspend_seller` - Suspend seller
- `resume_seller` - Resume seller

### Mechanic Actions
- `verify_mechanic` - Verify mechanic
- `unverify_mechanic` - Unverify mechanic
- `suspend_mechanic` - Suspend mechanic
- `resume_mechanic` - Resume mechanic

### Communication Actions
- `broadcast_message` - Send broadcast message
- `set_priority` - Change conversation priority

---

## Admin Dashboard UI Routes

### New Dashboard Pages Created

1. **Charger Control Center**
   - `/dashboard/charger-control`
   - View all chargers
   - Change status (available/in-use/offline)
   - Suspend/Resume chargers
   - Contact owners directly
   - Override pricing

2. **Admin Chat Interface**
   - `/dashboard/admin-chat`
   - View all conversations
   - Initiate new chats with any user
   - Send admin-marked messages
   - Priority messaging
   - Broadcast capabilities

3. **Existing Enhanced Pages**
   - `/dashboard/users` - User management
   - `/dashboard/mechanics` - Mechanic management
   - `/dashboard/marketplace` - Marketplace listings

---

## Usage Examples

### Example 1: Suspend a problematic charger
```bash
curl -X PUT http://localhost:4000/api/admin/chargers/CHARGER_ID/suspend \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "suspend": true,
    "reason": "Safety inspection required"
  }'
```

### Example 2: Contact a charger owner
```bash
curl -X POST http://localhost:4000/api/admin/chargers/CHARGER_ID/contact-owner \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Please respond to our email regarding your charger"
  }'
```

### Example 3: Broadcast urgent message
```bash
curl -X POST http://localhost:4000/api/admin/chat/broadcast \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user1-id", "user2-id", "user3-id"],
    "message": "System maintenance scheduled for tonight 10 PM - 12 AM",
    "priority": "urgent"
  }'
```

---

## Security & Permissions

All admin endpoints:
- ✅ Require authentication
- ✅ Verify admin role
- ✅ Log all actions to audit trail
- ✅ Include IP address tracking
- ✅ Support reason/notes for accountability

---

## Testing the System

1. **Run Backend**:
   ```bash
   cd evconnect_backend
   npm run start:dev
   ```

2. **Run Admin Dashboard**:
   ```bash
   cd admin-dashboard
   npm run dev
   ```

3. **Access Admin Dashboard**:
   - URL: http://localhost:3000
   - Login with admin credentials
   - Navigate to new pages:
     - Charger Control
     - Admin Chat

---

## Database Tables

### New Tables Created
1. **admin_actions** - Audit log
2. **messages** columns added:
   - `is_admin_message` (boolean)
   - `priority_level` (varchar)
3. **chargers** columns added:
   - `metadata` (jsonb) - for admin notes
4. **conversations** columns added:
   - `metadata` (jsonb) - for priority

---

## Next Steps for Full Implementation

1. ✅ Backend admin APIs created
2. ✅ Admin chat service implemented
3. ✅ Audit logging system ready
4. ✅ Database migrations completed
5. ✅ Dashboard UI pages created
6. 🔄 Add real-time WebSocket notifications (optional)
7. 🔄 Add email notifications for admin actions
8. 🔄 Implement role-based admin permissions (super-admin vs moderator)

---

## Support

For questions or issues:
- Check audit logs: `/api/admin/audit/actions`
- Review backend logs
- Test APIs with Postman/curl

---

**System Ready for Production** ✅

All admin control features are now fully implemented and ready to use through the admin dashboard!
