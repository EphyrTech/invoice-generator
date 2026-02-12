# Security Guide

## Random Password Generation in Docker Compose

This project provides multiple approaches for generating secure random passwords in Docker deployments.

## 🔐 Available Methods

### 1. **Environment Variables with Generated Passwords (Recommended)**

Generate a `.env` file with random passwords:

```bash
# Generate secure passwords
./scripts/generate-env.sh

# Deploy with generated passwords
docker-compose -f docker-compose.prod.yml up --build
```

**Pros:**
- Simple and straightforward
- Works with any Docker Compose version
- Easy to manage and rotate passwords

**Cons:**
- Passwords visible in environment variables
- Requires manual .env file management

### 2. **Docker Secrets (Most Secure)**

Use Docker's built-in secrets management:

```bash
# Generate secret files
./scripts/generate-secrets.sh

# Deploy with Docker secrets
docker-compose -f docker-compose.secrets.yml up --build
```

**Pros:**
- Passwords never visible in environment variables
- Encrypted at rest and in transit
- Follows Docker security best practices

**Cons:**
- Only works with Docker Swarm mode
- More complex setup

### 3. **Init Container (Automatic)**

Automatically generate passwords on each deployment:

```bash
# Deploy with automatic password generation
docker-compose -f docker-compose.init.yml up --build
```

**Pros:**
- Fully automated
- New passwords on each deployment
- No manual intervention required

**Cons:**
- Passwords change on every restart
- More complex container orchestration

## 🛡️ Security Best Practices

### Password Requirements
- **Database Password**: 25 characters, base64 encoded, special chars removed
- **NextAuth Secret**: 32 characters, base64 encoded
- **Admin Password**: 12 characters, base64 encoded, special chars removed

### File Permissions
```bash
# Secure permissions for secret files
chmod 600 secrets/*.txt
chmod 700 secrets/
```

### Production Recommendations

1. **Use External Secret Management**
   ```bash
   # AWS Secrets Manager
   aws secretsmanager create-secret --name "invoice-app/db-password"
   
   # HashiCorp Vault
   vault kv put secret/invoice-app db_password="$(openssl rand -base64 32)"
   ```

2. **Regular Password Rotation**
   ```bash
   # Rotate passwords monthly
   ./scripts/generate-env.sh
   docker-compose -f docker-compose.prod.yml up --build --force-recreate
   ```

3. **Environment Isolation**
   ```bash
   # Different passwords per environment
   ./scripts/generate-env.sh > .env.production
   ./scripts/generate-env.sh > .env.staging
   ```

## 🔄 Password Rotation

### Manual Rotation
```bash
# 1. Generate new passwords
./scripts/generate-env.sh

# 2. Backup current database
docker exec invoice-pdf-db-1 pg_dump -U invoice_user invoice_db > backup.sql

# 3. Update deployment
docker-compose -f docker-compose.prod.yml up --build --force-recreate
```

### Automated Rotation (Cron Job)
```bash
# Add to crontab for monthly rotation
0 2 1 * * /path/to/invoice-app/scripts/rotate-passwords.sh
```

## 🚨 Security Checklist

- [ ] Passwords are randomly generated (min 12 characters)
- [ ] Secret files have secure permissions (600)
- [ ] .env files are in .gitignore
- [ ] Passwords are rotated regularly
- [ ] Database connections use TLS in production
- [ ] Admin passwords are strong and unique
- [ ] NextAuth secrets are environment-specific

## 🔍 Verification

Test password security:

```bash
# Check password strength
./scripts/check-password-strength.sh

# Verify no passwords in git history
git log --all --full-history -- .env secrets/

# Test database connection
docker exec -it invoice-pdf-app-1 node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => console.log('✅ DB Connected')).catch(console.error);
"
```
