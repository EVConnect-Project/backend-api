# 🚀 EVConnect Platform - Complete Setup Guide

## ✅ Repository Structure Finalized

```
EVConnect-Project/
├── evconnect_backend/         # ✅ NestJS Backend API
│   ├── Dockerfile             # Production Docker image
│   ├── .env.example           # Environment template
│   ├── .dockerignore          # Docker build exclusions
│   └── README.md              # Backend documentation
├── evconnect_app/             # ✅ Flutter Mobile App  
│   ├── .env.example           # Environment template
│   └── README.md              # Mobile app documentation
├── ai-services/               # ✅ FastAPI AI Services
│   ├── Dockerfile             # Production Docker image
│   ├── start_server.sh        # Startup script
│   ├── requirements.txt       # Python dependencies
│   └── README.md              # AI services documentation
├── infra/                     # ✅ Infrastructure
│   ├── docker-compose.yml     # All services orchestration
│   ├── init-db.sql            # Database initialization
│   ├── nginx/                 # Reverse proxy config
│   └── README.md              # Infrastructure docs
├── .github/workflows/         # ✅ CI/CD Pipelines
│   ├── flutter-ci.yml         # Flutter tests & builds
│   ├── node-ci.yml            # Node.js tests & builds
│   ├── python-ci.yml          # Python tests & ML training
│   ├── full-ci.yml            # Complete pipeline
│   └── README.md              # Workflow documentation
├── docs/                      # Documentation
├── design/                    # UI/UX Assets
└── README.md                  # Main project README
```

---

## 🎯 Quick Start (3 Options)

### Option 1: Docker Compose (Fastest)

```bash
# 1. Clone repository
git clone https://github.com/EVConnect-Project/backend-api.git EVConnect-Project
cd EVConnect-Project

# 2. Start all services
cd infra
docker-compose up -d

# 3. Check status
docker-compose ps

# Services running:
# - Backend API: http://localhost:4000
# - AI Services: http://localhost:5000
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - Nginx: http://localhost:80
```

---

### Option 2: Individual Services

#### Backend API

```bash
cd evconnect_backend

# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env with your values

# Run
npm run start:dev

# API: http://localhost:4000
# Docs: http://localhost:4000/api/docs
```

#### AI Services

```bash
cd ai-services

# Setup
./start_server.sh

# Or manually:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python train_model.py
uvicorn main:app --reload --port 5000

# API: http://localhost:5000
# Docs: http://localhost:5000/docs
```

#### Mobile App

```bash
cd evconnect_app

# Install
flutter pub get

# Configure
cp .env.example .env
# Add your Google Maps API key

# Run
flutter run -d chrome
# Or: flutter run (for mobile)
```

---

### Option 3: Production Build

```bash
# Backend
cd evconnect_backend
docker build -t evconnect-backend:latest .
docker run -p 4000:4000 --env-file .env evconnect-backend

# AI Services
cd ai-services
docker build -t evconnect-ai:latest .
docker run -p 5000:5000 evconnect-ai

# Mobile (Android)
cd evconnect_app
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk

# Mobile (iOS)
flutter build ios --release
# Use Xcode to archive and distribute

# Mobile (Web)
flutter build web --release
# Output: build/web/
```

---

## 📦 Installed Dependencies

### Backend (Node.js)

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "typeorm": "^0.3.0",
    "pg": "^8.11.0",
    "bcrypt": "^5.1.0",
    "passport-jwt": "^4.0.0",
    "stripe": "^13.0.0",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "winston": "^3.10.0"
  }
}
```

### AI Services (Python)

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
numpy==1.26.3
scikit-learn==1.4.0
joblib==1.3.2
pandas==2.1.4
```

### Mobile (Flutter)

```yaml
dependencies:
  flutter_riverpod: ^3.0.3
  dio: ^5.9.0
  flutter_secure_storage: ^9.2.4
  google_maps_flutter: ^2.14.0
  geolocator: ^14.0.2
  url_launcher: ^6.3.1
  intl: ^0.20.2
```

---

## 🔧 Configuration Files

### Backend `.env`

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=evconnect
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=evconnect

JWT_SECRET=your_jwt_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

PORT=4000
NODE_ENV=development

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

CORS_ORIGIN=http://localhost:3000,http://localhost:8080

