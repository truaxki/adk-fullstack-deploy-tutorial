# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
from dataclasses import dataclass
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv

    # Load .env file from the app directory
    env_path = Path(__file__).parent / ".env"
    load_dotenv(env_path)
except ImportError:
    print(
        "Info: python-dotenv not installed. Environment variables should be set manually."
    )

import google.auth

# RECOMMENDED DEPLOYMENT: Use Agent Engine with ADK CLI
# Deploy with: adk deploy agent_engine app
# Prerequisites: Set up .env file with GOOGLE_CLOUD_STAGING_BUCKET
# This provides managed infrastructure, session handling, and enterprise features
# Configuration is loaded from .env file
# Copy .env.example to .env and fill in your values
# Initialize Vertex AI for ADK agent deployment
import vertexai

try:
    # Get project from environment or gcloud default
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        # Fallback to gcloud default
        _, project_id = google.auth.default()

    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    staging_bucket = os.environ.get("GOOGLE_CLOUD_STAGING_BUCKET")

    if project_id:
        # Initialize Vertex AI with the project and location
        # Set staging bucket for Agent Engine deployment if provided
        init_params = {"project": project_id, "location": location}
        if staging_bucket:
            init_params["staging_bucket"] = staging_bucket

        vertexai.init(**init_params)
        print(
            f"✓ Vertex AI initialized for project: {project_id}, location: {location}"
        )
        if staging_bucket:
            print(f"✓ Staging bucket configured: {staging_bucket}")
        else:
            print(
                "Note: No staging bucket set. Add GOOGLE_CLOUD_STAGING_BUCKET to .env for Agent Engine deployment"
            )
    else:
        print(
            "Warning: GOOGLE_CLOUD_PROJECT not set and could not get from gcloud default"
        )

except Exception as e:
    print(f"Warning: Could not initialize Vertex AI: {e}")
    print("Make sure you have:")
    print("1. Created .env file from .env.example with GOOGLE_CLOUD_PROJECT")
    print("2. Authenticated with 'gcloud auth application-default login'")
    print("3. Set default project with 'gcloud config set project YOUR_PROJECT_ID'")


@dataclass
class ResearchConfiguration:
    """Configuration for research-related models and parameters.

    Attributes:
        critic_model (str): Model for evaluation tasks.
        worker_model (str): Model for working/generation tasks.
        max_search_iterations (int): Maximum search iterations allowed.
    """

    critic_model: str = "gemini-2.5-pro"
    worker_model: str = "gemini-2.5-flash"
    max_search_iterations: int = 5


config = ResearchConfiguration()
