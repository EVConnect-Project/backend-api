# EVConnect - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Option 1: Interactive Setup Script (Recommended)

```bash
cd infra
./setup.sh
```

Select **1** for development or **2** for production.

---

### Option 2: Manual Setup

#### Step 1: Copy Environment Files

```bash
# From project root
cd infra

# Copy environment files
cp .env.example .env
cp .env.example ../backend-api/evconnect_backend/.env
cp .env.example ../ai-services/.env
```

#### Step 2: Edit Environment Variables

```bash
# Edit backend .env
nano ../backend-api/evconnect_backend/.env

# Update these values:
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - DATABASE_URL
# - STRIPE_SECRET_KEY (if using payments)
```

#### Step 3: Start Services

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f
```

#### Step 4: Verify Deployment

```bash
# Check service health
curl http://localhost/api/health
curl http://localhost/planner/health

# Check database
docker compose exec postgres psql -U evconnect -d evconnect -c "SELECT version();"
```

---

## 📋 Common Commands

### Service Management

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart a specific service
docker compose restart evconnect_backend

# Rebuild after code changes
docker compose up -d --build evconnect_backend
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f evconnect_backend
docker compose logs -f evconnect_ai

# Last 100 lines
docker compose logs --tail=100
```

### Database Operations

```bash
# Access PostgreSQL shell
docker compose exec postgres psql -U evconnect -d evconnect

# Run migrations
docker compose exec evconnect_backend npm run migration:run

# Backup database
docker compose exec postgres pg_dump -U evconnect evconnect > backup.sql

# Restore database
docker compose exec -T postgres psql -U evconnect evconnect < backup.sql
```

### Debugging

```bash
# Check service status
docker compose ps

# View container stats
docker stats

# Access backend shell
docker compose exec evconnect_backend sh

# Test database connection
docker compose exec evconnect_backend node -e "console.log(process.env.DATABASE_URL)"
```

---

## 🌐 Service URLs

### Development

- **Backend API**: http://localhost/api/
- **AI Services**: http://localhost/planner/
- **WebSocket**: ws://localhost/socket.io/
- **Health Check**: http://localhost/health

### Production

- **Backend API**: https://your-domain.com/api/
- **AI Services**: https://your-domain.com/planner/
- **WebSocket**: wss://your-domain.com/socket.io/
- **Health Check**: https://your-domain.com/health

---

## 🔧 Troubleshooting

### Services won't start?

```bash
# Check logs for errors
docker compose logs

# Verify port availability
netstat -tulpn | grep -E '4000|5000|5432|6379|80|443'

# Check Docker resources
docker system df
docker stats
```

### Database connection failed?

```bash
# Verify PostgreSQL is running
docker compose ps postgres

# Test database connectivity
docker compose exec postgres pg_isready -U evconnect

# Check environment variables
docker compose exec evconnect_backend env | grep DATABASE
```

### Nginx errors?

```bash
# Test nginx configuration
docker compose exec nginx nginx -t

# Reload nginx
docker compose exec nginx nginx -s reload

# Check nginx logs
docker compose logs nginx | grep error
```

---

## 🔐 Production Checklist

Before deploying to production:

- [ ] Change all default passwords in `.env` files
- [ ] Generate strong JWT secrets: `openssl rand -base64 32`
- [ ] Set up SSL certificates (see `certs/README.md`)
- [ ] Update domain name in `nginx/conf.d/evconnect.conf`
- [ ] Configure Stripe production keys
- [ ] Set `NODE_ENV=production`
- [ ] Enable firewall (only expose ports 80, 443)
- [ ] Set up database backups (cron job)
- [ ] Configure monitoring and logging
- [ ] Test WebSocket connections over WSS

---

## 📚 Additional Documentation

- **Full Documentation**: `README_DOCKER.md`
- **Infrastructure Updates**: `INFRASTRUCTURE_UPDATE.md`
- **SSL Setup**: `certs/README.md`
- **Advanced WebSocket**: `../ADVANCED_WEBSOCKET_FEATURES.md`

---

## 🆘 Need Help?

1. Check logs: `docker compose logs -f`
2. Review troubleshooting section above
3. See full documentation in `README_DOCKER.md`
4. Verify all environment variables are set correctly

---

**💡 Tip**: After making code changes, rebuild only the affected service:
```bash
docker compose up -d --build evconnect_backend
```

This is faster than rebuilding everything!
