import { getEndpointForPath, getAuthHeaders } from "@/lib/config";
import {
  ProcessedRequest,
  createSessionForLocalBackend,
  formatGoalMessage,
  logStreamStart,
  logStreamResponse,
} from "./common";
import {
  createAdkProcessingStream,
  createStreamingResponse,
} from "./streaming-utils";
import {
  handleFetchError,
  validateStreamingResponseOrCreateError,
} from "./error-utils";

/**
 * Local Backend deployment strategy handler
 * Handles goal planning requests using the local ADK backend
 */
export async function handleLocalBackendGoalPlanning(
  requestData: ProcessedRequest
): Promise<Response> {
  const { goal, sessionId, userId } = requestData;

  try {
    // Create or ensure session exists for local backend
    const sessionResult = await createSessionForLocalBackend(userId, sessionId);
    const finalSessionId = sessionResult.sessionId;

    // Prepare the ADK payload matching the example app's format
    const adkPayload = {
      appName: "app",
      userId: userId,
      sessionId: finalSessionId,
      newMessage: {
        parts: [
          {
            text: formatGoalMessage(goal),
          },
        ],
        role: "user", // Added role like the example
      },
      streaming: true, // Enable real-time streaming
    };

    // Log the start of streaming operation
    logStreamStart(finalSessionId, "local_backend");
    console.log(
      `📤 Local backend ADK payload:`,
      JSON.stringify(adkPayload, null, 2)
    );

    // Get the run endpoint and make the request
    const runEndpoint = getEndpointForPath("/run_sse");
    const runAuthHeaders = await getAuthHeaders();

    const response = await fetch(runEndpoint, {
      method: "POST",
      headers: {
        ...runAuthHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(adkPayload),
    });

    // Log response details
    logStreamResponse(
      response.status,
      response.statusText,
      response.headers,
      "local_backend"
    );

    // Validate the streaming response
    const validationError = await validateStreamingResponseOrCreateError(
      response,
      "local_backend"
    );

    if (validationError) {
      return validationError;
    }

    // Create and return the streaming response with ADK processing
    console.log(
      `🌊 Setting up local backend goal planning stream with ADK processing...`
    );

    const stream = createAdkProcessingStream(response);
    return createStreamingResponse(stream);
  } catch (error) {
    // Handle any fetch or processing errors
    return await handleFetchError(
      error,
      "local_backend",
      "goal planning stream"
    );
  }
}
