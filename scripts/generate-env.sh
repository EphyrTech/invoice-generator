#!/bin/bash

# Script to generate random passwords and create .env file for production deployment
# Usage: ./scripts/generate-env.sh

set -e

echo "🔐 Generating secure random passwords for production deployment..."

# Generate random passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)

# Create .env file
cat > .env << EOF
# Generated on $(date)
# Database Configuration
POSTGRES_USER=invoice_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=invoice_db

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Admin Configuration
ADMIN_PASSWORD=${ADMIN_PASSWORD}

# Optional: Override these in production
# NEXTAUTH_URL=https://your-domain.com
EOF

echo "✅ Generated .env file with secure random passwords:"
echo "   - Database password: ${POSTGRES_PASSWORD}"
echo "   - NextAuth secret: ${NEXTAUTH_SECRET:0:10}..."
echo "   - Admin password: ${ADMIN_PASSWORD}"
echo ""
echo "📝 The .env file has been created. Make sure to:"
echo "   1. Keep this file secure and never commit it to version control"
echo "   2. Update NEXTAUTH_URL for production deployment"
echo "   3. Store these passwords in a secure password manager"
echo ""
echo "🚀 You can now run: docker-compose -f docker-compose.prod.yml up --build"
