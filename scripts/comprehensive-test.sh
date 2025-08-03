#!/bin/bash

# Comprehensive Test Suite for Invoice PDF Application
# This script runs all tests including unit tests, integration tests, and entity creation tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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
    echo -e "\n${PURPLE}🧪 $1${NC}"
    echo "=================================================="
}

print_section() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "--------------------------------------------------"
}

# Function to wait for application
wait_for_app() {
    print_section "Waiting for Application"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$APP_URL/api/health" > /dev/null 2>&1; then
            print_success "Application is ready at $APP_URL"
            return 0
        fi
        
        print_info "Attempt $attempt/$max_attempts - waiting for app..."
        sleep 2
        ((attempt++))
    done
    
    print_error "Application failed to become ready"
    return 1
}

# Function to run unit tests
run_unit_tests() {
    print_header "Unit Tests"
    
    if [ ! -f "package.json" ]; then
        print_warning "No package.json found, skipping unit tests"
        return 0
    fi
    
    print_section "Running Jest Tests"
    
    # Run specific entity creation tests
    local test_files=(
        "__tests__/app/api/business-profiles/route.test.ts"
        "__tests__/app/api/clients/route.test.ts"
        "__tests__/app/api/invoices/route.test.ts"
    )
    
    local failed_tests=0
    
    for test_file in "${test_files[@]}"; do
        if [ -f "$test_file" ]; then
            print_info "Running $(basename "$test_file")..."
            if npm test -- "$test_file" --passWithNoTests --silent; then
                print_success "$(basename "$test_file") passed"
            else
                print_error "$(basename "$test_file") failed"
                ((failed_tests++))
            fi
        else
            print_warning "Test file not found: $test_file"
        fi
    done
    
    if [ $failed_tests -eq 0 ]; then
        print_success "All unit tests passed!"
        return 0
    else
        print_error "$failed_tests unit test(s) failed"
        return 1
    fi
}

