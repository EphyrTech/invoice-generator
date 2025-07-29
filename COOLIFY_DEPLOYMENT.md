# Coolify Deployment Guide

This guide explains how to deploy the Invoice PDF application on Coolify.

## Files for Coolify Deployment

- `docker-compose.prod.yml` - Production-ready Docker Compose configuration
- `Dockerfile.prod` - Optimized multi-stage Dockerfile for production
- `.env.example` - Environment variables template

## Deployment Steps

### 1. Coolify Project Setup

1. Create a new project in Coolify
2. Add a new service of type "Docker Compose"
3. Connect your Git repository

### 2. Environment Variables

Set the following environment variables in Coolify:

**Required:**
```
DATABASE_URL=postgresql://postgres:YOUR_SECURE_PASSWORD@db:5432/invoice_db
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET_KEY
```

**Optional:**
```
POSTGRES_USER=postgres
POSTGRES_DB=invoice_db
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://your-domain.com
```

### 3. Docker Configuration

1. Set the Docker Compose file path to: `docker-compose.prod.yml`
2. Set the Dockerfile path to: `Dockerfile.prod`
3. Set the build context to: `.`

### 4. Domain Configuration

1. Configure your domain in Coolify
2. Enable SSL/TLS certificates
3. Update `NEXTAUTH_URL` environment variable with your domain

### 5. Database Initialization

After the first deployment:

1. Access the application container
2. Run database migrations if needed:
   ```bash
   yarn db:push
   ```

## Production Features

### Health Checks
- Application health check endpoint: `/api/health`
- Database health checks configured
- Automatic restart on failure

### Security
- Non-root user execution
- Minimal Alpine Linux base image
- Production environment variables

### Performance
- Multi-stage Docker build for smaller images
- Standalone Next.js output for optimal performance
- Proper dependency caching

## Monitoring

The application includes:
- Health check endpoints for monitoring
- Proper logging for debugging
- Graceful shutdown handling

## Backup

Database backups are stored in the `./backups` directory and can be accessed through the container volumes.

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify `DATABASE_URL` environment variable
   - Check if database service is healthy

2. **Build Failures**
   - Ensure all environment variables are set
   - Check Docker build logs in Coolify

3. **Health Check Failures**
   - Verify the application is responding on port 3000
   - Check application logs for errors

### Logs

Access logs through Coolify's interface or by connecting to the container:
```bash
docker logs <container_name>
```

## Scaling

The application is designed to be stateless and can be scaled horizontally by:
1. Increasing replica count in Coolify
2. Using a load balancer for multiple instances
3. Ensuring database can handle concurrent connections
