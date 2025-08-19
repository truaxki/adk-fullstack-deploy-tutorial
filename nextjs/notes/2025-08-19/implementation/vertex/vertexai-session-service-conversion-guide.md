# ADK App to VertexAI Session Service Conversion Guide

## Overview
This document provides comprehensive guidance for converting your existing ADK application to use `VertexAiSessionService` for persistent, managed session state.

**Date**: August 19, 2025  
**Current Implementation**: AgentEngineApp with potential in-memory session handling  
**Target Implementation**: VertexAiSessionService for persistent sessions

---

## Current App Analysis

Your application structure:
- **Main Engine**: `agent_engine_app.py` - AgentEngineApp extends AdkApp
- **Agent Definition**: `agent.py` - LlmAgent with BuiltInPlanner
- **Configuration**: `config.py` - Environment-based configuration
- **Deployment**: Already deployed to Vertex AI Agent Engine

### Key Findings:
1. Your `AgentEngineApp` class already extends `AdkApp`
2. You have GCS artifact service configured
3. Environment variables and project configuration are in place
4. The app is already deployed and functional

---

## VertexAI Session Service Benefits

### Why Convert?
1. **Persistent Sessions**: Data survives application restarts
2. **Scalability**: Managed by Google Cloud infrastructure
3. **Multi-turn Conversations**: Maintains context across interactions
4. **Production Ready**: Designed for enterprise applications
5. **Automatic Integration**: Works seamlessly with Agent Engine

---

## Implementation Steps

### Step 1: Update Your AgentEngineApp Class

Modify your `agent_engine_app.py` to include session service builder:

```python
from google.adk.sessions import VertexAiSessionService

class AgentEngineApp(AdkApp):
    """
    ADK Application wrapper for Agent Engine deployment.
    """
    
    def __init__(self, *args, **kwargs):
        # Add session service builder if not provided
        if 'session_service_builder' not in kwargs:
            kwargs['session_service_builder'] = self._create_session_service_builder()
        super().__init__(*args, **kwargs)
    
    @staticmethod
    def _create_session_service_builder():
        """Create VertexAI Session Service builder."""
        def session_service_builder():
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
            location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
            
            return VertexAiSessionService(
                project=project_id,
                location=location
            )
        return session_service_builder
```

### Step 2: Update the Deployment Function

In your `deploy_agent_engine_app()` function:

```python
def deploy_agent_engine_app() -> agent_engines.AgentEngine:
    # ... existing code ...
    
    # Step 6: Create the agent engine app with session service
    agent_engine = AgentEngineApp(
        agent=root_agent,
        artifact_service_builder=lambda: GcsArtifactService(
            bucket_name=artifacts_bucket_name
        ),
        # Session service will be automatically configured via __init__
    )
    
    # ... rest of deployment code ...
```

### Step 3: Handle App Name Correctly

**CRITICAL**: When using VertexAiSessionService, the `app_name` must be the Agent Engine resource ID or name.

After deployment, use:
```python
# Get the resource name from deployment
agent_engine_id = remote_agent.resource_name.split("/")[-1]
# OR full resource name
app_name = remote_agent.resource_name

# When creating sessions
session = await session_service.create_session(
    app_name=app_name,  # Must use the Agent Engine ID/name
    user_id="user_123",
    state={"initial_key": "value"}
)
```

---

## Known Issues and Solutions

### Issue 1: Coroutine Object Not Iterable (GitHub #808)
**Problem**: ADK 1.0.0 agents fail with "coroutine object is not iterable"  
**Solution**: Ensure you're using the latest ADK version (>= 1.0.0) and that async methods are properly awaited

### Issue 2: Custom Session ID Creation Failure (GitHub #987)
**Problem**: Unable to create sessions with user-defined session IDs  
**Solution**: Let the service auto-generate session IDs initially, or ensure your custom IDs follow the expected format

### Issue 3: GCS Artifact Service Incompatibility (GitHub #1436)
**Problem**: GCS artifact service crashes when used with VertexAI session service  
**Solution**: The blob naming convention differs between services. A fix is available in newer versions, or you can modify the `list_artifact_keys` method to handle variable blob name formats

