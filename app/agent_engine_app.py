"""
Agent Engine App - Deploy your agent to Google Cloud

This file contains the logic to deploy your agent to Vertex AI Agent Engine.
"""

import copy
import datetime
import json
import os
from pathlib import Path
from typing import Any, Optional

import vertexai
from google.adk.artifacts import GcsArtifactService
from google.adk.sessions import VertexAiSessionService
from google.cloud import logging as google_cloud_logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider, export
from vertexai import agent_engines
from vertexai.preview.reasoning_engines import AdkApp

from app.agent import root_agent
from app.config import config, get_deployment_config
from app.utils.gcs import create_bucket_if_not_exists
from app.utils.tracing import CloudTraceLoggingSpanExporter
from app.utils.typing import Feedback


class AgentEngineApp(AdkApp):
    """
    ADK Application wrapper for Agent Engine deployment with VertexAI Session Service.

    This class extends the base ADK app with logging, tracing, feedback capabilities,
    and persistent session management through VertexAI Session Service.
    """
    
    def __init__(self, *args, **kwargs):
        """Initialize with VertexAI Session Service if not provided."""
        # Add session service builder if not provided
        if 'session_service_builder' not in kwargs:
            kwargs['session_service_builder'] = self._create_session_service_builder()
        
        # Store agent engine ID if available
        self.agent_engine_id = kwargs.pop('agent_engine_id', None)
        
        super().__init__(*args, **kwargs)
    
    @staticmethod
    def _create_session_service_builder():
        """
        Create VertexAI Session Service builder for persistent sessions.
        
        Returns:
            A function that creates and returns a VertexAiSessionService instance.
        """
        def session_service_builder():
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
            location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
            
            if not project_id:
                raise ValueError("GOOGLE_CLOUD_PROJECT environment variable is required")
            
            print(f"🔄 Initializing VertexAI Session Service...")
            print(f"   Project: {project_id}")
            print(f"   Location: {location}")
            
            return VertexAiSessionService(
                project=project_id,
                location=location
            )
        
        return session_service_builder

    def set_up(self) -> None:
        """Set up logging and tracing for the agent engine app."""
        super().set_up()
        
        # Configure logging
        logging_client = google_cloud_logging.Client()
        self.logger = logging_client.logger(__name__)
        
        # Configure tracing
        provider = TracerProvider()
        processor = export.BatchSpanProcessor(
            CloudTraceLoggingSpanExporter(
                project_id=os.environ.get("GOOGLE_CLOUD_PROJECT"),
                service_name=f"{config.deployment_name}-service",
            )
        )
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)
        self.enable_tracing = True
        
        # Log session service initialization
        self.logger.log_struct({
            "message": "AgentEngineApp initialized with VertexAI Session Service",
            "agent_engine_id": self.agent_engine_id,
            "deployment_name": config.deployment_name
        }, severity="INFO")

    def register_feedback(self, feedback: dict[str, Any]) -> None:
        """Collect and log feedback from users."""
        feedback_obj = Feedback.model_validate(feedback)
        self.logger.log_struct(feedback_obj.model_dump(), severity="INFO")

    def register_operations(self) -> dict[str, list[str]]:
        """Register available operations for the agent."""
        operations = super().register_operations()
        operations[""] = operations[""] + ["register_feedback"]
        return operations

    def clone(self) -> "AgentEngineApp":
        """Create a copy of this application."""
        template_attributes = self._tmpl_attrs

        return self.__class__(
            agent=copy.deepcopy(template_attributes["agent"]),
            enable_tracing=bool(template_attributes.get("enable_tracing", False)),
            session_service_builder=template_attributes.get("session_service_builder"),
            artifact_service_builder=template_attributes.get(
                "artifact_service_builder"
            ),
            env_vars=template_attributes.get("env_vars"),
            agent_engine_id=self.agent_engine_id
        )


