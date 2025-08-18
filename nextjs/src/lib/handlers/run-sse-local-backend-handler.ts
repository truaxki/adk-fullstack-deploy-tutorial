/**
 * Local Backend Handler for Run SSE API Route
 *
 * Handles streaming requests for local backend deployment configuration.
 * This handler formats requests for local backend endpoints and processes streaming responses.
 */

import { getEndpointForPath, getAuthHeaders } from "@/lib/config";
import {
  ProcessedStreamRequest,
  formatLocalBackendPayload,
  logStreamStart,
  logStreamResponse,
  SSE_HEADERS,
} from "./run-sse-common";
import {
  createInternalServerError,
  createBackendConnectionError,
  createStreamingError,
} from "./error-utils";
import { updateLastActivity } from "@/lib/utils/session-sync";
import { messageService } from "@/lib/services/message-service";
import { supabaseSessionServiceServer } from "@/lib/services/supabase-session-service-server";
import { createSSEInterceptor } from "./sse-stream-interceptor";

/**
 * Save messages to Supabase after successful processing
 */
async function saveMessagesToSupabase(requestData: ProcessedStreamRequest) {
  try {
    console.log("💾 [HANDLER] Saving messages to Supabase for session:", requestData.sessionId);
    
    // First, we need to find the Supabase session ID from the ADK session ID
    const sessionResult = await supabaseSessionServiceServer.findSessionByAdkId(requestData.sessionId);
    
    if (!sessionResult.success || !sessionResult.data) {
      console.warn("⚠️ [HANDLER] Supabase session not found for ADK session:", requestData.sessionId);
      return;
    }
    
    const supabaseSessionId = sessionResult.data.id;
    const userId = sessionResult.data.user_id;
    
    // Get the next sequence number
    const sequenceNumber = await messageService.getNextSequenceNumber(supabaseSessionId);
    
    // Save the user message
    const userMessageResult = await messageService.saveMessage(
      supabaseSessionId,
      userId,
      'human',
      {
        text: requestData.message,
        role: 'user'
      },
      sequenceNumber
    );
    
    if (userMessageResult.success) {
      console.log("✅ [HANDLER] User message saved to Supabase");
    } else {
      console.error("❌ [HANDLER] Failed to save user message:", userMessageResult.error);
    }
    
    // Update session activity
    await updateLastActivity(requestData.sessionId, true);
    
    // Note: AI response will be saved when it's received through the SSE stream
    // This would require parsing the SSE stream, which is complex for streaming responses
    // For now, we're just saving the user message
    
  } catch (error) {
    console.error("❌ [HANDLER] Error saving messages to Supabase:", error);
  }
}

/**
 * Validate that a response is suitable for streaming
 */
function validateStreamingResponse(response: Response): {
  isValid: boolean;
  error?: string;
} {
  if (!response.ok) {
    return {
      isValid: false,
      error: `Backend error: ${response.status} ${response.statusText}`,
    };
  }

  if (!response.body) {
    return {
      isValid: false,
      error: "No response body available for streaming",
    };
  }

  return { isValid: true };
}

/**
 * Handle local backend streaming request
 *
 * @param requestData - Processed request data
 * @returns SSE streaming Response
 */
export async function handleLocalBackendStreamRequest(
  requestData: ProcessedStreamRequest
): Promise<Response> {
  try {
    // Format payload for local backend
    const localBackendPayload = formatLocalBackendPayload(requestData);

    // Build local backend URL with stream endpoint
    const localBackendUrl = `${getEndpointForPath("/run_sse")}`;

    // Log operation start
    logStreamStart(localBackendUrl, localBackendPayload, "local_backend");

    // Get authentication headers
    const authHeaders = await getAuthHeaders();

    // Forward request to local backend
    const response = await fetch(localBackendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(localBackendPayload),
    });

    // Validate response before streaming
    const validation = validateStreamingResponse(response);
    if (!validation.isValid) {
      console.error(`❌ Local backend error: ${validation.error}`);

      // Try to get error details from response
      let errorDetails = validation.error || "Unknown error";
      try {
        const errorText = await response.text();
        console.error(`❌ Error details:`, errorText);
        if (errorText) {
          errorDetails = `${validation.error}. ${errorText}`;
        }
      } catch {
        // If response is already consumed, use original error
      }

      return createBackendConnectionError(
        "local_backend",
        response.status,
        response.statusText,
        errorDetails
      );
    }

    // Log successful response
    logStreamResponse(
      response.status,
      response.statusText,
      response.headers,
      "local_backend"
    );

    // Save user message to Supabase (non-blocking)
    saveMessagesToSupabase(requestData).catch(error => {
      console.warn("⚠️ Failed to save messages to Supabase:", error);
    });

    // Create SSE interceptor to capture and save AI responses
    console.log('🚀 [HANDLER] Creating SSE interceptor for AI response capture:', {
      sessionId: requestData.sessionId,
      userId: requestData.userId,
      hasResponseBody: !!response.body
    });
    
    const interceptor = createSSEInterceptor(requestData.sessionId, requestData.userId);
    
    // Pipe the response through the interceptor
    console.log('🔄 [HANDLER] Piping response through interceptor...');
    const interceptedStream = response.body!.pipeThrough(interceptor);
    
    console.log('✅ [HANDLER] Interceptor pipeline established, returning SSE response');

    // Return the intercepted stream
    return new Response(interceptedStream, {
      status: 200,
      headers: SSE_HEADERS,
    });
  } catch (error) {
    console.error("❌ Local backend handler error:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return createBackendConnectionError(
        "local_backend",
        500,
        "Connection failed",
        "Failed to connect to local backend"
      );
    }

    return createStreamingError(
      "local_backend",
      error,
      "Failed to process local backend streaming request"
    );
  }
}

/**
 * Validate local backend configuration
 *
 * @returns Validation result
 */
export function validateLocalBackendConfig(): {
  isValid: boolean;
  error?: string;
} {
  try {
    const endpoint = getEndpointForPath("/stream");
    if (!endpoint) {
      return {
        isValid: false,
        error: "Local backend endpoint not configured",
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `Local backend configuration error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Create local backend specific error response
 *
 * @param error - Error message
 * @param details - Additional error details
 * @returns Error Response
 */
export function createLocalBackendError(
  error: string,
  details?: unknown
): Response {
  console.error("❌ Local Backend Error:", error, details);

  return createInternalServerError(
    `Local Backend Error: ${error}`,
    details instanceof Error ? details : new Error(String(details))
  );
}
