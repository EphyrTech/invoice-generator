#!/bin/bash

# Script to fix the production database in Coolify
# This script will initialize the database with all required tables

set -e

echo "🔧 Fixing production database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "docker-compose.prod.yml not found!"
    exit 1
fi

# Check if the database service is running
print_status "Checking database service status..."
if ! docker-compose -f docker-compose.prod.yml ps db | grep -q "Up"; then
    print_warning "Database service is not running. Starting it..."
    docker-compose -f docker-compose.prod.yml up -d db
    
    print_status "Waiting for database to be ready..."
    sleep 10
fi

# Get database connection details from environment or use defaults
POSTGRES_USER=${POSTGRES_USER:-invoice_user}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-invoice_secure_password_2024}
POSTGRES_DB=${POSTGRES_DB:-invoice_db}

print_status "Database connection details:"
echo "  User: $POSTGRES_USER"
echo "  Database: $POSTGRES_DB"
echo "  Host: db (via Docker network)"

# Test database connectivity
print_status "Testing database connectivity..."
if docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then
    print_status "Database is accessible"
else
    print_error "Cannot connect to database"
    exit 1
fi

# Check if business_profiles table exists
print_status "Checking if business_profiles table exists..."
TABLE_EXISTS=$(docker-compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_profiles');" | tr -d ' \n')

if [ "$TABLE_EXISTS" = "t" ]; then
    print_status "business_profiles table already exists"
    
    # Check if it has data
    ROW_COUNT=$(docker-compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM business_profiles;" | tr -d ' \n')
    print_status "business_profiles table has $ROW_COUNT rows"
    
    if [ "$ROW_COUNT" = "0" ]; then
        print_warning "Table exists but is empty. Will add default data."
    else
        print_status "Database appears to be properly initialized"
        exit 0
    fi
else
    print_warning "business_profiles table does not exist. Will create all tables."
fi

# Run the initialization script
print_status "Running database initialization script..."
if docker-compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < scripts/init-production-db.sql; then
    print_status "Database initialization completed successfully!"
else
    print_error "Database initialization failed"
    exit 1
fi

# Verify the fix
print_status "Verifying the fix..."
TABLE_EXISTS=$(docker-compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_profiles');" | tr -d ' \n')

if [ "$TABLE_EXISTS" = "t" ]; then
    ROW_COUNT=$(docker-compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM business_profiles;" | tr -d ' \n')
    print_status "✅ business_profiles table exists with $ROW_COUNT rows"
    
    # List all tables
    print_status "All tables in the database:"
    docker-compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"
    
    print_status "🎉 Database fix completed successfully!"
    print_status "Your application should now work properly."
else
    print_error "❌ business_profiles table still does not exist"
    exit 1
fi
