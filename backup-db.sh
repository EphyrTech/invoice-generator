#!/bin/bash

# Database backup script for Invoice PDF Generator
# This script creates a backup of the PostgreSQL database

set -e

echo "🗄️  Starting database backup..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed or not in PATH"
    exit 1
fi

# Check if containers are running
if ! docker-compose ps | grep -q "invoice-pdf-db-1.*Up"; then
    echo "❌ Database container is not running. Please start it first:"
    echo "   docker-compose up -d db"
    exit 1
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate backup filename with timestamp
BACKUP_FILE="backups/invoice_db_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "📦 Creating backup: $BACKUP_FILE"

# Create the backup
docker-compose exec -T db pg_dump -U postgres -d invoice_db > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    echo "📊 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
    
    # Keep only the last 10 backups
    echo "🧹 Cleaning up old backups (keeping last 10)..."
    ls -t backups/invoice_db_backup_*.sql | tail -n +11 | xargs -r rm
    
    echo "📋 Available backups:"
    ls -lah backups/invoice_db_backup_*.sql 2>/dev/null || echo "   No backups found"
else
    echo "❌ Backup failed!"
    exit 1
fi
