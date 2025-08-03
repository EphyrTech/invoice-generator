#!/bin/bash

# Comprehensive smoke test for the Invoice PDF application
# This script tests all major API endpoints and functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="http://localhost:3000"
COMPOSE_FILE="docker-compose.secrets.yml"

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

# Function to check if containers are running
check_containers() {
    print_header "Checking Container Status"
    
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        print_error "Containers are not running. Please start them first:"
        echo "docker-compose -f $COMPOSE_FILE up -d"
        exit 1
    fi
    
    # Check individual services
    local services=("app" "db")
    for service in "${services[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            print_success "$service container is running"
        else
            print_error "$service container is not running"
            exit 1
        fi
    done
}

# Function to wait for application to be ready
wait_for_app() {
    print_header "Waiting for Application to be Ready"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$APP_URL/api/health" > /dev/null 2>&1; then
            print_success "Application is ready"
            return 0
        fi
        
        print_info "Attempt $attempt/$max_attempts - waiting for app to be ready..."
        sleep 2
        ((attempt++))
    done
    
    print_error "Application failed to become ready after $max_attempts attempts"
    exit 1
}

# Function to test API endpoint
test_api() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local description="$4"
    local data="$5"
    
    local url="$APP_URL$endpoint"
    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/response.json"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl_cmd="$curl_cmd -X POST -H 'Content-Type: application/json' -d '$data'"
    elif [ "$method" = "POST" ]; then
        curl_cmd="$curl_cmd -X POST"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    local status_code
    status_code=$(eval "$curl_cmd")
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "$description (Status: $status_code)"
        return 0
    else
        print_error "$description (Expected: $expected_status, Got: $status_code)"
        if [ -f /tmp/response.json ]; then
            echo "Response: $(cat /tmp/response.json)"
        fi
        return 1
    fi
}

# Function to test database health
test_database() {
    print_header "Testing Database Health"

    # Note: Database health endpoint requires authentication, so we expect a redirect
    test_api "GET" "/api/health/db" "307" "Database health check (should redirect to auth)"

    # Check if response contains auth redirect
    if [ -f /tmp/response.json ]; then
        if grep -q "/api/auth/signin" /tmp/response.json; then
            print_success "Database health endpoint properly requires authentication"
        else
            print_warning "Unexpected response from database health endpoint"
            echo "Response: $(cat /tmp/response.json)"
        fi
    fi
}

# Function to authenticate for smoke tests
authenticate_smoke_test() {
    print_info "Authenticating for smoke tests..."

    # Get the actual admin password from the environment
    local admin_password
    admin_password=$(docker-compose -f docker-compose.secrets.yml exec app printenv ADMIN_PASSWORD 2>/dev/null | tr -d '\r' || echo "${ADMIN_PASSWORD:-admin123}")

    # Get CSRF token
    curl -s -c /tmp/smoke_cookies.txt "$APP_URL/login" > /dev/null

    local csrf_response
    csrf_response=$(curl -s -b /tmp/smoke_cookies.txt -c /tmp/smoke_cookies.txt "$APP_URL/api/auth/csrf")
    local csrf_token
    csrf_token=$(echo "$csrf_response" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$csrf_token" ]; then
        print_error "Failed to get CSRF token for smoke tests"
        return 1
    fi

    # Authenticate
    local auth_response
    auth_response=$(curl -s -w '%{http_code}' -o /tmp/smoke_auth.json \
        -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -b /tmp/smoke_cookies.txt \
        -c /tmp/smoke_cookies.txt \
        -d "password=$admin_password&csrfToken=$csrf_token&callbackUrl=$APP_URL/dashboard&json=true" \
        "$APP_URL/api/auth/callback/credentials")

    # Check session
    local session_response
    session_response=$(curl -s -w '%{http_code}' -o /tmp/smoke_session.json \
        -b /tmp/smoke_cookies.txt \
        "$APP_URL/api/auth/session")

    if [ "$session_response" = "200" ] && grep -q '"user"' /tmp/smoke_session.json 2>/dev/null; then
        print_success "Smoke test authentication successful"
        return 0
    else
        print_error "Smoke test authentication failed"
        return 1
    fi
}

# Function to test authenticated API call
test_authenticated_api() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local description="$4"
    local data="$5"

    local url="$APP_URL$endpoint"
    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/response.json -b /tmp/smoke_cookies.txt"

    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl_cmd="$curl_cmd -X POST -H 'Content-Type: application/json' -d '$data'"
    elif [ "$method" = "POST" ]; then
        curl_cmd="$curl_cmd -X POST"
    fi

    curl_cmd="$curl_cmd '$url'"

    local status_code
    status_code=$(eval "$curl_cmd")

    if [ "$status_code" = "$expected_status" ]; then
        print_success "$description (Status: $status_code)"
        return 0
    else
        print_error "$description (Expected: $expected_status, Got: $status_code)"
        if [ -f /tmp/response.json ]; then
            echo "Response: $(cat /tmp/response.json)"
        fi
        return 1
    fi
}