def deploy_agent_engine_app() -> agent_engines.AgentEngine:
    """
    Deploy the agent to Vertex AI Agent Engine with VertexAI Session Service.

    This function:
    1. Gets deployment configuration from environment variables
    2. Creates required Google Cloud Storage buckets
    3. Configures VertexAI Session Service for persistent sessions
    4. Deploys the agent to Agent Engine
    5. Saves deployment metadata including session service configuration

    Returns:
        The deployed agent engine instance with persistent session support
    """
    print("🚀 Starting Agent Engine deployment with VertexAI Session Service...")

    # Step 1: Get deployment configuration
    deployment_config = get_deployment_config()
    print(f"📋 Deploying agent: {deployment_config.agent_name}")
    print(f"📋 Project: {deployment_config.project}")
    print(f"📋 Location: {deployment_config.location}")
    print(f"📋 Staging bucket: {deployment_config.staging_bucket}")

    # Step 2: Set up environment variables for the deployed agent
    env_vars = {}
    
    # Configure worker parallelism
    env_vars["NUM_WORKERS"] = "1"
    
    # Add session service configuration
    env_vars["SESSION_SERVICE_TYPE"] = "vertexai"
    # NOTE: GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION are reserved and set automatically
    # by Vertex AI, so we don't set them here

    # Step 3: Create required Google Cloud Storage buckets
    artifacts_bucket_name = (
        f"{deployment_config.project}-{deployment_config.agent_name}-logs-data"
    )

    print(f"📦 Creating artifacts bucket: {artifacts_bucket_name}")

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
    
    # Ensure VertexAI session service requirements are included
    if "google-adk[vertexai]" not in " ".join(requirements):
        requirements.append("google-adk[vertexai]>=1.0.0")

    # Step 6: Check for existing deployment to get agent engine ID
    agent_engine_id = None
    existing_agents = list(
        agent_engines.list(filter=f"display_name={deployment_config.agent_name}")
    )
    
    if existing_agents:
        agent_engine_id = existing_agents[0].resource_name.split("/")[-1]
        print(f"📝 Found existing agent with ID: {agent_engine_id}")

    # Step 7: Create the agent engine app with session service
    agent_engine = AgentEngineApp(
        agent=root_agent,
        artifact_service_builder=lambda: GcsArtifactService(
            bucket_name=artifacts_bucket_name
        ),
        agent_engine_id=agent_engine_id
        # session_service_builder is automatically added in __init__
    )

    # Step 8: Configure the agent for deployment
    agent_config = {
        "agent_engine": agent_engine,
        "display_name": deployment_config.agent_name,
        "description": "A simple goal planning agent with persistent sessions",
        "extra_packages": deployment_config.extra_packages,
        "env_vars": env_vars,
        "requirements": requirements,
    }

    # Step 9: Deploy or update the agent

    if existing_agents:
        print(f"🔄 Updating existing agent: {deployment_config.agent_name}")
        remote_agent = existing_agents[0].update(**agent_config)
    else:
        print(f"🆕 Creating new agent: {deployment_config.agent_name}")
        remote_agent = agent_engines.create(**agent_config)

    # Step 10: Save deployment metadata with session service info
    agent_engine_id = remote_agent.resource_name.split("/")[-1]
    
    metadata = {
        "remote_agent_engine_id": remote_agent.resource_name,
        "agent_engine_id": agent_engine_id,
        "deployment_timestamp": datetime.datetime.now().isoformat(),
        "agent_name": deployment_config.agent_name,
        "project": deployment_config.project,
        "location": deployment_config.location,
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

    print("✅ Agent deployed successfully with VertexAI Session Service!")
    print(f"📄 Deployment metadata saved to: {metadata_file}")
    print(f"🆔 Agent Engine ID: {agent_engine_id}")
    print(f"🔄 Session Service: VertexAI (Persistent)")
    
    # Save agent engine ID to environment file for future use
    env_file = Path(".env.production")
    with open(env_file, "a") as f:
        f.write(f"\n# Agent Engine ID (auto-generated on deployment)\n")
        f.write(f"AGENT_ENGINE_ID={agent_engine_id}\n")
    
    print(f"💾 Agent Engine ID saved to: {env_file}")

    return remote_agent


if __name__ == "__main__":
    print(
        """
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   🤖 DEPLOYING AGENT WITH VERTEXAI SESSION SERVICE 🤖     ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """
    )

    deploy_agent_engine_app()
