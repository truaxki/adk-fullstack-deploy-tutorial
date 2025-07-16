/**
 * Google Cloud Agent Engine client for Next.js API routes
 * Handles authentication, API calls, and response formatting
 */

import { endpointConfig } from "./config";

export interface AgentEngineQuery {
  query: string;
  sessionId?: string;
  userId?: string;
  context?: Record<string, unknown>;
}

export interface AgentEngineResponse {
  output?: string;
  response?: string;
  content?: {
    parts: Array<{ text: string }>;
  };
  error?: string;
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

/**
 * Gets the access token for Google Cloud API authentication
 * In cloud environments, this uses the service account attached to the service
 * In local environments, this uses application default credentials
 */
async function getAccessToken(): Promise<string> {
  try {
    // In cloud environments (Cloud Run, Agent Engine), use the metadata server
    if (process.env.GOOGLE_CLOUD_PROJECT || process.env.K_SERVICE) {
      const response = await fetch(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        {
          headers: {
            "Metadata-Flavor": "Google",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      }
    }

    // For local development, we'll need to handle this differently
    // In a real implementation, you'd use the Google Auth library
    console.warn(
      "No access token available. Using empty token for local development."
    );
    return "";
  } catch (error) {
    console.error("Error getting access token:", error);
    return "";
  }
}

/**
 * Formats the query for Agent Engine API
 */
function formatAgentEngineQuery(query: AgentEngineQuery): object {
  return {
    input: {
      query: query.query,
      sessionId: query.sessionId,
      userId: query.userId,
      ...query.context,
    },
  };
}

/**
 * Processes Agent Engine response and extracts text content
 */
function processAgentEngineResponse(response: AgentEngineResponse): {
  text: string;
  success: boolean;
  error?: string;
} {
  // Handle different response formats from Agent Engine
  if (response.error) {
    return {
      text: "",
      success: false,
      error: response.error,
    };
  }

  // Try to extract text from various response formats
  let text = "";

  if (response.output) {
    text = response.output;
  } else if (response.response) {
    text = response.response;
  } else if (response.content?.parts?.[0]?.text) {
    text = response.content.parts[0].text;
  } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
    text = response.candidates[0].content.parts[0].text;
  }

  return {
    text,
    success: true,
  };
}

/**
 * Queries the Agent Engine with proper authentication and error handling
 */
export async function queryAgentEngine(query: AgentEngineQuery): Promise<{
  text: string;
  success: boolean;
  error?: string;
}> {
  try {
    if (!endpointConfig.agentEngineUrl) {
      throw new Error("Agent Engine URL not configured");
    }

    const accessToken = await getAccessToken();
    const queryPayload = formatAgentEngineQuery(query);

    const response = await fetch(`${endpointConfig.agentEngineUrl}:query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Goog-User-Project": process.env.GOOGLE_CLOUD_PROJECT || "",
      },
      body: JSON.stringify(queryPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agent Engine API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return {
        text: "",
        success: false,
        error: `Agent Engine API error: ${response.status} ${response.statusText}`,
      };
    }

    const responseData: AgentEngineResponse = await response.json();
    return processAgentEngineResponse(responseData);
  } catch (error) {
    console.error("Error querying Agent Engine:", error);
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Streams a query to Agent Engine and returns a ReadableStream
 * Note: Agent Engine may not support streaming, so we'll simulate it
 */
export async function streamAgentEngineQuery(
  query: AgentEngineQuery
): Promise<ReadableStream<Uint8Array>> {
  return new ReadableStream({
    async start(controller) {
      try {
        const result = await queryAgentEngine(query);

        if (result.success) {
          // Convert response to SSE format
          const sseData = {
            content: {
              parts: [{ text: result.text }],
            },
          };

          const chunk = `data: ${JSON.stringify(sseData)}\n\n`;
          const encodedChunk = new TextEncoder().encode(chunk);
          controller.enqueue(encodedChunk);
        } else {
          // Send error as SSE
          const errorData = {
            error: result.error || "Unknown error",
          };

          const chunk = `data: ${JSON.stringify(errorData)}\n\n`;
          const encodedChunk = new TextEncoder().encode(chunk);
          controller.enqueue(encodedChunk);
        }

        controller.close();
      } catch (error) {
        console.error("Error streaming Agent Engine query:", error);
        controller.error(error);
      }
    },
  });
}

/**
 * Validates Agent Engine configuration
 */
export function validateAgentEngineConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!endpointConfig.agentEngineUrl) {
    errors.push("Agent Engine URL not configured");
  }

  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    errors.push("GOOGLE_CLOUD_PROJECT environment variable not set");
  }

  if (!process.env.REASONING_ENGINE_ID) {
    errors.push("REASONING_ENGINE_ID environment variable not set");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Health check for Agent Engine
 */
export async function checkAgentEngineHealth(): Promise<{
  healthy: boolean;
  error?: string;
}> {
  try {
    const result = await queryAgentEngine({
      query: "Health check",
      sessionId: "health-check",
      userId: "system",
    });

    return {
      healthy: result.success,
      error: result.error,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
