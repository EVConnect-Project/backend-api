# EVConnect Infrastructure

Docker Compose configuration and deployment scripts for the EVConnect platform.

## 🚀 Quick Start

### Start all services

```bash
docker-compose up -d
```

### Stop all services

```bash
docker-compose down
```

### View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ai-services
docker-compose logs -f postgres
```

## 📦 Services

### PostgreSQL Database (Port 5432)
- **Image**: postgres:15-alpine
- **User**: evconnect
- **Password**: evconnect123
- **Database**: evconnect
- **Features**: PostGIS enabled for geospatial queries

### Redis Cache (Port 6379)
- **Image**: redis:7-alpine
- **Purpose**: Caching, session storage

### NestJS Backend API (Port 4000)
- **Build**: ../evconnect_backend/Dockerfile
- **Endpoints**: `/api/...`
- **Documentation**: http://localhost:4000/api/docs

### FastAPI AI Services (Port 5000)
- **Build**: ../ai-services/Dockerfile
- **Endpoints**: `/predict/...`
- **Documentation**: http://localhost:5000/docs

### Nginx Reverse Proxy (Port 80/443)
- **Configuration**: nginx/nginx.conf
- **Features**: Load balancing, rate limiting, SSL termination

## 🔧 Configuration

### Environment Variables

Create `.env` files in respective directories:

**Backend (.env)**
```env
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=evconnect
DATABASE_PASSWORD=evconnect123
DATABASE_NAME=evconnect
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your_secret_key
```

### Database Initialization

The database is automatically initialized with:
- PostGIS extension
- Required tables (users, chargers, bookings, mechanics, payments)
- Sample data for testing

See `init-db.sql` for details.

## 🐳 Docker Commands

### Build services

```bash
# Build all
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build ai-services
```

### Scale services

```bash
# Run multiple backend instances
docker-compose up -d --scale backend=3
```

### View service status

```bash
docker-compose ps
```

### Execute commands in containers

```bash
# PostgreSQL
docker-compose exec postgres psql -U evconnect -d evconnect

# Backend
docker-compose exec backend npm run migration:run

# Redis
docker-compose exec redis redis-cli
```

## 📊 Monitoring

### Health Checks

All services have health checks configured:

```bash
# Check health status
docker-compose ps

# Manual health check
curl http://localhost:4000/health
curl http://localhost:5000/health
```

### Logs

```bash
# Tail logs
docker-compose logs -f --tail=100

# Export logs
docker-compose logs > logs.txt
```

## 🔒 Security

### Production Checklist

- [ ] Change default passwords
- [ ] Use environment variables for secrets
- [ ] Enable SSL/TLS (configure nginx/ssl)
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Enable log monitoring
- [ ] Set up backup strategy

### SSL Configuration

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Place certificates in `nginx/ssl/`
3. Uncomment HTTPS server block in `nginx/nginx.conf`
4. Update port mappings in `docker-compose.yml`

## 🚀 Deployment

### Development

```bash
docker-compose up
```

### Production

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Cloud Deployment

#### AWS ECS
```bash
# Build and push images
docker-compose build
docker tag evconnect-backend:latest <ECR_URL>/evconnect-backend:latest
docker push <ECR_URL>/evconnect-backend:latest
```

#### Google Cloud Run
```bash
gcloud builds submit --tag gcr.io/<PROJECT_ID>/evconnect-backend
gcloud run deploy evconnect-backend --image gcr.io/<PROJECT_ID>/evconnect-backend
```

#### Azure Container Instances
```bash
az acr build --registry <ACR_NAME> --image evconnect-backend:latest .
az container create --resource-group <RG> --name evconnect-backend --image <ACR_NAME>.azurecr.io/evconnect-backend:latest
```

## 🔄 Database Operations

### Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U evconnect evconnect > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U evconnect evconnect < backup.sql
```

### Migrations

```bash
# Run migrations
docker-compose exec backend npm run migration:run

# Revert migration
docker-compose exec backend npm run migration:revert
```

## 📈 Performance

### Resource Limits

Update `docker-compose.yml` to set resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          memory: 256M
```

### Optimization

- Use multi-stage builds (already configured)
- Enable caching with Redis
- Configure PostgreSQL connection pooling
- Set up CDN for static assets

## 🧪 Testing

### Integration Tests

```bash
# Run tests against Docker services
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:4000/api/chargers

# Using k6
k6 run load-test.js
```

## 📝 Maintenance

### Update Services

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

### Clean Up

```bash
# Remove containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## 🔗 Network

Services communicate via `evconnect-network` bridge network.

### Network Inspection

```bash
# List networks
docker network ls

# Inspect network
docker network inspect infra_evconnect-network
```

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [Nginx Docker Hub](https://hub.docker.com/_/nginx)

## 🐛 Troubleshooting

### Port conflicts

```bash
# Check if ports are in use
lsof -i :4000
lsof -i :5432

# Kill processes using ports
kill -9 <PID>
```

### Database connection issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U evconnect -d evconnect -c "SELECT 1"
```

### Container won't start

```bash
# Check container logs
docker-compose logs <service_name>

# Inspect container
docker inspect <container_name>

# Remove and recreate
docker-compose rm -f <service_name>
docker-compose up -d <service_name>
```

## 📞 Support

For issues and questions, open an issue on GitHub.
