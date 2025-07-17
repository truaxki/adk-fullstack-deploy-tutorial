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
 * Uses the same authentication approach as the main config
 */
async function getAccessToken(): Promise<string> {
  try {
    // Use base64-encoded service account key from environment variables (for Vercel deployment)
    const serviceAccountKeyBase64 =
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;

    if (!serviceAccountKeyBase64) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is required for Agent Engine deployment"
      );
    }

    // Decode the base64-encoded service account key
    const serviceAccountKeyJson = Buffer.from(
      serviceAccountKeyBase64,
      "base64"
    ).toString("utf-8");
    const credentials = JSON.parse(serviceAccountKeyJson);

    // Use the service account to get an access token
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();

    if (!accessToken.token) {
      throw new Error("Failed to get access token");
    }

    return accessToken.token;
  } catch (error) {
    console.error("Error getting access token:", error);
    throw new Error("Authentication failed");
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
 * Streams a query to Agent Engine using the real streaming endpoint
 */
export async function streamAgentEngineQuery(
  query: AgentEngineQuery
): Promise<ReadableStream<Uint8Array>> {
  return new ReadableStream({
    async start(controller) {
      try {
        if (!endpointConfig.agentEngineUrl) {
          throw new Error("Agent Engine URL not configured");
        }

        const accessToken = await getAccessToken();
        const streamQueryPayload = {
          class_method: "stream_query",
          input: {
            user_id: query.userId || "user",
            session_id: query.sessionId || "session",
            message: query.query,
          },
        };

        const response = await fetch(
          `${endpointConfig.agentEngineUrl}:streamQuery?alt=sse`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "X-Goog-User-Project": process.env.GOOGLE_CLOUD_PROJECT || "",
            },
            body: JSON.stringify(streamQueryPayload),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Agent Engine streaming error:", {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });

          // Send error as SSE
          const errorData = {
            error: `Agent Engine streaming error: ${response.status} ${response.statusText}`,
          };
          const chunk = `data: ${JSON.stringify(errorData)}\n\n`;
          const encodedChunk = new TextEncoder().encode(chunk);
          controller.enqueue(encodedChunk);
          controller.close();
          return;
        }

        // Stream the real response
        if (!response.body) {
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        async function pump() {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              // Forward the SSE chunk as-is
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          } catch (error) {
            console.error("Error reading Agent Engine stream:", error);
            controller.error(error);
          } finally {
            controller.close();
          }
        }

        pump();
      } catch (error) {
        console.error("Error setting up Agent Engine stream:", error);
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
