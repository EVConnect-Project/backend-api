# Docker Infrastructure Update Guide

## Changes Made

### 1. **Updated `docker-compose.yml`**
- Simplified service names: `evconnect_backend`, `evconnect_ai`
- Unified network: `evconnect_net`
- Removed exposed database ports (security)
- Cleaner environment configuration via `.env` files
- Improved health checks

### 2. **Restructured Nginx Configuration**

**Main config** (`nginx/nginx.conf`):
- Worker process optimization
- Global rate limiting zone
- Modular design with `conf.d` includes

**Site configs** (`nginx/conf.d/`):
- `evconnect.conf` - Production with SSL/HTTPS
- `evconnect-dev.conf.example` - Development HTTP-only

### 3. **Added SSL/Certificate Management**
- New `certs/` directory for SSL certificates
- `certs/README.md` with setup instructions
- `.gitignore` to prevent committing secrets
- Support for Let's Encrypt and self-signed certs

### 4. **WebSocket Support**
- Dedicated Socket.IO proxy configuration
- Long-lived connection timeouts (7 days)
- Proper upgrade headers for WebSocket

## Usage

### For Local Development (No SSL)

```bash
cd infra/nginx/conf.d
cp evconnect-dev.conf.example evconnect.conf

cd ../..
docker-compose up -d
```

Access: http://localhost/api/

### For Production (With SSL)

```bash
# 1. Generate/obtain SSL certificates (see certs/README.md)

# 2. Edit evconnect.conf to use your domain
cd nginx/conf.d
vim evconnect.conf
# Update: server_name yourdomain.com;
# Update: ssl_certificate paths

# 3. Start services
cd ../..
docker-compose up -d
```

Access: https://yourdomain.com/api/

## Service URLs

| Service | Development | Production |
|---------|------------|------------|
| Backend API | http://localhost/api/ | https://yourdomain.com/api/ |
| AI Service | http://localhost/planner/ | https://yourdomain.com/planner/ |
| WebSocket | ws://localhost/chargers/ | wss://yourdomain.com/chargers/ |
| Socket.IO | ws://localhost/socket.io/ | wss://yourdomain.com/socket.io/ |
| Health | http://localhost/health | https://yourdomain.com/health |

## Network Architecture

```
Client
  ↓
Nginx (Port 80/443)
  ├─→ /api/ → evconnect_backend:4000
  ├─→ /planner/ → evconnect_ai:5000
  ├─→ /socket.io/ → evconnect_backend:4000 (WebSocket)
  └─→ /chargers/ → evconnect_backend:4000 (WebSocket namespace)

evconnect_backend ← → postgres:5432
evconnect_backend ← → redis:6379
```

## Security Features

✅ **Rate Limiting** - 10 req/s with burst capacity  
✅ **Security Headers** - HSTS, X-Frame-Options, etc.  
✅ **SSL/TLS** - TLS 1.2+ with strong ciphers  
✅ **No Direct DB Access** - Database not exposed to host  
✅ **Health Checks** - Automatic service monitoring  

## Troubleshooting

### Nginx Config Test
```bash
docker-compose exec nginx nginx -t
```

### Reload Nginx Without Downtime
```bash
docker-compose exec nginx nginx -s reload
```

### View Service Logs
```bash
docker-compose logs -f evconnect_backend
docker-compose logs -f evconnect_ai
docker-compose logs -f nginx
```

### Check Network Connectivity
```bash
docker-compose exec evconnect_backend ping postgres
docker-compose exec evconnect_backend ping redis
```

### SSL Certificate Issues
```bash
# Check certificate expiration
openssl x509 -in certs/fullchain.pem -noout -dates

# Verify certificate chain
openssl verify -CAfile certs/fullchain.pem certs/fullchain.pem
```

## Migration from Old Config

If you're upgrading from the previous configuration:

1. **Update service references:**
   - `backend` → `evconnect_backend`
   - `ai-services` → `evconnect_ai`
   - `evconnect-network` → `evconnect_net`

2. **Update environment variables:**
   - Database host: `postgres` (unchanged)
   - Redis host: `redis` (unchanged)
   - Backend URL in Flutter: Update to use nginx proxy

3. **Nginx configuration:**
   - Old: Single `nginx.conf` with all config
   - New: Modular with `nginx.conf` + `conf.d/*.conf`

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://evconnect:evconnect_pass@postgres:5432/evconnect
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key
NODE_ENV=production
```

### AI Services (.env)
```bash
MODEL_PATH=/app/models/route_optimizer.pkl
API_PORT=5000
```

## Production Checklist

- [ ] SSL certificates installed in `certs/`
- [ ] Domain name configured in `evconnect.conf`
- [ ] Strong passwords in `.env` files
- [ ] `.env` files NOT committed to git
- [ ] Health checks passing for all services
- [ ] Rate limiting configured appropriately
- [ ] Backup strategy for PostgreSQL data
- [ ] Monitoring and alerting setup
- [ ] Log aggregation configured
- [ ] Firewall rules configured (ports 80, 443 only)

## Next Steps

1. **Add Redis persistence configuration**
2. **Set up automated backups for PostgreSQL**
3. **Configure log rotation**
4. **Add Prometheus/Grafana for monitoring**
5. **Set up automated SSL certificate renewal**
6. **Configure CDN for static assets**
7. **Add health check endpoints for all services**
8. **Set up CI/CD pipeline for deployments**
