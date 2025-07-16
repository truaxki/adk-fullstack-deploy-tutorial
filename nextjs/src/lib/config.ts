/**
 * Environment-based configuration for Next.js API endpoints
 * Handles both local development and cloud deployment contexts
 */

export interface EndpointConfig {
  backendUrl: string;
  agentEngineUrl?: string;
  environment: "local" | "cloud";
  deploymentType: "local" | "agent_engine" | "cloud_run";
}

/**
 * Detects the current deployment environment based on available environment variables
 */
function detectEnvironment(): EndpointConfig["environment"] {
  // Check for Google Cloud deployment indicators
  if (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.K_SERVICE ||
    process.env.FUNCTION_NAME
  ) {
    return "cloud";
  }

  // Default to local development
  return "local";
}

/**
 * Detects the deployment type based on environment variables
 */
function detectDeploymentType(): EndpointConfig["deploymentType"] {
  // Check for Agent Engine deployment
  if (process.env.AGENT_ENGINE_ENDPOINT || process.env.REASONING_ENGINE_ID) {
    return "agent_engine";
  }

  // Check for Cloud Run deployment
  if (process.env.K_SERVICE || process.env.CLOUD_RUN_SERVICE) {
    return "cloud_run";
  }

  // Default to local development
  return "local";
}

/**
 * Gets the backend URL based on deployment context
 */
function getBackendUrl(): string {
  const deploymentType = detectDeploymentType();

  switch (deploymentType) {
    case "agent_engine":
      // Agent Engine endpoint - use the specific endpoint if provided
      if (process.env.AGENT_ENGINE_ENDPOINT) {
        return process.env.AGENT_ENGINE_ENDPOINT;
      }
      // Fallback to constructed Agent Engine URL
      const project = process.env.GOOGLE_CLOUD_PROJECT;
      const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
      const reasoningEngineId = process.env.REASONING_ENGINE_ID;

      if (project && reasoningEngineId) {
        return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/reasoningEngines/${reasoningEngineId}`;
      }
      break;

    case "cloud_run":
      // Cloud Run deployment - use the service URL
      if (process.env.CLOUD_RUN_SERVICE_URL) {
        return process.env.CLOUD_RUN_SERVICE_URL;
      }
      break;

    case "local":
    default:
      // Local development - use configured backend URL or default
      return process.env.BACKEND_URL || "http://127.0.0.1:8000";
  }

  // Fallback to default local development URL
  return process.env.BACKEND_URL || "http://127.0.0.1:8000";
}

/**
 * Gets the Agent Engine URL for direct Agent Engine API calls
 */
function getAgentEngineUrl(): string | undefined {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
  const reasoningEngineId = process.env.REASONING_ENGINE_ID;

  if (project && reasoningEngineId) {
    return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/reasoningEngines/${reasoningEngineId}`;
  }

  return undefined;
}

/**
 * Creates the endpoint configuration based on current environment
 */
export function createEndpointConfig(): EndpointConfig {
  const environment = detectEnvironment();
  const deploymentType = detectDeploymentType();

  const config: EndpointConfig = {
    backendUrl: getBackendUrl(),
    agentEngineUrl: getAgentEngineUrl(),
    environment,
    deploymentType,
  };

  // Log configuration in development
  if (process.env.NODE_ENV === "development") {
    console.log("🔧 Endpoint Configuration:", {
      environment: config.environment,
      deploymentType: config.deploymentType,
      backendUrl: config.backendUrl,
      agentEngineUrl: config.agentEngineUrl,
    });
  }

  return config;
}

/**
 * Get the current endpoint configuration
 */
export const endpointConfig = createEndpointConfig();

/**
 * Utility function to get authentication headers for Google Cloud API calls
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // In cloud environments, use service account authentication
  if (endpointConfig.environment === "cloud") {
    // Service account token will be automatically injected by the runtime
    // For Agent Engine, we'll use the Google Cloud client libraries
    return headers;
  }

  // For local development, use application default credentials
  return headers;
}

/**
 * Determines if we should use Agent Engine API directly
 */
export function shouldUseAgentEngine(): boolean {
  return (
    endpointConfig.deploymentType === "agent_engine" &&
    Boolean(endpointConfig.agentEngineUrl)
  );
}

/**
 * Gets the appropriate endpoint for a given API path
 */
export function getEndpointForPath(path: string): string {
  if (shouldUseAgentEngine()) {
    // For Agent Engine, we need to use the query endpoint
    return `${endpointConfig.agentEngineUrl}:query`;
  }

  // For other deployments, append the path to the backend URL
  return `${endpointConfig.backendUrl}${path}`;
}
