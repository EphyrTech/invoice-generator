#!/bin/bash

# Manual Database Initialization Script
# Use this if the automatic database initialization didn't work in production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Manual Database Initialization${NC}"
echo "=================================="

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ docker-compose.prod.yml not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check if init-db.sql exists
if [ ! -f "docker/init-db.sql" ]; then
    echo -e "${RED}❌ docker/init-db.sql not found!${NC}"
    echo "Please ensure the init script exists."
    exit 1
fi

# Get the database container name
DB_CONTAINER=$(docker-compose -f docker-compose.prod.yml ps -q db)

if [ -z "$DB_CONTAINER" ]; then
    echo -e "${RED}❌ Database container not found!${NC}"
    echo "Please ensure your containers are running with:"
    echo "docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo -e "${YELLOW}ℹ️  Found database container: $DB_CONTAINER${NC}"

# Check if database is ready
echo -e "${YELLOW}ℹ️  Checking database connectivity...${NC}"
if ! docker exec $DB_CONTAINER pg_isready -U invoice_user -d invoice_db > /dev/null 2>&1; then
    echo -e "${RED}❌ Database is not ready!${NC}"
    echo "Please wait for the database to start up completely."
    exit 1
fi

echo -e "${GREEN}✅ Database is ready${NC}"

# Check if tables already exist
echo -e "${YELLOW}ℹ️  Checking if tables already exist...${NC}"
TABLE_COUNT=$(docker exec $DB_CONTAINER psql -U invoice_user -d invoice_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $TABLE_COUNT existing tables${NC}"
    echo -e "${YELLOW}Do you want to continue? This will create tables if they don't exist. (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ Aborted by user${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ No existing tables found, proceeding with initialization${NC}"
fi

# Run the initialization script
echo -e "${YELLOW}ℹ️  Running database initialization...${NC}"

if docker exec -i $DB_CONTAINER psql -U invoice_user -d invoice_db < docker/init-db.sql; then
    echo -e "${GREEN}✅ Database initialization completed successfully!${NC}"
    
    # Verify tables were created
    echo -e "${YELLOW}ℹ️  Verifying table creation...${NC}"
    FINAL_TABLE_COUNT=$(docker exec $DB_CONTAINER psql -U invoice_user -d invoice_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    echo -e "${GREEN}✅ Created $FINAL_TABLE_COUNT tables${NC}"
    
    # List the tables
    echo -e "${YELLOW}ℹ️  Tables created:${NC}"
    docker exec $DB_CONTAINER psql -U invoice_user -d invoice_db -c "\dt"
    
else
    echo -e "${RED}❌ Database initialization failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Database initialization completed successfully!${NC}"
echo -e "${BLUE}You can now test your application.${NC}"
