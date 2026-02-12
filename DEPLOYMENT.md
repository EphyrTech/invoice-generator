# 🚀 Production Deployment Guide

## Coolify Deployment (Recommended)

This application is configured for **zero-configuration deployment** with Coolify. Simply push to GitHub and Coolify will automatically deploy.

### Quick Deploy Steps:

1. **Connect Repository**: Add this GitHub repository to your Coolify instance
2. **Set Deployment Type**: Choose "Docker Compose" 
3. **Set Compose File**: Use `docker-compose.prod.yml`
4. **Deploy**: Click deploy - everything else is automatic!

### What Happens Automatically:

✅ **Database Setup**: PostgreSQL 15 with secure defaults  
✅ **Application Build**: Multi-stage Docker build for optimization  
✅ **Health Checks**: Automatic health monitoring  
✅ **Database Initialization**: Tables and sample data created automatically  
✅ **Networking**: Internal container networking configured  
✅ **Persistence**: Database data persisted across deployments  

### Default Configuration:

- **Database**: PostgreSQL 15 with user `invoice_user`
- **Port**: Application runs on port 3000
- **Health Check**: `/api/health` endpoint monitored
- **Environment**: Production-ready with telemetry disabled

### Optional Environment Variables:

You can override these in Coolify if needed:

```bash
# Custom domain (recommended for production)
NEXTAUTH_URL=https://your-domain.com

# Custom NextAuth secret (recommended for production)  
NEXTAUTH_SECRET=your-custom-secret-here

# Custom port (if needed)
PORT=3000
```

### Security Notes:

⚠️ **For Production**: Change the default database password in `docker-compose.prod.yml`  
⚠️ **For Production**: Set a custom `NEXTAUTH_SECRET`  
⚠️ **For Production**: Use HTTPS with proper domain in `NEXTAUTH_URL`

### Backup Configuration:

Database backups are automatically mounted to `./backups` directory.

## Manual Docker Deployment

If not using Coolify:

```bash
# Clone repository
git clone <your-repo-url>
cd invoice-pdf

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Health Monitoring

- **Application Health**: `http://your-domain:3000/api/health`
- **Database Health**: Automatic health checks configured
- **Container Status**: Monitored by Docker Compose

## Troubleshooting

### Database Connection Issues:
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Check application logs  
docker-compose -f docker-compose.prod.yml logs app
```

### Application Not Starting:
```bash
# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Coolify       │    │   GitHub Repo    │
│   (Deployment)  │◄───┤   (Source Code)  │
└─────────────────┘    └──────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐
│   App Container │◄───┤   DB Container   │
│   (Next.js)     │    │   (PostgreSQL)   │
│   Port: 3000    │    │   Port: 5432     │
└─────────────────┘    └──────────────────┘
```

## Support

For deployment issues:
1. Check container logs
2. Verify health endpoints
3. Review environment variables
4. Check database connectivity

The application includes comprehensive health checks and error handling for production reliability.
