# 📚 EVConnect Documentation Index

Complete guide to deploying and managing your EVConnect platform.

## 🚀 Getting Started

**New to deployment?** Start here:

1. **[Production Deployment Complete](PRODUCTION_DEPLOYMENT_COMPLETE.md)** ⭐
   - Overview of entire deployment setup
   - Quick start guide
   - Architecture diagram
   - Security features

2. **[Quick Start Guide](infra/QUICK_START.md)**
   - 5-minute deployment guide
   - Common commands
   - Service URLs
   - Quick troubleshooting

3. **[Pre-Deployment Check](infra/check-deployment.sh)**
   - Run before deploying: `cd infra && ./check-deployment.sh`
   - Verifies prerequisites
   - Checks configuration
   - Reports warnings and errors

## 📖 Complete Documentation

### Deployment & Infrastructure

| Document | Description | When to Use |
|----------|-------------|-------------|
| [README_DOCKER.md](infra/README_DOCKER.md) | Complete Docker deployment guide | Deep dive into Docker setup |
| [DEPLOYMENT_SUMMARY.md](infra/DEPLOYMENT_SUMMARY.md) | Overview of all files created | Understanding what was built |
| [INFRASTRUCTURE_UPDATE.md](infra/INFRASTRUCTURE_UPDATE.md) | Migration from old setup | Upgrading from previous version |

### Security & SSL

| Document | Description | When to Use |
|----------|-------------|-------------|
| [certs/README.md](infra/certs/README.md) | SSL certificate setup | Setting up HTTPS for production |
| Security Checklist | In PRODUCTION_DEPLOYMENT_COMPLETE.md | Before going live |

### Features & Advanced Topics

| Document | Description | When to Use |
|----------|-------------|-------------|
| [ADVANCED_WEBSOCKET_FEATURES.md](ADVANCED_WEBSOCKET_FEATURES.md) | WebSocket implementation details | Understanding real-time features |
| Geographic Rooms | Section in WebSocket docs | Optimizing location-based updates |
| Auto-Reconnect | Section in WebSocket docs | Implementing robust connections |

## 🛠️ Configuration Files

### Environment Templates

```
backend-api/evconnect_backend/.env.example  → Copy to .env
ai-services/.env.example                    → Copy to .env
infra/.env.example                          → Copy to .env
```

**Key values to update:**
- `JWT_SECRET` - Generate: `openssl rand -base64 32`
- `DATABASE_URL` - PostgreSQL connection string
- `STRIPE_SECRET_KEY` - Payment processing
- `REDIS_URL` - Cache configuration

### Docker Configuration

```
backend-api/evconnect_backend/Dockerfile   → Multi-stage production build
ai-services/Dockerfile                      → Python service
infra/docker-compose.yml                    → Orchestration
infra/init-db.sql                           → Database schema
```

### Nginx Configuration

```
infra/nginx/nginx.conf                      → Main configuration
infra/nginx/conf.d/evconnect.conf           → Production (HTTPS)
infra/nginx/conf.d/evconnect-dev.conf.example → Development (HTTP)
```

## 🔧 Scripts & Tools

### Interactive Setup
```bash
cd infra && ./setup.sh
```
- Creates environment files
- Configures nginx
- Starts services
- Shows status and URLs

### Pre-Deployment Check
```bash
cd infra && ./check-deployment.sh
```
- Verifies Docker installation
- Checks environment files
- Tests port availability
- Reports issues

## 📋 Quick Reference

### Common Commands

```bash
# Deploy
cd infra && ./setup.sh

# Check status
docker compose ps

# View logs
docker compose logs -f

# Restart service
docker compose restart evconnect_backend

# Stop all
docker compose down
```

### Service URLs

**Development:**
- Backend: http://localhost/api/
- AI: http://localhost/planner/
- WebSocket: ws://localhost/socket.io/
- Health: http://localhost/health

**Production:**
- Backend: https://your-domain.com/api/
- AI: https://your-domain.com/planner/
- WebSocket: wss://your-domain.com/socket.io/
- Health: https://your-domain.com/health

### Database Operations

```bash
# Access PostgreSQL
docker compose exec postgres psql -U evconnect -d evconnect

# Backup
docker compose exec postgres pg_dump -U evconnect evconnect > backup.sql

# Restore
docker compose exec -T postgres psql -U evconnect evconnect < backup.sql
```

## 🎯 Deployment Paths

### Path 1: Quick Development Setup

```
1. cd infra
2. ./check-deployment.sh          # Verify prerequisites
3. ./setup.sh                      # Select: 1 (Development)
4. curl http://localhost/api/health # Test
```

**Time:** ~5 minutes

### Path 2: Production Deployment

```
1. cd infra
2. Copy .env.example files and edit
3. Generate JWT secrets (openssl rand -base64 32)
4. Set up SSL certificates (see certs/README.md)
5. Update nginx domain name
6. ./check-deployment.sh          # Verify everything
7. ./setup.sh                      # Select: 2 (Production)
8. Test HTTPS endpoints
```

**Time:** ~30 minutes (excluding SSL cert generation)

### Path 3: CI/CD Deployment