# Function to test business profiles API
test_business_profiles() {
    print_header "Testing Business Profiles API (Authenticated)"

    # Test GET business profiles (authenticated)
    test_authenticated_api "GET" "/api/business-profiles" "200" "Get business profiles (authenticated)"

    # Test POST business profile creation
    local test_profile='{
        "name": "Smoke Test Company",
        "email": "smoketest@example.com",
        "phone": "+1-555-SMOKE",
        "address": "123 Smoke Test St",
        "city": "Test City",
        "state": "TS",
        "postalCode": "12345",
        "country": "USA",
        "taxId": "SMOKE123"
    }'

    test_authenticated_api "POST" "/api/business-profiles" "201" "Create business profile" "$test_profile"

    # Extract created profile ID for later use
    if [ -f /tmp/response.json ]; then
        CREATED_PROFILE_ID=$(grep -o '"id":"[^"]*"' /tmp/response.json | cut -d'"' -f4)
        if [ -n "$CREATED_PROFILE_ID" ]; then
            print_info "Created business profile ID: ${CREATED_PROFILE_ID:0:8}..."
        fi
    fi
}

# Function to test clients API
test_clients() {
    print_header "Testing Clients API (Authenticated)"

    # Test GET clients (authenticated)
    test_authenticated_api "GET" "/api/clients" "200" "Get clients (authenticated)"

    # Test POST client creation
    local test_client='{
        "name": "Smoke Test Client",
        "email": "smokeclient@example.com",
        "phone": "+1-555-CLIENT",
        "address": "456 Client Ave",
        "city": "Client City",
        "state": "CC",
        "postalCode": "54321",
        "country": "USA",
        "taxId": "CLIENT456"
    }'

    test_authenticated_api "POST" "/api/clients" "201" "Create client" "$test_client"

    # Extract created client ID for later use
    if [ -f /tmp/response.json ]; then
        CREATED_CLIENT_ID=$(grep -o '"id":"[^"]*"' /tmp/response.json | cut -d'"' -f4)
        if [ -n "$CREATED_CLIENT_ID" ]; then
            print_info "Created client ID: ${CREATED_CLIENT_ID:0:8}..."
        fi
    fi
}

# Function to test invoices API
test_invoices() {
    print_header "Testing Invoices API (Authenticated)"

    # Test GET invoices (authenticated)
    test_authenticated_api "GET" "/api/invoices" "200" "Get invoices (authenticated)"
}

# Function to test invoice templates API
test_invoice_templates() {
    print_header "Testing Invoice Templates API (Authenticated)"

    # Test GET invoice templates (authenticated) - might be 404 if not implemented
    local status_code
    status_code=$(curl -s -w '%{http_code}' -o /tmp/response.json -b /tmp/smoke_cookies.txt "$APP_URL/api/invoice-templates")

    if [ "$status_code" = "200" ]; then
        print_success "Get invoice templates (authenticated) (Status: $status_code)"
        return 0
    elif [ "$status_code" = "404" ]; then
        print_warning "Invoice templates endpoint not implemented yet (Status: $status_code)"
        return 0
    else
        print_error "Unexpected response from invoice templates (Status: $status_code)"
        return 1
    fi
}

# Function to test authentication
test_authentication() {
    print_header "Testing Authentication"
    
    # Test login page
    test_api "GET" "/login" "200" "Login page accessibility"
    
    # Test API auth endpoints
    test_api "GET" "/api/auth/session" "200" "Auth session endpoint"
}

# Function to test static assets
test_static_assets() {
    print_header "Testing Static Assets"

    # Test favicon (might be 404 if not configured, which is acceptable)
    local favicon_status
    favicon_status=$(curl -s -w '%{http_code}' -o /dev/null "$APP_URL/favicon.svg")

    if [ "$favicon_status" = "200" ]; then
        print_success "Favicon is available (Status: $favicon_status)"
    elif [ "$favicon_status" = "404" ]; then
        print_warning "Favicon not found (Status: $favicon_status) - consider adding one"
    else
        print_error "Unexpected favicon response (Status: $favicon_status)"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    local failed_tests=0
    
    echo -e "${BLUE}"
    echo "🚀 Starting Comprehensive Smoke Test"
    echo "======================================"
    echo -e "${NC}"
    
    # Run tests
    check_containers || ((failed_tests++))
    wait_for_app || ((failed_tests++))
    test_database || ((failed_tests++))
    test_authentication || ((failed_tests++))

    # Authenticate for API tests
    if authenticate_smoke_test; then
        test_business_profiles || ((failed_tests++))
        test_clients || ((failed_tests++))
        test_invoices || ((failed_tests++))
        test_invoice_templates || ((failed_tests++))
    else
        print_error "Authentication failed, skipping authenticated API tests"
        ((failed_tests += 4))
    fi

    test_static_assets || ((failed_tests++))
    
    # Summary
    print_header "Test Summary"
    
    if [ $failed_tests -eq 0 ]; then
        print_success "All tests passed! 🎉"
        print_info "The application is working correctly and ready for use."
        echo ""
        print_info "You can access the application at: $APP_URL"
        print_info "Default admin password: admin123 (change via ADMIN_PASSWORD env var)"
        return 0
    else
        print_error "$failed_tests test(s) failed"
        print_warning "Please check the logs and fix any issues before deploying."
        return 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -u, --url URL  Set application URL (default: $APP_URL)"
    echo "  -f, --file     Set docker-compose file (default: $COMPOSE_FILE)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all tests with defaults"
    echo "  $0 -u http://localhost:8080          # Test different port"
    echo "  $0 -f docker-compose.prod.yml        # Use different compose file"
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
        -f|--file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed"
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is required but not installed"
        exit 1
    fi
    
    # Run all tests
    run_all_tests
}

# Cleanup function
cleanup() {
    rm -f /tmp/response.json /tmp/smoke_cookies.txt /tmp/smoke_auth.json /tmp/smoke_session.json
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"
