#!/bin/bash

# Database restore script for Invoice PDF Generator
# This script restores a PostgreSQL database from a backup file

set -e

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "❌ Usage: $0 <backup_file.sql>"
    echo ""
    echo "📋 Available backups:"
    ls -lah backups/invoice_db_backup_*.sql 2>/dev/null || echo "   No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Starting database restore from: $BACKUP_FILE"

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

# Confirm restore operation
echo "⚠️  WARNING: This will replace all existing data in the database!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

echo "🗑️  Dropping existing database..."
docker-compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS invoice_db;"

echo "🆕 Creating new database..."
docker-compose exec -T db psql -U postgres -c "CREATE DATABASE invoice_db;"

echo "📥 Restoring data from backup..."
docker-compose exec -T db psql -U postgres -d invoice_db < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully from: $BACKUP_FILE"
    echo "🔄 You may need to restart the application container:"
    echo "   docker-compose restart app"
else
    echo "❌ Restore failed!"
    exit 1
fi
