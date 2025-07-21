/**
 * Agent Engine Handler for Run SSE API Route
 *
 * Handles requests for Agent Engine deployment configuration.
 * This handler formats requests for Agent Engine endpoints and processes complete responses.
 */

import { getEndpointForPath, getAuthHeaders } from "@/lib/config";
import {
  ProcessedStreamRequest,
  formatAgentEnginePayload,
  logStreamStart,
  logStreamResponse,
} from "./run-sse-common";
import {
  createInternalServerError,
  createBackendConnectionError,
} from "./error-utils";
import { NextResponse } from "next/server";

/**
 * Handle Agent Engine request (non-streaming)
 *
 * @param requestData - Processed request data
 * @returns JSON Response with complete data from Agent Engine
 */
export async function handleAgentEngineStreamRequest(
  requestData: ProcessedStreamRequest
): Promise<Response> {
  try {
    // Format payload for Agent Engine
    const agentEnginePayload = formatAgentEnginePayload(requestData);

    // Build Agent Engine URL with the non-streaming :query endpoint
    const agentEngineUrl = getEndpointForPath("", "query");

    // Log operation start
    logStreamStart(agentEngineUrl, agentEnginePayload, "agent_engine");

    // Get authentication headers
    const authHeaders = await getAuthHeaders();

    // Forward request to Agent Engine and wait for the complete response
    const response = await fetch(agentEngineUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(agentEnginePayload),
    });

    // Log the response from Agent Engine
    logStreamResponse(
      response.status,
      response.statusText,
      response.headers,
      "agent_engine"
    );

    // Check for errors from Agent Engine
    if (!response.ok) {
      let errorDetails = `Agent Engine returned an error: ${response.status} ${response.statusText}`;
      try {
        const errorText = await response.text();
        console.error(`❌ Agent Engine error details:`, errorText);
        if (errorText) {
          errorDetails += `. ${errorText}`;
        }
      } catch {
        // Response body might not be available or already consumed
      }
      return createBackendConnectionError(
        "agent_engine",
        response.status,
        response.statusText,
        errorDetails
      );
    }

    // Parse the complete JSON response
    const responseData = await response.json();

    // Return the complete data as a single JSON response
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("❌ Agent Engine handler error:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return createBackendConnectionError(
        "agent_engine",
        500,
        "Connection failed",
        "Failed to connect to Agent Engine"
      );
    }

    return createInternalServerError(
      "agent_engine",
      error,
      "Failed to process Agent Engine request"
    );
  }
}

/**
 * Validate Agent Engine configuration
 *
 * @returns Validation result
 */
export function validateAgentEngineConfig(): {
  isValid: boolean;
  error?: string;
} {
  try {
    const endpoint = getEndpointForPath("", "query");
    if (!endpoint) {
      return {
        isValid: false,
        error: "Agent Engine endpoint not configured",
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `Agent Engine configuration error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Create Agent Engine specific error response
 *
 * @param error - Error message
 * @param details - Additional error details
 * @returns Error Response
 */
export function createAgentEngineError(
  error: string,
  details?: unknown
): Response {
  console.error("❌ Agent Engine Error:", error, details);

  return createInternalServerError(
    `Agent Engine Error: ${error}`,
    details instanceof Error ? details : new Error(String(details))
  );
}
