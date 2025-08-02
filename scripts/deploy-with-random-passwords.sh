#!/bin/bash

# Deploy with randomly generated passwords
# Usage: ./scripts/deploy-with-random-passwords.sh [compose-file]

set -e

COMPOSE_FILE=${1:-docker-compose.prod.yml}

echo "🔐 Deploying with randomly generated passwords..."
echo "📁 Using compose file: $COMPOSE_FILE"

# Generate random passwords
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)

echo "✅ Generated passwords:"
echo "   - Database: $DB_PASSWORD"
echo "   - NextAuth: ${NEXTAUTH_SECRET:0:10}..."
echo "   - Admin: $ADMIN_PASSWORD"
echo ""

# Export environment variables
export POSTGRES_PASSWORD="$DB_PASSWORD"
export NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
export ADMIN_PASSWORD="$ADMIN_PASSWORD"
export POSTGRES_USER="invoice_user"
export POSTGRES_DB="invoice_db"

echo "🚀 Starting deployment..."

# Run docker-compose with generated passwords
docker-compose -f "$COMPOSE_FILE" up --build

echo ""
echo "📝 Deployment completed with the following credentials:"
echo "   Database Password: $DB_PASSWORD"
echo "   Admin Password: $ADMIN_PASSWORD"
echo "   NextAuth Secret: $NEXTAUTH_SECRET"
echo ""
echo "⚠️  IMPORTANT: Save these credentials securely!"
