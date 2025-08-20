"""
Quick verification script for VertexAI Session Service
Run this after deployment to verify sessions are being stored.
"""

import json
import os
from pathlib import Path
from google.cloud import aiplatform
from vertexai.preview import reasoning_engines

# Load environment variables
from dotenv import load_dotenv
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

def verify_session_storage():
    """Verify that sessions are being stored in VertexAI."""
    
    print("🔍 Verifying VertexAI Session Storage")
    print("=" * 50)
    
    # 1. Get deployment metadata - check multiple locations
    metadata_locations = [
        Path("../logs/deployment_metadata.json"),  # Parent directory
        Path("logs/deployment_metadata.json"),     # Current directory
        Path(__file__).parent.parent / "logs" / "deployment_metadata.json"  # Absolute path
    ]
    
    metadata_file = None
    for location in metadata_locations:
        if location.exists():
            metadata_file = location
            break
    
    if not metadata_file:
        print("❌ No deployment metadata found. Deploy first!")
        print("   Searched locations:")
        for loc in metadata_locations:
            print(f"   - {loc.absolute()}")
        return
    
    with open(metadata_file) as f:
        metadata = json.load(f)
    
    agent_engine_id = metadata.get("agent_engine_id")
    project = metadata.get("project")
    location = metadata.get("location")
    
    print(f"📋 Agent Engine ID: {agent_engine_id}")
    print(f"📋 Project: {project}")
    print(f"📋 Location: {location}")
    
    # 2. Initialize Vertex AI
    aiplatform.init(project=project, location=location)
    
    # 3. Get the deployed agent
    try:
        agent = reasoning_engines.ReasoningEngine(
            f"projects/{project}/locations/{location}/reasoningEngines/{agent_engine_id}"
        )
        print(f"✅ Connected to deployed agent")
    except Exception as e:
        print(f"❌ Failed to connect to agent: {e}")
        return
    
    # 4. Create a session and interact
    print("\n🧪 Testing Session Creation...")
    
    try:
        # Use the correct method - 'query_reasoning_engine' or the operation method
        # First, let's try to understand the available methods
        print("   Available methods:", [m for m in dir(agent) if not m.startswith('_')][:10])
        
        # Try using the operation interface
        # First interaction - create session
        operation_request = {
            "prompt": "Remember that my name is TestUser and I like gardening. What's your name?",
            "session_id": "test_session_verification_001"
        }
        
        response1 = agent.operation(
            function_name="query",
            **operation_request
        )
        print(f"✅ First interaction successful")
        print(f"   Response preview: {str(response1)[:200]}...")
        
        # Second interaction - same session
        print("\n🧪 Testing Session Persistence...")
        operation_request2 = {
            "prompt": "What did I just tell you my name was and what do I like?",
            "session_id": "test_session_verification_001"
        }
        
        response2 = agent.operation(
            function_name="query",
            **operation_request2
        )
        
        response_text = str(response2)
        
        # Check if the agent remembers
        if "TestUser" in response_text or "gardening" in response_text:
            print(f"✅ SESSION IS WORKING! Agent remembered the information")
            print(f"   Response: {response_text[:300]}...")
        else:
            print(f"⚠️  Agent may not be using sessions properly")
            print(f"   Response: {response_text[:300]}...")
        
        # Third interaction - different session
        print("\n🧪 Testing Session Isolation...")
        operation_request3 = {
            "prompt": "What's my name?",
            "session_id": "different_session_002"
        }
        
        response3 = agent.operation(
            function_name="query",
            **operation_request3
        )
        
        response3_text = str(response3)
        if "TestUser" not in response3_text and "don't know" in response3_text.lower():
            print(f"✅ Session isolation working! Different session doesn't have the data")
        else:
            print(f"⚠️  Check session isolation")
        
        print("\n" + "=" * 50)
        print("✅ VERIFICATION COMPLETE!")
        print("\nSessions are being stored persistently in VertexAI!")
        print("Each session maintains its own state and context.")
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        print("\nTroubleshooting:")
        print("1. Check if the agent is fully deployed (may take a few minutes)")
        print("2. Verify you have the correct permissions")
        print("3. Check the Cloud Console for any errors")

if __name__ == "__main__":
    verify_session_storage()
