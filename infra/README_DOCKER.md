# EVConnect Docker Deployment Guide

This guide explains how to deploy EVConnect using Docker and Docker Compose.

## 📋 Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- At least 4GB RAM available
- 10GB free disk space

## 🚀 Quick Start (Development)

### 1. Set Up Environment Files

Copy the example environment files and update with your values:

```bash
# Navigate to infra directory
cd infra

# Copy environment files
cp .env.example .env
cp .env.example ../backend-api/evconnect_backend/.env
cp .env.example ../ai-services/.env

# Edit each .env file with your configuration
# Update DATABASE_URL, JWT_SECRET, STRIPE keys, etc.
```

### 2. Build and Start Services

```bash
# From infra/ directory
docker compose up -d --build
```

This will:
- Build the backend and AI service images
- Start PostgreSQL with PostGIS
- Start Redis
- Start Nginx reverse proxy
- Initialize the database with sample data

### 3. Verify Services

```bash
# Check all services are running
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f evconnect_backend
docker compose logs -f evconnect_ai
```

### 4. Access Services

- **Backend API**: http://localhost/api/
- **AI Services**: http://localhost/planner/
- **WebSocket**: ws://localhost/socket.io/
- **Health Check**: http://localhost/health

### 5. Test the Deployment

```bash
# Test backend health
curl http://localhost/api/health

# Test AI service
curl http://localhost/planner/health

# Test database connection
docker compose exec postgres psql -U evconnect -d evconnect -c "SELECT version();"
```

## 🔧 Development Workflow

### Running Individual Services

```bash
# Start only database and cache
docker compose up -d postgres redis

# Start backend
docker compose up -d evconnect_backend

# Start AI service
docker compose up -d evconnect_ai
```

### Rebuilding Services

```bash
# Rebuild backend after code changes
docker compose up -d --build evconnect_backend

# Rebuild AI service
docker compose up -d --build evconnect_ai

# Rebuild all services
docker compose up -d --build
```

### Database Management

```bash
# Access PostgreSQL shell
docker compose exec postgres psql -U evconnect -d evconnect

# Run database migrations (from backend container)
docker compose exec evconnect_backend npm run migration:run

# Seed database
docker compose exec postgres psql -U evconnect -d evconnect -f /docker-entrypoint-initdb.d/init-db.sql

# Backup database
docker compose exec postgres pg_dump -U evconnect evconnect > backup_$(date +%Y%m%d).sql

# Restore database
docker compose exec -T postgres psql -U evconnect evconnect < backup.sql
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Specific service
docker compose logs -f evconnect_backend
docker compose logs -f evconnect_ai
docker compose logs -f postgres
docker compose logs -f nginx
```

## 🏭 Production Deployment

### 1. Use Interactive Setup Script

```bash
cd infra
chmod +x setup.sh
./setup.sh
```

Select option **2 (Production)** when prompted.

### 2. Manual Production Setup

```bash
# Copy production nginx config
cp nginx/conf.d/evconnect.conf.example nginx/conf.d/evconnect.conf

# Update domain name in nginx config
sed -i 's/example.com/your-domain.com/g' nginx/conf.d/evconnect.conf

# Generate SSL certificates (or use Let's Encrypt)
# See certs/README.md for detailed instructions

# Update environment variables for production
# - Change JWT_SECRET to a strong random value
# - Update database passwords
# - Configure Stripe production keys
# - Set NODE_ENV=production

# Start services
docker compose up -d --build
```

### 3. Enable HTTPS with Let's Encrypt

```bash
# Install Certbot on host
sudo apt-get update
sudo apt-get install certbot

# Stop nginx temporarily
docker compose stop nginx

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to certs directory
sudo cp -r /etc/letsencrypt/live/your-domain.com certs/live/
sudo cp -r /etc/letsencrypt/archive/your-domain.com certs/archive/

# Start nginx
docker compose up -d nginx

# Set up auto-renewal (crontab)
sudo crontab -e
# Add: 0 0 * * 0 certbot renew --quiet && docker compose -f /path/to/infra/docker-compose.yml restart nginx
```

