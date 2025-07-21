/**
 * Agent Engine Handler for Run SSE API Route
 *
 * Handles requests for Agent Engine deployment configuration.
 * This handler formats requests for Agent Engine endpoints and streams real-time responses.
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

/**
 * Handle Agent Engine streaming request with real-time SSE forwarding
 *
 * @param requestData - Processed request data
 * @returns Streaming SSE Response forwarding Agent Engine data
 */
export async function handleAgentEngineStreamRequest(
  requestData: ProcessedStreamRequest
): Promise<Response> {
  try {
    // Format payload for Agent Engine
    const agentEnginePayload = formatAgentEnginePayload(requestData);

    // Build Agent Engine URL with the streaming :streamQuery?alt=sse endpoint
    const agentEngineUrl = getEndpointForPath("", "streamQuery");

    // Log operation start
    logStreamStart(agentEngineUrl, agentEnginePayload, "agent_engine");

    // Get authentication headers
    const authHeaders = await getAuthHeaders();

    // Forward request to Agent Engine streaming endpoint
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
        if (errorDetails && errorText) {
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

    // Create SSE streaming response to forward Agent Engine stream
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.error(new Error("No readable stream from Agent Engine"));
          return;
        }

        console.log("🔄 [AGENT ENGINE] Starting SSE stream forwarding");

        try {
          // Read and forward chunks from Agent Engine
          let done = false;
          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;

            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              console.log(
                `📡 [AGENT ENGINE] Forwarding chunk: ${chunk.length} bytes`
              );

              // Forward the chunk to the frontend as-is
              // Agent Engine should already provide properly formatted SSE
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          }

          console.log("✅ [AGENT ENGINE] Stream forwarding completed");
          controller.close();
        } catch (error) {
          console.error("❌ [AGENT ENGINE] Stream forwarding error:", error);
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });

    // Return streaming SSE response with proper headers
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
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
      "Failed to process Agent Engine streaming request"
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
    const endpoint = getEndpointForPath("", "streamQuery");
    if (!endpoint) {
      return {
        isValid: false,
        error: "Agent Engine streaming endpoint not configured",
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
