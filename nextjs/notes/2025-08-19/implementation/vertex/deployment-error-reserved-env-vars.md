# Critical Deployment Error - Reserved Environment Variables

**Date**: August 19, 2025  
**Error Encountered**: `FailedPrecondition: 400 Environment variable name 'GOOGLE_CLOUD_PROJECT' is reserved`

## Issue Summary

When deploying to Vertex AI Agent Engine, certain environment variable names are **reserved** and cannot be set in the deployment configuration. These variables are automatically set by the platform.

## Error Details

```
google.api_core.exceptions.FailedPrecondition: 400 Environment variable name 'GOOGLE_CLOUD_PROJECT' is reserved. 
Please rename the variable in `spec.deployment_spec.env`.
```

## Reserved Environment Variables

The following environment variables are **RESERVED** by Vertex AI and must NOT be set in `env_vars`:

1. **`GOOGLE_CLOUD_PROJECT`** - Automatically set to the project ID
2. **`GOOGLE_CLOUD_LOCATION`** - Automatically set to the deployment region
3. **`GOOGLE_APPLICATION_CREDENTIALS`** - Managed by the platform
4. **`GCLOUD_PROJECT`** - Legacy project variable
5. **`GCP_PROJECT`** - Alternative project variable

## ❌ INCORRECT Code (Will Fail)

```python
# This will cause deployment to fail
env_vars = {
    "SESSION_SERVICE_TYPE": "vertexai",
    "GOOGLE_CLOUD_PROJECT": deployment_config.project,  # ❌ RESERVED!
    "GOOGLE_CLOUD_LOCATION": deployment_config.location,  # ❌ RESERVED!
}
```

## ✅ CORRECT Code (Fixed)

```python
# Only set non-reserved environment variables
env_vars = {
    "SESSION_SERVICE_TYPE": "vertexai",
    # GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION are set automatically
}
```

## How Vertex AI Handles These Variables

When your agent is deployed to Vertex AI Agent Engine:

1. **Automatic Injection**: The platform automatically injects these environment variables:
   - `GOOGLE_CLOUD_PROJECT` = Your project ID
   - `GOOGLE_CLOUD_LOCATION` = Deployment region
   - `GOOGLE_APPLICATION_CREDENTIALS` = Path to service account credentials

2. **Access in Code**: Your code can still access these variables:
   ```python
   import os
   
   # These will work inside the deployed agent
   project = os.environ.get("GOOGLE_CLOUD_PROJECT")  # ✅ Available
   location = os.environ.get("GOOGLE_CLOUD_LOCATION")  # ✅ Available
   ```

3. **Session Service Builder**: The session service builder can use them:
   ```python
   def session_service_builder():
       # These are available at runtime
       project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
       location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
       
       return VertexAiSessionService(
           project=project_id,
           location=location
       )
   ```

## Fix Applied

The `agent_engine_app.py` file has been updated to remove the reserved variables from the deployment configuration:

```python
# Step 2: Set up environment variables for the deployed agent
env_vars = {}

# Configure worker parallelism
env_vars["NUM_WORKERS"] = "1"

# Add session service configuration
env_vars["SESSION_SERVICE_TYPE"] = "vertexai"
# NOTE: GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION are reserved and set automatically
# by Vertex AI, so we don't set them here
```

## Implications for VertexAI Session Service

The VertexAI Session Service will still work correctly because:

1. The reserved variables are available at runtime
2. The session service builder reads them from the environment
3. No code changes needed in the session service initialization

## Alternative Variable Names

If you need to pass project/location info for other purposes, use different names:

```python
env_vars = {
    "SESSION_SERVICE_TYPE": "vertexai",
    "APP_PROJECT_ID": deployment_config.project,  # ✅ Custom name
    "APP_LOCATION": deployment_config.location,    # ✅ Custom name
}
```

## Lesson Learned

**Always check the Vertex AI documentation for reserved environment variables before deployment.**

The error message is clear but only appears during deployment, making it a late-stage discovery. This is now documented for future reference.

## References

- [Vertex AI Agent Engine Environment Variables](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/manage-agent#environment-variables)
- [ADK Deployment Guide](https://google.github.io/adk-docs/deploy/agent-engine/)
- Error encountered during deployment on 2025-08-19

---

**Status**: ✅ FIXED  
**Solution**: Removed reserved environment variables from deployment configuration  
**Impact**: No functional impact - variables are still available at runtime