## 🔍 Monitoring and Maintenance

### Health Checks

```bash
# Check service health
docker compose ps

# View health check logs
docker inspect --format='{{json .State.Health}}' evconnect_backend
docker inspect --format='{{json .State.Health}}' evconnect_ai
```

### Resource Usage

```bash
# View container stats
docker stats

# View disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

### Updates and Rollbacks

```bash
# Pull latest images
docker compose pull

# Update services (with zero downtime)
docker compose up -d --no-deps --build evconnect_backend

# Rollback to previous version
docker compose down
docker compose up -d
```

## 🛠️ Troubleshooting

### Services Won't Start

```bash
# Check Docker logs
docker compose logs

# Verify network connectivity
docker compose exec evconnect_backend ping postgres
docker compose exec evconnect_backend ping redis

# Check port conflicts
netstat -tulpn | grep -E '4000|5000|5432|6379|80|443'
```

### Database Connection Issues

```bash
# Test database connection
docker compose exec evconnect_backend node -e "console.log(process.env.DATABASE_URL)"

# Verify PostgreSQL is accepting connections
docker compose exec postgres pg_isready -U evconnect

# Check PostGIS extension
docker compose exec postgres psql -U evconnect -d evconnect -c "SELECT PostGIS_version();"
```

### Performance Issues

```bash
# Check resource limits
docker stats

# Increase backend workers (in docker-compose.yml)
# Update CMD in backend Dockerfile to use PM2 cluster mode

# Scale services
docker compose up -d --scale evconnect_backend=3
```

### Nginx Configuration Issues

```bash
# Test nginx configuration
docker compose exec nginx nginx -t

# Reload nginx
docker compose exec nginx nginx -s reload

# View nginx error logs
docker compose logs nginx | grep error
```

## 📦 CI/CD Integration

### GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/build-and-push.yml`) that:

1. Builds Docker images for backend and AI services
2. Pushes images to GitHub Container Registry (GHCR)
3. Runs security scans with Trivy
4. Supports multi-platform builds (amd64, arm64)

**To use:**

```bash
# Push to main branch
git push origin main

# Images will be available at:
# ghcr.io/YOUR_USERNAME/evconnect-backend:latest
# ghcr.io/YOUR_USERNAME/evconnect-ai:latest
```

### Pull Images from GHCR

Update `docker-compose.yml` to use pre-built images:

```yaml
services:
  evconnect_backend:
    image: ghcr.io/YOUR_USERNAME/evconnect-backend:latest
    # Comment out 'build:' section

  evconnect_ai:
    image: ghcr.io/YOUR_USERNAME/evconnect-ai:latest
    # Comment out 'build:' section
```

Then:

```bash
docker compose pull
docker compose up -d
```

## 🔐 Security Best Practices

1. **Change Default Credentials**: Update all passwords in `.env` files
2. **Use Strong JWT Secrets**: Generate with `openssl rand -base64 32`
3. **Enable HTTPS**: Always use SSL/TLS in production
4. **Restrict Database Access**: Don't expose PostgreSQL port externally
5. **Use Non-Root Users**: All Dockerfiles use non-root users
6. **Keep Images Updated**: Regularly rebuild with latest base images
7. **Scan for Vulnerabilities**: Use `docker scan` or Trivy
8. **Enable Firewall**: Only expose necessary ports (80, 443)
9. **Backup Regularly**: Automate database backups
10. **Monitor Logs**: Set up centralized logging (ELK, Grafana)

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)
- [FastAPI Docker Guide](https://fastapi.tiangolo.com/deployment/docker/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Nginx Docker Documentation](https://hub.docker.com/_/nginx)

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `docker compose logs -f`
2. Verify environment variables are set correctly
3. Ensure all required ports are available
4. Review the troubleshooting section above
5. Check Docker and Docker Compose versions

For more help, see `infra/INFRASTRUCTURE_UPDATE.md`
