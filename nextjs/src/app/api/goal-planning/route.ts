import { NextRequest } from "next/server";
import { shouldUseAgentEngine } from "@/lib/config";
import {
  parseRequest,
  logGoalPlanningRequest,
  CORS_HEADERS,
} from "@/lib/handlers/common";
import {
  createValidationError,
  createInternalServerError,
} from "@/lib/handlers/error-utils";
import { handleAgentEngineGoalPlanning } from "@/lib/handlers/agent-engine-handler";
import { handleLocalBackendGoalPlanning } from "@/lib/handlers/local-backend-handler";

/**
 * Goal Planning API Route - Main Orchestrator
 * Uses strategy pattern to delegate to appropriate deployment handler
 *
 * @param request - The incoming HTTP request
 * @returns Streaming SSE response with goal planning results
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Parse and validate the incoming request
    const { data: requestData, validation } = await parseRequest(request);

    if (!validation.isValid || !requestData) {
      return createValidationError(
        validation.error || "Invalid request format"
      );
    }

    // Determine deployment strategy based on configuration
    const deploymentType = shouldUseAgentEngine()
      ? "agent_engine"
      : "local_backend";

    // Log the incoming request with deployment strategy
    logGoalPlanningRequest(
      requestData.sessionId,
      requestData.userId,
      requestData.goal,
      deploymentType
    );

    // Delegate to appropriate deployment strategy handler
    if (deploymentType === "agent_engine") {
      return await handleAgentEngineGoalPlanning(requestData);
    } else {
      return await handleLocalBackendGoalPlanning(requestData);
    }
  } catch (error) {
    // Handle any unexpected errors at the top level
    return createInternalServerError(
      "Failed to process goal planning request",
      error
    );
  }
}

/**
 * Handle preflight requests for CORS
 * @returns CORS headers for preflight requests
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
