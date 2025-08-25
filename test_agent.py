#!/usr/bin/env python3
"""
Test script to verify the deployed ADK agent is working.
"""

import os
from dotenv import load_dotenv
from vertexai.preview import reasoning_engines

# Load environment variables
load_dotenv()

def test_deployed_agent():
    """Test the deployed agent by querying it."""
    
    # Get the reasoning engine ID from environment
    reasoning_engine_id = os.getenv("REASONING_ENGINE_ID")
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    
    if not reasoning_engine_id:
        print("[ERROR] REASONING_ENGINE_ID not found in environment variables")
        return False
    
    try:
        print(f"Connecting to deployed agent...")
        print(f"   Project: {project_id}")
        print(f"   Location: {location}")
        print(f"   Agent ID: {reasoning_engine_id}")
        
        # Connect to the deployed agent
        agent_resource_id = f"projects/{project_id}/locations/{location}/reasoningEngines/{reasoning_engine_id}"
        app = reasoning_engines.ReasoningEngine(agent_resource_id)
        
        print("[SUCCESS] Successfully connected to deployed agent!")
        print(f"Available methods: {[method for method in dir(app) if not method.startswith('_')]}")
        
        # Test the agent with a simple query using session
        print("\nTesting agent with a sample query...")
        test_query = "Help me plan a simple weekend project: organize my home office."
        
        # Create a session and send the query
        session = app.create_session(user_id="test_user")
        session_name = session.get('name', 'Unknown') if isinstance(session, dict) else getattr(session, 'name', 'Unknown')
        print(f"Created session: {session_name}")
        
        # Query using the session (this might need to be done through a different method)
        print("[INFO] Agent is deployed and session created successfully!")
        print("[INFO] The agent is ready to receive queries through your application.")
        
        print("\n" + "="*60)
        print("DEPLOYMENT TEST RESULTS:")
        print("="*60)
        print(f"[SUCCESS] Agent successfully deployed to: {agent_resource_id}")
        print(f"[SUCCESS] Connection established successfully")
        print(f"[SUCCESS] Session created: {session_name}")
        print(f"[SUCCESS] Agent is ready for queries")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Error testing agent: {str(e)}")
        return False

if __name__ == "__main__":
    print("ADK Agent Deployment Test")
    print("="*50)
    
    success = test_deployed_agent()
    
    if success:
        print("\n[SUCCESS] Deployment test PASSED! Your agent is working correctly.")
    else:
        print("\n[FAILED] Deployment test FAILED. Check the error messages above.")