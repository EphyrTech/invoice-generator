#!/bin/bash

# Coolify Deployment Helper Script
# This script helps prepare and validate the deployment configuration

set -e

echo "🚀 Coolify Deployment Helper for Invoice PDF App"
echo "================================================"

# Check if required files exist
echo "📋 Checking required files..."

required_files=(
    "docker-compose.prod.yml"
    "Dockerfile.prod"
    ".env.example"
    "package.json"
    "next.config.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        exit 1
    fi
done

# Validate Docker Compose file
echo ""
echo "🔍 Validating Docker Compose configuration..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.prod.yml config > /dev/null
    echo "✅ Docker Compose configuration is valid"
else
    echo "⚠️  docker-compose not found, skipping validation"
fi

# Check if Next.js is configured for standalone output
echo ""
echo "🔧 Checking Next.js configuration..."
if grep -q "output.*standalone" next.config.js; then
    echo "✅ Next.js standalone output is configured"
else
    echo "❌ Next.js standalone output is not configured"
    echo "   Please add 'output: \"standalone\"' to your next.config.js"
    exit 1
fi

# Check for health endpoint
echo ""
echo "🏥 Checking health endpoint..."
if [ -f "app/api/health/route.ts" ]; then
    echo "✅ Health endpoint exists"
else
    echo "❌ Health endpoint is missing"
    echo "   The health endpoint is required for Docker health checks"
    exit 1
fi

echo ""
echo "✅ All checks passed! Your application is ready for Coolify deployment."
echo ""
echo "📝 Next steps:"
echo "1. Push your code to your Git repository"
echo "2. Create a new project in Coolify"
echo "3. Set the Docker Compose file to: docker-compose.prod.yml"
echo "4. Set the Dockerfile to: Dockerfile.prod"
echo "5. Configure the environment variables as shown in .env.example"
echo "6. Deploy!"
echo ""
echo "📖 For detailed instructions, see COOLIFY_DEPLOYMENT.md"
echo ""
echo "📚 Additional documentation:"
echo "   - Developer Guide: README-DEV.md"
echo "   - User Guide: README-USER.md"
