"""
Agent Engine App with Memory Bank - Production Deployment

This version includes Memory Bank integration for persistent user memories.
"""

import copy
import datetime
import json
import os
from pathlib import Path
from typing import Any

import vertexai
from google.adk.artifacts import GcsArtifactService
from google.adk.sessions import VertexAiSessionService
from google.adk.memory import VertexAiMemoryBankService  # Add Memory Bank
from google.cloud import logging as google_cloud_logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider, export
from vertexai import agent_engines
from vertexai.preview.reasoning_engines import AdkApp

# Import the memory-enabled agent from agent.py
from app.agent import root_agent  # Now includes memory capabilities
from app.config import config, get_deployment_config
from app.utils.gcs import create_bucket_if_not_exists
from app.utils.tracing import CloudTraceLoggingSpanExporter
from app.utils.typing import Feedback


class MemoryEnabledAgentEngineApp(AdkApp):
    """
    ADK Application with Memory Bank support for Agent Engine deployment.
    
    This class extends the base ADK app with:
    - Memory Bank integration
    - Persistent session management
    - Logging and tracing
    - User feedback capabilities
    """

    def __init__(self, *args, **kwargs):
        """Initialize with VertexAI session service."""
        
        # Add session service builder if not provided
        if 'session_service_builder' not in kwargs:
            kwargs['session_service_builder'] = self._create_session_service_builder()
        
        # Note: Memory Bank is automatically configured when deployed to Agent Engine
        # No need to provide memory_service_builder - it's handled by the platform
            
        super().__init__(*args, **kwargs)
    
    @staticmethod
    def _create_session_service_builder():
        """Create VertexAI Session Service builder for persistent sessions."""
        def session_service_builder():
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
            location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
            agent_engine_id = os.environ.get("AGENT_ENGINE_ID")
            
            if not project_id:
                raise ValueError("GOOGLE_CLOUD_PROJECT environment variable is required")
            
            # When deployed, agent_engine_id is automatically available
            # For local testing, use from environment
            return VertexAiSessionService(
                project=project_id,
                location=location,
                agent_engine_id=agent_engine_id  # Add this for local testing
            )
        return session_service_builder
    
    @staticmethod
    def _create_memory_service_builder():
        """Create VertexAI Memory Bank Service builder for persistent memories."""
        def memory_service_builder():
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
            location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
            agent_engine_id = os.environ.get("AGENT_ENGINE_ID")
            
            if not project_id:
                raise ValueError("GOOGLE_CLOUD_PROJECT environment variable is required")
            
            # When deployed to Agent Engine, this is auto-configured
            # For local testing, we need to specify the agent engine ID
            return VertexAiMemoryBankService(
                project=project_id,
                location=location,
                agent_engine_id=agent_engine_id  # Add this for local testing
            )
        return memory_service_builder

    def set_up(self) -> None:
        """Set up logging, tracing, and memory services."""
        super().set_up()
        
        # Set up logging
        logging_client = google_cloud_logging.Client()
        self.logger = logging_client.logger(__name__)
        
        # Set up tracing
        provider = TracerProvider()
        processor = export.BatchSpanProcessor(
            CloudTraceLoggingSpanExporter(
                project_id=os.environ.get("GOOGLE_CLOUD_PROJECT"),
                service_name=f"{config.deployment_name}-memory-service",
            )
        )
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)
        self.enable_tracing = True
        
        # Log memory service initialization
        self.logger.log_struct({
            "message": "Memory Bank service initialized",
            "memory_enabled": True,
            "agent_name": config.internal_agent_name
        }, severity="INFO")

    def register_feedback(self, feedback: dict[str, Any]) -> None:
        """Collect and log feedback from users."""
        feedback_obj = Feedback.model_validate(feedback)
        self.logger.log_struct(feedback_obj.model_dump(), severity="INFO")

    def register_operations(self) -> dict[str, list[str]]:
        """Register available operations including memory operations."""
        operations = super().register_operations()
        operations[""] = operations[""] + ["register_feedback"]
        # Memory operations are handled automatically by ADK
        return operations

    def clone(self) -> "MemoryEnabledAgentEngineApp":
        """Create a copy of this application with memory support."""
        template_attributes = self._tmpl_attrs

        return self.__class__(
            agent=copy.deepcopy(template_attributes["agent"]),
            enable_tracing=bool(template_attributes.get("enable_tracing", False)),
            session_service_builder=template_attributes.get("session_service_builder"),
            memory_service_builder=template_attributes.get("memory_service_builder"),
            artifact_service_builder=template_attributes.get("artifact_service_builder"),
            env_vars=template_attributes.get("env_vars"),
        )