```
1. Push to main branch
2. GitHub Actions builds images
3. Pull images on server:
   - ghcr.io/YOUR_USERNAME/evconnect-backend:latest
   - ghcr.io/YOUR_USERNAME/evconnect-ai:latest
4. Update docker-compose.yml to use images
5. docker compose pull && docker compose up -d
```

**Time:** ~10 minutes (after initial setup)

## 🔍 Troubleshooting Guide

### Issue: Services won't start
**Solution:**
```bash
docker compose logs
netstat -tulpn | grep -E '80|443|5432|6379'
```

### Issue: Database connection failed
**Solution:**
```bash
docker compose exec postgres pg_isready -U evconnect
docker compose exec evconnect_backend env | grep DATABASE
```

### Issue: Nginx configuration error
**Solution:**
```bash
docker compose exec nginx nginx -t
docker compose logs nginx | grep error
```

### Issue: SSL certificate problems
**Solution:** See [certs/README.md](infra/certs/README.md)

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│            Flutter Mobile App                    │
│  (Real-time updates, Auto-reconnect, JWT auth)  │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│              Nginx (Reverse Proxy)              │
│   • SSL/TLS Termination                         │
│   • Rate Limiting (10 req/s)                    │
│   • WebSocket Proxy (7d timeout)                │
│   • Security Headers                            │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────────┐
        ↓                     ↓              ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Backend    │   │ AI Services  │   │  WebSocket   │
│   (NestJS)   │   │  (FastAPI)   │   │ (Socket.IO)  │
│              │   │              │   │              │
│ • REST API   │   │ • ML Models  │   │ • Rooms      │
│ • JWT Auth   │   │ • Routing    │   │ • Auth       │
│ • CRUD       │   │ • Redis      │   │ • Real-time  │
└──────┬───────┘   └──────┬───────┘   └──────────────┘
       │                  │
       └──────────┬───────┘
                  ↓
        ┌──────────────────┐
        │   PostgreSQL 15  │
        │   with PostGIS   │
        │                  │
        │ • UUID keys      │
        │ • Spatial index  │
        │ • Triggers       │
        └──────────────────┘
                  │
                  ↓
           ┌──────────┐
           │  Redis   │
           │  Cache   │
           └──────────┘
```

## 🎓 Learning Resources

### WebSocket Features
- **Geographic Rooms**: Auto-joining ~55km grid regions
- **Auto-Reconnect**: Exponential backoff (1s → 16s max)
- **JWT Authentication**: Secure WebSocket connections
- **Status Updates**: Real-time charger availability

See: [ADVANCED_WEBSOCKET_FEATURES.md](ADVANCED_WEBSOCKET_FEATURES.md)

### Docker Best Practices
- **Multi-stage builds**: Smaller images, faster deploys
- **Non-root users**: Enhanced security
- **Health checks**: Automatic recovery
- **Volume management**: Persistent data

See: [infra/README_DOCKER.md](infra/README_DOCKER.md)

### Security Implementation
- **JWT tokens**: Access + Refresh token pattern
- **Rate limiting**: Nginx-based protection
- **SSL/TLS**: Let's Encrypt integration
- **Environment isolation**: Separate configs per service

See: [PRODUCTION_DEPLOYMENT_COMPLETE.md](PRODUCTION_DEPLOYMENT_COMPLETE.md)

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# All services
docker compose ps

# Individual health endpoints
curl http://localhost/api/health
curl http://localhost/planner/health
```

### Log Management

```bash
# All logs
docker compose logs -f

# Specific service
docker compose logs -f evconnect_backend

# Last N lines
docker compose logs --tail=100
```

### Resource Monitoring

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up
docker system prune -a
```

## 🔄 Updates & Maintenance

### Updating Services

```bash
# Pull latest code
git pull origin main

# Rebuild specific service
docker compose up -d --build evconnect_backend

# Zero-downtime update
docker compose up -d --no-deps --build evconnect_backend
```

### Database Maintenance

```bash
# Regular backups (add to cron)
0 2 * * * docker compose exec postgres pg_dump -U evconnect evconnect > /backups/evconnect_$(date +\%Y\%m\%d).sql

# Vacuum (optimize)
docker compose exec postgres psql -U evconnect -d evconnect -c "VACUUM ANALYZE;"
```

## 🆘 Support & Community

### Getting Help

1. **Check Documentation**: Use this index to find relevant guides
2. **Run Diagnostics**: `./check-deployment.sh`
3. **Review Logs**: `docker compose logs -f`
4. **Check Issues**: GitHub Issues (if applicable)

### Useful Links

- Docker Documentation: https://docs.docker.com/
- NestJS Documentation: https://docs.nestjs.com/
- FastAPI Documentation: https://fastapi.tiangolo.com/
- PostgreSQL + PostGIS: https://postgis.net/documentation/

---

## 🎯 Start Here

**First time?** → [PRODUCTION_DEPLOYMENT_COMPLETE.md](PRODUCTION_DEPLOYMENT_COMPLETE.md)

**Quick deploy?** → [infra/QUICK_START.md](infra/QUICK_START.md)

**Need details?** → [infra/README_DOCKER.md](infra/README_DOCKER.md)

**Troubleshooting?** → [Troubleshooting Guide](#-troubleshooting-guide) (above)

---

**Last Updated:** November 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
