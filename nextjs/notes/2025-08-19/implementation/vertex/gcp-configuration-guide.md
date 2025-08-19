# GCP Configuration Guide for VertexAI Session Service

## Your Current Environment Details

**Project ID**: `agentlocker-466121`  
**Location**: `us-central1`  
**Agent Name**: `astra`  
**Agent Engine ID**: `5717733143318888448`  
**Full Resource Name**: `projects/245627026184/locations/us-central1/reasoningEngines/5717733143318888448`

---

## Step 1: Enable Required APIs

Run these commands in Google Cloud Shell or your local terminal with gcloud CLI:

```bash
# Set your project
gcloud config set project agentlocker-466121

# Enable required APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable iam.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled | grep -E "(aiplatform|storage|cloudbuild|artifactregistry)"
```

---

## Step 2: Set Up IAM Permissions

### For Your User Account

```bash
# Get your current user email
USER_EMAIL=$(gcloud config get-value account)

# Grant necessary roles for development
gcloud projects add-iam-policy-binding agentlocker-466121 \
    --member="user:${USER_EMAIL}" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding agentlocker-466121 \
    --member="user:${USER_EMAIL}" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding agentlocker-466121 \
    --member="user:${USER_EMAIL}" \
    --role="roles/iam.serviceAccountUser"
```

### For Service Account (if using one)

```bash
# Create a service account for the agent
gcloud iam service-accounts create astra-agent-sa \
    --display-name="Astra Agent Service Account" \
    --project=agentlocker-466121

# Grant necessary roles
gcloud projects add-iam-policy-binding agentlocker-466121 \
    --member="serviceAccount:astra-agent-sa@agentlocker-466121.iam.gserviceaccount.com" \
    --role="roles/aiplatform.serviceAgent"

gcloud projects add-iam-policy-binding agentlocker-466121 \
    --member="serviceAccount:astra-agent-sa@agentlocker-466121.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"
```

---

## Step 3: Configure Storage Buckets

### Create/Verify Staging Bucket

```bash
# Create staging bucket if it doesn't exist
gsutil mb -p agentlocker-466121 -l us-central1 gs://agentlocker-agent-staging/

# Set lifecycle policy to clean up old files (optional)
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 30,
          "matchesPrefix": ["staging/"]
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://agentlocker-agent-staging/
```

### Create Session Storage Bucket

```bash
# Create a dedicated bucket for session data
gsutil mb -p agentlocker-466121 -l us-central1 gs://agentlocker-466121-astra-sessions/

# Set appropriate permissions
gsutil iam ch allUsers:objectViewer gs://agentlocker-466121-astra-sessions/

# Enable versioning for data safety
gsutil versioning set on gs://agentlocker-466121-astra-sessions/
```

---

## Step 4: Configure Vertex AI Agent Engine

### Verify Your Agent Engine

```bash
# Check your agent engine status
gcloud ai reasoning-engines describe 5717733143318888448 \
    --location=us-central1 \
    --project=agentlocker-466121
```

### Update Agent Engine Configuration

```bash
# Update the agent to ensure session service is configured
gcloud ai reasoning-engines update 5717733143318888448 \
    --location=us-central1 \
    --project=agentlocker-466121 \
    --display-name="astra" \
    --description="Research agent with persistent sessions"
```

---

## Step 5: Set Up Authentication

### Local Development Authentication

```bash
# Authenticate your local environment
gcloud auth application-default login

# Set application default project
gcloud config set project agentlocker-466121

# Verify authentication
gcloud auth application-default print-access-token
```

### Create API Key (Optional)

```bash
# Create an API key for your project
gcloud services api-keys create --display-name="astra-agent-key" \
    --project=agentlocker-466121

# List API keys
gcloud services api-keys list --project=agentlocker-466121
```

---

## Step 6: Configure Firewall Rules (if needed)

```bash
# Allow HTTPS traffic for agent endpoints
gcloud compute firewall-rules create allow-agent-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --target-tags agent-engine \
    --project=agentlocker-466121
```

---

## Step 7: Set Up Monitoring and Logging

### Enable Monitoring

```bash
# Enable monitoring APIs
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com

# Create a monitoring dashboard
gcloud monitoring dashboards create \
    --config-from-file=- <<EOF
{
  "displayName": "Astra Agent Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Session Creation Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"aiplatform.googleapis.com/ReasoningEngine\" resource.labels.reasoning_engine_id=\"5717733143318888448\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF
```

### Set Up Log Sink for Sessions

```bash
# Create a log sink for session events
gcloud logging sinks create astra-session-sink \
    storage.googleapis.com/agentlocker-466121-astra-sessions/logs \
    --log-filter='resource.type="aiplatform.googleapis.com/ReasoningEngine" 
    AND resource.labels.reasoning_engine_id="5717733143318888448"
    AND jsonPayload.session_id!=""' \
    --project=agentlocker-466121
```

---

## Step 8: Configure Quotas and Limits

### Check Current Quotas

