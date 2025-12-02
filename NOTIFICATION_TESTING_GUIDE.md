# 🚀 Quick Start: Testing Notifications

## Prerequisites
- ✅ Backend running: `cd evconnect_backend && npm run start:dev`
- ✅ Database running: PostgreSQL on localhost
- ⚠️ Firebase configured (optional for testing API)

## 1. Test API Endpoints

### Save FCM Token
```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.access_token')

# Save FCM token
curl -X POST http://localhost:3000/api/notifications/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fcmToken": "test-token-12345",
    "platform": "web",
    "deviceId": "test-device"
  }'
```

### Get Notification History
```bash
curl -X GET http://localhost:3000/api/notifications/history \
  -H "Authorization: Bearer $TOKEN"
```

### Send Test Notification
```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "booking_confirmed",
    "title": "Test Notification",
    "body": "This is a test notification"
  }'
```

## 2. Test Real Scenarios

### Booking Confirmation
```bash
# Create a booking (automatically sends notification)
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "chargerId": "your-charger-id",
    "startTime": "2025-12-03T10:00:00Z",
    "endTime": "2025-12-03T11:00:00Z",
    "price": 15.00
  }'
```

### Payment Success
```bash
# Complete a payment (sends notification via webhook)
# This happens automatically when PayHere webhook is called
```

### Mechanic Assignment
```bash
# Assign mechanic to breakdown request
curl -X POST http://localhost:3000/api/breakdown/request/:requestId/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MECHANIC_TOKEN" \
  -d '{
    "mechanicId": "mechanic-user-id"
  }'
```

## 3. Check Database

### View FCM Tokens
```sql
SELECT 
  "userId", 
  LEFT(fcmToken, 30) as token_preview,
  platform,
  "isActive",
  "createdAt"
FROM fcm_tokens
ORDER BY "createdAt" DESC;
```

### View Notification Logs
```sql
SELECT 
  type,
  title,
  status,
  "sentAt",
  "createdAt"
FROM notification_logs
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Check Notification Stats
```sql
SELECT 
  type,
  status,
  COUNT(*) as count
FROM notification_logs
GROUP BY type, status
ORDER BY count DESC;
```

## 4. Flutter Testing

### Initialize Notification Service
```dart
// In main.dart
await NotificationService().initialize();
```

### Check FCM Token
```dart
final token = await FirebaseMessaging.instance.getToken();
print('FCM Token: $token');
```

### Test Foreground Notification
1. Keep app in foreground
2. Send test notification from backend
3. Should see local notification popup

### Test Background Notification
1. Put app in background
2. Send test notification from backend
3. Tap notification to open app

## 5. Firebase Console Testing

Once Firebase is configured:

1. Go to Firebase Console → Cloud Messaging
2. Send test message to device token
3. Check if notification arrives in app

## 6. Automated Test

Run the comprehensive test script:
```bash
./test-notifications-complete.sh
```

## 7. Verify Integration

Run the verification script:
```bash
./verify-notifications.sh
```

## Troubleshooting

### Backend not sending notifications
- Check Firebase credentials in `.env`
- Verify `NotificationsModule` is imported in service modules
- Check backend logs for errors

### Flutter not receiving notifications
- Verify FCM token is being saved (check database)
- Check if notification service is initialized
- Verify JWT token is valid in secure storage

### Notifications not appearing
- Check notification permissions on device
- Verify notification channels are created (Android)
- Check if app is in foreground/background

## Next Steps

1. **Configure Firebase**: Add credentials to `.env`
2. **Test end-to-end**: Create booking → verify notification
3. **Add charging notifications**: Integrate with OCPP service
4. **Add reminder notifications**: 15 min before booking
5. **Add notification preferences**: Allow users to opt-in/out