### Issue 4: Default App Name Error (Forum Discussion)
**Problem**: "App name default-app-name is not valid" error  
**Solution**: Always use the actual Agent Engine resource ID as the app_name, not a custom string

---

## Best Practices

### 1. Session Management
```python
# Create sessions with proper app_name
session = await session_service.create_session(
    app_name=agent_engine_id,  # Use actual engine ID
    user_id=user_id,
    state=initial_state
)

# Resume sessions
existing_session = await session_service.get_session(
    app_name=agent_engine_id,
    user_id=user_id,
    session_id=session_id
)
```

### 2. State Management
- Use prefixes for state keys:
  - No prefix: Session-specific
  - `user:`: User-specific, across sessions
  - `app:`: Application-wide
  - `temp:`: Temporary, may not persist

```python
# Session-specific state
session.state['current_task'] = 'planning'

# User-specific state (persists across sessions)
session.state['user:preferences'] = {'theme': 'dark'}

# Application-wide state
session.state['app:version'] = '1.0.0'
```

### 3. Error Handling
```python
try:
    session = await session_service.create_session(
        app_name=agent_engine_id,
        user_id=user_id
    )
except Exception as e:
    # Fall back to in-memory if needed
    print(f"Failed to create VertexAI session: {e}")
    # Handle gracefully
```

---

## Testing Strategy

### Local Testing with VertexAI Sessions
```python
# For local testing with cloud sessions
from google.adk.sessions import VertexAiSessionService

# Initialize for local testing
session_service = VertexAiSessionService(
    project=config.project_id,
    location=config.location
)

# Create test runner
runner = adk.Runner(
    agent=root_agent,
    app_name=agent_engine_id,  # Must use deployed engine ID
    session_service=session_service
)
```

### Deployment Testing
1. Deploy with session service configured
2. Test session creation via API
3. Verify session persistence across restarts
4. Test multi-user scenarios

---

## Migration Checklist

- [ ] Update ADK to latest version (pip install google-adk[vertexai]>=1.0.0)
- [ ] Add session_service_builder to AgentEngineApp
- [ ] Update deployment configuration
- [ ] Test locally with VertexAI sessions
- [ ] Deploy to Agent Engine
- [ ] Verify session persistence
- [ ] Update app_name references to use engine ID
- [ ] Test session CRUD operations
- [ ] Verify artifact service compatibility
- [ ] Monitor for async/await issues

---

## Environment Variables Required

Add to your `.env` file:
```bash
# Existing variables
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_STAGING_BUCKET=your-staging-bucket
AGENT_NAME=your-agent-name

# After deployment, add:
AGENT_ENGINE_ID=<get-from-deployment-metadata>
```

---

## Monitoring and Debugging

### Check Session Creation
```python
# Log session creation
import logging
logger = logging.getLogger(__name__)

session = await session_service.create_session(
    app_name=agent_engine_id,
    user_id=user_id
)
logger.info(f"Created session: {session.id} for user: {user_id}")
```

### Verify Session Persistence
```python
# Create session and add state
session = await session_service.create_session(
    app_name=agent_engine_id,
    user_id="test_user",
    state={"test_key": "test_value"}
)

# Later, retrieve and verify
retrieved = await session_service.get_session(
    app_name=agent_engine_id,
    user_id="test_user",
    session_id=session.id
)
assert retrieved.state.get("test_key") == "test_value"
```

---

## Resources

- [Official ADK Session Documentation](https://google.github.io/adk-docs/sessions/session/)
- [Vertex AI Agent Engine Sessions Guide](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/sessions/manage-sessions-adk)
- [ADK GitHub Issues](https://github.com/google/adk-python/issues)
- [Agent Engine Deployment Guide](https://google.github.io/adk-docs/deploy/agent-engine/)

---

## Notes for Your Implementation

Since you already have a deployed agent:
1. You may need to redeploy after adding session service configuration
2. Save your current deployment metadata before making changes
3. Test thoroughly in a development environment first
4. Consider implementing a gradual rollout if this is production

The main advantage is that your sessions will persist across deployments and scale automatically with your application.
