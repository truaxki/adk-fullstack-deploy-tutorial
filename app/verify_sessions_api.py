"""
Simple verification script for VertexAI Session Service
Uses the correct SDK methods for interacting with deployed agents.
"""

import json
import os
from pathlib import Path
from google.cloud import aiplatform
import requests

# Load environment variables
from dotenv import load_dotenv
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

def verify_session_with_api():
    """Verify sessions using direct API calls."""
    
    print("🔍 Verifying VertexAI Session Storage with API")
    print("=" * 50)
    
    # 1. Get deployment metadata
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
        print("❌ No deployment metadata found. Deploy first!")
        return
    
    with open(metadata_file) as f:
        metadata = json.load(f)
    
    agent_engine_id = metadata.get("agent_engine_id")
    project = metadata.get("project")
    location = metadata.get("location")
    
    print(f"📋 Agent Engine ID: {agent_engine_id}")
    print(f"📋 Project: {project}")
    print(f"📋 Location: {location}")
    
    # 2. Get access token
    try:
        import subprocess
        result = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            capture_output=True,
            text=True,
            check=True
        )
        access_token = result.stdout.strip()
        print("✅ Got access token")
    except Exception as e:
        print(f"❌ Failed to get access token: {e}")
        print("   Run: gcloud auth application-default login")
        return
    
    # 3. Test session with API calls
    base_url = f"https://{location}-aiplatform.googleapis.com/v1beta1"
    engine_path = f"projects/{project}/locations/{location}/reasoningEngines/{agent_engine_id}"
    query_url = f"{base_url}/{engine_path}:query"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print("\n🧪 Testing Session Creation...")
    
    # First interaction
    request1 = {
        "input": {
            "prompt": "Remember that my name is TestUser and I like gardening."
        },
        "config": {
            "session_id": "api_test_session_001"
        }
    }
    
    try:
        response1 = requests.post(query_url, headers=headers, json=request1)
        if response1.status_code == 200:
            print("✅ First interaction successful")
            result1 = response1.json()
            print(f"   Response preview: {str(result1)[:200]}...")
        else:
            print(f"❌ First interaction failed: {response1.status_code}")
            print(f"   Error: {response1.text[:500]}")
            return
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return
    
    # Second interaction - test persistence
    print("\n🧪 Testing Session Persistence...")
    
    request2 = {
        "input": {
            "prompt": "What did I just tell you my name was and what do I like?"
        },
        "config": {
            "session_id": "api_test_session_001"  # Same session ID
        }
    }
    
    try:
        response2 = requests.post(query_url, headers=headers, json=request2)
        if response2.status_code == 200:
            result2 = response2.json()
            response_text = json.dumps(result2)
            
            # Check if the agent remembers
            if "TestUser" in response_text or "gardening" in response_text:
                print("✅ SESSION IS WORKING! Agent remembered the information")
                # Try to extract the actual response
                if "output" in result2:
                    print(f"   Response: {str(result2['output'])[:300]}...")
                else:
                    print(f"   Full response: {response_text[:300]}...")
            else:
                print("⚠️  Agent may not be using sessions properly")
                print(f"   Response: {response_text[:300]}...")
        else:
            print(f"❌ Second interaction failed: {response2.status_code}")
            print(f"   Error: {response2.text[:500]}")
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    # Third interaction - test isolation
    print("\n🧪 Testing Session Isolation...")
    
    request3 = {
        "input": {
            "prompt": "What's my name?"
        },
        "config": {
            "session_id": "api_test_session_002"  # Different session ID
        }
    }
    
    try:
        response3 = requests.post(query_url, headers=headers, json=request3)
        if response3.status_code == 200:
            result3 = response3.json()
            response_text = json.dumps(result3)
            
            if "TestUser" not in response_text:
                print("✅ Session isolation working! Different session doesn't have the data")
            else:
                print("⚠️  Check session isolation - found data from other session")
                print(f"   Response: {response_text[:300]}...")
        else:
            print(f"❌ Third interaction failed: {response3.status_code}")
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    print("\n" + "=" * 50)
    print("✅ VERIFICATION COMPLETE!")
    print("\nIf sessions are working correctly:")
    print("1. ✅ Agent remembers information within same session_id")
    print("2. ✅ Different session_ids don't share information")
    print("3. ✅ Your VertexAI Session Service is properly configured!")

if __name__ == "__main__":
    verify_session_with_api()
