# Backend API Requirements - Phase 1 Integration

This document outlines the backend API endpoints required to support Phase 1 Critical UX features.

---

## 1. Photo Upload API

### Endpoint: Upload Charger Photos
**POST** `/api/chargers/:chargerId/photos`

**Authentication**: Required (JWT token)

**Request Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Request Body**:
```
photos: File[] (max 5 files)
isMainPhoto: boolean (for first photo)
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "chargerId": "123",
    "photos": [
      {
        "id": "photo_1",
        "url": "https://storage.evconnect.com/chargers/123/photo1.jpg",
        "thumbnailUrl": "https://storage.evconnect.com/chargers/123/thumb_photo1.jpg",
        "isMain": true,
        "uploadedAt": "2025-11-23T10:30:00Z"
      },
      {
        "id": "photo_2",
        "url": "https://storage.evconnect.com/chargers/123/photo2.jpg",
        "thumbnailUrl": "https://storage.evconnect.com/chargers/123/thumb_photo2.jpg",
        "isMain": false,
        "uploadedAt": "2025-11-23T10:30:05Z"
      }
    ]
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid file format or size
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User not authorized to upload photos for this charger
- `413 Payload Too Large`: File size exceeds limit (max 5MB per photo)

**Implementation Notes**:
- Accept JPEG, PNG formats only
- Max file size: 5MB per photo
- Max 5 photos per charger
- Generate thumbnails (300x300) automatically
- Store in cloud storage (S3, Google Cloud Storage, etc.)
- Compress images to optimize storage
- Return both full-size and thumbnail URLs

**Database Schema**:
```sql
CREATE TABLE charger_photos (
  id SERIAL PRIMARY KEY,
  charger_id INTEGER REFERENCES chargers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  file_size INTEGER,
  width INTEGER,
  height INTEGER
);

