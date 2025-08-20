# Vertex AI Agent Engine Session Persistence Verification Guide

**Last Updated**: August 19, 2025  
**API Version**: v1beta1  
**Resource Type**: `reasoningEngines` (formerly Reasoning Engine, now Agent Engine)

## Important Terminology Update

The name of Vertex AI Agent Engine changed over time, the name of the resource in the API reference is ReasoningEngine to maintain backwards compatibility.

- **API Resource Name**: `reasoningEngines` (plural, lowercase 'r')
- **Console Name**: Vertex AI Agent Engine
- **Previous Name**: Reasoning Engine / LangChain on Vertex AI

## Session Persistence Overview

A session represents the chronological sequence of messages and actions (events) for a single, ongoing interaction between a user and your agent system. When an AdkApp is deployed to Agent Engine, it automatically uses VertexAiSessionService for persistent, managed session state. This provides multi-turn conversational memory without any additional configuration.

## Verification Methods

### Method 1: Google Cloud Console (Web GUI)

#### 1.1 Navigate to Agent Engine
```
https://console.cloud.google.com/vertex-ai/reasoning-engines?project=YOUR_PROJECT_ID
```

#### 1.2 Verify Agent Status
- Look for your agent (e.g., "astra")
- Status should show "Ready" or "Active"
- Note the Engine ID (e.g., `5717733143318888448`)

#### 1.3 Test Session Persistence in Console

**Test 1: Create Session with Initial Data**
- Session ID: `console-test-001`
- Query: "My name is Alice and I work as a teacher"
- Expected: Agent acknowledges the information

**Test 2: Verify Persistence (Same Session)**
- Use same Session ID: `console-test-001`
- Query: "What's my profession?"
- Expected: Agent should respond with "teacher"

**Test 3: Test Session Isolation (Different Session)**
- Use new Session ID: `console-test-002`
- Query: "What's my name?"
- Expected: Agent should NOT know "Alice"

### Method 2: Command Line Verification

#### 2.1 Correct gcloud Commands

**Check Agent Status:**
```bash
# Note: There is no "gcloud ai reasoning-engines" command
# The resource exists in the API but not as a direct gcloud command

# Use API calls instead via curl
curl -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1beta1/projects/YOUR_PROJECT_ID/locations/us-central1/reasoningEngines/YOUR_ENGINE_ID"
```

#### 2.2 Query Agent with Session

POST https://LOCATION-aiplatform.googleapis.com/v1beta1/projects/PROJECT_ID/locations/LOCATION/reasoningEngines/REASONING_ENGINE_ID:query

```bash
# Create a test query with session
cat > session_test.json << EOF
{
  "input": {
    "prompt": "Remember my favorite color is blue"
  },
  "config": {
    "session_id": "cli-test-session-001"
  }
}
EOF

# Send the query
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @session_test.json \
  "https://us-central1-aiplatform.googleapis.com/v1beta1/projects/YOUR_PROJECT_ID/locations/us-central1/reasoningEngines/YOUR_ENGINE_ID:query"

# Verify persistence with follow-up query
cat > session_verify.json << EOF
{
  "input": {
    "prompt": "What's my favorite color?"
  },
  "config": {
    "session_id": "cli-test-session-001"
  }
}
EOF

curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @session_verify.json \
  "https://us-central1-aiplatform.googleapis.com/v1beta1/projects/YOUR_PROJECT_ID/locations/us-central1/reasoningEngines/YOUR_ENGINE_ID:query"
```

### Method 3: Direct API Calls for Session Management

GET https://LOCATION-aiplatform.googleapis.com/v1beta1/projects/PROJECT_ID/locations/LOCATION/reasoningEngines/AGENT_ENGINE_ID/sessions

#### 3.1 List All Sessions
```bash
curl -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1beta1/projects/YOUR_PROJECT_ID/locations/us-central1/reasoningEngines/YOUR_ENGINE_ID/sessions"
```

#### 3.2 Get Specific Session
```bash
curl -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1beta1/projects/YOUR_PROJECT_ID/locations/us-central1/reasoningEngines/YOUR_ENGINE_ID/sessions/SESSION_ID"
```

### Method 4: Python SDK Verification

```python
import vertexai
from vertexai.preview import reasoning_engines

# Initialize
vertexai.init(project="YOUR_PROJECT_ID", location="us-central1")

# Get your deployed agent
agent = reasoning_engines.ReasoningEngine("YOUR_ENGINE_ID")

# Test 1: Create session with data
response1 = agent.query(
    prompt="My name is Bob and I like hiking",
    config={"session_id": "python-test-001"}
)
print("First interaction:", response1)

# Test 2: Verify persistence
response2 = agent.query(
    prompt="What's my name and what do I like?",
    config={"session_id": "python-test-001"}
)
print("Persistence check:", response2)

# Test 3: Different session (isolation)
response3 = agent.query(
    prompt="What's my name?",
    config={"session_id": "python-test-002"}
)
print("Isolation check:", response3)
```

### Method 5: Check Storage Buckets

Sessions are stored in Google Cloud Storage. Check for session data:

```bash
# List session bucket contents
gsutil ls -r gs://YOUR_PROJECT_ID-AGENT_NAME-sessions/

# Example for your setup:
gsutil ls -r gs://agentlocker-466121-astra-sessions/
```

### Method 6: Cloud Logging Verification

```bash
# View session-related logs
gcloud logging read \
  "resource.type=aiplatform.googleapis.com/ReasoningEngine \
  AND resource.labels.reasoning_engine_id=YOUR_ENGINE_ID \
  AND jsonPayload.session_id!=''" \
  --limit=10 \
  --format=json
```

## Expected Results for Persistent Sessions

### ✅ Sessions ARE Persistent When:

1. **Cross-Query Memory**: Agent remembers information from earlier in the same session
2. **Session Retrieval**: Can retrieve session data after creating it
3. **Persistence After Time**: Session data remains available hours/days later
4. **Cross-Instance**: New service instances can access existing sessions
5. **Storage Evidence**: Session files appear in GCS buckets

### ❌ Sessions NOT Working When:

1. Agent doesn't remember information within same session_id
2. Session retrieval returns empty or not found
3. Different session_ids share information (isolation failure)
4. Sessions disappear after short time periods

## Troubleshooting

### Common Issues:

1. **"reasoningEngines not found"**: The resource exists in API but not as a direct gcloud command
2. **Session not persisting**: Ensure you're using the agent_engine_id, not "default-app-name"
3. **403 Forbidden**: Check IAM permissions for reasoning engine access
4. **Empty session list**: Sessions may take a moment to propagate

### Required IAM Roles:
- `roles/aiplatform.user`
- `roles/storage.objectViewer` (for bucket inspection)
- `roles/logging.viewer` (for log inspection)

## Key Configuration Points

Initialize the Runner with VertexAiSessionService, which connects with Vertex AI Agent Engine Sessions.

For ADK deployments:
- Session service is automatic when deployed to Agent Engine
- Use agent_engine_id as app_name (critical!)
- Sessions persist in Vertex AI managed storage
- No additional configuration needed

## References

- [Agent Engine API Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/reasoning-engine)
- [Sessions Overview](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/sessions/overview)
- [Managing Sessions with ADK](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/sessions/manage-sessions-adk)
- [Direct API Session Management](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/sessions/manage-sessions-api)

---

**Note**: The API uses `reasoningEngines` (plural, camelCase) in endpoints, while documentation may refer to "Reasoning Engine" or "Agent Engine" for backwards compatibility.
