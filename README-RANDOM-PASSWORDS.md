# Random Password Generation in Docker Compose

This document explains how to generate random passwords for secure Docker deployments of the invoice PDF application.

## 🔐 Available Methods

### 1. **Environment Variables (.env file) - RECOMMENDED**

Generate a `.env` file with secure random passwords:

```bash
# Generate passwords and create .env file
./scripts/generate-env.sh

# Deploy with generated passwords
docker-compose -f docker-compose.prod.yml up --build
```

**Features:**
- ✅ 25-character database password (base64, special chars removed)
- ✅ 32-character NextAuth secret (base64)
- ✅ 12-character admin password (base64, special chars removed)
- ✅ Automatic timestamp and documentation
- ✅ Works with any Docker Compose version

### 2. **Docker Secrets (Most Secure)**

Use Docker's built-in secrets management:

```bash
# Generate secret files with secure permissions
./scripts/generate-secrets.sh

# Deploy with Docker secrets
docker-compose -f docker-compose.secrets.yml up --build
```

**Features:**
- ✅ Passwords stored in encrypted files (600 permissions)
- ✅ Never visible in environment variables
- ✅ Follows Docker security best practices
- ⚠️ Requires Docker Swarm mode for full functionality

### 3. **Init Container (Automatic)**

Automatically generate passwords on each deployment:

```bash
# Deploy with automatic password generation
docker-compose -f docker-compose.init.yml up --build
```

**Features:**
- ✅ Fully automated password generation
- ✅ New passwords on each deployment
- ✅ No manual intervention required
- ⚠️ Passwords change on every restart

### 4. **One-Command Deployment**

Deploy with randomly generated passwords in one command:

```bash
# Generate passwords and deploy immediately
./scripts/deploy-with-random-passwords.sh
```

## 🚀 Quick Start

1. **Generate passwords:**
   ```bash
   ./scripts/generate-env.sh
   ```

2. **Deploy application:**
   ```bash
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

3. **Verify deployment:**
   ```bash
   curl http://localhost:$(docker port invoice-pdf-app-1 3000 | cut -d: -f2)/api/health
   ```

## 🔒 Security Features

- **Strong Password Generation**: Uses `openssl rand -base64` for cryptographically secure randomness
- **Character Filtering**: Removes problematic characters (`=+/`) for URL safety
- **Secure Permissions**: Secret files created with 600 permissions
- **Git Protection**: `.env` and `secrets/` directories are in `.gitignore`
- **Environment Isolation**: Different passwords per deployment

## 📝 Generated Credentials

After running `./scripts/generate-env.sh`, you'll see output like:

```
🔐 Generating secure random passwords for production deployment...
✅ Generated .env file with secure random passwords:
   - Database password: BzAFrQ4Vb9Pdd0O4BxTC07Sw8
   - NextAuth secret: s8czBAi3lW...
   - Admin password: YjgProLSw1Er
```

## ⚠️ Important Notes

1. **Database Recreation**: When changing passwords, you must recreate the database container:
   ```bash
   docker-compose -f docker-compose.prod.yml down -v
   docker-compose -f docker-compose.prod.yml up --build
   ```

2. **Password Storage**: Store generated passwords securely in a password manager

3. **Production Deployment**: Update `NEXTAUTH_URL` in `.env` for production domains

4. **Regular Rotation**: Rotate passwords regularly for security

## 🔄 Password Rotation

```bash
# 1. Generate new passwords
./scripts/generate-env.sh

# 2. Recreate containers with new passwords
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up --build -d

# 3. Verify health
curl http://localhost:$(docker port invoice-pdf-app-1 3000 | cut -d: -f2)/api/health
```

## 📊 Health Check

The application provides a health endpoint that verifies database connectivity:

```json
{
  "status": "healthy",
  "timestamp": "2025-08-02T15:07:22.393Z",
  "service": "invoice-pdf",
  "database": "connected"
}
```

## 🛠️ Troubleshooting

**Password Authentication Failed:**
- Ensure database container is recreated after password change
- Use `docker-compose down -v` to remove volumes

**Permission Denied:**
- Check script permissions: `chmod +x scripts/*.sh`
- Verify secret file permissions: `ls -la secrets/`

**Health Check Fails:**
- Wait for containers to be fully healthy: `docker ps`
- Check logs: `docker logs invoice-pdf-app-1`