REDIS_HOST=localhost
REDIS_PORT=6379
```

### Mobile `.env`

```env
API_BASE_URL=http://localhost:4000
GOOGLE_MAPS_API_KEY=AIza...
STRIPE_PUBLISHABLE_KEY=pk_test_...
ENVIRONMENT=development
```

---

## 🐳 Docker Commands

### Start Services

```bash
cd infra
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ai-services
```

### Stop Services

```bash
docker-compose down
```

### Rebuild

```bash
docker-compose up -d --build
```

### Database Access

```bash
docker-compose exec postgres psql -U evconnect -d evconnect
```

---

## 🧪 Testing

### Backend

```bash
cd evconnect_backend
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # With coverage
```

### AI Services

```bash
cd ai-services
pytest test_api.py -v
pytest test_api.py --cov=. --cov-report=html
```

### Mobile

```bash
cd evconnect_app
flutter test
flutter test --coverage
```

---

## 📊 API Endpoints

### Backend API (`http://localhost:4000`)

- `POST /auth/register` - Register user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user
- `GET /chargers` - List chargers
- `GET /chargers/nearby` - Find nearby chargers
- `POST /chargers` - Create charger
- `POST /bookings` - Create booking
- `GET /bookings/my-bookings` - User bookings
- `POST /payments/create-intent` - Payment intent
- `GET /mechanics/nearby` - Find mechanics

**Swagger Docs**: http://localhost:4000/api/docs

### AI Services (`http://localhost:5000`)

- `POST /predict/route` - Optimal charging stops
- `GET /health` - Health check
- `GET /model/info` - Model information

**FastAPI Docs**: http://localhost:5000/docs

---

## 🚀 Production Deployment

### Docker Hub

```bash
# Tag images
docker tag evconnect-backend:latest your-dockerhub/evconnect-backend:latest
docker tag evconnect-ai:latest your-dockerhub/evconnect-ai:latest

# Push
docker push your-dockerhub/evconnect-backend:latest
docker push your-dockerhub/evconnect-ai:latest
```

### AWS ECS

```bash
# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker tag evconnect-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/evconnect-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/evconnect-backend:latest
```

### Mobile App Stores

#### Android (Google Play)

```bash
flutter build appbundle --release
# Upload to Google Play Console
```

#### iOS (App Store)

```bash
flutter build ios --release
# Archive in Xcode and upload to App Store Connect
```

---

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Database backups
- [ ] API authentication on all endpoints

---

## 📈 Monitoring

### Health Checks

```bash
# Backend
curl http://localhost:4000/health

# AI Services
curl http://localhost:5000/health

# PostgreSQL
docker-compose exec postgres pg_isready -U evconnect

# Redis
docker-compose exec redis redis-cli ping
```

### Logs

```bash
# View logs
docker-compose logs -f

# Export logs
docker-compose logs > logs.txt
```

---

## 🔗 Repository Links

- **Backend API**: https://github.com/EVConnect-Project/backend-api
- **Mobile App**: https://github.com/EVConnect-Project/mobile-app (to be created)
- **AI Services**: https://github.com/EVConnect-Project/ai-services (to be created)
- **Documentation**: https://github.com/EVConnect-Project/docs (to be created)

---

## 📚 Documentation

- [Backend README](./evconnect_backend/README.md)
- [Mobile App README](./evconnect_app/README.md)
- [AI Services README](./ai-services/README.md)
- [Infrastructure README](./infra/README.md)
- [CI/CD Workflows](./.github/workflows/README.md)

---

## 🎓 Next Steps

1. **Configure Environment Variables**
   - Copy `.env.example` files
   - Add your API keys and secrets

2. **Start Services**
   - Use Docker Compose or manual setup
   - Verify all services are running

3. **Test APIs**
   - Check Swagger documentation
   - Test endpoints with Postman/curl

4. **Run Mobile App**
   - Configure Google Maps API
   - Run on emulator or device

5. **Set Up CI/CD**
   - GitHub Actions are already configured
   - Push code to trigger builds

6. **Deploy to Production**
   - Build Docker images
   - Deploy to cloud provider
   - Configure SSL/domain

---

## 🐛 Troubleshooting

### Port Conflicts

```bash
# Check ports
lsof -i :4000
lsof -i :5000
lsof -i :5432

# Kill process
kill -9 <PID>
```

### Database Issues

```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
```

### Flutter Issues

```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter run
```

---

## 📞 Support

- **GitHub Issues**: Open an issue in the repository
- **Email**: support@evconnect.com
- **Discord**: [Join our community](#)

---

**🎉 Your EVConnect platform is ready to go!**

Made with ⚡ by the EVConnect Team
