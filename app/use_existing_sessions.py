"""
Vertex AI Session Service Utilities

This module provides session management utilities for verifying that
Vertex AI sessions are properly configured in the deployed Agent Engine.

Note: Sessions are managed by the deployed Agent Engine automatically.
This module is for verification and testing purposes only.
"""

import asyncio
import os
from typing import List, Optional, Dict, Any

from google.adk.sessions import VertexAiSessionService, Session

from app.config import config, load_environment_variables

# Load env vars from .env (if available) and initialize config
load_environment_variables()

# Resolve app/engine identifiers strictly from environment
app_name = os.environ.get("AGENT_ENGINE_ID")
if not app_name:
    raise ValueError("Missing AGENT_ENGINE_ID environment variable. Set it in your .env.")

# Initialize the session service for verification purposes
session_service = VertexAiSessionService(
    project=config.project_id, 
    location=config.location
)


async def create_session(user_id: str, initial_state: Optional[Dict[str, Any]] = None) -> Session:
    """
    Create a new session for a user.
    
    Args:
        user_id: The user identifier
        initial_state: Optional initial state for the session
        
    Returns:
        The created Session object
    """
    if initial_state is None:
        initial_state = {}
    
    session = await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        state=initial_state
    )
    print(f"[OK] Created session: {session.id} for user: {user_id}")
    return session


async def get_session(user_id: str, session_id: str) -> Optional[Session]:
    """
    Retrieve an existing session.
    
    Args:
        user_id: The user identifier
        session_id: The session identifier
        
    Returns:
        The Session object if found, None otherwise
    """
    try:
        session = await session_service.get_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id
        )
        return session
    except Exception as e:
        print(f"[ERROR] Error retrieving session {session_id}: {e}")
        return None


async def list_user_sessions(user_id: str) -> List[Session]:
    """
    List all sessions for a user.
    
    Args:
        user_id: The user identifier
        
    Returns:
        List of Session objects for the user
    """
    try:
        sessions = await session_service.list_sessions(
            app_name=app_name,
            user_id=user_id
        )
        print(f"[INFO] Found {len(sessions)} sessions for user: {user_id}")
        return sessions
    except Exception as e:
        print(f"[ERROR] Error listing sessions for user {user_id}: {e}")
        return []


async def update_session_state(user_id: str, session_id: str, state_updates: Dict[str, Any]) -> bool:
    """
    Update the state of an existing session.
    
    Args:
        user_id: The user identifier
        session_id: The session identifier
        state_updates: Dictionary of state updates to apply
        
    Returns:
        True if successful, False otherwise
    """
    try:
        session = await get_session(user_id, session_id)
        if session:
            # Update the session state
            session.state.update(state_updates)
            await session_service.update_session(
                app_name=app_name,
                user_id=user_id,
                session_id=session_id,
                state=session.state
            )
            print(f"[OK] Updated session {session_id} state")
            return True
    except Exception as e:
        print(f"[ERROR] Error updating session {session_id}: {e}")
    return False


async def delete_session(user_id: str, session_id: str) -> bool:
    """
    Delete a session.
    
    Args:
        user_id: The user identifier
        session_id: The session identifier
        
    Returns:
        True if successful, False otherwise
    """
    try:
        await session_service.delete_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id
        )
        print(f"[OK] Deleted session: {session_id}")
        return True
    except Exception as e:
        print(f"[ERROR] Error deleting session {session_id}: {e}")
        return False


async def verify_session_service() -> bool:
    """
    Verify that the session service is properly configured and accessible.
    
    Returns:
        True if session service is working, False otherwise
    """
    try:
        # Test basic session service connectivity
        test_user_id = "verification_test_user"
        
        # Try to list sessions (should work even if empty)
        sessions = await session_service.list_sessions(
            app_name=app_name,
            user_id=test_user_id
        )
        
        print(f"[OK] Session service is accessible")
        print(f"   App Name: {app_name}")
        print(f"   Project: {config.project_id}")
        print(f"   Location: {config.location}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Session service verification failed: {e}")
        return False


async def check_existing_sessions(user_id: str = None) -> List[Session]:
    """
    Check for existing sessions for a user or the default user.
    
    Args:
        user_id: Optional user identifier, uses USER_ID env var if not provided
        
    Returns:
        List of existing sessions
    """
    if user_id is None:
        user_id = os.environ.get("USER_ID", "default_user")
    
    sessions = await list_user_sessions(user_id)
    
    if sessions:
        print("\n[SESSIONS] Existing sessions found:")
        for session in sessions:
            print(f"  - Session ID: {session.id}")
            print(f"    State: {session.state}")
    else:
        print("\n[SESSIONS] No existing sessions found")
    
    return sessions


async def deployment_verification():
    """
    Verify that the Agent Engine deployment has session support.
    Run this after deploying your agent to verify session integration.
    """
    print("\n[VERIFY] AGENT ENGINE SESSION VERIFICATION")
    print("=" * 50)
    
    # Step 1: Verify session service connectivity
    print("\n[1/2] Verifying session service connectivity...")
    service_ok = await verify_session_service()
    
    if not service_ok:
        print("\n[ERROR] Session service verification failed.")
        print("[INFO] Make sure your agent is deployed with session support.")
        return False
    
    # Step 2: Check for any existing sessions
    print("\n[2/2] Checking for existing sessions...")
    test_user_id = os.environ.get("USER_ID", "verification_user")
    existing_sessions = await check_existing_sessions(test_user_id)
    
    print(f"\n[SUCCESS] Session verification complete!")
    print("[INFO] Your deployed Agent Engine is ready for persistent sessions.")
    print("[NEXT] Test via your Vercel/Next.js frontend.")
    
    return True


if __name__ == "__main__":
    # Run verification when script is executed directly
    print("[TEST] Running Agent Engine session verification...")
    asyncio.run(deployment_verification())