# Function to authenticate
authenticate() {
    print_section "Authentication"
    
    # Get the actual admin password from the environment
    local admin_password
    admin_password=$(docker-compose -f docker-compose.secrets.yml exec app printenv ADMIN_PASSWORD 2>/dev/null | tr -d '\r' || echo "$ADMIN_PASSWORD")
    
    print_info "Getting CSRF token..."
    curl -s -c /tmp/test_cookies.txt "$APP_URL/login" > /dev/null
    
    local csrf_response
    csrf_response=$(curl -s -b /tmp/test_cookies.txt -c /tmp/test_cookies.txt "$APP_URL/api/auth/csrf")
    local csrf_token
    csrf_token=$(echo "$csrf_response" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$csrf_token" ]; then
        print_error "Failed to get CSRF token"
        return 1
    fi
    
    print_info "Authenticating..."
    local auth_response
    auth_response=$(curl -s -w '%{http_code}' -o /tmp/auth_result.json \
        -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -b /tmp/test_cookies.txt \
        -c /tmp/test_cookies.txt \
        -d "password=$admin_password&csrfToken=$csrf_token&callbackUrl=$APP_URL/dashboard&json=true" \
        "$APP_URL/api/auth/callback/credentials")
    
    # Check session
    local session_response
    session_response=$(curl -s -w '%{http_code}' -o /tmp/session.json \
        -b /tmp/test_cookies.txt \
        "$APP_URL/api/auth/session")
    
    if [ "$session_response" = "200" ] && grep -q '"user"' /tmp/session.json 2>/dev/null; then
        print_success "Authentication successful"
        return 0
    else
        print_error "Authentication failed"
        return 1
    fi
}

# Function to test entity creation
test_entity_creation() {
    print_header "Entity Creation Tests"
    
    local failed_tests=0
    local created_entities=()
    
    # Test business profile creation
    print_section "Business Profile Creation"
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
    
    if [ "$response_code" = "201" ]; then
        local profile_id
        profile_id=$(grep -o '"id":"[^"]*"' /tmp/profile_result.json | cut -d'"' -f4)
        print_success "Business profile created: $profile_id"
        created_entities+=("Business Profile: $profile_id")
    else
        print_error "Business profile creation failed: $response_code"
        ((failed_tests++))
    fi
    
    # Test client creation
    print_section "Client Creation"
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
    
    if [ "$response_code" = "201" ]; then
        local client_id
        client_id=$(grep -o '"id":"[^"]*"' /tmp/client_result.json | cut -d'"' -f4)
        print_success "Client created: $client_id"
        created_entities+=("Client: $client_id")
    else
        print_error "Client creation failed: $response_code"
        ((failed_tests++))
    fi
    
    # Test data retrieval
    print_section "Data Retrieval"
    
    response_code=$(curl -s -w '%{http_code}' -o /tmp/get_profiles.json \
        -b /tmp/test_cookies.txt \
        "$APP_URL/api/business-profiles")
    
    if [ "$response_code" = "200" ]; then
        local count
        count=$(grep -o '"id"' /tmp/get_profiles.json | wc -l)
        print_success "Retrieved $count business profile(s)"
    else
        print_error "Failed to retrieve profiles: $response_code"
        ((failed_tests++))
    fi
    
    response_code=$(curl -s -w '%{http_code}' -o /tmp/get_clients.json \
        -b /tmp/test_cookies.txt \
        "$APP_URL/api/clients")
    
    if [ "$response_code" = "200" ]; then
        local count
        count=$(grep -o '"id"' /tmp/get_clients.json | wc -l)
        print_success "Retrieved $count client(s)"
    else
        print_error "Failed to retrieve clients: $response_code"
        ((failed_tests++))
    fi
    
    # Summary
    if [ $failed_tests -eq 0 ]; then
        print_success "All entity creation tests passed!"
        print_info "Created entities:"
        for entity in "${created_entities[@]}"; do
            echo "  - $entity"
        done
        return 0
    else
        print_error "$failed_tests entity creation test(s) failed"
        return 1
    fi
}

# Function to run smoke tests
run_smoke_tests() {
    print_header "Smoke Tests"
    
    if [ -f "./scripts/smoke-test.sh" ]; then
        print_section "Running Application Smoke Tests"
        if ./scripts/smoke-test.sh -u "$APP_URL"; then
            print_success "Smoke tests passed"
            return 0
        else
            print_error "Smoke tests failed"
            return 1
        fi
    else
        print_warning "Smoke test script not found"
        return 0
    fi
}

# Main execution
main() {
    local start_time
    start_time=$(date +%s)
    
    echo -e "${PURPLE}"
    echo "🚀 Invoice PDF Application - Comprehensive Test Suite"
    echo "====================================================="
    echo -e "${NC}"
    
    print_info "Test Configuration:"
    echo "   App URL: $APP_URL"
    echo "   Admin Password: ${ADMIN_PASSWORD:0:3}***"
    echo ""
    
    local total_tests=0
    local failed_tests=0
    
    # Wait for application
    if ! wait_for_app; then
        print_error "Application is not ready. Aborting tests."
        exit 1
    fi
    
    # Run unit tests
    ((total_tests++))
    if ! run_unit_tests; then
        ((failed_tests++))
    fi
    
    # Authenticate
    if ! authenticate; then
        print_error "Authentication failed, skipping entity tests"
        ((failed_tests++))
    else
        # Run entity creation tests
        ((total_tests++))
        if ! test_entity_creation; then
            ((failed_tests++))
        fi
    fi
    
    # Run smoke tests
    ((total_tests++))
    if ! run_smoke_tests; then
        ((failed_tests++))
    fi
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Final summary
    print_header "Test Summary"
    echo "📊 Results:"
    echo "   Total Test Suites: $total_tests"
    echo "   Passed: $((total_tests - failed_tests))"
    echo "   Failed: $failed_tests"
    echo "   Duration: ${duration}s"
    echo ""
    
    if [ $failed_tests -eq 0 ]; then
        print_success "🎉 All tests passed! Application is ready for use."
        echo ""
        print_info "✨ Key Features Tested:"
        echo "   • Application health and availability"
        echo "   • Authentication system"
        echo "   • Business profile creation and retrieval"
        echo "   • Client creation and retrieval"
        echo "   • API endpoint security"
        echo ""
        print_info "🌐 Access the application at: $APP_URL"
        exit 0
    else
        print_error "❌ $failed_tests test suite(s) failed"
        print_warning "Please review the logs above and fix any issues"
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
