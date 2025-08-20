"""
Session Content Inspector - View what's stored in sessions
This script retrieves and displays the actual content of sessions.
"""

import json
import subprocess
from pathlib import Path
from datetime import datetime
import requests

def get_access_token():
    """Get GCP access token."""
    result = subprocess.run(
        ["gcloud", "auth", "print-access-token"],
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout.strip()

def inspect_sessions():
    """Inspect session content from your Agent Engine."""
    
    print("🔍 Session Content Inspector")
    print("=" * 60)
    
    # Configuration
    project = "agentlocker-466121"
    location = "us-central1"
    agent_engine_id = "5717733143318888448"
    
    # Get access token
    try:
        token = get_access_token()
        print("✅ Authentication successful")
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Base URL for API calls
    base_url = f"https://{location}-aiplatform.googleapis.com/v1beta1"
    engine_path = f"projects/{project}/locations/{location}/reasoningEngines/{agent_engine_id}"
    
    # 1. List all sessions
    print("\n📋 Fetching sessions...")
    list_url = f"{base_url}/{engine_path}/sessions"
    
    try:
        response = requests.get(list_url, headers=headers)
        if response.status_code == 200:
            sessions_data = response.json()
            sessions = sessions_data.get("sessions", [])
            
            if not sessions:
                print("No sessions found. The listing might require different parameters.")
                # Try to list with user filter
                print("\nTrying alternative session listing...")
            else:
                print(f"Found {len(sessions)} sessions")
                
                # Display each session's content
                for session in sessions[:5]:  # Show first 5
                    session_id = session.get("name", "").split("/")[-1]
                    print(f"\n📁 Session ID: {session_id}")
                    print(f"   Created: {session.get('createTime', 'Unknown')}")
                    print(f"   Updated: {session.get('updateTime', 'Unknown')}")
                    
                    # Get detailed session info
                    session_url = f"{base_url}/{engine_path}/sessions/{session_id}"
                    detail_response = requests.get(session_url, headers=headers)
                    
                    if detail_response.status_code == 200:
                        details = detail_response.json()
                        print(f"   State: {json.dumps(details.get('state', {}), indent=6)[:200]}")
                        
                        # Check for events
                        events = details.get("events", [])
                        if events:
                            print(f"   Events: {len(events)} events recorded")
                            for event in events[:2]:  # Show first 2 events
                                print(f"      - {event.get('type', 'Unknown')}: {str(event)[:100]}")
                        else:
                            print("   Events: No events found")
        else:
            print(f"❌ Failed to list sessions: {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"❌ Error listing sessions: {e}")
    
    # 2. Test session retrieval with known IDs from your screenshot
    print("\n📊 Testing specific session IDs from your console...")
    
    # Session IDs from your screenshot
    known_sessions = [
        "3782088455770398720",
        "9200340619216912384",
        "3559574886680625152"
    ]
    
    for session_id in known_sessions[:2]:  # Test first 2
        print(f"\n🔍 Checking session: {session_id}")
        session_url = f"{base_url}/{engine_path}/sessions/{session_id}"
        
        try:
            response = requests.get(session_url, headers=headers)
            if response.status_code == 200:
                session_data = response.json()
                print(f"   ✅ Session exists")
                print(f"   User ID: {session_data.get('userId', 'Unknown')}")
                
                # Show state
                state = session_data.get("state", {})
                if state:
                    print(f"   State keys: {list(state.keys())}")
                    print(f"   State preview: {json.dumps(state, indent=6)[:300]}")
                else:
                    print("   ⚠️  No state data found")
                
                # Show events
                events = session_data.get("events", [])
                if events:
                    print(f"   Events: {len(events)} events")
                    for i, event in enumerate(events[:3]):
                        print(f"      Event {i+1}: {json.dumps(event, indent=9)[:200]}")
                else:
                    print("   ⚠️  No events found")
                    
            elif response.status_code == 404:
                print(f"   ❌ Session not found")
            else:
                print(f"   ❌ Error: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # 3. Query a session to see the interaction
    print("\n🧪 Testing session interaction...")
    test_session_id = "test_inspection_" + datetime.now().strftime("%Y%m%d_%H%M%S")
    
    query_url = f"{base_url}/{engine_path}:query"
    
    # First message
    request1 = {
        "input": {
            "prompt": "Hello, my name is Inspector and I'm testing sessions"
        },
        "config": {
            "session_id": test_session_id
        }
    }
    
    try:
        response = requests.post(query_url, headers=headers, json=request1)
        if response.status_code == 200:
            print(f"✅ Created test session: {test_session_id}")
            result = response.json()
            print(f"   Response: {json.dumps(result, indent=3)[:500]}")
            
            # Now check if we can retrieve this session
            print(f"\n📂 Retrieving test session...")
            session_url = f"{base_url}/{engine_path}/sessions/{test_session_id}"
            
            response = requests.get(session_url, headers=headers)
            if response.status_code == 200:
                print("✅ Session retrieved successfully")
                session_data = response.json()
                print(f"   Session data: {json.dumps(session_data, indent=3)[:500]}")
            else:
                print(f"⚠️  Could not retrieve session: {response.status_code}")
                
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    inspect_sessions()
    
    print("\n" + "=" * 60)
    print("💡 Additional debugging steps:")
    print("1. Check Cloud Logging for detailed message traffic")
    print("2. Verify session service is configured in deployment")
    print("3. Check if sessions are using the correct app_name (agent_engine_id)")
