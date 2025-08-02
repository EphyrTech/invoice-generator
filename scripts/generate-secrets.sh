#!/bin/bash

# Script to generate Docker secrets for maximum security
# Usage: ./scripts/generate-secrets.sh

set -e

echo "🔐 Generating Docker secrets for production deployment..."

# Create secrets directory
mkdir -p secrets

# Generate random passwords and save to secret files
echo "Generating database password..."
openssl rand -base64 32 | tr -d "=+/" | cut -c1-25 > secrets/db_password.txt

echo "Generating NextAuth secret..."
openssl rand -base64 32 > secrets/nextauth_secret.txt

echo "Generating admin password..."
openssl rand -base64 16 | tr -d "=+/" | cut -c1-12 > secrets/admin_password.txt

# Set secure permissions
chmod 600 secrets/*.txt

echo "✅ Generated Docker secrets:"
echo "   - Database password: $(cat secrets/db_password.txt)"
echo "   - NextAuth secret: $(cat secrets/nextauth_secret.txt | cut -c1-10)..."
echo "   - Admin password: $(cat secrets/admin_password.txt)"
echo ""
echo "🔒 Secret files created with secure permissions (600):"
ls -la secrets/
echo ""
echo "📝 Important security notes:"
echo "   1. Never commit the secrets/ directory to version control"
echo "   2. In production, use external secret management (AWS Secrets Manager, etc.)"
echo "   3. Rotate these secrets regularly"
echo ""
echo "🚀 You can now run: docker-compose -f docker-compose.secrets.yml up --build"
