#!/usr/bin/env python3
"""
Ingest Specific Session to Memory Bank

This script:
1. Ingests an existing session (5976292648439250944) for user (ab84d1a0-c3f5-450b-aae3-acd79c520308)
2. Searches the memory for "what town do i live in"

Usage:
    python ingest_specific_session.py
"""

import os
import sys
from pathlib import Path
import time
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Load environment variables
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Import ADK components
import vertexai
from google.adk.memory import VertexAiMemoryBankService
from google.adk.sessions import VertexAiSessionService

# Configuration
PROJECT_ID = os.getenv('GOOGLE_CLOUD_PROJECT')
LOCATION = os.getenv('GOOGLE_CLOUD_LOCATION', 'us-central1')
AGENT_ENGINE_ID = os.getenv('AGENT_ENGINE_ID')

# Your specific IDs
USER_ID = os.getenv('USER_ID', 'ab84d1a0-c3f5-450b-aae3-acd79c520308')
SESSION_ID = os.getenv('SESSION_ID', '5976292648439250944')
SEARCH_QUERY = os.getenv('SEARCH_QUERY', 'what town do i live in')


def main():
    """Main function to ingest session and search memory."""
    
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║         INGEST SPECIFIC SESSION TO MEMORY BANK            ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    print(f"📋 Configuration:")
    print(f"   Project: {PROJECT_ID}")
    print(f"   Location: {LOCATION}")
    print(f"   Agent Engine: {AGENT_ENGINE_ID}")
    print(f"   User ID: {USER_ID}")
    print(f"   Session ID: {SESSION_ID}")
    print(f"   Search Query: '{SEARCH_QUERY}'")
    print()
    
    # Initialize Vertex AI
    print("🔧 Initializing Vertex AI...")
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    
    # Initialize services
    print("📡 Connecting to Memory Bank and Session services...")
    
    memory_service = VertexAiMemoryBankService(
        project=PROJECT_ID,
        location=LOCATION,
        agent_engine_id=AGENT_ENGINE_ID
    )
    
    session_service = VertexAiSessionService(
        project=PROJECT_ID,
        location=LOCATION,
        agent_engine_id=AGENT_ENGINE_ID
    )
    
    print("✅ Services initialized\n")
    
    # =========================================================================
    # STEP 1: INGEST THE SESSION TO MEMORY
    # =========================================================================
    
    print("=" * 60)
    print("STEP 1: INGESTING SESSION TO MEMORY BANK")
    print("=" * 60)
    
    try:
        print(f"🔄 Adding session {SESSION_ID} to memory for user {USER_ID[:8]}...")
        
        # Add the existing session to memory
        result = memory_service.add_session_to_memory(
            session_id=SESSION_ID,
            user_id=USER_ID
        )
        
        print(f"✅ Session successfully ingested to Memory Bank!")
        print(f"   Timestamp: {datetime.now().isoformat()}")
        print(f"   Session ID: {SESSION_ID}")
        print(f"   User ID: {USER_ID}")
        
        ingestion_success = True
        
    except Exception as e:
        print(f"❌ Error ingesting session: {e}")
        ingestion_success = False
    
    # Wait for memory processing
    if ingestion_success:
        print("\n⏳ Waiting for memory processing (5 seconds)...")
        time.sleep(5)
    
    # =========================================================================
    # STEP 2: SEARCH THE MEMORY
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("STEP 2: SEARCHING MEMORY")
    print("=" * 60)
    
    try:
        print(f"🔍 Searching for: '{SEARCH_QUERY}'")
        print(f"👤 User: {USER_ID[:8]}...")
        
        # Search the memory for the specific query
        results = memory_service.search_memory(
            query=SEARCH_QUERY,
            user_id=USER_ID,
            top_k=5  # Get top 5 results
        )
        
        if results:
            print(f"\n✅ Found {len(results)} relevant memories:\n")
            print("-" * 50)
            
            for i, memory in enumerate(results, 1):
                content = memory.get('content', 'No content available')
                score = memory.get('score', 0.0)
                
                print(f"🎯 Result #{i}")
                print(f"   Relevance Score: {score:.3f}")
                print(f"   Content: {content[:300]}")
                
                if len(content) > 300:
                    print(f"            {'...[truncated]'}")
                
                # Show metadata if available
                metadata = memory.get('metadata', {})
                if metadata:
                    print(f"   Metadata: {metadata}")
                
                print("-" * 50)
        else:
            print(f"❌ No memories found for query: '{SEARCH_QUERY}'")
            print("\nPossible reasons:")
            print("  1. The session might not contain information about your town")
            print("  2. Memory processing might still be in progress")
            print("  3. The query might need to be rephrased")
            
    except Exception as e:
        print(f"❌ Error searching memory: {e}")
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if ingestion_success:
        print("✅ Session ingestion: SUCCESS")
    else:
        print("❌ Session ingestion: FAILED")
    
    print(f"📊 Search executed for: '{SEARCH_QUERY}'")
    
    print("\n🎉 Script completed!")
    print("\nNext steps:")
    print("  - Try different search queries to explore the ingested memories")
    print("  - Check if the session contained location/town information")
    print("  - Wait longer if memories are still being processed")


if __name__ == "__main__":
    main()
