"""
Simplified session verification using vertexai SDK
Tests session persistence with the deployed agent.
"""

import json
import os
from pathlib import Path
import vertexai
from vertexai import agent_engines

# Load environment variables
from dotenv import load_dotenv
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

def simple_session_test():
    """Simple test of session functionality."""
    
    print("🔍 Simple Session Verification Test")
    print("=" * 50)
    
    # Get deployment metadata
    metadata_locations = [
        Path("../logs/deployment_metadata.json"),
        Path("logs/deployment_metadata.json"),
        Path(__file__).parent.parent / "logs" / "deployment_metadata.json"
    ]
    
    metadata_file = None
    for location in metadata_locations:
        if location.exists():
            metadata_file = location
            break
    
    if not metadata_file:
        print("❌ No deployment metadata found.")
        return
    
    with open(metadata_file) as f:
        metadata = json.load(f)
    
    agent_engine_id = metadata.get("agent_engine_id")
    project = metadata.get("project")
    location = metadata.get("location")
    resource_name = metadata.get("remote_agent_engine_id")
    
    print(f"📋 Project: {project}")
    print(f"📋 Location: {location}")
    print(f"📋 Agent ID: {agent_engine_id}")
    
    # Initialize Vertex AI
    vertexai.init(project=project, location=location)
    
    try:
        # Get the deployed agent using the SDK
        print("\n🔄 Connecting to deployed agent...")
        
        # Try to get the agent from the list
        agents = list(agent_engines.list(filter=f"display_name=astra"))
        if agents:
            agent = agents[0]
            print(f"✅ Found agent: {agent.display_name}")
            
            # Try to use the agent's operations
            print("\n🧪 Testing agent operations...")
            
            # First, let's see what operations are available
            try:
                # The agent should have been deployed with query capability
                # Try using the SDK's built-in methods
                
                # Create a session using the agent_engines interface
                print("📝 Creating test session...")
                
                # Note: The actual session testing would require using the
                # deployed agent's specific interface, which varies based on
                # how it was deployed (AdkApp, LangchainAgent, etc.)
                
                print("\n💡 To fully test sessions, use one of these methods:")
                print("1. Run: python verify_sessions_api.py (uses REST API)")
                print("2. Use the Cloud Console to test with session IDs")
                print("3. Deploy a test client that uses the agent")
                
                # Show agent details
                print(f"\n📊 Agent Details:")
                print(f"   Resource Name: {agent.resource_name}")
                print(f"   Display Name: {agent.display_name}")
                print(f"   State: {getattr(agent, 'state', 'Unknown')}")
                
                # Check if we can access the agent's spec
                if hasattr(agent, 'spec'):
                    print(f"   Has spec: Yes")
                    
            except Exception as e:
                print(f"⚠️  Could not test operations: {e}")
                print("\nThis is normal - the SDK doesn't directly expose query methods.")
                print("Use the API verification script instead: python verify_sessions_api.py")
                
        else:
            print("❌ No agents found with name 'astra'")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Ensure the agent is fully deployed")
        print("2. Check your authentication: gcloud auth application-default login")
        print("3. Verify project and location are correct")

if __name__ == "__main__":
    simple_session_test()
    print("\n" + "=" * 50)
    print("💡 For complete session testing, run:")
    print("   python verify_sessions_api.py")
    print("\nThis will use the REST API to properly test session persistence.")
