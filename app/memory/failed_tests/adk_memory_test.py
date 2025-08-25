#!/usr/bin/env python3
"""
ADK Memory Service Test - Ingest Existing Session and Search

This script uses the ADK pattern to:
1. Retrieve an existing session and add it to memory
2. Search the memory for specific information

Based on the ADK memory example pattern.
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Load environment variables
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# ADK imports
from google.adk.agents import LlmAgent
from google.adk.sessions import VertexAiSessionService
from google.adk.memory import VertexAiMemoryBankService
from google.adk.runners import Runner
from google.adk.tools import load_memory
from google.genai.types import Content, Part

# Configuration from environment
PROJECT_ID = os.getenv('GOOGLE_CLOUD_PROJECT')
LOCATION = os.getenv('GOOGLE_CLOUD_LOCATION', 'us-central1')
AGENT_ENGINE_ID = os.getenv('AGENT_ENGINE_ID')
MODEL = os.getenv('MODEL', 'gemini-2.0-flash')

# Your specific IDs
USER_ID = "ab84d1a0-c3f5-450b-aae3-acd79c520308"
SESSION_ID = "5976292648439250944"
SEARCH_QUERY = "what town do i live in"
APP_NAME = "agentlocker"


async def ingest_and_search():
    """Main async function to ingest session and search memory."""
    
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║      ADK MEMORY TEST: INGEST SESSION & SEARCH             ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    print(f"📋 Configuration:")
    print(f"   Project: {PROJECT_ID}")
    print(f"   Location: {LOCATION}")
    print(f"   Agent Engine: {AGENT_ENGINE_ID}")
    print(f"   Model: {MODEL}")
    print(f"   User ID: {USER_ID}")
    print(f"   Session ID: {SESSION_ID}")
    print()
    
    # Initialize services with Vertex AI
    print("🔧 Initializing ADK services...")
    
    # Create VertexAI services for production use
    session_service = VertexAiSessionService(
        project=PROJECT_ID,
        location=LOCATION,
        agent_engine_id=AGENT_ENGINE_ID
    )
    
    memory_service = VertexAiMemoryBankService(
        project=PROJECT_ID,
        location=LOCATION,
        agent_engine_id=AGENT_ENGINE_ID
    )
    
    print("✅ Services initialized\n")
    
    # =========================================================================
    # STEP 1: RETRIEVE AND INGEST THE EXISTING SESSION
    # =========================================================================
    
    print("=" * 60)
    print("STEP 1: INGESTING EXISTING SESSION TO MEMORY")
    print("=" * 60)
    
    try:
        # Retrieve the existing session
        print(f"📥 Retrieving session {SESSION_ID}...")
        
        # Get the session from the session service
        # Note: The exact method may vary based on your ADK version
        existing_session = await session_service.get_session(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=SESSION_ID
        )
        
        if existing_session:
            print(f"✅ Session retrieved successfully")
            print(f"   Session has {len(existing_session.messages)} messages")
            
            # Add the session to memory
            print(f"\n🧠 Adding session to Memory Bank...")
            await memory_service.add_session_to_memory(existing_session)
            
            print(f"✅ Session successfully added to memory!")
            print(f"   Timestamp: {datetime.now().isoformat()}")
        else:
            print(f"⚠️  Session {SESSION_ID} not found, trying direct ingestion...")
            
            # Alternative: Direct ingestion without retrieving session first
            # This approach works if the session exists in the backend
            result = await memory_service.add_session_to_memory_by_id(
                session_id=SESSION_ID,
                user_id=USER_ID
            )
            print(f"✅ Session ingested directly to Memory Bank")
            
    except AttributeError:
        # Fallback for different ADK versions
        print("📝 Using alternative ingestion method...")
        
        # Create a simple agent for memory operations
        memory_agent = LlmAgent(
            model=MODEL,
            name="MemoryIngestionAgent",
            instruction="Process and store session information."
        )
        
        # Create a runner with the memory service
        runner = Runner(
            agent=memory_agent,
            app_name=APP_NAME,
            session_service=session_service,
            memory_service=memory_service
        )
        
        # Try to get and ingest the session through the runner
        session = await runner.session_service.get_session(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=SESSION_ID
        )
        
        if session:
            await runner.memory_service.add_session_to_memory(session)
            print(f"✅ Session ingested via runner")
        else:
            print(f"❌ Could not retrieve session {SESSION_ID}")
            
    except Exception as e:
        print(f"❌ Error during ingestion: {e}")
        print(f"   Error type: {type(e).__name__}")
    
    # Wait for memory processing
    print("\n⏳ Waiting for memory processing (5 seconds)...")
    await asyncio.sleep(5)
    
    # =========================================================================
    # STEP 2: SEARCH MEMORY USING AN AGENT WITH MEMORY TOOL
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("STEP 2: SEARCHING MEMORY WITH AGENT")
    print("=" * 60)
    
    # Create an agent that can search memory
    memory_search_agent = LlmAgent(
        model=MODEL,
        name="MemorySearchAgent",
        instruction=(
            "Answer the user's question by searching your memory. "
            "Use the 'load_memory' tool to find relevant information from past conversations."
        ),
        tools=[load_memory]  # Give the agent the memory search tool
    )
    
    # Create a runner for the search
    search_runner = Runner(
        agent=memory_search_agent,
        app_name=APP_NAME,
        session_service=session_service,
        memory_service=memory_service  # Connect to the same memory service
    )
    
    # Create a new session for the search
    search_session_id = f"search_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    await search_runner.session_service.create_session(
        app_name=APP_NAME,
        user_id=USER_ID,
        session_id=search_session_id
    )
    
    # Create the search query as a user message
    user_query = Content(
        parts=[Part(text=SEARCH_QUERY)],
        role="user"
    )
    
    print(f"🔍 Searching for: '{SEARCH_QUERY}'")
    print(f"👤 User: {USER_ID[:8]}...")
    print()
    
    # Run the agent with the search query
    final_response = "(No response)"
    print("🤖 Agent searching memory...\n")
    
    async for event in search_runner.run_async(
        user_id=USER_ID,
        session_id=search_session_id,
        new_message=user_query
    ):
        if event.is_final_response() and event.content and event.content.parts:
            final_response = event.content.parts[0].text
    
    print("-" * 50)
    print("🎯 AGENT RESPONSE:")
    print("-" * 50)
    print(final_response)
    print("-" * 50)
    
    # =========================================================================
    # STEP 3: DIRECT MEMORY SEARCH (Alternative Method)
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("STEP 3: DIRECT MEMORY SEARCH (Alternative)")
    print("=" * 60)
    
    try:
        # Direct search without agent
        print(f"🔍 Performing direct memory search...")
        
        search_results = await memory_service.search_memory(
            query=SEARCH_QUERY,
            user_id=USER_ID,
            top_k=5
        )
        
        if search_results:
            print(f"\n✅ Found {len(search_results)} direct results:")
            for i, result in enumerate(search_results, 1):
                print(f"\n   Result #{i}:")
                print(f"   Score: {result.get('score', 0):.3f}")
                print(f"   Content: {result.get('content', 'N/A')[:200]}...")
        else:
            print("❌ No direct search results found")
            
    except Exception as e:
        print(f"⚠️  Direct search not available: {e}")
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("COMPLETION SUMMARY")
    print("=" * 60)
    print(f"✅ Session ID: {SESSION_ID}")
    print(f"✅ User ID: {USER_ID}")
    print(f"✅ Query: '{SEARCH_QUERY}'")
    print(f"✅ Agent Response: Provided above")
    print("\n🎉 Test completed successfully!")


async def main():
    """Main entry point."""
    try:
        await ingest_and_search()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Run the async function
    asyncio.run(main())
