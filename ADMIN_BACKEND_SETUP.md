# Admin Module Setup Guide

## ✅ What's Been Implemented

### Backend Admin Module (NestJS)

1. **User Entity Updates**
   - Added `role` field (user, admin, owner)
   - Added `isBanned` field for user management

2. **Admin Module Structure**
   ```
   src/admin/
   ├── admin.module.ts          # Module configuration
   ├── admin.controller.ts      # API endpoints
   ├── admin.service.ts         # Business logic
   ├── dto/
   │   └── admin.dto.ts        # Data transfer objects
   └── guards/
       └── admin.guard.ts       # Admin role protection
   ```

3. **Admin API Endpoints**

   **Dashboard**
   - `GET /api/admin/stats` - Dashboard statistics (users, chargers, revenue)

   **User Management**
   - `GET /api/admin/users` - List users with filters (search, role, status, pagination)
   - `GET /api/admin/users/:id` - Get user details
   - `POST /api/admin/users/:id/ban` - Ban a user
   - `POST /api/admin/users/:id/unban` - Unban a user
   - `PATCH /api/admin/users/:id/role` - Update user role

   **Charger Management**
   - `GET /api/admin/chargers` - List chargers with filters
   - `POST /api/admin/chargers/:id/approve` - Approve a charger
   - `POST /api/admin/chargers/:id/reject` - Reject a charger (with reason)
   - `PATCH /api/admin/chargers/:id` - Update charger details

   **Analytics**
   - `GET /api/admin/analytics/revenue` - Revenue data by date range
   - `GET /api/admin/analytics/user-growth` - User growth statistics
   - `GET /api/admin/analytics/bookings` - Booking statistics

4. **Authentication**
   - `POST /api/auth/admin/login` - Admin login (checks role)
   - `GET /api/auth/admin/verify` - Verify admin token

5. **Security Features**
   - JWT authentication required for all admin routes
   - Admin role verification via `AdminGuard`
   - Ban status checking
   - CORS enabled for admin dashboard (localhost:3000)

## 🚀 Setup Instructions

### 1. Database Setup

Make sure your PostgreSQL database is running and the connection URL is in `.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/evconnect
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=4000
```

### 2. Install Dependencies (if not already installed)

```bash
cd /Users/akilanishan/Documents/EVConnect-Project
npm install
```

### 3. Create Admin User

Run the seed script to create the default admin user:

```bash
npm run seed
```

This creates:
- **Email**: admin@evconnect.com
- **Password**: admin123
- **Role**: admin

⚠️ **Important**: Change this password in production!

### 4. Start the Backend

```bash
npm run start:dev
```

The API will be available at: `http://localhost:4000/api`

### 5. Test Admin Login

You can test the admin login endpoint:

```bash
curl -X POST http://localhost:4000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@evconnect.com","password":"admin123"}'
```

You should get a response with an access token.

### 6. Test Admin Endpoints

Get the token from the login response and use it:

```bash
# Get dashboard stats
curl http://localhost:4000/api/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# List users
curl http://localhost:4000/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# List chargers
curl http://localhost:4000/api/admin/chargers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🔗 Connect to Admin Dashboard

### 1. Make sure the backend is running on port 4000

```bash
# In the project root
npm run start:dev
```

### 2. Start the admin dashboard (in a new terminal)

```bash
cd admin-dashboard
npm run dev
```

The dashboard will be at: `http://localhost:3000`

### 3. Login

- Go to `http://localhost:3000`
- You'll be redirected to the login page
- Enter:
  - Email: `admin@evconnect.com`
  - Password: `admin123`
- Click Login

### 4. Explore the Dashboard

After login, you'll see:
- 4 KPI cards (users, chargers, bookings, revenue)
- Revenue trend chart
- Bookings trend chart
- Sidebar navigation

## 📋 API Response Examples

### Dashboard Stats
```json
{
  "totalUsers": 15,
  "totalChargers": 8,
  "availableChargers": 5,
  "totalBookings": 0,
  "totalRevenue": 0,
  "userGrowth": 12.5,
  "revenueGrowth": 8.3
}
```

### User List
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "isVerified": true,
      "isBanned": false,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

## 🔒 Security Notes

1. **JWT Secret**: Change `JWT_SECRET` in production
2. **Admin Password**: Change the default admin password immediately
3. **CORS**: Update CORS origins in `main.ts` for production
4. **Database**: Use `synchronize: false` in production and use migrations
5. **Validation**: All DTOs use `class-validator` for input validation

## 🐛 Troubleshooting

### Database Connection Issues

**Error**: "Connection refused"
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql
```

### TypeScript Errors

The TypeScript errors you see are because node_modules aren't installed yet. Run:
```bash
npm install
```

### Port Already in Use

**Error**: "Port 4000 is already in use"
```bash
# Find process using port 4000
lsof -ti:4000

# Kill the process
kill -9 $(lsof -ti:4000)
```

### Admin Login Fails

1. Make sure you ran the seed script: `npm run seed`
2. Check database connection
3. Verify JWT_SECRET is set
4. Check backend logs for errors

## 📊 Testing the Full Stack

1. **Start Backend**
   ```bash
   npm run start:dev
   ```

2. **Start Admin Dashboard** (new terminal)
   ```bash
   cd admin-dashboard
   npm run dev
   ```

3. **Login to Dashboard**
   - Go to http://localhost:3000
   - Login with admin@evconnect.com / admin123

4. **Verify APIs**
   - Dashboard should show stats
   - Charts should display mock data
   - All navigation items should be visible

## 🎯 Next Steps

Now that the backend admin module is complete, you can:

1. **Build User Management Page** - Create the frontend UI for managing users
2. **Build Charger Management Page** - Create the frontend UI for managing chargers
3. **Build Analytics Page** - Create advanced charts and reports
4. **Add Real Booking Data** - When booking module is implemented, replace mock data
5. **Deploy** - Set up Docker and production deployment

## 📝 API Documentation

For detailed API documentation, you can add Swagger:

```bash
npm install @nestjs/swagger swagger-ui-express
```

Then add to `main.ts`:
```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('EVConnect Admin API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

Access at: `http://localhost:4000/api/docs`

---

**Great work! Your admin backend is now complete and ready to power the admin dashboard! 🎉**
