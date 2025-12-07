# Backend API Endpoints for Phone + OTP Authentication

## Overview
The frontend now implements a complete phone-based authentication flow with OTP verification. The backend needs to implement these endpoints to support the new flow.

## Required Endpoints

### 1. Send OTP
**POST** `/api/auth/send-otp`

**Request Body:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 300
}
```

**Implementation Notes:**
- Generate a 6-digit random OTP
- Store OTP with phone number and expiration time (5 minutes) in database/cache
- Send OTP via SMS service (Twilio, AWS SNS, etc.)
- Rate limit: Max 3 attempts per phone number per hour

---

### 2. Verify OTP
**POST** `/api/auth/verify-otp`

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "verificationToken": "jwt-token-here",
  "message": "OTP verified successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**Implementation Notes:**
- Check if OTP matches and hasn't expired
- Generate a temporary verification token (JWT) valid for 10 minutes
- Mark OTP as used to prevent replay attacks
- Return verification token for account creation

---

### 3. Resend OTP
**POST** `/api/auth/resend-otp`

**Request Body:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP resent successfully",
  "expiresIn": 300
}
```

**Implementation Notes:**
- Same logic as send-otp
- Invalidate previous OTP
- Generate new OTP and send via SMS
- Rate limit: Max 3 resends per phone number per hour

---

### 4. Register with Phone
**POST** `/api/auth/register-phone`

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "password": "SecurePassword123!",
  "verificationToken": "jwt-token-from-verify-otp"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "access_token": "jwt-access-token",
  "refresh_token": "jwt-refresh-token",
  "user": {
    "id": "user-id",
    "phoneNumber": "+1234567890",
    "createdAt": "2025-12-07T10:00:00Z"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Phone number already registered"
}
```

**Implementation Notes:**
- Verify the verification token is valid and matches phone number
- Check if phone number is already registered
- Hash password using bcrypt (min 10 rounds)
- Create user account in database
- Generate access token (JWT) - expires in 24 hours
- Generate refresh token - expires in 30 days
- Return tokens and user data

---

### 5. Login with Phone
**POST** `/api/auth/login-phone`

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "access_token": "jwt-access-token",
  "refresh_token": "jwt-refresh-token",
  "user": {
    "id": "user-id",
    "phoneNumber": "+1234567890",
    "name": "John Doe",
    "role": "user"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid phone number or password"
}
```

**Implementation Notes:**
- Find user by phone number
- Verify password using bcrypt compare
- Generate new access token and refresh token
- Update last login timestamp
- Return tokens and user data

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone_number);
```

### OTP Verification Table (or use Redis)
```sql
CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT false,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_verifications(phone_number);
CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);
```

---

## Security Considerations

1. **Rate Limiting:**
   - Implement rate limiting on all OTP endpoints
   - Max 3 OTP requests per phone number per hour
   - Max 5 login attempts per phone number per 15 minutes

2. **OTP Security:**
   - Use cryptographically secure random number generator
   - 6-digit OTP (000000 - 999999)
   - 5-minute expiration
   - Single-use only
   - Store hashed OTP in database

3. **Password Requirements:**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character

4. **Phone Number Validation:**
   - Use libphonenumber for validation
   - Store in E.164 format (+1234567890)
   - Validate country code

5. **JWT Tokens:**
   - Access token: 24 hours expiration
   - Refresh token: 30 days expiration
   - Include user ID, phone number, and role in payload
   - Sign with strong secret key

---

## SMS Provider Integration

### Recommended Services:
1. **Twilio** - Most popular, reliable
2. **AWS SNS** - Good for AWS infrastructure
3. **Firebase Cloud Messaging** - Free tier available
4. **MessageBird** - Good international coverage

### Example Twilio Integration (Node.js):
```javascript
const twilio = require('twilio');
const client = twilio(accountSid, authToken);

async function sendOTP(phoneNumber, otp) {
  await client.messages.create({
    body: `Your EVRS verification code is: ${otp}. Valid for 5 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  });
}
```

---

## Testing

### Test Phone Numbers (Development):
For development/testing, implement bypass logic:
- Phone: `+1555000000X` where X is any digit
- OTP: Always accept `123456` for test numbers
- Skip actual SMS sending

### Example Test Credentials:
```
Phone: +15550000001
OTP: 123456
Password: Test1234!
```

---

## Frontend Integration Status

✅ **Completed:**
- Phone signup screen with 3-step flow
- OTP verification screen with 6-digit input
- Phone login screen
- Full AuthService integration
- API client setup with token management
- Error handling and loading states

🔄 **Backend Requirements:**
- Implement all 5 API endpoints
- Set up SMS service
- Create database tables
- Implement rate limiting
- Add security measures

---

## API Error Codes

Use these standard error codes for consistency:

- `400` - Bad Request (invalid input, validation errors)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (account disabled, etc.)
- `404` - Not Found (phone number not registered)
- `409` - Conflict (phone number already registered)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Next Steps

1. Implement backend endpoints in NestJS
2. Set up Twilio or SMS service
3. Create database migrations
4. Add rate limiting middleware
5. Test OTP flow end-to-end
6. Deploy and monitor

---

**Date Created:** December 7, 2025
**Frontend Implementation:** ✅ Complete
**Backend Implementation:** 🔄 Pending
