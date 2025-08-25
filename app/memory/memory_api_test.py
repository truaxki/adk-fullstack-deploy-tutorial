#!/usr/bin/env python3
"""
Memory Bank API Test - Direct API approach based on Google Cloud documentation

This script uses the direct Vertex AI API to:
1. Create a session
2. Add events to the session
3. Generate memories from the session
4. Retrieve memories

Based on: https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/memory-bank/quickstart-api
"""

import os
import sys
from pathlib import Path
from datetime import datetime
import time

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Load environment variables
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Configuration from environment
PROJECT_ID = os.getenv('GOOGLE_CLOUD_PROJECT')
LOCATION = os.getenv('GOOGLE_CLOUD_LOCATION', 'us-central1')
AGENT_ENGINE_ID = os.getenv('AGENT_ENGINE_ID')

# Test user
USER_ID = "api-test-user"


def main():
    """Main function using direct API calls."""
    
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║         MEMORY BANK DIRECT API TEST                       ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    print(f"📋 Configuration:")
    print(f"   Project: {PROJECT_ID}")
    print(f"   Location: {LOCATION}")
    print(f"   Agent Engine: {AGENT_ENGINE_ID}")
    print(f"   User ID: {USER_ID}")
    print()
    
    # Import required libraries
    import vertexai
    from google.cloud import aiplatform_v1beta1
    
    # Initialize Vertex AI
    print("🔧 Initializing Vertex AI client...")
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    client = vertexai.Client(project=PROJECT_ID, location=LOCATION)
    
    # Build the agent engine name
    agent_engine_name = f"projects/{PROJECT_ID}/locations/{LOCATION}/reasoningEngines/{AGENT_ENGINE_ID}"
    print(f"✅ Using Agent Engine: {agent_engine_name}")
    
    # =========================================================================
    # STEP 1: CREATE A SESSION
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("STEP 1: CREATING SESSION WITH API")
    print("=" * 60)
    
    # Create sessions client
    sessions_client = aiplatform_v1beta1.SessionServiceClient(
        client_options={
            "api_endpoint": f"https://{LOCATION}-aiplatform.googleapis.com"
        },
        transport="rest"
    )
    
    print(f"📝 Creating session for user: {USER_ID}")
    
    # Create session
    session_lro = sessions_client.create_session(
        parent=agent_engine_name,
        session={"user_id": USER_ID}
    )
    
    # Extract session name from the operation
    session_name = "/".join(session_lro.operation.name.split("/")[0:-2])
    print(f"✅ Session created: {session_name}")
    
    # =========================================================================
    # STEP 2: ADD EVENTS TO SESSION
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("STEP 2: ADDING CONVERSATION EVENTS")
    print("=" * 60)
    
    # Conversation to add
    conversation = [
        {"role": "user", "text": "Hi! I'm looking for restaurant recommendations."},
        {"role": "model", "text": "I'd be happy to help you find great restaurants! What type of cuisine are you interested in?"},
        {"role": "user", "text": "I live in Austin, Texas, specifically in the Hyde Park neighborhood."},
        {"role": "model", "text": "Hyde Park is a great area with many dining options! Are you looking for something casual or more upscale?"},
        {"role": "user", "text": "I prefer vegetarian food and really enjoy Thai cuisine."},
        {"role": "model", "text": "Perfect! Austin has excellent vegetarian and Thai options. Let me suggest some places."},
        {"role": "user", "text": "My favorite local spot is Titaya's Thai Cuisine on Guadalupe Street."},
        {"role": "model", "text": "Titaya's is excellent! Since you enjoy that, you might also like Sap's Fine Thai Cuisine or Madam Mam's."}
    ]
    
    print(f"💬 Adding {len(conversation)} conversation turns...")
    
    for i, turn in enumerate(conversation, 1):
        # Create event
        event = aiplatform_v1beta1.SessionEvent(
            author=turn["role"],
            invocation_id=str(i),
            timestamp=datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ'),
            content=aiplatform_v1beta1.Content(
                role=turn["role"],
                parts=[aiplatform_v1beta1.Part(text=turn["text"])]
            )
        )
        
        # Append event to session
        sessions_client.append_event(name=session_name, event=event)
        print(f"   Turn {i} ({turn['role']}): {turn['text'][:50]}...")
    
    print(f"✅ All events added to session")
    
    # =========================================================================
    # STEP 3: GENERATE MEMORIES FROM SESSION
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("STEP 3: GENERATING MEMORIES")
    print("=" * 60)
    
    print("🧠 Triggering memory generation from session...")
    
    try:
        # Generate memories from the session
        response = client.agent_engines.generate_memories(
            name=agent_engine_name,
            vertex_session_source={
                "session": session_name
            },
            # Optional: specify scope (defaults to {"user_id": USER_ID})
            scope={"user_id": USER_ID}
        )
        
        print(f"✅ Memory generation triggered successfully")
        print(f"   Response: {response}")
        
    except Exception as e:
        print(f"⚠️ Memory generation error: {e}")
    
    # Wait for processing
    print("\n⏳ Waiting for memory processing (10 seconds)...")
    time.sleep(10)
    
    # =========================================================================
    # STEP 4: RETRIEVE MEMORIES
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("STEP 4: RETRIEVING MEMORIES")
    print("=" * 60)
    
    print(f"🔍 Retrieving memories for user: {USER_ID}")
    
    try:
        # Retrieve all memories for the user
        retrieved_memories = list(
            client.agent_engines.retrieve_memories(
                name=agent_engine_name,
                scope={"user_id": USER_ID}
            )
        )
        
        if retrieved_memories:
            print(f"\n✅ Found {len(retrieved_memories)} memories:")
            print("-" * 50)
            
            for i, memory_item in enumerate(retrieved_memories, 1):
                if hasattr(memory_item, 'memory') and hasattr(memory_item.memory, 'fact'):
                    fact = memory_item.memory.fact
                    print(f"\nMemory #{i}:")
                    print(f"  Fact: {fact}")
                    
                    # Show scope if available
                    if hasattr(memory_item.memory, 'scope'):
                        print(f"  Scope: {memory_item.memory.scope}")
                else:
                    print(f"\nMemory #{i}: {str(memory_item)}")
        else:
            print("❌ No memories found yet")
            print("   Memory generation might still be processing")
            print("   Try running this script again in a minute")
            
    except Exception as e:
        print(f"❌ Error retrieving memories: {e}")
    
    # =========================================================================
    # STEP 5: TEST DIRECT MEMORY CREATION (Optional)
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("STEP 5: DIRECT MEMORY CREATION (Optional)")
    print("=" * 60)
    
    print("📝 Creating a direct memory (without session)...")
    
    try:
        # Create a memory directly
        memory = client.agent_engines.create_memory(
            name=agent_engine_name,
            fact="I prefer vegetarian Thai food and live in Austin's Hyde Park neighborhood",
            scope={"user_id": USER_ID}
        )
        
        print(f"✅ Direct memory created successfully")
        if hasattr(memory, 'response') and hasattr(memory.response, 'fact'):
            print(f"   Fact: {memory.response.fact}")
            
    except Exception as e:
        print(f"⚠️ Direct memory creation error: {e}")
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Session created: {session_name}")
    print(f"✅ Added {len(conversation)} conversation events")
    print(f"✅ Triggered memory generation")
    print(f"✅ User ID: {USER_ID}")
    print("\n🎉 API test completed!")
    
    print("\n💡 NEXT STEPS:")
    print("1. Wait a minute for memory processing to complete")
    print("2. Run this script again to see if more memories appear")
    print("3. Try with different conversation content")
    print("4. Test with different user IDs for isolation")


if __name__ == "__main__":
    main()
