#!/bin/bash

# Invoice Templates Test Script
# Tests the invoice templates endpoint with authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="${1:-http://localhost:51961}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-YjgProLSw1Er}"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}🧪 $1${NC}"
    echo "=================================================="
}

# Function to authenticate
authenticate() {
    print_info "Authenticating..."
    
    # Get CSRF token
    curl -s -c /tmp/templates_cookies.txt "$APP_URL/login" > /dev/null
    
    local csrf_response
    csrf_response=$(curl -s -b /tmp/templates_cookies.txt -c /tmp/templates_cookies.txt "$APP_URL/api/auth/csrf")
    local csrf_token
    csrf_token=$(echo "$csrf_response" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$csrf_token" ]; then
        print_error "Failed to get CSRF token"
        return 1
    fi
    
    # Authenticate
    local auth_response
    auth_response=$(curl -s -w '%{http_code}' -o /tmp/templates_auth.json \
        -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -b /tmp/templates_cookies.txt \
        -c /tmp/templates_cookies.txt \
        -d "password=$ADMIN_PASSWORD&csrfToken=$csrf_token&callbackUrl=$APP_URL/dashboard&json=true" \
        "$APP_URL/api/auth/callback/credentials")
    
    # Check session
    local session_response
    session_response=$(curl -s -w '%{http_code}' -o /tmp/templates_session.json \
        -b /tmp/templates_cookies.txt \
        "$APP_URL/api/auth/session")
    
    if [ "$session_response" = "200" ] && grep -q '"user"' /tmp/templates_session.json 2>/dev/null; then
        print_success "Authentication successful"
        return 0
    else
        print_error "Authentication failed"
        return 1
    fi
}

# Function to test invoice templates
test_invoice_templates() {
    print_header "Testing Invoice Templates API"
    
    # Test GET invoice templates
    print_info "Testing GET /api/invoice-templates..."
    local get_response
    get_response=$(curl -s -w '%{http_code}' -o /tmp/templates_get.json \
        -b /tmp/templates_cookies.txt \
        "$APP_URL/api/invoice-templates")
    
    print_info "GET response status: $get_response"
    if [ "$get_response" = "200" ]; then
        print_success "GET /api/invoice-templates works!"
        local template_count
        template_count=$(cat /tmp/templates_get.json | grep -o '"id"' | wc -l)
        print_info "Found $template_count existing template(s)"
        echo "Response: $(cat /tmp/templates_get.json)"
    else
        print_error "GET /api/invoice-templates failed with status: $get_response"
        echo "Response: $(cat /tmp/templates_get.json 2>/dev/null || echo 'No response body')"
        return 1
    fi
    
    # First, let's create a business profile and client for the template
    print_info "Creating business profile for template test..."
    local profile_data='{
        "name": "Template Test Company",
        "email": "template@test.com",
        "phone": "+1-555-TEMPLATE",
        "address": "123 Template St",
        "city": "Template City",
        "state": "TC",
        "postalCode": "12345",
        "country": "USA",
        "taxId": "TEMPLATE123"
    }'
    
    local profile_response
    profile_response=$(curl -s -w '%{http_code}' -o /tmp/template_profile.json \
        -X POST \
        -H "Content-Type: application/json" \
        -b /tmp/templates_cookies.txt \
        -d "$profile_data" \
        "$APP_URL/api/business-profiles")
    
    if [ "$profile_response" != "201" ]; then
        print_error "Failed to create business profile for template test"
        return 1
    fi
    
    local profile_id
    profile_id=$(cat /tmp/template_profile.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_info "Created business profile: $profile_id"
    
    print_info "Creating client for template test..."
    local client_data='{
        "name": "Template Test Client",
        "email": "templateclient@test.com",
        "phone": "+1-555-CLIENT",
        "address": "456 Client Ave",
        "city": "Client City",
        "state": "CC",
        "postalCode": "54321",
        "country": "USA",
        "taxId": "CLIENT456"
    }'
    
    local client_response
    client_response=$(curl -s -w '%{http_code}' -o /tmp/template_client.json \
        -X POST \
        -H "Content-Type: application/json" \
        -b /tmp/templates_cookies.txt \
        -d "$client_data" \
        "$APP_URL/api/clients")
    
    if [ "$client_response" != "201" ]; then
        print_error "Failed to create client for template test"
        return 1
    fi
    
    local client_id
    client_id=$(cat /tmp/template_client.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_info "Created client: $client_id"
    
    # Test POST invoice template creation
    print_info "Testing POST /api/invoice-templates..."
    local template_data="{
        \"name\": \"Test Invoice Template\",
        \"businessProfileId\": \"$profile_id\",
        \"clientId\": \"$client_id\",
        \"taxRate\": 10,
        \"discountRate\": 5,
        \"notes\": \"This is a test template\",
        \"terms\": \"Payment due in 30 days\",
        \"currency\": \"USD\",
        \"items\": [
            {
                \"description\": \"Consulting Services\",
                \"quantity\": 1,
                \"unitPrice\": 100,
                \"taxRate\": 10
            },
            {
                \"description\": \"Development Work\",
                \"quantity\": 2,
                \"unitPrice\": 150,
                \"taxRate\": 10
            }
        ]
    }"
    
    local post_response
    post_response=$(curl -s -w '%{http_code}' -o /tmp/templates_post.json \
        -X POST \
        -H "Content-Type: application/json" \
        -b /tmp/templates_cookies.txt \
        -d "$template_data" \
        "$APP_URL/api/invoice-templates")
    
    print_info "POST response status: $post_response"
    if [ "$post_response" = "201" ]; then
        print_success "POST /api/invoice-templates works!"
        local template_id
        template_id=$(cat /tmp/templates_post.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_info "Created template ID: $template_id"
        echo "Response: $(cat /tmp/templates_post.json)"
    else
        print_error "POST /api/invoice-templates failed with status: $post_response"
        echo "Response: $(cat /tmp/templates_post.json 2>/dev/null || echo 'No response body')"
        return 1
    fi
    
    print_success "All invoice template tests passed!"
    return 0
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "🚀 Invoice Templates API Test"
    echo "============================="
    echo -e "${NC}"
    
    print_info "Testing URL: $APP_URL"
    echo ""
    
    # Test authentication
    if ! authenticate; then
        print_error "Authentication failed, cannot proceed"
        exit 1
    fi
    
    # Test invoice templates
    if test_invoice_templates; then
        print_success "🎉 All tests passed!"
        exit 0
    else
        print_error "Some tests failed"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    rm -f /tmp/templates_cookies.txt /tmp/templates_auth.json /tmp/templates_session.json
    rm -f /tmp/templates_get.json /tmp/templates_post.json
    rm -f /tmp/template_profile.json /tmp/template_client.json
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"