def deploy_agent_engine_app() -> agent_engines.AgentEngine:
    """
    Deploy the memory-enabled agent to Vertex AI Agent Engine.
    
    This deployment includes:
    - Memory Bank integration for persistent user memories
    - Session management for conversation continuity
    - Automatic memory generation at session end
    - Memory retrieval through the load_memory tool
    """
    print("Starting Memory-Enabled Agent Engine deployment...")
    print("🧠 Memory Bank will be automatically configured")

    # Step 1: Get deployment configuration
    deployment_config = get_deployment_config()
    print(f"Deploying agent: {deployment_config.agent_name}")
    print(f"Project: {deployment_config.project}")
    print(f"Location: {deployment_config.location}")
    print(f"Staging bucket: {deployment_config.staging_bucket}")

    # Step 2: Set up environment variables for the deployed agent
    env_vars = {
        "NUM_WORKERS": "1",
        "MEMORY_BANK_ENABLED": "true",
        "MEMORY_GENERATION_INTERVAL": os.environ.get("MEMORY_GENERATION_INTERVAL", "END_OF_SESSION"),
        "AGENT_ENGINE_ID": os.environ.get("AGENT_ENGINE_ID", ""),  # Will be auto-populated when deployed
    }

    # Step 3: Create required Google Cloud Storage buckets
    artifacts_bucket_name = (
        f"{deployment_config.project}-{deployment_config.agent_name}-memory-data"
    )

    print(f"Creating artifacts bucket: {artifacts_bucket_name}")

    create_bucket_if_not_exists(
        bucket_name=artifacts_bucket_name,
        project=deployment_config.project,
        location=deployment_config.location,
    )

    # Step 4: Initialize Vertex AI for deployment
    vertexai.init(
        project=deployment_config.project,
        location=deployment_config.location,
        staging_bucket=f"gs://{deployment_config.staging_bucket}",
    )

    # Step 5: Read requirements file
    with open(deployment_config.requirements_file) as f:
        requirements = f.read().strip().split("\n")

    # Step 6: Create the memory-enabled agent engine app
    agent_engine_app = MemoryEnabledAgentEngineApp(
        agent=root_agent,  # This is the memory-enabled agent
        artifact_service_builder=lambda: GcsArtifactService(
            bucket_name=artifacts_bucket_name
        ),
        # Memory service is automatically configured when deployed
    )

    # Step 7: Configure the agent for deployment
    agent_config = {
        "agent_engine": agent_engine_app,
        "display_name": deployment_config.agent_name,
        "description": "An intelligent goal planning agent with persistent memory capabilities",
        "extra_packages": deployment_config.extra_packages,
        "env_vars": env_vars,
        "requirements": requirements,
    }

    # Step 8: Deploy or update the agent
    existing_agents = list(
        agent_engines.list(filter=f"display_name={deployment_config.agent_name}")
    )

    if existing_agents:
        print(f"Updating existing agent with memory capabilities: {deployment_config.agent_name}")
        remote_agent = existing_agents[0].update(**agent_config)
    else:
        print(f"Creating new memory-enabled agent: {deployment_config.agent_name}")
        remote_agent = agent_engines.create(**agent_config)

    # Step 9: Save deployment metadata with memory configuration
    agent_engine_id = remote_agent.resource_name.split("/")[-1]
    
    metadata = {
        "remote_agent_engine_id": remote_agent.resource_name,
        "agent_engine_id": agent_engine_id,
        "deployment_timestamp": datetime.datetime.now().isoformat(),
        "agent_name": deployment_config.agent_name,
        "project": deployment_config.project,
        "location": deployment_config.location,
        "memory_configuration": {
            "enabled": True,
            "service": "VertexAiMemoryBankService",
            "generation_interval": env_vars["MEMORY_GENERATION_INTERVAL"],
            "agent_has_memory_tool": True,
            "automatic_generation": True
        },
        "session_service": {
            "type": "VertexAiSessionService",
            "persistent": True,
            "configuration": {
                "project": deployment_config.project,
                "location": deployment_config.location,
                "agent_engine_id": agent_engine_id
            }
        }
    }

    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    metadata_file = logs_dir / "deployment_metadata.json"

    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)

    print("\n" + "="*60)
    print("✅ [SUCCESS] Memory-Enabled Agent deployed successfully!")
    print("="*60)
    print(f"📋 Deployment metadata saved to: {metadata_file}")
    print(f"🆔 Agent Engine ID: {remote_agent.resource_name}")
    print(f"🧠 Memory Bank: ENABLED")
    print(f"💾 Memory Generation: {env_vars['MEMORY_GENERATION_INTERVAL']}")
    print(f"🔍 Memory Search Tool: ENABLED (load_memory)")
    print("\n💡 The agent will now:")
    print("   - Remember user context across sessions")
    print("   - Generate memories automatically at session end")
    print("   - Search memories to provide personalized responses")
    print("   - Build on previous conversations")
    print("="*60)

    return remote_agent


if __name__ == "__main__":
    print(
        """
    ===========================================================
    
       DEPLOYING MEMORY-ENABLED AGENT TO AGENT ENGINE     
       
       🧠 With Vertex AI Memory Bank Integration
    
    ===========================================================
    """
    )

    deploy_agent_engine_app()
