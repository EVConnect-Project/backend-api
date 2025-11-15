# EV Connect Permission System

## Overview
This document describes the charger registration and management permission system.

## Permission Rules

### 1. Register Charger (POST `/api/owner/chargers`)
**Who can do this:** ANY authenticated user (user, owner, or admin)

- Any logged-in user can register a charger
- When a regular user registers their first charger, they are automatically upgraded to 'owner' role
- New chargers start with `verified: false` and `status: 'offline'`
- **Admin approval required** before charger goes live

**Implementation:**
```typescript
@Post('chargers')
@Roles('user', 'owner', 'admin')  // ✅ All authenticated users allowed
async registerCharger(@Body() createChargerDto: CreateChargerDto, @Request() req) {
  return this.ownerService.registerCharger(createChargerDto, req.user.userId);
}
```

### 2. Delete Charger (DELETE `/api/owner/chargers/:id`)
**Who can do this:** The charger OWNER (user who created it) + admins

- Users can delete their own chargers at any time
- Ownership is verified in the service layer
- Cannot delete if there are active bookings
- Deletion is a "soft delete" - charger is marked as `offline` and `verified: false`

**Implementation:**
```typescript
@Delete('chargers/:id')
@Roles('user', 'owner', 'admin')  // ✅ All users can attempt, but ownership checked in service
async deleteCharger(@Param('id') id: string, @Request() req) {
  return this.ownerService.deleteCharger(id, req.user.userId);
}
```

**Service validation:**
```typescript
async deleteCharger(id: string, ownerId: string) {
  const charger = await this.chargerRepository.findOne({ where: { id } });
  
  if (!charger) {
    throw new NotFoundException('Charger not found');
  }
  
  if (charger.ownerId !== ownerId) {
    throw new ForbiddenException('You can only delete your own chargers');  // ✅ Ownership check
  }
  
  // ... rest of deletion logic
}
```

### 3. Verify/Approve Charger (POST `/api/admin/chargers/:id/approve`)
**Who can do this:** ADMIN ONLY

- Only administrators can verify/approve chargers
- This is the ONLY way to make a charger available to the public
- Owners CANNOT verify their own chargers
- Admin sets `verified: true` which allows the charger to be discovered by users

**Implementation:**
```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')  // ✅ Admin only
export class AdminController {
  
  @Post('chargers/:id/approve')
  async approveCharger(@Param('id') id: string) {
    return this.adminService.approveCharger(id);
  }
}
```

### 4. Update Charger Status (PATCH `/api/owner/chargers/:id/status`)
**Who can do this:** The charger OWNER

- Owners can change operational status: `available`, `in-use`, `offline`
- This is for day-to-day operations (e.g., taking charger offline for maintenance)
- This does NOT change the `verified` status
- Only verified chargers can be set to 'available'

**Note:** Owners can manage status, but CANNOT verify their charger

## Permission Matrix

| Action | User | Owner | Admin |
|--------|------|-------|-------|
| Register charger | ✅ | ✅ | ✅ |
| View own chargers | ✅* | ✅ | ✅ |
| Update own charger details | ✅* | ✅ | ✅ |
| Change own charger status | ✅* | ✅ | ✅ |
| Delete own charger | ✅ | ✅ | ✅ |
| Verify/Approve charger | ❌ | ❌ | ✅ |
| View all chargers | ❌ | ❌ | ✅ |
| Delete any charger | ❌ | ❌ | ✅ |

\* Users are automatically upgraded to 'owner' role when they register a charger

## Workflow Example

1. **User Registration**
   - New user creates account with role: `user`

2. **User Registers Charger**
   ```
   POST /api/owner/chargers
   {
     "name": "My Home Charger",
     "address": "123 Main St",
     "lat": 6.9271,
     "lng": 79.8612,
     "powerKw": 50,
     "pricePerKwh": 5
   }
   ```
   - User role automatically upgraded to `owner`
   - Charger created with `verified: false`, `status: 'offline'`

3. **Admin Reviews and Approves**
   ```
   POST /api/admin/chargers/:id/approve
   ```
   - Admin verifies charger details
   - Sets `verified: true`
   - Charger now visible to other users

4. **Owner Manages Charger**
   ```
   PATCH /api/owner/chargers/:id/status
   { "status": "available" }
   ```
   - Owner brings charger online
   - Users can now book this charger

5. **Owner Can Delete Anytime**
   ```
   DELETE /api/owner/chargers/:id
   ```
   - Owner decides to remove charger
   - Charger marked as offline and unverified
   - No admin approval needed for deletion

## Security Notes

- All endpoints require JWT authentication via `@UseGuards(JwtAuthGuard)`
- Role-based access control via `@Roles()` decorator and `RolesGuard`
- Ownership verification happens at service layer, not just controller
- Users cannot escalate permissions to verify their own chargers
- Admin approval creates a quality control checkpoint

## API Endpoints Summary

### Owner Endpoints (`/api/owner`)
- `POST /chargers` - Register charger (user, owner, admin)
- `GET /chargers` - List my chargers (owner, admin)
- `GET /chargers/:id` - Get charger details (owner, admin)
- `PATCH /chargers/:id` - Update charger (owner, admin)
- `PATCH /chargers/:id/status` - Change status (owner, admin)
- `DELETE /chargers/:id` - Delete charger (user, owner, admin with ownership check)

### Admin Endpoints (`/api/admin`)
- `GET /chargers` - List all chargers (admin)
- `POST /chargers/:id/approve` - Verify charger (admin)
- `POST /chargers/:id/reject` - Reject charger (admin)
- `PATCH /chargers/:id` - Update any charger (admin)
- `DELETE /chargers/:id` - Delete any charger (admin)
