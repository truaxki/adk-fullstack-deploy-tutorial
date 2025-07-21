import { getEndpointForPath, getAuthHeaders } from "@/lib/config";
import {
  ProcessedRequest,
  createSessionForAgentEngine,
  formatGoalMessage,
  logStreamStart,
  logStreamResponse,
} from "./common";
import {
  createPassThroughStream,
  createStreamingResponse,
} from "./streaming-utils";
import {
  handleFetchError,
  validateStreamingResponseOrCreateError,
} from "./error-utils";

/**
 * Agent Engine deployment strategy handler
 * Handles goal planning requests using the Agent Engine backend
 */
export async function handleAgentEngineGoalPlanning(
  requestData: ProcessedRequest
): Promise<Response> {
  const { goal, sessionId, userId } = requestData;

  try {
    // Create or ensure session exists for Agent Engine
    const sessionResult = await createSessionForAgentEngine(userId, sessionId);
    const finalSessionId = sessionResult.sessionId;

    // Prepare the stream query payload for Agent Engine
    const streamQueryPayload = {
      class_method: "stream_query",
      input: {
        user_id: userId,
        session_id: finalSessionId,
        message: formatGoalMessage(goal),
      },
    };

    // Log the start of streaming operation
    logStreamStart(finalSessionId, "agent_engine");
    console.log(
      `📤 Agent Engine stream payload:`,
      JSON.stringify(streamQueryPayload, null, 2)
    );

    // Get the streaming endpoint and make the request
    const streamEndpoint = getEndpointForPath("", "streamQuery");
    const authHeaders = await getAuthHeaders();

    const streamResponse = await fetch(streamEndpoint, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(streamQueryPayload),
    });

    // Log response details
    logStreamResponse(
      streamResponse.status,
      streamResponse.statusText,
      streamResponse.headers,
      "agent_engine"
    );

    // Validate the streaming response
    const validationError = await validateStreamingResponseOrCreateError(
      streamResponse,
      "agent_engine"
    );

    if (validationError) {
      return validationError;
    }

    // Create and return the streaming response
    console.log(
      `🌊 Setting up Agent Engine goal planning stream forwarding...`
    );

    const stream = createPassThroughStream(streamResponse, "agent_engine");
    return createStreamingResponse(stream);
  } catch (error) {
    // Handle any fetch or processing errors
    return await handleFetchError(
      error,
      "agent_engine",
      "goal planning stream"
    );
  }
}
