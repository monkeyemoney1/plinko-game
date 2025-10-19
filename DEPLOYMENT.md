# Plinko Game - Production Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose (optional)
- TON API Key from https://tonapi.io/
- SSL Certificate for HTTPS

### 1. Environment Setup

```bash
# Clone repository
git clone <your-repo-url>
cd plinkogame

# Copy environment file
cp .env.example .env

# Edit .env with production values
nano .env
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb plinko_production

# Run migrations
psql -d plinko_production -f database/schema.sql
```

### 3. Build Application

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# Preview build
pnpm preview
```

### 4. Docker Deployment (Recommended)

```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f plinko-app

# Scale application (if needed)
docker-compose up -d --scale plinko-app=3
```

### 5. Manual Deployment

```bash
# Start application with PM2
pm2 start ecosystem.config.js --env production

# Check status
pm2 status
pm2 logs plinko-game
```

## 📊 Monitoring

### Health Checks
- **Application**: `GET /api/health`
- **Metrics**: `GET /api/metrics`
- **Database**: Included in health check

### Example Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2025-01-14T12:00:00.000Z",
  "version": "1.1.0",
  "environment": "production",
  "responseTime": 45,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 12
    },
    "ton": {
      "status": "healthy",
      "responseTime": 230
    }
  }
}
```

## 🔒 Security Checklist

- [ ] Update `JWT_SECRET` to a strong random value
- [ ] Use HTTPS in production
- [ ] Configure firewall (only ports 80, 443, 22)
- [ ] Enable database SSL
- [ ] Regularly update dependencies
- [ ] Monitor logs for suspicious activity
- [ ] Backup database regularly
- [ ] Use strong passwords for all services

## 🔧 Configuration

### Environment Variables (Production)
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
TON_NETWORK=mainnet
TONAPI_KEY=your_production_key
GAME_WALLET_MNEMONIC="24 words here"
JWT_SECRET=your_very_long_random_string
PUBLIC_BASE_URL=https://your-domain.com
LOG_LEVEL=info
```

### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📈 Performance Optimization

### Database
- Enable connection pooling
- Add appropriate indexes
- Regular VACUUM and ANALYZE
- Monitor slow queries

### Application
- Enable gzip compression
- Use CDN for static assets
- Implement caching where appropriate
- Monitor memory usage

### TON Integration
- Cache API responses when possible
- Implement retry mechanisms
- Monitor API rate limits
- Handle network failures gracefully

## 🔄 Backup Strategy

### Database Backup
```bash
# Daily backup
pg_dump plinko_production > backup_$(date +%Y%m%d).sql

# Automated with cron
0 2 * * * pg_dump plinko_production > /backups/plinko_$(date +\%Y\%m\%d).sql
```

### Application Backup
- Source code in Git repository
- Environment files (encrypted)
- SSL certificates
- Logs (if storing locally)

## 🚨 Incident Response

### Application Down
1. Check health endpoint: `curl https://your-domain.com/api/health`
2. Check logs: `docker-compose logs -f plinko-app`
3. Restart if needed: `docker-compose restart plinko-app`

### Database Issues
1. Check connection: `psql -d plinko_production -c "SELECT 1"`
2. Check disk space: `df -h`
3. Check PostgreSQL logs

### TON API Issues
1. Check TON API status
2. Verify API key is valid
3. Check network connectivity
4. Monitor rate limits

## 📞 Support

For production issues:
- Check logs first
- Review monitoring dashboards
- Contact TON API support if needed
- Have database backup ready for recovery

## 🔗 Useful Commands

```bash
# Check application status
curl -s https://your-domain.com/api/health | jq .

# Monitor logs in real-time
docker-compose logs -f plinko-app

# Database maintenance
docker-compose exec postgres psql -U plinko_user -d plinko_production

# Update application
git pull origin main
docker-compose build plinko-app
docker-compose up -d plinko-app

# Backup database
docker-compose exec postgres pg_dump -U plinko_user plinko_production > backup.sql
```