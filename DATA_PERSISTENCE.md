# Data Persistence Guide

This document explains how data persistence works in the Invoice PDF Generator application and how to backup/restore your data.

## 🗄️ Data Storage

### PostgreSQL Data Persistence

The application uses **Docker volumes** to ensure your data persists even when containers are removed or recreated.

- **Volume Name**: `invoice-pdf_postgres_data`
- **Mount Point**: `/var/lib/postgresql/data` (inside container)
- **Persistence**: Data survives container restarts, rebuilds, and removals

### What Data is Stored

- User accounts and authentication data
- Business profiles
- Client information
- Invoice records and items
- Invoice templates
- Session data

## 🔄 Container Management

### Safe Operations (Data Preserved)

```bash
# Restart containers (data preserved)
docker-compose restart

# Stop containers (data preserved)
docker-compose stop

# Start stopped containers (data preserved)
docker-compose start

# Rebuild and restart (data preserved)
docker-compose up --build -d
```

### Destructive Operations (Data Preserved with Volumes)

```bash
# Remove containers but keep volumes (data preserved)
docker-compose down

# Remove containers and images but keep volumes (data preserved)
docker-compose down --rmi all
```

### ⚠️ Dangerous Operations (Data Loss Risk)

```bash
# Remove everything including volumes (DATA WILL BE LOST!)
docker-compose down -v

# Remove specific volume (DATA WILL BE LOST!)
docker volume rm invoice-pdf_postgres_data
```

## 💾 Backup & Restore

### Creating Backups

Use the provided backup script:

```bash
# Create a backup
./backup-db.sh
```

This will:
- Create a timestamped SQL dump in the `backups/` directory
- Keep only the last 10 backups automatically
- Show backup size and available backups

### Manual Backup

```bash
# Create backup manually
docker-compose exec -T db pg_dump -U postgres -d invoice_db > backups/manual_backup.sql
```

### Restoring from Backup

Use the provided restore script:

```bash
# Restore from a specific backup
./restore-db.sh backups/invoice_db_backup_20231207_143022.sql
```

⚠️ **Warning**: This will replace all existing data!

### Manual Restore

```bash
# Drop and recreate database
docker-compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS invoice_db;"
docker-compose exec -T db psql -U postgres -c "CREATE DATABASE invoice_db;"

# Restore data
docker-compose exec -T db psql -U postgres -d invoice_db < backups/your_backup.sql

# Restart application
docker-compose restart app
```

## 📊 Volume Management

### Check Volume Status

```bash
# List all volumes
docker volume ls

# Inspect the postgres volume
docker volume inspect invoice-pdf_postgres_data

# Check volume size
docker system df -v
```

### Volume Location

Docker volumes are stored in:
- **Linux**: `/var/lib/docker/volumes/`
- **macOS**: `~/Library/Containers/com.docker.docker/Data/vms/0/data/docker/volumes/`
- **Windows**: `C:\ProgramData\docker\volumes\`

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Check if database is healthy
docker-compose ps

# Check database logs
docker-compose logs db

# Test database connection
docker-compose exec db psql -U postgres -d invoice_db -c "SELECT version();"
```

### Data Recovery

If you suspect data corruption:

1. **Stop the application**:
   ```bash
   docker-compose stop app
   ```

2. **Check database integrity**:
   ```bash
   docker-compose exec db psql -U postgres -d invoice_db -c "SELECT pg_database_size('invoice_db');"
   ```

3. **Create emergency backup**:
   ```bash
   ./backup-db.sh
   ```

4. **Restart services**:
   ```bash
   docker-compose restart
   ```

### Migration Between Environments

To move data to another server:

1. **Create backup on source**:
   ```bash
   ./backup-db.sh
   ```

2. **Copy backup file to destination**

3. **Restore on destination**:
   ```bash
   ./restore-db.sh backups/your_backup.sql
   ```

## 📋 Best Practices

1. **Regular Backups**: Run `./backup-db.sh` regularly (daily/weekly)
2. **Test Restores**: Periodically test backup restoration
3. **Monitor Disk Space**: Check volume sizes regularly
4. **Version Control**: Keep backup scripts in version control
5. **Secure Backups**: Store backups in secure, off-site locations

## 🚨 Emergency Procedures

### Complete Data Loss Recovery

If volumes are accidentally deleted:

1. **Stop all containers**:
   ```bash
   docker-compose down
   ```

2. **Restore from latest backup**:
   ```bash
   docker-compose up -d db
   # Wait for database to be ready
   ./restore-db.sh backups/latest_backup.sql
   ```

3. **Start all services**:
   ```bash
   docker-compose up -d
   ```

### Backup Before Major Changes

Always backup before:
- Updating the application
- Changing database schema
- Migrating to new servers
- Major configuration changes

```bash
# Pre-update backup
./backup-db.sh
echo "Backup created before update on $(date)" >> backups/backup_log.txt
```
