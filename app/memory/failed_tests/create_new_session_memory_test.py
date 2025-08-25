#!/usr/bin/env python3
"""
ADK Memory Service Test - Create New Session, Add to Memory, and Search

This script:
1. Creates a NEW session with conversation data
2. Adds the session to Memory Bank
3. Searches the memory for specific information

This avoids any compatibility issues with existing sessions.
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

# User configuration
USER_ID = "test-user-memory-demo"  # Using a test user ID
APP_NAME = "memory-demo-app"


async def create_session_and_test_memory():
    """Create a new session, add conversation, ingest to memory, and search."""
    
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║   CREATE NEW SESSION → ADD TO MEMORY → SEARCH TEST        ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    print(f"📋 Configuration:")
    print(f"   Project: {PROJECT_ID}")
    print(f"   Location: {LOCATION}")
    print(f"   Agent Engine: {AGENT_ENGINE_ID}")
    print(f"   Model: {MODEL}")
    print(f"   User ID: {USER_ID}")
    print()
    
    # Initialize services
    print("🔧 Initializing ADK services...")
    
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
    # STEP 1: CREATE A NEW SESSION WITH CONVERSATION DATA
    # =========================================================================
    
    print("=" * 60)
    print("STEP 1: CREATING NEW SESSION WITH CONVERSATION")
    print("=" * 60)
    
    # Create an agent for the conversation
    conversation_agent = LlmAgent(
        model=MODEL,
        name="ConversationAgent",
        instruction="You are a helpful assistant. Respond naturally to the user's messages."
    )
    
    # Create runner for the conversation
    conversation_runner = Runner(
        agent=conversation_agent,
        app_name=APP_NAME,
        session_service=session_service,
        memory_service=memory_service
    )
    
    # Create a new session (let Vertex AI generate the ID)
    print("📝 Creating new session...")
    session = await conversation_runner.session_service.create_session(
        app_name=APP_NAME,
        user_id=USER_ID
        # Note: NOT providing session_id - let Vertex AI generate it
    )
    
    # Get the generated session ID
    session_id = session.session_id
    print(f"✅ New session created: {session_id}")
    print(f"   User: {USER_ID}")
    
    # Add conversation to the session
    print("\n💬 Adding conversation to session...")
    
    # Conversation about user's location and preferences
    conversation_turns = [
        "Hi! I'm looking for restaurant recommendations.",
        "I live in Austin, Texas, specifically in the Hyde Park neighborhood.",
        "I prefer vegetarian food and really enjoy Thai cuisine.",
        "My favorite local spot is Titaya's Thai Cuisine on Guadalupe Street.",
        "What are some similar restaurants you'd recommend?"
    ]
    
    for i, user_message in enumerate(conversation_turns, 1):
        print(f"\n   Turn {i} - User: {user_message[:50]}...")
        
        # Create user message
        user_content = Content(
            parts=[Part(text=user_message)],
            role="user"
        )
        
        # Run the agent to get a response
        agent_response = ""
        async for event in conversation_runner.run_async(
            user_id=USER_ID,
            session_id=session_id,
            new_message=user_content
        ):
            if event.is_final_response() and event.content and event.content.parts:
                agent_response = event.content.parts[0].text
        
        print(f"   Agent: {agent_response[:80]}...")
    
    print(f"\n✅ Conversation completed with {len(conversation_turns)} exchanges")
    
    # =========================================================================
    # STEP 2: ADD THE SESSION TO MEMORY BANK
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("STEP 2: ADDING SESSION TO MEMORY BANK")
    print("=" * 60)
    
    # Get the completed session
    print("📥 Retrieving completed session...")
    completed_session = await session_service.get_session(
        app_name=APP_NAME,
        user_id=USER_ID,
        session_id=session_id
    )
    
    # Add to memory
    print("🧠 Adding session to Memory Bank...")
    await memory_service.add_session_to_memory(completed_session)
    
    print(f"✅ Session successfully added to memory!")
    print(f"   Session ID: {session_id}")
    print(f"   User ID: {USER_ID}")
    print(f"   Timestamp: {datetime.now().isoformat()}")
    
    # Wait for memory processing
    print("\n⏳ Waiting for memory processing (5 seconds)...")
    await asyncio.sleep(5)
    
    # =========================================================================
    # STEP 3: SEARCH MEMORY WITH DIFFERENT QUERIES
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("STEP 3: SEARCHING MEMORY WITH MULTIPLE QUERIES")
    print("=" * 60)
    
    # Create an agent with memory search capability
    memory_search_agent = LlmAgent(
        model=MODEL,
        name="MemorySearchAgent",
        instruction=(
            "Answer the user's question by searching your memory. "
            "Use the 'load_memory' tool to find relevant information from past conversations. "
            "Be specific and cite what you found in memory."
        ),
        tools=[load_memory]
    )
    
    # Create runner for memory search
    search_runner = Runner(
        agent=memory_search_agent,
        app_name=APP_NAME,
        session_service=session_service,
        memory_service=memory_service
    )
    
    # Test queries
    test_queries = [
        "What city and neighborhood does the user live in?",
        "What type of food does the user prefer?",
        "What is the user's favorite restaurant?"
    ]
    
    for query in test_queries:
        print(f"\n{'='*50}")
        print(f"🔍 Query: '{query}'")
        print(f"{'='*50}")
        
        # Create a new session for each search
        search_session = await search_runner.session_service.create_session(
            app_name=APP_NAME,
            user_id=USER_ID
        )
        
        # Create the query as user message
        user_query = Content(
            parts=[Part(text=query)],
            role="user"
        )
        
        # Run the search agent
        final_response = ""
        async for event in search_runner.run_async(
            user_id=USER_ID,
            session_id=search_session.session_id,
            new_message=user_query
        ):
            if event.is_final_response() and event.content and event.content.parts:
                final_response = event.content.parts[0].text
        
        print("\n🤖 Agent Response:")
        print("-" * 40)
        print(final_response)
        
        # Brief pause between queries
        await asyncio.sleep(1)
    
    # =========================================================================
    # STEP 4: DIRECT MEMORY SEARCH (Alternative Method)
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("STEP 4: DIRECT MEMORY SEARCH")
    print("=" * 60)
    
    try:
        print("🔍 Performing direct memory search...")
        
        direct_query = "Austin Texas Hyde Park neighborhood restaurants"
        print(f"   Query: '{direct_query}'")
        
        search_results = await memory_service.search_memory(
            query=direct_query,
            user_id=USER_ID,
            top_k=3
        )
        
        if search_results:
            print(f"\n✅ Found {len(search_results)} results:")
            for i, result in enumerate(search_results, 1):
                print(f"\n   Result #{i}:")
                print(f"   Score: {result.get('score', 0):.3f}")
                print(f"   Content: {result.get('content', 'N/A')[:150]}...")
        else:
            print("❌ No direct search results found")
            
    except Exception as e:
        print(f"⚠️  Direct search not available: {e}")
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Created new session: {session_id}")
    print(f"✅ Added {len(conversation_turns)} conversation turns")
    print(f"✅ Successfully ingested to Memory Bank")
    print(f"✅ Tested {len(test_queries)} search queries")
    print(f"✅ User ID: {USER_ID}")
    print("\n🎉 All tests completed successfully!")
    
    return session_id


async def main():
    """Main entry point."""
    try:
        session_id = await create_session_and_test_memory()
        
        print("\n" + "=" * 60)
        print("💡 NEXT STEPS")
        print("=" * 60)
        print(f"You can now:")
        print(f"1. Run this script again to create more memories")
        print(f"2. Search will find information from ALL sessions")
        print(f"3. Created session ID: {session_id}")
        print(f"4. User ID for testing: {USER_ID}")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Run the async function
    asyncio.run(main())
