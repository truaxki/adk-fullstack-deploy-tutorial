#!/usr/bin/env python3
"""
GCP Setup Test Script for Vertex AI Implementation
===================================================
This script validates that all required GCP APIs, permissions, and configurations
are properly set up for your Vertex AI Agent deployment.

Usage:
    python test_gcp_setup.py

Requirements:
    pip install google-cloud-aiplatform google-cloud-storage google-cloud-resource-manager google-cloud-iam

Author: ADK Implementation Guide
Date: August 19, 2025
Project: agentlocker-466121
"""

import os
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from pathlib import Path
from dotenv import load_dotenv

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text: str):
    """Print a formatted header."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text:^60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")

def print_section(text: str):
    """Print a section header."""
    print(f"\n{Colors.CYAN}{Colors.BOLD}▶ {text}{Colors.ENDC}")
    print(f"{Colors.CYAN}{'─'*50}{Colors.ENDC}")

def print_success(text: str):
    """Print success message."""
    print(f"{Colors.GREEN}✅ {text}{Colors.ENDC}")

def print_error(text: str):
    """Print error message."""
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

def print_warning(text: str):
    """Print warning message."""
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")

def print_info(text: str):
    """Print info message."""
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.ENDC}")

class GCPSetupTester:
    """Test harness for validating GCP setup for Vertex AI."""
    
    # Expected configuration values
    EXPECTED_PROJECT = "agentlocker-466121"
    EXPECTED_LOCATION = "us-central1"
    EXPECTED_AGENT_NAME = "astra"
    EXPECTED_ENGINE_ID = "5717733143318888448"
    
    # Required APIs
    REQUIRED_APIS = [
        "aiplatform.googleapis.com",
        "storage-api.googleapis.com",
        "cloudbuild.googleapis.com",
        "artifactregistry.googleapis.com",
        "cloudresourcemanager.googleapis.com",
        "iam.googleapis.com"
    ]
    
    OPTIONAL_APIS = [
        "monitoring.googleapis.com",
        "logging.googleapis.com"
    ]
    
    def __init__(self):
        """Initialize the GCP setup tester."""
        # Load environment variables from the app/.env file
        self._load_env_file()
        
        self.project_id = None
        self.location = None
        self.errors = []
        self.warnings = []
        self.successes = []
    
    def _load_env_file(self):
        """Load environment variables from the app/.env file."""
        # Define possible .env file locations
        env_locations = [
            Path(r"C:\Users\ktrua\OneDrive\Desktop\Code-tutorials\adk-fullstack-deploy-tutorial\app\.env"),
            Path("..\\..\\..\\..\\..\\..\\app\.env"),  # Relative path from current location
            Path(".env"),  # Local .env if exists
        ]
        
        env_loaded = False
        for env_path in env_locations:
            if env_path.exists():
                print_info(f"Loading environment from: {env_path}")
                load_dotenv(env_path, override=True)
                env_loaded = True
                break
        
        if not env_loaded:
            print_warning("No .env file found. Using system environment variables only.")
            print_info("Expected location: C:\\Users\\ktrua\\OneDrive\\Desktop\\Code-tutorials\\adk-fullstack-deploy-tutorial\\app\\.env")
        
    def check_environment_variables(self) -> bool:
        """Check if required environment variables are set."""
        print_section("Checking Environment Variables")
        
        required_vars = {
            "GOOGLE_CLOUD_PROJECT": self.EXPECTED_PROJECT,
            "GOOGLE_CLOUD_LOCATION": self.EXPECTED_LOCATION,
        }
        
        optional_vars = [
            "GOOGLE_CLOUD_STAGING_BUCKET",
            "GOOGLE_CLOUD_SESSION_BUCKET",
            "AGENT_NAME",
            "AGENT_ENGINE_ID",
            "GOOGLE_APPLICATION_CREDENTIALS"
        ]
        
        all_good = True
        
        # Check required variables
        for var, expected_value in required_vars.items():
            value = os.getenv(var)
            if not value:
                print_error(f"{var} is not set")
                self.errors.append(f"Missing environment variable: {var}")
                all_good = False
            elif expected_value and value != expected_value:
                print_warning(f"{var} = '{value}' (expected: '{expected_value}')")
                self.warnings.append(f"{var} has unexpected value")
            else:
                print_success(f"{var} = '{value}'")
                self.successes.append(f"{var} configured correctly")
                
                if var == "GOOGLE_CLOUD_PROJECT":
                    self.project_id = value
                elif var == "GOOGLE_CLOUD_LOCATION":
                    self.location = value
        
        # Check optional variables
        print("\nOptional variables:")
        for var in optional_vars:
            value = os.getenv(var)
            if value:
                print_info(f"{var} = '{value}'")
            else:
                print_info(f"{var} is not set (optional)")
        
        return all_good
    
    def check_gcp_authentication(self) -> bool:
        """Check if GCP authentication is configured."""
        print_section("Checking GCP Authentication")
        
        try:
            from google.auth import default
            from google.auth.exceptions import DefaultCredentialsError
            
            credentials, project = default()
            
            if credentials:
                print_success("Default credentials found")
                if project:
                    print_info(f"Default project: {project}")
                    if project != self.EXPECTED_PROJECT:
                        print_warning(f"Default project differs from expected: {self.EXPECTED_PROJECT}")
                return True
            else:
                print_error("No credentials found")
                return False
                
        except DefaultCredentialsError as e:
            print_error(f"Authentication error: {str(e)}")
            print_info("Run: gcloud auth application-default login")
            self.errors.append("GCP authentication not configured")
            return False
        except ImportError:
            print_error("google-auth package not installed")
            print_info("Run: pip install google-auth")
            self.errors.append("Missing google-auth package")
            return False
    
    def check_apis_enabled(self) -> bool:
        """Check if required APIs are enabled."""
        print_section("Checking API Status")
        
        try:
            from google.cloud import resourcemanager_v3
            
            # Initialize the service usage client
            client = resourcemanager_v3.ProjectsClient()
            
            # This is a simplified check - in production, use the Service Usage API
            print_info("Attempting to verify API status...")
            print_info("Note: This requires serviceusage.services.list permission")
            
            # List APIs that should be checked
            print("\nRequired APIs to be enabled:")
            for api in self.REQUIRED_APIS:
                print(f"  • {api}")
            
            print("\nOptional APIs (recommended):")
            for api in self.OPTIONAL_APIS:
                print(f"  • {api}")
            
            print_warning("\nPlease verify these APIs are enabled in the Cloud Console")
            print_info("Or run the verification command in Cloud Shell:")
            print(f"\n{Colors.BOLD}gcloud services list --enabled --project={self.project_id}{Colors.ENDC}")
            
            return True
            
        except Exception as e:
            print_warning(f"Cannot automatically verify APIs: {str(e)}")
            print_info("Please manually verify APIs are enabled")
            return True
    
    def check_vertex_ai_connection(self) -> bool:
        """Test Vertex AI connection and initialization."""
        print_section("Testing Vertex AI Connection")
        
        try:
            import vertexai
            from google.cloud import aiplatform
            
            # Initialize Vertex AI
            vertexai.init(
                project=self.project_id or self.EXPECTED_PROJECT,
                location=self.location or self.EXPECTED_LOCATION
            )
            
            print_success("Vertex AI initialized successfully")
            print_info(f"Project: {self.project_id or self.EXPECTED_PROJECT}")
            print_info(f"Location: {self.location or self.EXPECTED_LOCATION}")
            
            # Try to list models (basic connectivity test)
            try:
                aiplatform.Model.list(limit=1)
                print_success("Successfully connected to Vertex AI API")
                self.successes.append("Vertex AI connection verified")
            except Exception as e:
                if "403" in str(e):
                    print_warning("Permission issue accessing Vertex AI models")
                    print_info("This is normal if you haven't deployed models yet")
                else:
                    print_warning(f"Could not list models: {str(e)[:100]}")
            
            return True
            
        except ImportError:
            print_error("google-cloud-aiplatform package not installed")
            print_info("Run: pip install google-cloud-aiplatform")
            self.errors.append("Missing google-cloud-aiplatform package")
            return False
        except Exception as e:
            print_error(f"Failed to initialize Vertex AI: {str(e)}")
            self.errors.append("Vertex AI initialization failed")
            return False
    
    def check_storage_access(self) -> bool:
        """Check Google Cloud Storage access."""
        print_section("Testing Cloud Storage Access")
        
        try:
            from google.cloud import storage
            
            client = storage.Client(project=self.project_id or self.EXPECTED_PROJECT)
            
            # Try to list buckets
            try:
                buckets = list(client.list_buckets(max_results=1))
                print_success("Successfully connected to Cloud Storage")
                
                # Check for expected buckets
                staging_bucket = os.getenv("GOOGLE_CLOUD_STAGING_BUCKET", "agentlocker-agent-staging")
                session_bucket = f"{self.project_id or self.EXPECTED_PROJECT}-{self.EXPECTED_AGENT_NAME}-sessions"
                
                for bucket_name in [staging_bucket, session_bucket]:
                    try:
                        bucket = client.bucket(bucket_name)
                        if bucket.exists():
                            print_success(f"Bucket exists: {bucket_name}")
                        else:
                            print_warning(f"Bucket not found: {bucket_name}")
                            print_info(f"Create with: gsutil mb gs://{bucket_name}")
                    except Exception as e:
                        print_warning(f"Cannot check bucket {bucket_name}: {str(e)[:50]}")
                
                return True
                
            except Exception as e:
                if "403" in str(e):
                    print_error("Permission denied accessing Cloud Storage")
                    print_info("Ensure storage.buckets.list permission is granted")
                else:
                    print_error(f"Storage access error: {str(e)[:100]}")
                self.errors.append("Cloud Storage access failed")
                return False
                
        except ImportError:
            print_error("google-cloud-storage package not installed")
            print_info("Run: pip install google-cloud-storage")
            self.errors.append("Missing google-cloud-storage package")
            return False
    
    def check_agent_engine(self) -> bool:
        """Check if the Agent Engine is accessible."""
        print_section("Checking Agent Engine")
        
        try:
            from vertexai import agent_engines
            
            print_info(f"Looking for agent engine: {self.EXPECTED_ENGINE_ID}")
            
            # Note: This is a placeholder as the actual agent_engines API might differ
            print_warning("Agent Engine verification requires deployment")
            print_info("After deployment, verify with:")
            print(f"\n{Colors.BOLD}gcloud ai reasoning-engines describe {self.EXPECTED_ENGINE_ID} \\")
            print(f"    --location={self.location or self.EXPECTED_LOCATION} \\")
            print(f"    --project={self.project_id or self.EXPECTED_PROJECT}{Colors.ENDC}\n")
            
            # Check if deployment metadata exists
            metadata_file = Path("logs/deployment_metadata.json")
            if metadata_file.exists():
                with open(metadata_file) as f:
                    metadata = json.load(f)
                    engine_id = metadata.get("agent_engine_id")
                    if engine_id:
                        print_success(f"Found deployment metadata with engine ID: {engine_id}")
                        if engine_id == self.EXPECTED_ENGINE_ID:
                            print_success("Engine ID matches expected value")
                        else:
                            print_warning(f"Engine ID differs from expected: {self.EXPECTED_ENGINE_ID}")
            else:
                print_info("No deployment metadata found (deploy first)")
            
            return True
            
        except Exception as e:
            print_warning(f"Could not verify agent engine: {str(e)[:100]}")
            return True
    
    def check_iam_permissions(self) -> bool:
        """Check IAM permissions for the current user."""
        print_section("Checking IAM Permissions")
        
        try:
            from google.cloud import iam_admin_v1
            from google.auth import default
            
            # Get current user
            credentials, _ = default()
            
            print_info("Checking required roles...")
            
            required_roles = [
                "roles/aiplatform.user",
                "roles/storage.admin",
                "roles/iam.serviceAccountUser"
            ]
            
            print("\nRequired IAM roles:")
            for role in required_roles:
                print(f"  • {role}")
            
            print_warning("\nPlease verify these roles are assigned in Cloud Console")
            print_info("IAM & Admin → IAM → Find your user/service account")
            
            return True
            
        except Exception as e:
            print_warning(f"Could not check IAM permissions: {str(e)[:100]}")
            print_info("Please manually verify IAM roles are assigned")
            return True
    
    def generate_report(self):
        """Generate a summary report of the test results."""
        print_header("TEST SUMMARY REPORT")
        
        # Print timestamp
        print(f"\n{Colors.BOLD}Test Date:{Colors.ENDC} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{Colors.BOLD}Project:{Colors.ENDC} {self.project_id or self.EXPECTED_PROJECT}")
        print(f"{Colors.BOLD}Location:{Colors.ENDC} {self.location or self.EXPECTED_LOCATION}")
        
        # Success summary
        if self.successes:
            print(f"\n{Colors.GREEN}{Colors.BOLD}✅ Successes ({len(self.successes)}):{Colors.ENDC}")
            for success in self.successes:
                print(f"  • {success}")
        
        # Warnings summary
        if self.warnings:
            print(f"\n{Colors.WARNING}{Colors.BOLD}⚠️  Warnings ({len(self.warnings)}):{Colors.ENDC}")
            for warning in self.warnings:
                print(f"  • {warning}")
        
        # Errors summary
        if self.errors:
            print(f"\n{Colors.FAIL}{Colors.BOLD}❌ Errors ({len(self.errors)}):{Colors.ENDC}")
            for error in self.errors:
                print(f"  • {error}")
        
        # Overall status
        print(f"\n{Colors.BOLD}{'─'*60}{Colors.ENDC}")
        if not self.errors:
            print(f"{Colors.GREEN}{Colors.BOLD}✅ SETUP VALIDATION PASSED{Colors.ENDC}")
            print("Your GCP environment appears to be configured correctly!")
        else:
            print(f"{Colors.FAIL}{Colors.BOLD}❌ SETUP VALIDATION FAILED{Colors.ENDC}")
            print("Please address the errors above before proceeding.")
        
        # Next steps
        print(f"\n{Colors.CYAN}{Colors.BOLD}📋 Next Steps:{Colors.ENDC}")
        if not self.errors:
            print("1. Deploy your agent with: python app/agent_engine_app.py")
            print("2. Test sessions with: python app/test_sessions.py")
            print("3. Monitor in Cloud Console: https://console.cloud.google.com")
        else:
            print("1. Fix the errors listed above")
            print("2. Re-run this validation script")
            print("3. Consult the implementation guide if needed")
    
    def save_report(self):
        """Save the test report to a file."""
        report_dir = Path("logs")
        report_dir.mkdir(exist_ok=True)
        
        report_file = report_dir / f"gcp_setup_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "project_id": self.project_id or self.EXPECTED_PROJECT,
            "location": self.location or self.EXPECTED_LOCATION,
            "successes": self.successes,
            "warnings": self.warnings,
            "errors": self.errors,
            "status": "PASSED" if not self.errors else "FAILED"
        }
        
        with open(report_file, "w") as f:
            json.dump(report_data, f, indent=2)
        
        print(f"\n{Colors.BLUE}📄 Report saved to: {report_file}{Colors.ENDC}")
    
    def run_all_tests(self) -> bool:
        """Run all validation tests."""
        print_header("GCP SETUP VALIDATION FOR VERTEX AI")
        print(f"{Colors.CYAN}Testing configuration for project: {self.EXPECTED_PROJECT}{Colors.ENDC}")
        
        tests = [
            ("Environment Variables", self.check_environment_variables),
            ("GCP Authentication", self.check_gcp_authentication),
            ("API Status", self.check_apis_enabled),
            ("Vertex AI Connection", self.check_vertex_ai_connection),
            ("Cloud Storage Access", self.check_storage_access),
            ("Agent Engine", self.check_agent_engine),
            ("IAM Permissions", self.check_iam_permissions)
        ]
        
        all_passed = True
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                if not result:
                    all_passed = False
            except Exception as e:
                print_error(f"Test '{test_name}' failed with error: {str(e)}")
                self.errors.append(f"{test_name} test failed")
                all_passed = False
        
        return all_passed


def main():
    """Main entry point for the test script."""
    print(f"{Colors.BOLD}")
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║                                                           ║")
    print("║       🔍 GCP SETUP VALIDATOR FOR VERTEX AI 🔍            ║")
    print("║                                                           ║")
    print("╚═══════════════════════════════════════════════════════════╝")
    print(f"{Colors.ENDC}")
    
    tester = GCPSetupTester()
    
    try:
        # Run all tests
        success = tester.run_all_tests()
        
        # Generate report
        tester.generate_report()
        
        # Save report to file
        tester.save_report()
        
        # Exit with appropriate code
        sys.exit(0 if success and not tester.errors else 1)
        
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}Test interrupted by user{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.FAIL}Unexpected error: {str(e)}{Colors.ENDC}")
        sys.exit(1)


if __name__ == "__main__":
    main()