```bash
# Check Vertex AI quotas
gcloud compute project-info describe --project=agentlocker-466121 \
    | grep -A 10 "quotas"

# Check specific quota for reasoning engines
gcloud ai-platform operations list --region=us-central1 \
    --filter="metadata.@type:*ReasoningEngine*"
```

### Request Quota Increase (if needed)

1. Go to [Cloud Console Quotas](https://console.cloud.google.com/iam-admin/quotas?project=agentlocker-466121)
2. Filter for "Vertex AI"
3. Select relevant quotas:
   - Reasoning Engine requests per minute
   - Concurrent sessions
   - Storage capacity
4. Click "Edit Quotas" and submit request

---

## Step 9: Environment Configuration Updates

Update your `.env` file with the complete configuration:

```bash
# Core Configuration
GOOGLE_GENAI_USE_VERTEXAI=True
GOOGLE_CLOUD_PROJECT=agentlocker-466121
GOOGLE_CLOUD_LOCATION=us-central1

# Agent Configuration
AGENT_NAME=astra
AGENT_ENGINE_ID=5717733143318888448
AGENT_ENGINE_RESOURCE_NAME=projects/245627026184/locations/us-central1/reasoningEngines/5717733143318888448

# Storage Configuration
GOOGLE_CLOUD_STAGING_BUCKET=agentlocker-agent-staging
GOOGLE_CLOUD_SESSION_BUCKET=agentlocker-466121-astra-sessions
GOOGLE_CLOUD_ARTIFACT_BUCKET=agentlocker-466121-astra-logs-data

# Model Configuration
MODEL=gemini-2.5-flash

# Session Service Configuration
SESSION_SERVICE_TYPE=vertexai
SESSION_PERSISTENCE=true
SESSION_TIMEOUT_DAYS=30

# Optional: Service Account (if using)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

---

## Step 10: Validate Configuration

Create and run this validation script:

```python
# validation.py
import os
import sys
from google.cloud import aiplatform
from google.cloud import storage
import vertexai

def validate_gcp_config():
    """Validate GCP configuration for VertexAI Session Service."""
    
    print("🔍 Validating GCP Configuration...\n")
    
    # Check environment variables
    required_vars = [
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_CLOUD_LOCATION",
        "AGENT_ENGINE_ID"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
            print(f"❌ Missing: {var}")
        else:
            print(f"✅ {var}: {os.getenv(var)}")
    
    if missing_vars:
        print(f"\n⚠️ Please set missing environment variables")
        return False
    
    print("\n📡 Testing GCP Connectivity...")
    
    try:
        # Initialize Vertex AI
        vertexai.init(
            project=os.getenv("GOOGLE_CLOUD_PROJECT"),
            location=os.getenv("GOOGLE_CLOUD_LOCATION")
        )
        print("✅ Vertex AI initialized successfully")
        
        # Check storage access
        storage_client = storage.Client()
        staging_bucket = os.getenv("GOOGLE_CLOUD_STAGING_BUCKET")
        
        if staging_bucket:
            bucket = storage_client.bucket(staging_bucket)
            if bucket.exists():
                print(f"✅ Staging bucket accessible: {staging_bucket}")
            else:
                print(f"⚠️ Staging bucket not found: {staging_bucket}")
        
        # Check Agent Engine
        from vertexai import agent_engines
        engine_id = os.getenv("AGENT_ENGINE_ID")
        
        try:
            engine = agent_engines.get(engine_id)
            print(f"✅ Agent Engine accessible: {engine_id}")
            print(f"   Display Name: {engine.display_name}")
        except Exception as e:
            print(f"❌ Cannot access Agent Engine: {e}")
            return False
        
        print("\n✅ All validations passed! Your GCP environment is configured correctly.")
        return True
        
    except Exception as e:
        print(f"\n❌ Configuration error: {e}")
        return False

if __name__ == "__main__":
    success = validate_gcp_config()
    sys.exit(0 if success else 1)
```

Run the validation:

```bash
python validation.py
```

---

## Troubleshooting Common Issues

### Issue 1: Permission Denied

```bash
# Check your current permissions
gcloud projects get-iam-policy agentlocker-466121 \
    --flatten="bindings[].members" \
    --format='table(bindings.role)' \
    --filter="bindings.members:$(gcloud config get-value account)"
```

### Issue 2: API Not Enabled

```bash
# Enable specific API if missing
gcloud services enable <service-name>.googleapis.com
```

### Issue 3: Quota Exceeded

```bash
# Check quota usage
gcloud compute project-info describe --project=agentlocker-466121
```

### Issue 4: Authentication Issues

```bash
# Re-authenticate
gcloud auth application-default login --project=agentlocker-466121

# Clear and reset credentials
gcloud auth application-default revoke
gcloud auth application-default login
```

---

## Next Steps

1. ✅ Run all configuration commands above
2. ✅ Update your `.env` file with new variables
3. ✅ Run the validation script
4. ✅ Test session creation with your deployed agent
5. ✅ Monitor logs and metrics in Cloud Console

Your agent "astra" is already deployed and ready. These configurations will ensure optimal operation with VertexAI Session Service.
