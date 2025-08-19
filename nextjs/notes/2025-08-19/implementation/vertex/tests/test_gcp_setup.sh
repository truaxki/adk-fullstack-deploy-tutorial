#!/bin/bash

###############################################################################
# GCP Setup Test Script for Vertex AI Implementation
# 
# This script validates that all required GCP APIs and configurations
# are properly set up for your Vertex AI Agent deployment.
#
# Usage:
#   bash test_gcp_setup.sh
#
# Project: agentlocker-466121
# Location: us-central1
# Agent: astra
###############################################################################

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
EXPECTED_PROJECT="agentlocker-466121"
EXPECTED_LOCATION="us-central1"
EXPECTED_AGENT_NAME="astra"
EXPECTED_ENGINE_ID="5717733143318888448"

# Counters for summary
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNING=0

# Print functions
print_header() {
    echo -e "\n${PURPLE}${BOLD}===============================================================${NC}"
    echo -e "${PURPLE}${BOLD}                    $1${NC}"
    echo -e "${PURPLE}${BOLD}===============================================================${NC}"
}

print_section() {
    echo -e "\n${CYAN}${BOLD}▶ $1${NC}"
    echo -e "${CYAN}──────────────────────────────────────────────────${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((TESTS_WARNING++))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Test functions
check_gcloud_cli() {
    print_section "Checking gcloud CLI"
    
    if command -v gcloud &> /dev/null; then
        print_success "gcloud CLI is installed"
        
        # Check version
        GCLOUD_VERSION=$(gcloud version --format="value(version.version_string)" 2>/dev/null | head -n 1)
        print_info "gcloud version: $GCLOUD_VERSION"
        
        return 0
    else
        print_error "gcloud CLI is not installed"
        print_info "Install from: https://cloud.google.com/sdk/docs/install"
        return 1
    fi
}

check_project_configuration() {
    print_section "Checking Project Configuration"
    
    # Get current project
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
    
    if [ -z "$CURRENT_PROJECT" ]; then
        print_error "No project is configured"
        print_info "Run: gcloud config set project $EXPECTED_PROJECT"
        return 1
    elif [ "$CURRENT_PROJECT" != "$EXPECTED_PROJECT" ]; then
        print_warning "Current project: $CURRENT_PROJECT (expected: $EXPECTED_PROJECT)"
        print_info "To switch: gcloud config set project $EXPECTED_PROJECT"
        return 0
    else
        print_success "Project configured: $CURRENT_PROJECT"
        return 0
    fi
}

check_authentication() {
    print_section "Checking Authentication"
    
    # Check if authenticated
    ACCOUNT=$(gcloud config get-value account 2>/dev/null)
    
    if [ -z "$ACCOUNT" ]; then
        print_error "Not authenticated with gcloud"
        print_info "Run: gcloud auth login"
        return 1
    else
        print_success "Authenticated as: $ACCOUNT"
        
        # Check application default credentials
        if gcloud auth application-default print-access-token &>/dev/null; then
            print_success "Application default credentials configured"
        else
            print_warning "Application default credentials not set"
            print_info "Run: gcloud auth application-default login"
        fi
        
        return 0
    fi
}

check_apis_enabled() {
    print_section "Checking Required APIs"
    
    # Required APIs
    REQUIRED_APIS=(
        "aiplatform.googleapis.com"
        "storage-api.googleapis.com"
        "cloudbuild.googleapis.com"
        "artifactregistry.googleapis.com"
        "cloudresourcemanager.googleapis.com"
        "iam.googleapis.com"
    )
    
    # Optional APIs
    OPTIONAL_APIS=(
        "monitoring.googleapis.com"
        "logging.googleapis.com"
    )
    
    echo -e "${BOLD}Required APIs:${NC}"
    for API in "${REQUIRED_APIS[@]}"; do
        if gcloud services list --enabled --filter="name:${API}" --format="value(name)" 2>/dev/null | grep -q "${API}"; then
            print_success "$API"
        else
            print_error "$API - NOT ENABLED"
            echo "      Run: gcloud services enable $API"
        fi
    done
    
    echo -e "\n${BOLD}Optional APIs:${NC}"
    for API in "${OPTIONAL_APIS[@]}"; do
        if gcloud services list --enabled --filter="name:${API}" --format="value(name)" 2>/dev/null | grep -q "${API}"; then
            print_success "$API"
        else
            print_warning "$API - NOT ENABLED (optional)"
        fi
    done
}

check_iam_roles() {
    print_section "Checking IAM Roles"
    
    ACCOUNT=$(gcloud config get-value account 2>/dev/null)
    
    if [ -n "$ACCOUNT" ]; then
        echo -e "${BOLD}Checking roles for: $ACCOUNT${NC}"
        
        # Get user's roles
        ROLES=$(gcloud projects get-iam-policy $EXPECTED_PROJECT \
            --flatten="bindings[].members" \
            --format='value(bindings.role)' \
            --filter="bindings.members:$ACCOUNT" 2>/dev/null)
        
        if [ -z "$ROLES" ]; then
            print_warning "No roles found for $ACCOUNT"
            print_info "You may need additional permissions"
        else
            echo -e "${BOLD}Assigned roles:${NC}"
            echo "$ROLES" | while read -r role; do
                echo "  • $role"
            done
            
            # Check for specific required roles
            REQUIRED_ROLES=(
                "roles/aiplatform.user"
                "roles/storage.admin"
                "roles/iam.serviceAccountUser"
            )
            
            echo -e "\n${BOLD}Checking for required roles:${NC}"
            for ROLE in "${REQUIRED_ROLES[@]}"; do
                if echo "$ROLES" | grep -q "$ROLE"; then
                    print_success "$ROLE"
                else
                    # Check if user has owner/editor which includes these permissions
                    if echo "$ROLES" | grep -q -E "roles/(owner|editor)"; then
                        print_info "$ROLE (covered by owner/editor role)"
                    else
                        print_warning "$ROLE - NOT ASSIGNED"
                    fi
                fi
            done
        fi
    fi
}

check_storage_buckets() {
    print_section "Checking Storage Buckets"
    
    # Expected buckets
    STAGING_BUCKET="agentlocker-agent-staging"
    SESSION_BUCKET="${EXPECTED_PROJECT}-${EXPECTED_AGENT_NAME}-sessions"
    ARTIFACT_BUCKET="${EXPECTED_PROJECT}-${EXPECTED_AGENT_NAME}-logs-data"
    
    for BUCKET in "$STAGING_BUCKET" "$SESSION_BUCKET" "$ARTIFACT_BUCKET"; do
        if gsutil ls -b "gs://$BUCKET" &>/dev/null; then
            print_success "Bucket exists: $BUCKET"
        else
            print_warning "Bucket not found: $BUCKET"
            echo "      Create with: gsutil mb -p $EXPECTED_PROJECT -l $EXPECTED_LOCATION gs://$BUCKET/"
        fi
    done
}

check_agent_engine() {
    print_section "Checking Agent Engine"
    
    # Try to describe the agent engine
    if gcloud ai reasoning-engines describe $EXPECTED_ENGINE_ID \
        --location=$EXPECTED_LOCATION \
        --project=$EXPECTED_PROJECT &>/dev/null; then
        print_success "Agent Engine found: $EXPECTED_ENGINE_ID"
        
        # Get details
        ENGINE_NAME=$(gcloud ai reasoning-engines describe $EXPECTED_ENGINE_ID \
            --location=$EXPECTED_LOCATION \
            --project=$EXPECTED_PROJECT \
            --format="value(displayName)" 2>/dev/null)
        
        if [ -n "$ENGINE_NAME" ]; then
            print_info "Display name: $ENGINE_NAME"
        fi
    else
        print_warning "Agent Engine not found or not accessible: $EXPECTED_ENGINE_ID"
        print_info "This is normal if you haven't deployed yet"
    fi
}

check_environment_variables() {
    print_section "Checking Environment Variables"
    
    # Check key environment variables
    ENV_VARS=(
        "GOOGLE_CLOUD_PROJECT"
        "GOOGLE_CLOUD_LOCATION"
        "AGENT_NAME"
        "AGENT_ENGINE_ID"
        "GOOGLE_CLOUD_STAGING_BUCKET"
    )
    
    for VAR in "${ENV_VARS[@]}"; do
        VALUE="${!VAR}"
        if [ -n "$VALUE" ]; then
            print_success "$VAR = $VALUE"
        else
            print_info "$VAR is not set"
        fi
    done
}

enable_all_apis() {
    print_section "Quick API Enable Command"
    
    echo -e "${BOLD}To enable all required APIs at once, run:${NC}\n"
    
    cat << 'EOF'
gcloud services enable \
    aiplatform.googleapis.com \
    storage-api.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    cloudresourcemanager.googleapis.com \
    iam.googleapis.com \
    monitoring.googleapis.com \
    logging.googleapis.com
EOF
    
    echo -e "\n${BOLD}Or copy this one-liner:${NC}"
    echo "gcloud services enable aiplatform.googleapis.com storage-api.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com cloudresourcemanager.googleapis.com iam.googleapis.com monitoring.googleapis.com logging.googleapis.com"
}

generate_summary() {
    print_header "TEST SUMMARY"
    
    echo -e "${BOLD}Test Results:${NC}"
    echo -e "  ${GREEN}Passed:${NC} $TESTS_PASSED"
    echo -e "  ${YELLOW}Warnings:${NC} $TESTS_WARNING"
    echo -e "  ${RED}Failed:${NC} $TESTS_FAILED"
    
    echo -e "\n${BOLD}Configuration:${NC}"
    echo "  Project: $EXPECTED_PROJECT"
    echo "  Location: $EXPECTED_LOCATION"
    echo "  Agent: $EXPECTED_AGENT_NAME"
    echo "  Engine ID: $EXPECTED_ENGINE_ID"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}${BOLD}✅ SETUP VALIDATION PASSED${NC}"
        echo "Your GCP environment appears to be configured correctly!"
        
        echo -e "\n${CYAN}${BOLD}📋 Next Steps:${NC}"
        echo "1. Deploy your agent with: python app/agent_engine_app.py"
        echo "2. Test sessions with: python app/test_sessions.py"
        echo "3. Monitor in Cloud Console: https://console.cloud.google.com"
    else
        echo -e "\n${RED}${BOLD}❌ SETUP VALIDATION FAILED${NC}"
        echo "Please address the errors above before proceeding."
        
        echo -e "\n${CYAN}${BOLD}📋 Next Steps:${NC}"
        echo "1. Fix the errors listed above"
        echo "2. Re-run this validation script"
        echo "3. Consult the implementation guide if needed"
    fi
    
    # Save results to file
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    REPORT_FILE="gcp_setup_test_${TIMESTAMP}.txt"
    
    {
        echo "GCP Setup Test Report"
        echo "===================="
        echo "Date: $(date)"
        echo "Project: $EXPECTED_PROJECT"
        echo "Tests Passed: $TESTS_PASSED"
        echo "Tests Warning: $TESTS_WARNING"
        echo "Tests Failed: $TESTS_FAILED"
    } > "$REPORT_FILE"
    
    echo -e "\n${BLUE}📄 Report saved to: $REPORT_FILE${NC}"
}

# Main execution
main() {
    print_header "GCP SETUP VALIDATION FOR VERTEX AI"
    
    echo -e "${CYAN}Testing configuration for project: ${BOLD}$EXPECTED_PROJECT${NC}"
    echo -e "${CYAN}Expected location: ${BOLD}$EXPECTED_LOCATION${NC}"
    echo -e "${CYAN}Expected agent: ${BOLD}$EXPECTED_AGENT_NAME${NC}\n"
    
    # Run all checks
    check_gcloud_cli
    check_project_configuration
    check_authentication
    check_apis_enabled
    check_iam_roles
    check_storage_buckets
    check_agent_engine
    check_environment_variables
    
    # Show quick enable command
    enable_all_apis
    
    # Generate summary
    generate_summary
}

# Run the script
main
