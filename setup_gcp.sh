#!/bin/bash
# GCP Setup Script for VertexAI Session Service
# Project: agentlocker-466121
# Agent: astra

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="agentlocker-466121"
LOCATION="us-central1"
AGENT_NAME="astra"
AGENT_ENGINE_ID="5717733143318888448"
USER_EMAIL=$(gcloud config get-value account)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}GCP Setup for VertexAI Session Service${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Project ID: ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Location: ${YELLOW}${LOCATION}${NC}"
echo -e "Agent Name: ${YELLOW}${AGENT_NAME}${NC}"
echo -e "User: ${YELLOW}${USER_EMAIL}${NC}"
echo ""

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: Set Project
echo -e "${YELLOW}Step 1: Setting up project...${NC}"
gcloud config set project ${PROJECT_ID}
check_status "Project set"

# Step 2: Enable APIs
echo -e "${YELLOW}Step 2: Enabling required APIs...${NC}"
apis=(
    "aiplatform.googleapis.com"
    "storage-api.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "iam.googleapis.com"
    "monitoring.googleapis.com"
    "logging.googleapis.com"
)

for api in "${apis[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api --project=${PROJECT_ID} 2>/dev/null || true
done
check_status "APIs enabled"

# Step 3: Set up IAM permissions
echo -e "${YELLOW}Step 3: Configuring IAM permissions...${NC}"

roles=(
    "roles/aiplatform.user"
    "roles/storage.admin"
    "roles/iam.serviceAccountUser"
)

for role in "${roles[@]}"; do
    echo "Granting $role to ${USER_EMAIL}..."
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="user:${USER_EMAIL}" \
        --role="$role" \
        --quiet 2>/dev/null || true
done
check_status "IAM permissions configured"

# Step 4: Create Storage Buckets
echo -e "${YELLOW}Step 4: Setting up storage buckets...${NC}"

# Staging bucket
STAGING_BUCKET="agentlocker-agent-staging"
if ! gsutil ls -b gs://${STAGING_BUCKET} 2>/dev/null; then
    echo "Creating staging bucket..."
    gsutil mb -p ${PROJECT_ID} -l ${LOCATION} gs://${STAGING_BUCKET}/
    check_status "Staging bucket created"
else
    echo -e "${GREEN}✅ Staging bucket already exists${NC}"
fi

# Session bucket
SESSION_BUCKET="${PROJECT_ID}-${AGENT_NAME}-sessions"
if ! gsutil ls -b gs://${SESSION_BUCKET} 2>/dev/null; then
    echo "Creating session bucket..."
    gsutil mb -p ${PROJECT_ID} -l ${LOCATION} gs://${SESSION_BUCKET}/
    gsutil versioning set on gs://${SESSION_BUCKET}/
    check_status "Session bucket created"
else
    echo -e "${GREEN}✅ Session bucket already exists${NC}"
fi

# Artifacts bucket
ARTIFACTS_BUCKET="${PROJECT_ID}-${AGENT_NAME}-logs-data"
if ! gsutil ls -b gs://${ARTIFACTS_BUCKET} 2>/dev/null; then
    echo "Creating artifacts bucket..."
    gsutil mb -p ${PROJECT_ID} -l ${LOCATION} gs://${ARTIFACTS_BUCKET}/
    check_status "Artifacts bucket created"
else
    echo -e "${GREEN}✅ Artifacts bucket already exists${NC}"
fi

# Step 5: Create Service Account
echo -e "${YELLOW}Step 5: Setting up service account...${NC}"
SERVICE_ACCOUNT="${AGENT_NAME}-agent-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT_EMAIL} --project=${PROJECT_ID} 2>/dev/null; then
    echo "Creating service account..."
    gcloud iam service-accounts create ${SERVICE_ACCOUNT} \
        --display-name="${AGENT_NAME^} Agent Service Account" \
        --project=${PROJECT_ID}
    
    # Grant roles to service account
    sa_roles=(
        "roles/aiplatform.serviceAgent"
        "roles/storage.objectAdmin"
    )
    
    for role in "${sa_roles[@]}"; do
        gcloud projects add-iam-policy-binding ${PROJECT_ID} \
            --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
            --role="$role" \
            --quiet
    done
    check_status "Service account created"
else
    echo -e "${GREEN}✅ Service account already exists${NC}"
fi

# Step 6: Verify Agent Engine
echo -e "${YELLOW}Step 6: Verifying Agent Engine...${NC}"
if gcloud ai reasoning-engines describe ${AGENT_ENGINE_ID} \
    --location=${LOCATION} \
    --project=${PROJECT_ID} &>/dev/null; then
    echo -e "${GREEN}✅ Agent Engine verified${NC}"
else
    echo -e "${RED}⚠️  Agent Engine not found. You may need to redeploy.${NC}"
fi

# Step 7: Set up authentication
echo -e "${YELLOW}Step 7: Configuring authentication...${NC}"
gcloud auth application-default set-quota-project ${PROJECT_ID}
check_status "Authentication configured"

# Step 8: Create .env.gcp file
echo -e "${YELLOW}Step 8: Creating environment configuration...${NC}"
cat > .env.gcp << EOF
# GCP Configuration for VertexAI Session Service
# Generated on $(date)

# Core Configuration
GOOGLE_GENAI_USE_VERTEXAI=True
GOOGLE_CLOUD_PROJECT=${PROJECT_ID}
GOOGLE_CLOUD_LOCATION=${LOCATION}

# Agent Configuration
AGENT_NAME=${AGENT_NAME}
AGENT_ENGINE_ID=${AGENT_ENGINE_ID}
AGENT_ENGINE_RESOURCE_NAME=projects/245627026184/locations/${LOCATION}/reasoningEngines/${AGENT_ENGINE_ID}

# Storage Configuration
GOOGLE_CLOUD_STAGING_BUCKET=${STAGING_BUCKET}
GOOGLE_CLOUD_SESSION_BUCKET=${SESSION_BUCKET}
GOOGLE_CLOUD_ARTIFACT_BUCKET=${ARTIFACTS_BUCKET}

# Model Configuration
MODEL=gemini-2.5-flash

# Session Service Configuration
SESSION_SERVICE_TYPE=vertexai
SESSION_PERSISTENCE=true
SESSION_TIMEOUT_DAYS=30

# Service Account
SERVICE_ACCOUNT_EMAIL=${SERVICE_ACCOUNT_EMAIL}
EOF

check_status "Environment file created (.env.gcp)"

# Step 9: Create validation script
echo -e "${YELLOW}Step 9: Creating validation script...${NC}"
cat > validate_setup.py << 'EOF'
#!/usr/bin/env python3
"""Validate GCP setup for VertexAI Session Service."""

import os
import sys
from pathlib import Path

def load_env():
    """Load environment variables from .env.gcp"""
    env_file = Path(".env.gcp")
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value

def validate():
    load_env()
    
    print("🔍 Validating GCP Setup...\n")
    
    # Check required environment variables
    required = [
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_CLOUD_LOCATION", 
        "AGENT_ENGINE_ID",
        "GOOGLE_CLOUD_STAGING_BUCKET"
    ]
    
    all_good = True
    for var in required:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: NOT SET")
            all_good = False
    
    if not all_good:
        print("\n❌ Some variables are missing!")
        return False
    
    # Try to import required libraries
    print("\n📦 Checking Python dependencies...")
    try:
        import vertexai
        print("✅ vertexai package installed")
    except ImportError:
        print("❌ vertexai not installed. Run: pip install google-cloud-aiplatform[adk,agent_engines]")
        all_good = False
    
    try:
        from google.adk.sessions import VertexAiSessionService
        print("✅ ADK with VertexAI support installed")
    except ImportError:
        print("❌ ADK VertexAI support not installed. Run: pip install google-adk[vertexai]")
        all_good = False
    
    if all_good:
        print("\n✅ All checks passed! Your environment is ready.")
    else:
        print("\n⚠️ Please fix the issues above before proceeding.")
    
    return all_good

if __name__ == "__main__":
    success = validate()
    sys.exit(0 if success else 1)
EOF

chmod +x validate_setup.py
check_status "Validation script created"

# Step 10: Final summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Created Resources:${NC}"
echo -e "  • Enabled APIs: ${GREEN}✅${NC}"
echo -e "  • IAM Permissions: ${GREEN}✅${NC}"
echo -e "  • Staging Bucket: gs://${STAGING_BUCKET}"
echo -e "  • Session Bucket: gs://${SESSION_BUCKET}"
echo -e "  • Artifacts Bucket: gs://${ARTIFACTS_BUCKET}"
echo -e "  • Service Account: ${SERVICE_ACCOUNT_EMAIL}"
echo -e "  • Environment File: .env.gcp"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Review .env.gcp and merge with your existing .env"
echo -e "  2. Run: ${GREEN}python validate_setup.py${NC}"
echo -e "  3. Install dependencies: ${GREEN}pip install google-adk[vertexai]>=1.0.0${NC}"
echo -e "  4. Test with the implementation code in your notes folder"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo -e "  • Your Agent Engine ID: ${GREEN}${AGENT_ENGINE_ID}${NC}"
echo -e "  • Always use this ID as app_name in your code"
echo ""
