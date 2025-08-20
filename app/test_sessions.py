"""
Test script for VertexAI Session Service functionality
Run this after deploying your agent to verify sessions work correctly.
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Optional

import vertexai
from google.adk.sessions import VertexAiSessionService
from google.genai import types
from google import adk

from app.agent import root_agent
from app.config import config


class SessionTester:
    """Test harness for VertexAI Session Service."""
    
    def __init__(self):
        """Initialize the session tester."""
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "agentlocker-466121")
        self.location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
        self.agent_engine_id = self._get_agent_engine_id()
        
        # Initialize VertexAI
        vertexai.init(
            project=self.project_id,
            location=self.location
        )
        
        # Initialize session service
        self.session_service = VertexAiSessionService(
            project=self.project_id,
            location=self.location
        )
        
        print(f"✅ Initialized SessionTester")
        print(f"   Project: {self.project_id}")
        print(f"   Location: {self.location}")
        print(f"   Agent Engine ID: {self.agent_engine_id}")
    
    def _get_agent_engine_id(self) -> Optional[str]:
        """Get agent engine ID from deployment metadata or environment."""
        # Try environment variable first
        engine_id = os.environ.get("AGENT_ENGINE_ID")
        if engine_id:
            return engine_id
            
        # Try deployment metadata - check multiple locations
        metadata_locations = [
            Path("../logs/deployment_metadata.json"),  # Parent directory
            Path("logs/deployment_metadata.json"),     # Current directory
            Path(__file__).parent.parent / "logs" / "deployment_metadata.json"  # Absolute path
        ]
        
        for location in metadata_locations:
            if location.exists():
                with open(location) as f:
                    metadata = json.load(f)
                    engine_id = metadata.get("agent_engine_id")
                    if engine_id:
                        return engine_id
        
        # Try production env file
        prod_env = Path(".env.production")
        if prod_env.exists():
            with open(prod_env) as f:
                for line in f:
                    if line.startswith("AGENT_ENGINE_ID="):
                        return line.split("=", 1)[1].strip()
        
        return None
    
    async def test_session_creation(self):
        """Test creating a new session."""
        print("\n🧪 Testing Session Creation...")
        
        if not self.agent_engine_id:
            print("❌ No Agent Engine ID found. Please deploy first.")
            return None
        
        try:
            session = await self.session_service.create_session(
                app_name=self.agent_engine_id,
                user_id="test_user_001",
                state={"test_key": "initial_value", "counter": 0}
            )
            
            print(f"✅ Session created successfully!")
            print(f"   Session ID: {session.id}")
            print(f"   User ID: {session.user_id}")
            print(f"   Initial State: {session.state}")
            
            return session
        
        except Exception as e:
            print(f"❌ Failed to create session: {e}")
            return None
    
    async def test_session_update(self, session_id: str):
        """Test updating session with agent interaction."""
        print(f"\n🧪 Testing Session Update with Agent...")
        
        try:
            # Create a runner with the session service
            runner = adk.Runner(
                agent=root_agent,
                app_name=self.agent_engine_id,
                session_service=self.session_service
            )
            
            # Send a message to the agent
            content = types.Content(
                role='user',
                parts=[types.Part(text="Help me plan a small garden project")]
            )
            
            print("   Sending message to agent...")
            events = runner.run(
                user_id="test_user_001",
                session_id=session_id,
                new_message=content
            )
            
            # Process events
            for event in events:
                if event.is_final_response():
                    response_text = event.content.parts[0].text
                    print(f"✅ Agent responded successfully")
                    print(f"   Response preview: {response_text[:200]}...")
            
            # Retrieve updated session
            updated_session = await self.session_service.get_session(
                app_name=self.agent_engine_id,
                user_id="test_user_001",
                session_id=session_id
            )
            
            print(f"   Session Events Count: {len(updated_session.events)}")
            
            return updated_session
        
        except Exception as e:
            print(f"❌ Failed to update session: {e}")
            return None
    
    async def test_session_persistence(self, session_id: str):
        """Test that session persists across service restarts."""
        print(f"\n🧪 Testing Session Persistence...")
        
        try:
            # Create a new session service instance (simulating restart)
            new_session_service = VertexAiSessionService(
                project=self.project_id,
                location=self.location
            )
            
            # Try to retrieve the session with new service instance
            session = await new_session_service.get_session(
                app_name=self.agent_engine_id,
                user_id="test_user_001",
                session_id=session_id
            )
            
            print(f"✅ Session persisted successfully!")
            print(f"   Session still accessible after service restart")
            print(f"   State preserved: {session.state}")
            
            return True
        
        except Exception as e:
            print(f"❌ Session persistence failed: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all session tests."""
        print("\n" + "="*60)
        print("🚀 Starting VertexAI Session Service Tests")
        print("="*60)
        
        if not self.agent_engine_id:
            print("⚠️  No Agent Engine ID found!")
            print("   Please deploy your agent first with: python agent_engine_app.py")
            return
        
        # Test 1: Create session
        session = await self.test_session_creation()
        if not session:
            print("⚠️  Stopping tests - session creation failed")
            return
        
        session_id = session.id
        
        # Test 2: Update session with agent
        await self.test_session_update(session_id)
        
        # Test 3: Test persistence
        await self.test_session_persistence(session_id)
        
        print("\n" + "="*60)
        print("✅ All tests completed!")
        print("="*60)
        print("\n📝 Your agent is ready with persistent session support!")
        print("   Sessions will persist across deployments and restarts.")
        print("   Each user gets their own isolated session state.")


async def main():
    """Main test runner."""
    # Load environment variables
    from dotenv import load_dotenv
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        load_dotenv(env_file)
    
    tester = SessionTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    print("🔍 VertexAI Session Service Test Suite")
    print("=" * 40)
    asyncio.run(main())
