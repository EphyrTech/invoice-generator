#!/bin/bash

# Comprehensive test runner for the Invoice PDF application
# This script runs all tests including unit tests, integration tests, and smoke tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
APP_URL="${APP_URL:-http://app:3000}"
TEST_TIMEOUT="${TEST_TIMEOUT:-300}"
SKIP_UNIT_TESTS="${SKIP_UNIT_TESTS:-false}"
SKIP_INTEGRATION_TESTS="${SKIP_INTEGRATION_TESTS:-false}"
SKIP_SMOKE_TESTS="${SKIP_SMOKE_TESTS:-false}"

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

# Function to wait for application to be ready
wait_for_app() {
    print_section "Waiting for Application to be Ready"
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$APP_URL/api/health" > /dev/null 2>&1; then
            print_success "Application is ready at $APP_URL"
            return 0
        fi
        
        print_info "Attempt $attempt/$max_attempts - waiting for app to be ready..."
        sleep 5
        ((attempt++))
    done
    
    print_error "Application failed to become ready after $max_attempts attempts"
    return 1
}

# Function to run unit tests
run_unit_tests() {
    print_header "Running Unit Tests"
    
    if [ "$SKIP_UNIT_TESTS" = "true" ]; then
        print_warning "Unit tests skipped (SKIP_UNIT_TESTS=true)"
        return 0
    fi
    
    print_section "Entity Creation Tests"
    
    # Run specific test suites for entity creation
    local test_files=(
        "__tests__/app/api/business-profiles/route.test.ts"
        "__tests__/app/api/clients/route.test.ts"
        "__tests__/app/api/invoices/route.test.ts"
        "__tests__/app/api/templates/route.test.ts"
    )
    
    local failed_tests=0
    
    for test_file in "${test_files[@]}"; do
        if [ -f "$test_file" ]; then
            print_info "Running $(basename "$test_file")..."
            if npm test -- "$test_file" --verbose --passWithNoTests; then
                print_success "$(basename "$test_file") passed"
            else
                print_error "$(basename "$test_file") failed"
                ((failed_tests++))
            fi
        else
            print_warning "Test file not found: $test_file"
        fi
    done
    
    print_section "Database Tests"
    if npm test -- "__tests__/lib/db" --verbose --passWithNoTests; then
        print_success "Database tests passed"
    else
        print_error "Database tests failed"
        ((failed_tests++))
    fi
    
    print_section "Utility Tests"
    if npm test -- "__tests__/lib/pdf" --verbose --passWithNoTests; then
        print_success "PDF utility tests passed"
    else
        print_error "PDF utility tests failed"
        ((failed_tests++))
    fi
    
    if [ $failed_tests -eq 0 ]; then
        print_success "All unit tests passed!"
        return 0
    else
        print_error "$failed_tests unit test suite(s) failed"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_header "Running Integration Tests"
    
    if [ "$SKIP_INTEGRATION_TESTS" = "true" ]; then
        print_warning "Integration tests skipped (SKIP_INTEGRATION_TESTS=true)"
        return 0
    fi
    
    print_section "API Integration Tests"
    if npm test -- "__tests__/integration" --verbose --passWithNoTests; then
        print_success "Integration tests passed"
        return 0
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Function to run smoke tests
run_smoke_tests() {
    print_header "Running Smoke Tests"
    
    if [ "$SKIP_SMOKE_TESTS" = "true" ]; then
        print_warning "Smoke tests skipped (SKIP_SMOKE_TESTS=true)"
        return 0
    fi
    
    # Determine the correct URL for smoke tests
    local smoke_test_url="$APP_URL"
    
    # If running inside Docker, try to detect the actual port
    if [ -n "$DOCKER_CONTAINER" ]; then
        smoke_test_url="http://app:3000"
    fi
    
    print_section "Application Smoke Tests"
    if ./scripts/smoke-test.sh -u "$smoke_test_url"; then
        print_success "Smoke tests passed"
        return 0
    else
        print_error "Smoke tests failed"
        return 1
    fi
}

# Function to authenticate and get session cookie
authenticate() {
    print_section "Authenticating for Entity Creation Tests"

    # First, get the login page to establish session
    print_info "Getting login page..."
    curl -s -c /tmp/cookies.txt "$APP_URL/login" > /dev/null

    # Get CSRF token
    local csrf_response
    csrf_response=$(curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt "$APP_URL/api/auth/csrf")
    local csrf_token
    csrf_token=$(echo "$csrf_response" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$csrf_token" ]; then
        print_error "Failed to get CSRF token"
        return 1
    fi

    print_info "Got CSRF token: ${csrf_token:0:20}..."

    # Get the actual admin password from the environment
    local admin_password
    admin_password=$(docker-compose -f docker-compose.secrets.yml exec app printenv ADMIN_PASSWORD 2>/dev/null | tr -d '\r' || echo "${ADMIN_PASSWORD:-admin123}")

    # Authenticate with admin password using form data
    local auth_response
    auth_response=$(curl -s -w '%{http_code}' -o /tmp/auth_response.txt \
        -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -b /tmp/cookies.txt \
        -c /tmp/cookies.txt \
        -d "password=$admin_password&csrfToken=$csrf_token&callbackUrl=$APP_URL/dashboard&json=true" \
        "$APP_URL/api/auth/callback/credentials" || echo "000")

    print_info "Auth response status: $auth_response"

    # Check if we have a session by testing a protected endpoint
    local session_check
    session_check=$(curl -s -w '%{http_code}' -o /tmp/session_check.json \
        -b /tmp/cookies.txt \
        "$APP_URL/api/auth/session" || echo "000")

    if [ "$session_check" = "200" ]; then
        # Check if session contains user data
        if grep -q '"user"' /tmp/session_check.json 2>/dev/null; then
            print_success "Authentication successful - session established"
            return 0
        else
            print_warning "Session endpoint accessible but no user data found"
            cat /tmp/session_check.json 2>/dev/null || true
        fi
    fi

    # Try alternative authentication method - direct login
    print_info "Trying alternative authentication method..."

    # Get the signin page
    curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt "$APP_URL/api/auth/signin" > /dev/null

    # Try signing in with credentials provider
    local signin_response
    signin_response=$(curl -s -w '%{http_code}' -o /tmp/signin_response.txt \
        -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -b /tmp/cookies.txt \
        -c /tmp/cookies.txt \
        -d "password=${ADMIN_PASSWORD:-admin123}&csrfToken=$csrf_token" \
        "$APP_URL/api/auth/signin/credentials" || echo "000")

    print_info "Signin response status: $signin_response"

    # Final session check
    session_check=$(curl -s -w '%{http_code}' -o /tmp/session_final.json \
        -b /tmp/cookies.txt \
        "$APP_URL/api/auth/session" || echo "000")

    if [ "$session_check" = "200" ] && grep -q '"user"' /tmp/session_final.json 2>/dev/null; then
        print_success "Authentication successful via alternative method"
        return 0
    else
        print_error "Authentication failed - no valid session established"
        print_info "Session check status: $session_check"
        cat /tmp/session_final.json 2>/dev/null || true
        return 1
    fi
}

# Function to run authenticated entity creation tests
run_entity_creation_tests() {
    print_header "Running Authenticated Entity Creation Tests"

    # Authenticate first
    if ! authenticate; then
        print_error "Authentication failed, skipping entity creation tests"
        return 1
    fi

    print_section "Testing Real Entity Creation"

    local failed_tests=0
    local created_profile_id=""
    local created_client_id=""

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
    response_code=$(curl -s -w '%{http_code}' -o /tmp/profile_response.json \
        -X POST \
        -H "Content-Type: application/json" \
        -b /tmp/cookies.txt \
        -d "$profile_data" \
        "$APP_URL/api/business-profiles" || echo "000")

    if [ "$response_code" = "201" ]; then
        created_profile_id=$(cat /tmp/profile_response.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_success "Business profile created successfully (ID: ${created_profile_id:0:8}...)"
    else
        print_error "Business profile creation failed with status: $response_code"
        cat /tmp/profile_response.json 2>/dev/null || true
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

    response_code=$(curl -s -w '%{http_code}' -o /tmp/client_response.json \
        -X POST \
        -H "Content-Type: application/json" \
        -b /tmp/cookies.txt \
        -d "$client_data" \
        "$APP_URL/api/clients" || echo "000")

    if [ "$response_code" = "201" ]; then
        created_client_id=$(cat /tmp/client_response.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_success "Client created successfully (ID: ${created_client_id:0:8}...)"
    else
        print_error "Client creation failed with status: $response_code"
        cat /tmp/client_response.json 2>/dev/null || true
        ((failed_tests++))
    fi

    # Test template creation (if we have profile and client)
    if [ -n "$created_profile_id" ] && [ -n "$created_client_id" ]; then
        print_info "Creating template..."
        local template_data="{
            \"name\": \"Test Service Template\",
            \"businessProfileId\": \"$created_profile_id\",
            \"clientId\": \"$created_client_id\"
        }"

        response_code=$(curl -s -w '%{http_code}' -o /tmp/template_response.json \
            -X POST \
            -H "Content-Type: application/json" \
            -b /tmp/cookies.txt \
            -d "$template_data" \
            "$APP_URL/api/templates" || echo "000")

        if [ "$response_code" = "201" ]; then
            local created_template_id
            created_template_id=$(cat /tmp/template_response.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
            print_success "Template created successfully (ID: ${created_template_id:0:8}...)"
        else
            print_error "Template creation failed with status: $response_code"
            cat /tmp/template_response.json 2>/dev/null || true
            ((failed_tests++))
        fi

        # Test invoice creation
        print_info "Creating invoice..."
        local invoice_data="{
            \"businessProfileId\": \"$created_profile_id\",
            \"clientId\": \"$created_client_id\",
            \"invoiceNumber\": \"INV-TEST-$(date +%s)\",
            \"issueDate\": \"$(date +%Y-%m-%d)\",
            \"dueDate\": \"$(date -v+30d +%Y-%m-%d)\",
            \"taxRate\": 10,
            \"discountRate\": 0,
            \"currency\": \"USD\",
            \"notes\": \"Test invoice\",
            \"terms\": \"Payment due in 30 days\",
            \"items\": [
                {
                    \"description\": \"Test Service\",
                    \"quantity\": 2,
                    \"unitPrice\": 100,
                    \"taxRate\": 10
                }
            ]
        }"

        response_code=$(curl -s -w '%{http_code}' -o /tmp/invoice_response.json \
            -X POST \
            -H "Content-Type: application/json" \
            -b /tmp/cookies.txt \
            -d "$invoice_data" \
            "$APP_URL/api/invoices" || echo "000")

        if [ "$response_code" = "201" ]; then
            local created_invoice_id
            created_invoice_id=$(cat /tmp/invoice_response.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
            print_success "Invoice created successfully (ID: ${created_invoice_id:0:8}...)"
        else
            print_error "Invoice creation failed with status: $response_code"
            cat /tmp/invoice_response.json 2>/dev/null || true
            ((failed_tests++))
        fi
    else
        print_warning "Skipping template and invoice creation due to missing dependencies"
        ((failed_tests++))
    fi

    # Test data retrieval
    print_info "Testing data retrieval..."

    # Get business profiles
    response_code=$(curl -s -w '%{http_code}' -o /tmp/get_profiles.json \
        -b /tmp/cookies.txt \
        "$APP_URL/api/business-profiles" || echo "000")

    if [ "$response_code" = "200" ]; then
        local profile_count
        profile_count=$(cat /tmp/get_profiles.json | grep -o '"id"' | wc -l)
        print_success "Retrieved $profile_count business profile(s)"
    else
        print_error "Failed to retrieve business profiles: $response_code"
        ((failed_tests++))
    fi

    # Get clients
    response_code=$(curl -s -w '%{http_code}' -o /tmp/get_clients.json \
        -b /tmp/cookies.txt \
        "$APP_URL/api/clients" || echo "000")

    if [ "$response_code" = "200" ]; then
        local client_count
        client_count=$(cat /tmp/get_clients.json | grep -o '"id"' | wc -l)
        print_success "Retrieved $client_count client(s)"
    else
        print_error "Failed to retrieve clients: $response_code"
        ((failed_tests++))
    fi

    if [ $failed_tests -eq 0 ]; then
        print_success "All entity creation tests passed!"
        return 0
    else
        print_error "$failed_tests entity creation test(s) failed"
        return 1
    fi
}

# Function to generate test report
generate_test_report() {
    local total_tests="$1"
    local failed_tests="$2"
    local start_time="$3"
    local end_time="$4"
    
    print_header "Test Execution Summary"
    
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo "📊 Test Results:"
    echo "   Total Test Suites: $total_tests"
    echo "   Passed: $((total_tests - failed_tests))"
    echo "   Failed: $failed_tests"
    echo "   Duration: ${minutes}m ${seconds}s"
    echo ""
    
    if [ $failed_tests -eq 0 ]; then
        print_success "🎉 All tests passed! The application is ready for deployment."
        echo ""
        print_info "Application URL: $APP_URL"
        print_info "Health Check: $APP_URL/api/health"
        return 0
    else
        print_error "❌ $failed_tests test suite(s) failed. Please review the logs above."
        return 1
    fi
}

# Main execution function
main() {
    local start_time
    start_time=$(date +%s)
    
    echo -e "${PURPLE}"
    echo "🚀 Invoice PDF Application - Comprehensive Test Suite"
    echo "====================================================="
    echo -e "${NC}"
    
    print_info "Test Configuration:"
    echo "   App URL: $APP_URL"
    echo "   Test Timeout: ${TEST_TIMEOUT}s"
    echo "   Skip Unit Tests: $SKIP_UNIT_TESTS"
    echo "   Skip Integration Tests: $SKIP_INTEGRATION_TESTS"
    echo "   Skip Smoke Tests: $SKIP_SMOKE_TESTS"
    echo ""
    
    local total_tests=0
    local failed_tests=0
    
    # Wait for application to be ready
    if ! wait_for_app; then
        print_error "Application is not ready. Aborting tests."
        exit 1
    fi
    
    # Run unit tests
    ((total_tests++))
    if ! run_unit_tests; then
        ((failed_tests++))
    fi
    
    # Run integration tests
    ((total_tests++))
    if ! run_integration_tests; then
        ((failed_tests++))
    fi
    
    # Run entity creation tests
    ((total_tests++))
    if ! run_entity_creation_tests; then
        ((failed_tests++))
    fi
    
    # Run smoke tests
    ((total_tests++))
    if ! run_smoke_tests; then
        ((failed_tests++))
    fi
    
    local end_time
    end_time=$(date +%s)
    
    # Generate test report
    generate_test_report "$total_tests" "$failed_tests" "$start_time" "$end_time"
    
    # Cleanup
    rm -f /tmp/test_response.json /tmp/cookies.txt /tmp/auth_response.* /tmp/session_*.json
    rm -f /tmp/profile_response.json /tmp/client_response.json /tmp/template_response.json
    rm -f /tmp/invoice_response.json /tmp/get_profiles.json /tmp/get_clients.json
    rm -f /tmp/signin_response.txt
    
    # Exit with appropriate code
    if [ $failed_tests -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Show usage information
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -u, --url URL           Set application URL (default: $APP_URL)"
    echo "  --skip-unit             Skip unit tests"
    echo "  --skip-integration      Skip integration tests"
    echo "  --skip-smoke            Skip smoke tests"
    echo "  --timeout SECONDS       Set test timeout (default: $TEST_TIMEOUT)"
    echo ""
    echo "Environment Variables:"
    echo "  APP_URL                 Application URL"
    echo "  TEST_TIMEOUT            Test timeout in seconds"
    echo "  SKIP_UNIT_TESTS         Skip unit tests (true/false)"
    echo "  SKIP_INTEGRATION_TESTS  Skip integration tests (true/false)"
    echo "  SKIP_SMOKE_TESTS        Skip smoke tests (true/false)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all tests"
    echo "  $0 --skip-unit                       # Skip unit tests"
    echo "  $0 -u http://localhost:3000          # Test specific URL"
    echo "  $0 --timeout 600                     # Set 10 minute timeout"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -u|--url)
            APP_URL="$2"
            shift 2
            ;;
        --skip-unit)
            SKIP_UNIT_TESTS="true"
            shift
            ;;
        --skip-integration)
            SKIP_INTEGRATION_TESTS="true"
            shift
            ;;
        --skip-smoke)
            SKIP_SMOKE_TESTS="true"
            shift
            ;;
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check dependencies
if ! command -v curl &> /dev/null; then
    print_error "curl is required but not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed"
    exit 1
fi

# Run main function
main "$@"
