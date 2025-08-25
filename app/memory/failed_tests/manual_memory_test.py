#!/usr/bin/env python3
"""
Manual Memory Service Testing Script

Simple script to manually test Memory Bank operations:
- Adding session content to memory
- Searching memory with queries

Usage:
    python manual_memory_test.py
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Optional
import json
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
from google.genai import types


# Configuration from .env
PROJECT_ID = os.getenv('GOOGLE_CLOUD_PROJECT')
LOCATION = os.getenv('GOOGLE_CLOUD_LOCATION', 'us-central1')
AGENT_ENGINE_ID = os.getenv('AGENT_ENGINE_ID')
USER_ID = os.getenv('USER_ID', 'test-user-1')


def initialize_services():
    """Initialize Vertex AI and Memory Services."""
    print(f"🔧 Initializing services...")
    print(f"   Project: {PROJECT_ID}")
    print(f"   Location: {LOCATION}")
    print(f"   Agent Engine: {AGENT_ENGINE_ID}")
    
    # Initialize Vertex AI
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    
    # Create services
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
    return memory_service, session_service


def add_to_memory(memory_service, session_service, conversation_data: List[Dict]):
    """
    Add conversation data to memory.
    
    Args:
        memory_service: The Memory Bank service instance
        session_service: The Session service instance
        conversation_data: List of conversation turns with 'role' and 'content'
    """
    print("📝 ADDING TO MEMORY")
    print("=" * 50)
    
    try:
        # Create a new session
        session = session_service.create_session(user_id=USER_ID)
        session_id = session.session_id
        print(f"✅ Created session: {session_id}")
        
        # Add conversation to session
        print(f"📤 Adding {len(conversation_data)} turns to session...")
        
        for i, turn in enumerate(conversation_data):
            content = types.Content(
                role=turn['role'],
                parts=[types.Part(text=turn['content'])]
            )
            
            session_service.add_content_to_session(
                session_id=session_id,
                content=content
            )
            
            print(f"   Turn {i+1} ({turn['role']}): {turn['content'][:50]}...")
        
        # Generate memories from session
        print("\n🧠 Generating memories...")
        
        result = memory_service.add_session_to_memory(
            session_id=session_id,
            user_id=USER_ID
        )
        
        print(f"✅ Successfully added session to memory for user: {USER_ID}")
        print(f"   Session ID: {session_id}")
        print(f"   Timestamp: {datetime.now().isoformat()}")
        
        return {
            'success': True,
            'session_id': session_id,
            'user_id': USER_ID,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return {'success': False, 'error': str(e)}


def search_memory(memory_service, query: str, top_k: int = 5):
    """
    Search memory for relevant information.
    
    Args:
        memory_service: The Memory Bank service instance
        query: Search query string
        top_k: Number of results to return
    """
    print("\n🔍 SEARCHING MEMORY")
    print("=" * 50)
    print(f"Query: '{query}'")
    print(f"User: {USER_ID}")
    print(f"Top K: {top_k}")
    
    try:
        # Search memories
        results = memory_service.search_memory(
            query=query,
            user_id=USER_ID,
            top_k=top_k
        )
        
        if results:
            print(f"\n✅ Found {len(results)} memories:")
            print("-" * 40)
            
            for i, memory in enumerate(results, 1):
                print(f"\n🎯 Result {i}:")
                print(f"   Content: {memory.get('content', 'N/A')[:200]}...")
                print(f"   Score: {memory.get('score', 0):.3f}")
                
                metadata = memory.get('metadata', {})
                if metadata:
                    print(f"   Metadata: {json.dumps(metadata, indent=6)[:100]}...")
        else:
            print("❌ No memories found")
        
        return results
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []


# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

if __name__ == "__main__":
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║            MEMORY BANK MANUAL TEST SCRIPT                 ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    # Initialize services
    memory_service, session_service = initialize_services()
    
    # ===========================================================
    # TEST 1: Add sample conversation to memory
    # ===========================================================
    
    sample_conversation = [
        {
            "role": "user",
            "content": "I'm building an AI agent system called AgentLocker."
        },
        {
            "role": "assistant",
            "content": "That sounds interesting! AgentLocker - is this for managing AI agents?"
        },
        {
            "role": "user",
            "content": "Yes, it's built with Google ADK and uses Vertex AI Agent Engine. I prefer Python for the backend."
        },
        {
            "role": "assistant",
            "content": "Great tech stack! ADK with Vertex AI is powerful for agent development."
        },
        {
            "role": "user",
            "content": "I'm particularly focused on implementing persistent memory using Memory Bank."
        }
    ]
    
    print("\n" + "="*60)
    print("TEST 1: Adding conversation to memory")
    print("="*60)
    
    add_result = add_to_memory(memory_service, session_service, sample_conversation)
    
    if add_result['success']:
        print("\n✅ Memory addition successful!")
    else:
        print(f"\n❌ Memory addition failed: {add_result.get('error')}")
    
    # Wait for processing
    print("\n⏳ Waiting for memory processing...")
    import time
    time.sleep(3)
    
    # ===========================================================
    # TEST 2: Search memories
    # ===========================================================
    
    print("\n" + "="*60)
    print("TEST 2: Searching memories")
    print("="*60)
    
    test_queries = [
        "What is AgentLocker?",
        "What technology stack is the user using?",
        "Python ADK Vertex AI"
    ]
    
    for query in test_queries:
        results = search_memory(memory_service, query, top_k=3)
        time.sleep(1)  # Brief pause between queries
    
    print("\n" + "="*60)
    print("✅ Tests completed!")
    print("="*60)
