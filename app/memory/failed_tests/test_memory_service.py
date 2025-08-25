"""
Test script for Memory Service functionality with Vertex AI Memory Bank.

This script tests two core functionalities:
1. Adding session information to memory (add_session_to_memory)
2. Searching the memory store (search_memory)

Run this script manually to test memory operations.
"""

import os
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
import json
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Google Cloud imports
import vertexai
from google.adk.memory import VertexAiMemoryBankService
from google.adk.sessions import VertexAiSessionService, Session
from google.genai import types
from vertexai.preview import reasoning_engines


class MemoryServiceTester:
    """Test harness for Memory Bank operations."""
    
    def __init__(self):
        """Initialize the memory service tester with configuration from .env"""
        
        # Load configuration from environment
        self.project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
        self.location = os.getenv('GOOGLE_CLOUD_LOCATION', 'us-central1')
        self.agent_engine_id = os.getenv('AGENT_ENGINE_ID')
        self.user_id = os.getenv('USER_ID', 'test-user-1')
        
        # Validate required configuration
        if not self.project_id:
            raise ValueError("GOOGLE_CLOUD_PROJECT not found in .env")
        if not self.agent_engine_id:
            raise ValueError("AGENT_ENGINE_ID not found in .env")
        
        print(f"🔧 Initializing Memory Service Tester")
        print(f"   Project: {self.project_id}")
        print(f"   Location: {self.location}")
        print(f"   Agent Engine ID: {self.agent_engine_id}")
        print(f"   User ID: {self.user_id}")
        
        # Initialize Vertex AI
        vertexai.init(
            project=self.project_id,
            location=self.location
        )
        
        # Initialize services
        self._initialize_services()
        
    def _initialize_services(self):
        """Initialize Memory Bank and Session services."""
        try:
            # Initialize Memory Bank Service
            self.memory_service = VertexAiMemoryBankService(
                project=self.project_id,
                location=self.location,
                agent_engine_id=self.agent_engine_id
            )
            print("✅ Memory Bank Service initialized")
            
            # Initialize Session Service
            self.session_service = VertexAiSessionService(
                project=self.project_id,
                location=self.location,
                agent_engine_id=self.agent_engine_id
            )
            print("✅ Session Service initialized")
            
        except Exception as e:
            print(f"❌ Error initializing services: {e}")
            raise
    
    def add_memory_from_session(
        self,
        session_content: List[Dict[str, str]],
        session_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Add memory from a session to the Memory Bank.
        
        Args:
            session_content: List of conversation turns with 'role' and 'content'
            session_id: Optional session ID (will create new if not provided)
            metadata: Optional metadata to attach to the memory
            
        Returns:
            Result dictionary with operation status
        """
        print("\n📝 ADDING MEMORY FROM SESSION")
        print("=" * 50)
        
        try:
            # Create or get session
            if not session_id:
                # Create a new session with user context
                session = self.session_service.create_session(
                    user_id=self.user_id
                )
                session_id = session.session_id
                print(f"✅ Created new session: {session_id}")
            else:
                print(f"📌 Using existing session: {session_id}")
            
            # Add conversation content to session
            print(f"\n📤 Adding {len(session_content)} conversation turns to session...")
            
            for i, turn in enumerate(session_content):
                role = turn.get('role', 'user')
                content_text = turn.get('content', '')
                
                # Create content object based on role
                content = types.Content(
                    role=role,
                    parts=[types.Part(text=content_text)]
                )
                
                # Add to session
                self.session_service.add_content_to_session(
                    session_id=session_id,
                    content=content
                )
                
                print(f"   Turn {i+1}: {role[:4]}: {content_text[:50]}...")
            
            # Generate memories from the session
            print("\n🧠 Generating memories from session...")
            
            # Add session to memory using Memory Bank
            memory_result = self.memory_service.add_session_to_memory(
                session_id=session_id,
                user_id=self.user_id
            )
            
            # Parse result
            result = {
                'status': 'success',
                'session_id': session_id,
                'user_id': self.user_id,
                'memories_generated': True,
                'timestamp': datetime.now().isoformat(),
                'metadata': metadata
            }
            
            print(f"✅ Memories successfully generated for session {session_id}")
            print(f"   User: {self.user_id}")
            
            return result
            
        except Exception as e:
            error_result = {
                'status': 'error',
                'error': str(e),
                'session_id': session_id,
                'timestamp': datetime.now().isoformat()
            }
            print(f"❌ Error adding memory: {e}")
            return error_result
    
    def search_memory(
        self,
        query: str,
        top_k: int = 5,
        similarity_threshold: float = 0.7
    ) -> List[Dict]:
        """
        Search the memory store for relevant information.
        
        Args:
            query: Search query string
            top_k: Number of results to return
            similarity_threshold: Minimum similarity score for results
            
        Returns:
            List of relevant memory entries
        """
        print("\n🔍 SEARCHING MEMORY")
        print("=" * 50)
        print(f"Query: '{query}'")
        print(f"Parameters: top_k={top_k}, threshold={similarity_threshold}")
        
        try:
            # Search memories using Memory Bank
            results = self.memory_service.search_memory(
                query=query,
                user_id=self.user_id,
                top_k=top_k,
                similarity_threshold=similarity_threshold
            )
            
            # Format results
            formatted_results = []
            
            if results:
                print(f"\n✅ Found {len(results)} relevant memories:")
                print("-" * 40)
                
                for i, memory in enumerate(results, 1):
                    # Extract memory content
                    memory_content = memory.get('content', '')
                    memory_score = memory.get('score', 0.0)
                    memory_metadata = memory.get('metadata', {})
                    
                    formatted_result = {
                        'rank': i,
                        'content': memory_content,
                        'relevance_score': memory_score,
                        'metadata': memory_metadata
                    }
                    
                    formatted_results.append(formatted_result)
                    
                    # Display result
                    print(f"\n🎯 Result {i}:")
                    print(f"   Score: {memory_score:.3f}")
                    print(f"   Content: {memory_content[:200]}...")
                    if memory_metadata:
                        print(f"   Metadata: {json.dumps(memory_metadata, indent=6)[:100]}...")
            else:
                print("❌ No memories found matching the query")
            
            return formatted_results
            
        except Exception as e:
            print(f"❌ Error searching memory: {e}")
            return []


def test_add_memory():
    """Test adding memories to the Memory Bank."""
    
    print("\n" + "=" * 60)
    print("TEST 1: ADDING MEMORY FROM SESSION")
    print("=" * 60)
    
    # Initialize tester
    tester = MemoryServiceTester()
    
    # Sample conversation to add to memory
    sample_conversation = [
        {
            "role": "user",
            "content": "Hi! I'm working on a Python project for data analysis."
        },
        {
            "role": "assistant",
            "content": "Great! I'd be happy to help with your Python data analysis project. What specific aspects are you working on?"
        },
        {
            "role": "user",
            "content": "I need to process CSV files and create visualizations. I prefer using pandas and matplotlib."
        },
        {
            "role": "assistant",
            "content": "Excellent choices! Pandas is perfect for CSV processing and matplotlib for visualizations. Would you like help with data loading, cleaning, or the visualization part?"
        },
        {
            "role": "user",
            "content": "I'm particularly interested in time series analysis. My data has daily sales records."
        }
    ]
    
    # Add conversation to memory
    result = tester.add_memory_from_session(
        session_content=sample_conversation,
        metadata={
            "topic": "Python data analysis",
            "tools": ["pandas", "matplotlib"],
            "focus": "time series analysis"
        }
    )
    
    print("\n📊 Test Result:")
    print(json.dumps(result, indent=2))
    
    return result


def test_search_memory():
    """Test searching memories from the Memory Bank."""
    
    print("\n" + "=" * 60)
    print("TEST 2: SEARCHING MEMORY")
    print("=" * 60)
    
    # Initialize tester
    tester = MemoryServiceTester()
    
    # Test queries
    test_queries = [
        "What programming languages does the user prefer?",
        "Python data analysis",
        "time series visualization",
        "user preferences for data tools"
    ]
    
    all_results = {}
    
    for query in test_queries:
        print(f"\n{'='*50}")
        print(f"Testing query: '{query}'")
        print(f"{'='*50}")
        
        results = tester.search_memory(
            query=query,
            top_k=3,
            similarity_threshold=0.5
        )
        
        all_results[query] = results
        
        # Brief pause between queries
        import time
        time.sleep(1)
    
    # Summary
    print("\n" + "=" * 60)
    print("SEARCH TEST SUMMARY")
    print("=" * 60)
    
    for query, results in all_results.items():
        print(f"\n✓ Query: '{query}'")
        print(f"  Found: {len(results)} relevant memories")
        if results:
            print(f"  Best match score: {results[0]['relevance_score']:.3f}")
    
    return all_results


def main():
    """Main function to run all tests."""
    
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║           VERTEX AI MEMORY BANK TEST SUITE                ║
    ║                                                            ║
    ║  Testing Memory Service Integration with ADK              ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    # Test 1: Add memories
    print("\n🚀 Starting Test Suite...\n")
    
    add_result = test_add_memory()
    
    # Wait a bit for memories to be processed
    print("\n⏳ Waiting for memory processing...")
    import time
    time.sleep(3)
    
    # Test 2: Search memories
    search_results = test_search_memory()
    
    # Final summary
    print("\n" + "=" * 60)
    print("TEST SUITE COMPLETED")
    print("=" * 60)
    
    if add_result['status'] == 'success':
        print("✅ Memory addition: SUCCESS")
    else:
        print("❌ Memory addition: FAILED")
    
    if search_results:
        print("✅ Memory search: SUCCESS")
    else:
        print("❌ Memory search: FAILED")
    
    print("\n🎉 All tests completed!")


if __name__ == "__main__":
    main()