CREATE INDEX idx_charger_photos_charger_id ON charger_photos(charger_id);
```

### Endpoint: Delete Charger Photo
**DELETE** `/api/chargers/:chargerId/photos/:photoId`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

---

## 2. Transaction History API

### Endpoint: Get User Transactions
**GET** `/api/transactions`

**Authentication**: Required

**Query Parameters**:
```
status: string (optional) - "completed", "active", "pending"
startDate: ISO 8601 date (optional)
endDate: ISO 8601 date (optional)
page: integer (default: 1)
limit: integer (default: 20, max: 100)
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_123456",
        "chargerId": "charger_789",
        "chargerName": "Downtown Charging Station",
        "sessionId": "session_abc123",
        "startTime": "2025-11-23T09:00:00Z",
        "endTime": "2025-11-23T10:30:00Z",
        "duration": 5400,
        "energyDelivered": 45.5,
        "cost": 22.75,
        "pricePerKwh": 0.50,
        "status": "completed",
        "paymentMethod": {
          "id": "pm_123",
          "last4": "4242",
          "brand": "visa"
        },
        "createdAt": "2025-11-23T09:00:00Z",
        "updatedAt": "2025-11-23T10:30:00Z"
      }
    ],
    "summary": {
      "totalSpent": 234.50,
      "totalEnergy": 456.8,
      "totalSessions": 12,
      "avgCostPerSession": 19.54,
      "avgEnergyPerSession": 38.07
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

**Implementation Notes**:
- Return transactions for authenticated user only
- Sort by `startTime` descending (newest first)
- Calculate summary statistics based on filtered results
- Support filtering by status and date range
- Implement pagination for large result sets

**Database Schema**:
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  charger_id INTEGER REFERENCES chargers(id),
  session_id INTEGER REFERENCES charging_sessions(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration INTEGER, -- seconds
  energy_delivered DECIMAL(10, 2), -- kWh
  cost DECIMAL(10, 2), -- dollars
  price_per_kwh DECIMAL(5, 2),
  status VARCHAR(20) NOT NULL, -- completed, active, pending, failed
  payment_method_id INTEGER REFERENCES payment_methods(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_start_time ON transactions(start_time DESC);
```

### Endpoint: Export Transactions
**GET** `/api/transactions/export`

**Query Parameters**: Same as GET /api/transactions

**Response**: CSV file download
```csv
Transaction ID,Charger Name,Start Time,End Time,Duration (min),Energy (kWh),Cost ($),Status
txn_123456,Downtown Station,2025-11-23 09:00,2025-11-23 10:30,90,45.5,22.75,completed
```

---

## 3. FCM Token Management API

### Endpoint: Save FCM Token
**POST** `/api/users/:userId/fcm-token`

**Authentication**: Required (user can only update their own token)

**Request Body**:
```json
{
  "fcmToken": "fKJ8h9D3pQ4:APA91bE...",
  "platform": "ios" // or "android"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "FCM token saved successfully"
}
```

**Implementation Notes**:
- Upsert token (update if exists, insert if new)
- Store platform to enable platform-specific notifications
- Invalidate old tokens when user logs out
- Support multiple devices per user

**Database Schema**:
```sql
CREATE TABLE user_fcm_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,
  platform VARCHAR(10) NOT NULL, -- ios, android, web
  device_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_fcm_tokens_user_id ON user_fcm_tokens(user_id);
```

### Endpoint: Delete FCM Token (on logout)
**DELETE** `/api/users/:userId/fcm-token/:tokenId`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "FCM token deleted successfully"
}
```

---

## 4. Push Notification API (Backend → Device)

### Send Charging Started Notification
**Trigger**: When charging session starts

**Payload**:
```json
{
  "to": "FCM_TOKEN",
  "notification": {
    "title": "Charging Started",
    "body": "Your EV is now charging at Downtown Station"
  },
  "data": {
    "type": "charging_started",
    "chargerId": "789",
    "sessionId": "abc123",
    "navigate": "/sessions/abc123"
  },
  "priority": "high"
}
```

### Send Charging Complete Notification
**Trigger**: When charging session completes (100% or stopped)

**Payload**:
```json
{
  "notification": {
    "title": "Charging Complete",
    "body": "45.5 kWh delivered | $22.75 | 90 min"
  },
  "data": {
    "type": "charging_complete",
    "sessionId": "abc123",
    "energyDelivered": "45.5",
    "cost": "22.75",
    "navigate": "/transaction-history"
  }
}
```

### Send 80% Battery Notification
**Trigger**: When battery reaches 80% (optimal for battery health)

**Payload**:
```json
{
  "notification": {
    "title": "Battery at 80%",
    "body": "Optimal charge level reached. Continue to 100%?"
  },
  "data": {
    "type": "battery_80_percent",
    "sessionId": "abc123"
  }
}
```

### Send Idle Fee Warning
**Trigger**: 5 minutes before idle fees apply

**Payload**:
```json
{
  "notification": {
    "title": "Idle Fee Warning",
    "body": "Move your vehicle in 5 minutes to avoid $0.50/min idle fee"
  },
  "data": {
    "type": "idle_fee_warning",
    "sessionId": "abc123",
    "timeRemaining": "300"
  }
}
```

### Send Payment Successful Notification
**Trigger**: After payment processing completes

**Payload**:
```json
{
  "notification": {
    "title": "Payment Successful",
    "body": "$22.75 charged to Visa •••• 4242"
  },
  "data": {
    "type": "payment_successful",
    "transactionId": "txn_123456",
    "amount": "22.75"
  }
}
```

### Send Charger Available Notification
**Trigger**: When favorited charger becomes available

**Payload**:
```json
{
  "notification": {
    "title": "Charger Available",
    "body": "Downtown Station is now available"
  },
  "data": {
    "type": "charger_available",
    "chargerId": "789",
    "navigate": "/chargers/789"
  }
}
```

---

## 5. Enhanced Charger Search API (with Filters)

### Endpoint: Search Chargers with Filters
**GET** `/api/chargers/search`

**Query Parameters**:
```
connectorTypes: string[] (ccs,type2,chademo,gbt,tesla)
powerLevels: string[] (slow,fast,rapid,ultraFast)
minPrice: float
maxPrice: float
maxDistance: float (km from user location)
availableOnly: boolean
verifiedOnly: boolean
amenities: string[] (parking,wifi,restroom,restaurant,shopping,covered)
latitude: float (user location)
longitude: float (user location)
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "chargers": [
      {
        "id": "789",
        "name": "Downtown Charging Station",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "powerKw": 150,
        "pricePerKwh": 0.50,
        "status": "available",
        "connectorTypes": ["ccs", "type2"],
        "amenities": ["parking", "wifi", "restroom"],
        "distance": 2.5,
        "photos": [
          {
            "url": "...",
            "thumbnailUrl": "...",
            "isMain": true
          }
        ],
        "rating": 4.5,
        "reviewCount": 123,
        "verified": true
      }
    ],
    "totalResults": 45,
    "appliedFilters": {
      "connectorTypes": ["ccs"],
      "powerLevels": ["rapid"],
      "maxDistance": 10
    }
  }
}
```

**Implementation Notes**:
- Use spatial queries for distance filtering (PostGIS)
- Filter by connector compatibility
- Power level ranges: slow (≤7kW), fast (7-50kW), rapid (50-150kW), ultraFast (>150kW)
- Return chargers sorted by distance
- Include photos (main photo only in list view)

---

## 6. Payment Methods API (Already Implemented?)

### Endpoint: List Payment Methods
**GET** `/api/payment-methods`

**Response**:
```json
{
  "paymentMethods": [
    {
      "id": "pm_123",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "expMonth": 12,
        "expYear": 2026
      },
      "isDefault": true
    }
  ]
}
```

### Endpoint: Add Payment Method
**POST** `/api/payment-methods`

### Endpoint: Delete Payment Method
**DELETE** `/api/payment-methods/:id`

### Endpoint: Set Default Payment Method
**PUT** `/api/payment-methods/:id/default`

---

## Implementation Priority

### High Priority (Required for Phase 1)
1. ✅ FCM Token Management - Enables push notifications
2. ✅ Enhanced Charger Search - Enables advanced filters
3. ✅ Transaction History - Enables transaction tracking

### Medium Priority
4. Photo Upload API - Enables photo upload (can use placeholder for now)
5. Push Notification Triggers - Can test manually initially

### Low Priority (Can be mocked)
6. Export Transactions - Nice to have
7. Charger Available Notifications - Requires favorites system (Phase 2)

---

## Testing Endpoints

Use tools like:
- **Postman**: For API testing
- **Thunder Client**: VS Code extension
- **curl**: Command-line testing

**Example curl request**:
```bash
# Get transactions
curl -X GET "http://localhost:3000/api/transactions?status=completed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Save FCM token
curl -X POST "http://localhost:3000/api/users/123/fcm-token" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fcmToken": "fKJ8h9...", "platform": "ios"}'
```

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Users can only access their own data
3. **Rate Limiting**: Prevent abuse (max 100 requests/minute per user)
4. **Input Validation**: Validate all inputs (file types, sizes, parameters)
5. **SQL Injection Protection**: Use parameterized queries
6. **CORS**: Configure allowed origins
7. **HTTPS Only**: Enforce SSL in production

---

## Next Steps

1. Implement high-priority endpoints first
2. Test with Postman/curl
3. Update Flutter app to call real APIs (remove mock data)
4. Monitor API performance and errors
5. Set up logging and monitoring (e.g., Sentry, LogRocket)

---

*Last Updated: 23 November 2025*
