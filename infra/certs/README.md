# SSL Certificates Directory

## For Development (Self-Signed)

Generate self-signed certificates for local testing:

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./certs/privkey.pem \
  -out ./certs/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=EVConnect/CN=localhost"
```

Then update `infra/nginx/conf.d/evconnect.conf` to point to:
```nginx
ssl_certificate /etc/letsencrypt/live/localhost/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/localhost/privkey.pem;
```

## For Production (Let's Encrypt)

### Option 1: Certbot on Host

1. Install Certbot:
```bash
# Ubuntu/Debian
sudo apt-get install certbot

# macOS
brew install certbot
```

2. Generate certificates:
```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

3. Copy certificates to this directory:
```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./certs/
sudo chmod 644 ./certs/*.pem
```

4. Update `infra/nginx/conf.d/evconnect.conf`:
```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

### Option 2: Certbot in Docker

Use the Certbot Docker image:

```bash
docker run -it --rm \
  -v $(pwd)/certs:/etc/letsencrypt \
  -v $(pwd)/certs-data:/var/lib/letsencrypt \
  certbot/certbot certonly --standalone \
  -d yourdomain.com \
  --agree-tos \
  --email your-email@example.com
```

### Certificate Renewal

Let's Encrypt certificates expire after 90 days. Set up auto-renewal:

```bash
# Add to crontab
0 0 * * * certbot renew --quiet && docker-compose -f /path/to/infra/docker-compose.yml exec nginx nginx -s reload
```

## For Local Development (Skip SSL)

For local development without SSL, use the dev configuration:

```bash
cd infra/nginx/conf.d
cp evconnect-dev.conf.example evconnect.conf
```

This serves everything over HTTP on port 80 without SSL requirements.

## Security Notes

- **Never commit** actual certificate files (`.pem`) to git
- Keep private keys (`privkey.pem`) secure with proper file permissions
- Use strong ciphers in production (already configured in nginx)
- Enable HSTS (already configured) for production domains
- Rotate certificates before expiration

## Current Configuration

The `docker-compose.yml` mounts this directory as:
```yaml
volumes:
  - ./certs:/etc/letsencrypt:ro
```

This makes certificates available to nginx at `/etc/letsencrypt/` inside the container.
