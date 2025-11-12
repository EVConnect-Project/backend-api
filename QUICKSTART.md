# EVConnect - Quick Start Guide

Complete setup guide for the EVConnect platform (Backend + Mobile App).

## 🚀 Quick Start

### Backend Setup (5 minutes)

1. **Install dependencies:**
```bash
cd evconnect_backend
npm install
npm install @nestjs/passport passport passport-jwt @types/passport-jwt @nestjs/mapped-types
```

2. **Setup PostgreSQL:**
```bash
# macOS (using Homebrew)
brew install postgresql
brew services start postgresql
createdb evconnect

# Or using Docker
docker run --name evconnect-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=evconnect -p 5432:5432 -d postgres:14
```

3. **Configure environment:**
```bash
# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/evconnect
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
PORT=4000
EOF
```

4. **Start the backend:**
```bash
npm run start:dev
# Backend running at http://localhost:4000
```

### Mobile App Setup (3 minutes)

1. **Install dependencies:**
```bash
cd mobile-app/evconnect_app
flutter pub get
```

2. **Configure base URL (if using emulator):**

For Android emulator, edit `lib/services/auth_service.dart` and `lib/services/api_service.dart`:
```dart
// Change from
AuthService(baseUrl: 'http://localhost:4000')
// To
AuthService(baseUrl: 'http://10.0.2.2:4000')
```

3. **Run the app:**
```bash
flutter run
# Or for web
flutter run -d chrome
```

## 📱 Platform-Specific Notes

### Android Emulator
- Use `http://10.0.2.2:4000` instead of `localhost:4000`
- Location permissions configured in AndroidManifest.xml

### iOS Simulator
- `localhost:4000` works as-is
- Location permissions configured in Info.plist

### Physical Device
- Use your machine's LAN IP (e.g., `http://192.168.1.100:4000`)
- Ensure backend accepts connections from network interfaces
- Backend should bind to `0.0.0.0` not just `127.0.0.1`

## 🧪 Test the Setup

### 1. Test Backend Health
```bash
curl http://localhost:4000
# Should return: Hello World!
```

### 2. Register a User
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Save the access_token from response
```

### 3. Create a Test Charger
```bash
# Replace <TOKEN> with your access_token
curl -X POST http://localhost:4000/chargers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "lat": 37.7749,
    "lng": -122.4194,
    "powerKw": 150,
    "pricePerKwh": 0.35,
    "name": "Test Charger",
    "address": "San Francisco, CA"
  }'
```

### 4. Get All Chargers
```bash
curl http://localhost:4000/chargers
# Should return array with your test charger
```

## 🎯 App Features to Test

1. **Authentication Flow:**
   - Open app → Signup screen
   - Register new account
   - Login with credentials
   - JWT token stored securely

2. **Chargers List:**
   - Main screen shows chargers from backend
   - Pull to refresh
   - Error handling with retry button

3. **Map View:**
   - Navigate to map screen
   - Allow location permissions
   - See charger markers
   - Tap marker for details
   - Nearby chargers based on your location

## 🛠️ Development Workflow

### Backend Terminal
```bash
cd evconnect_backend
npm run start:dev
# Watches for file changes, auto-restarts
```

### Flutter Terminal  
```bash
cd mobile-app/evconnect_app
flutter run
# Hot reload: press 'r'
# Hot restart: press 'R'
```

### Logs & Debugging

**Backend logs:**
- TypeORM SQL queries logged to console
- Request/response logs in terminal

**Flutter logs:**
- `flutter logs` - view device logs
- `print()` statements appear in terminal
- DevTools: `flutter pub global run devtools`

## 📚 Key Files Reference

### Backend
- `src/auth/auth.controller.ts` - Auth endpoints
- `src/charger/charger.controller.ts` - Charger endpoints  
- `src/auth/entities/user.entity.ts` - User model
- `src/charger/entities/charger.entity.ts` - Charger model

### Flutter
- `lib/main.dart` - App entry point
- `lib/screens/login_screen.dart` - Login UI
- `lib/screens/signup_screen.dart` - Signup UI
- `lib/screens/map_screen.dart` - Map with chargers
- `lib/services/auth_service.dart` - Auth API calls
- `lib/services/charger_service.dart` - Charger API calls
- `lib/providers/auth_provider.dart` - Auth state management
- `lib/providers/charger_provider.dart` - Charger state management

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 4000 is in use
lsof -ti:4000 | xargs kill -9

# Verify PostgreSQL is running
brew services list
# or
docker ps

# Check .env file exists
cat .env
```

### Flutter package errors
```bash
flutter clean
flutter pub get
flutter run
```

### Location not working
- iOS: Check Info.plist has location usage description
- Android: Check AndroidManifest.xml has permissions
- Enable location services on device/simulator

### Network errors in app
- Check backend is running: `curl http://localhost:4000`
- Verify base URL in service files
- Android emulator: must use `10.0.2.2` not `localhost`
- Physical device: use LAN IP address

### JWT token issues
- Check JWT_SECRET is set in backend .env
- Verify token is saved after login/signup
- Check Authorization header format: `Bearer <token>`

## 📖 Next Steps

1. **Add more features:**
   - Booking/reservation system
   - Real-time charging status with WebSockets
   - Payment integration
   - User reviews and ratings
   - Push notifications

2. **Enhance security:**
   - Refresh tokens
   - Rate limiting
   - Input sanitization
   - HTTPS in production

3. **Improve UX:**
   - Add splash screen
   - Loading skeletons
   - Offline mode
   - Better error messages
   - Animations

4. **Deploy:**
   - Backend: Heroku, AWS, DigitalOcean
   - Database: Managed PostgreSQL
   - Mobile: App Store & Google Play

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review backend/frontend logs
3. Verify all dependencies installed
4. Ensure database is running and accessible

Happy coding! ⚡🚗
