#!/bin/bash

# Entity Creation Test Script
# Tests real entity creation with authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="${1:-http://localhost:50732}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

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

# Function to authenticate using NextAuth
authenticate() {
    print_header "Authentication Test"
    
    print_info "Testing authentication flow..."
    
    # Get CSRF token
    print_info "Getting CSRF token..."
    local csrf_response
    csrf_response=$(curl -s -c /tmp/test_cookies.txt "$APP_URL/api/auth/csrf")
    local csrf_token
    csrf_token=$(echo "$csrf_response" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$csrf_token" ]; then
        print_error "Failed to get CSRF token"
        return 1
    fi
    
    print_info "CSRF token obtained: ${csrf_token:0:20}..."
    
    # Try the signin endpoint that the client uses
    print_info "Authenticating with credentials via signin endpoint..."
    local auth_response
    auth_response=$(curl -s -w '%{http_code}' -o /tmp/auth_result.json \
        -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -b /tmp/test_cookies.txt \
        -c /tmp/test_cookies.txt \
        -d "password=$ADMIN_PASSWORD&csrfToken=$csrf_token&callbackUrl=$APP_URL/dashboard&json=true" \
        "$APP_URL/api/auth/callback/credentials")
    
    print_info "Auth response status: $auth_response"
    print_info "Auth response body: $(cat /tmp/auth_result.json 2>/dev/null || echo 'No response body')"
    
    # Check session
    print_info "Checking session..."
    local session_response
    session_response=$(curl -s -w '%{http_code}' -o /tmp/session.json \
        -b /tmp/test_cookies.txt \
        "$APP_URL/api/auth/session")
    
    if [ "$session_response" = "200" ]; then
        if grep -q '"user"' /tmp/session.json 2>/dev/null; then
            print_success "Authentication successful - session established"
            print_info "Session data: $(cat /tmp/session.json)"
            return 0
        else
            print_warning "Session endpoint accessible but no user data"
            print_info "Session response: $(cat /tmp/session.json)"
        fi
    fi
    
    print_error "Authentication failed"
    return 1
}

# Function to test entity creation
test_entity_creation() {
    print_header "Entity Creation Tests"
    
    local failed_tests=0
    
    # Test business profile creation
    print_info "Creating business profile..."
    local profile_data='{
        "name": "Test Company Ltd",
        "email": "test@company.com",
        "phone": "+1-555-0123",
        "address": "123 Test Street",
        "city": "Test City",
        "state": "TS",
        "postalCode": "12345",
        "country": "USA",
        "taxId": "TEST123456"
    }'
    
    local response_code
    response_code=$(curl -s -w '%{http_code}' -o /tmp/profile_result.json \
        -X POST \
        -H "Content-Type: application/json" \
        -b /tmp/test_cookies.txt \
        -d "$profile_data" \
        "$APP_URL/api/business-profiles")
    
    print_info "Business profile response: $response_code"
    cat /tmp/profile_result.json
    echo ""
    
    if [ "$response_code" = "201" ]; then
        local profile_id
        profile_id=$(cat /tmp/profile_result.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_success "Business profile created: $profile_id"
    else
        print_error "Business profile creation failed: $response_code"
        ((failed_tests++))
    fi
    
    # Test client creation
    print_info "Creating client..."
    local client_data='{
        "name": "Test Client Corp",
        "email": "client@test.com",
        "phone": "+1-555-0456",
        "address": "456 Client Avenue",
        "city": "Client City",
        "state": "CC",
        "postalCode": "54321",
        "country": "USA",
        "taxId": "CLIENT789"
    }'
    
    response_code=$(curl -s -w '%{http_code}' -o /tmp/client_result.json \
        -X POST \
        -H "Content-Type: application/json" \
        -b /tmp/test_cookies.txt \
        -d "$client_data" \
        "$APP_URL/api/clients")
    
    print_info "Client response: $response_code"
    cat /tmp/client_result.json
    echo ""
    
    if [ "$response_code" = "201" ]; then
        local client_id
        client_id=$(cat /tmp/client_result.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_success "Client created: $client_id"
    else
        print_error "Client creation failed: $response_code"
        ((failed_tests++))
    fi
    
    # Test data retrieval
    print_info "Testing data retrieval..."
    
    response_code=$(curl -s -w '%{http_code}' -o /tmp/get_profiles.json \
        -b /tmp/test_cookies.txt \
        "$APP_URL/api/business-profiles")
    
    print_info "Get profiles response: $response_code"
    if [ "$response_code" = "200" ]; then
        local count
        count=$(cat /tmp/get_profiles.json | grep -o '"id"' | wc -l)
        print_success "Retrieved $count business profile(s)"
    else
        print_error "Failed to retrieve profiles: $response_code"
        ((failed_tests++))
    fi
    
    response_code=$(curl -s -w '%{http_code}' -o /tmp/get_clients.json \
        -b /tmp/test_cookies.txt \
        "$APP_URL/api/clients")
    
    print_info "Get clients response: $response_code"
    if [ "$response_code" = "200" ]; then
        local count
        count=$(cat /tmp/get_clients.json | grep -o '"id"' | wc -l)
        print_success "Retrieved $count client(s)"
    else
        print_error "Failed to retrieve clients: $response_code"
        ((failed_tests++))
    fi
    
    if [ $failed_tests -eq 0 ]; then
        print_success "All entity creation tests passed!"
        return 0
    else
        print_error "$failed_tests test(s) failed"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "🚀 Entity Creation Test"
    echo "======================"
    echo -e "${NC}"
    
    print_info "Testing URL: $APP_URL"
    print_info "Admin Password: ${ADMIN_PASSWORD:0:3}***"
    echo ""
    
    # Test authentication
    if ! authenticate; then
        print_error "Authentication failed, cannot proceed with entity tests"
        exit 1
    fi
    
    # Test entity creation
    if test_entity_creation; then
        print_success "🎉 All tests passed!"
        exit 0
    else
        print_error "Some tests failed"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    rm -f /tmp/test_cookies.txt /tmp/auth_result.json /tmp/session.json
    rm -f /tmp/profile_result.json /tmp/client_result.json
    rm -f /tmp/get_profiles.json /tmp/get_clients.json
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"
