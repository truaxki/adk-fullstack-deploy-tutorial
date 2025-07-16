import { NextRequest } from "next/server";
import {
  endpointConfig,
  getEndpointForPath,
  shouldUseAgentEngine,
  getAuthHeaders,
} from "@/lib/config";

// Type definitions for ADK agent response structure
interface ContentPart {
  text: string;
  thought?: boolean;
}

interface AdkAgentResponse {
  content?: {
    parts: ContentPart[];
  };
  output?: string;
  response?: string;
  role?: string;
  usageMetadata?: unknown;
  actions?: unknown;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Parse the request body
    const requestBody = await request.json();

    // Get the appropriate endpoint based on deployment type
    const endpoint = getEndpointForPath("/run_sse");

    // Log endpoint configuration in development
    if (process.env.NODE_ENV === "development") {
      console.log(`📡 Run SSE API - Using endpoint: ${endpoint}`);
      console.log(`📡 Deployment type: ${endpointConfig.deploymentType}`);
    }

    // Handle Agent Engine vs regular backend deployment
    if (shouldUseAgentEngine()) {
      // For Agent Engine, convert the request to query format
      const agentEnginePayload = {
        input: {
          query: requestBody.query || requestBody.message || "",
          sessionId: requestBody.sessionId,
          userId: requestBody.userId,
        },
      };

      // Forward the request to Agent Engine
      const authHeaders = await getAuthHeaders();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
          // Forward any authentication headers if present
          ...(request.headers.get("authorization") && {
            authorization: request.headers.get("authorization")!,
          }),
        },
        body: JSON.stringify(agentEnginePayload),
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: `Agent Engine error: ${response.status} ${response.statusText}`,
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle Agent Engine response format and convert to SSE
      const agentResponse = await response.json();

      // Convert Agent Engine response to SSE format
      const sseData = {
        content: {
          parts: [
            { text: agentResponse.output || agentResponse.response || "" },
          ],
        },
      };

      // Return as SSE stream
      const stream = new ReadableStream({
        start(controller) {
          const chunk = `data: ${JSON.stringify(sseData)}\n\n`;
          const encodedChunk = new TextEncoder().encode(chunk);
          controller.enqueue(encodedChunk);
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    } else {
      // For regular backend deployment (local or Cloud Run)
      const authHeaders = await getAuthHeaders();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...authHeaders,
          // Forward any authentication headers if present
          ...(request.headers.get("authorization") && {
            authorization: request.headers.get("authorization")!,
          }),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: `Backend error: ${response.status} ${response.statusText}`,
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create a new ReadableStream to proxy the SSE response
      const stream = new ReadableStream({
        start(controller) {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          function pump(): Promise<void> {
            return reader!
              .read()
              .then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }

                // Decode the chunk and add to buffer
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // Process complete SSE messages
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    try {
                      const jsonData = line.substring(6); // Remove 'data: ' prefix
                      if (jsonData.trim()) {
                        const rawParsed = JSON.parse(jsonData) as
                          | AdkAgentResponse
                          | AdkAgentResponse[];

                        // Handle case where ADK agent returns an array with single response
                        const parsed: AdkAgentResponse =
                          Array.isArray(rawParsed) && rawParsed.length > 0
                            ? rawParsed[0]
                            : (rawParsed as AdkAgentResponse);

                        // Extract readable text from ADK agent response
                        let extractedText = "";

                        if (parsed.content && parsed.content.parts) {
                          // Handle content.parts structure from ADK agent
                          const textParts = parsed.content.parts
                            .filter(
                              (part: ContentPart) => !part.thought && part.text
                            ) // Skip thought parts
                            .map((part: ContentPart) => part.text);
                          extractedText = textParts.join("");
                        } else if (parsed.output) {
                          // Handle direct output field
                          extractedText = parsed.output;
                        } else if (parsed.response) {
                          // Handle response field
                          extractedText = parsed.response;
                        } else if (typeof parsed === "string") {
                          // Handle direct string response
                          extractedText = parsed;
                        }

                        // Create properly formatted SSE response
                        const sseData = {
                          content: {
                            parts: [{ text: extractedText }],
                          },
                        };

                        const formattedChunk = `data: ${JSON.stringify(
                          sseData
                        )}\n\n`;
                        const encodedChunk = new TextEncoder().encode(
                          formattedChunk
                        );
                        controller.enqueue(encodedChunk);
                      }
                    } catch (error) {
                      console.error("Error parsing SSE data:", error);
                      // If parsing fails, forward the original line
                      const encodedChunk = new TextEncoder().encode(
                        line + "\n"
                      );
                      controller.enqueue(encodedChunk);
                    }
                  } else if (line.trim()) {
                    // Forward non-data lines (like comments or other SSE events)
                    const encodedChunk = new TextEncoder().encode(line + "\n");
                    controller.enqueue(encodedChunk);
                  }
                }

                // Continue reading
                return pump();
              })
              .catch((error) => {
                console.error("SSE stream error:", error);
                controller.error(error);
              });
          }

          return pump();
        },
      });

      // Return the streaming response with appropriate headers for SSE
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }
  } catch (error) {
    console.error("SSE endpoint error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process SSE request",
        deploymentType: endpointConfig.deploymentType,
        environment: endpointConfig.environment,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
