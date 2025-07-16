import { NextRequest, NextResponse } from "next/server";
import { GoalInput, ApiResponse } from "@/types";
import {
  getEndpointForPath,
  shouldUseAgentEngine,
  getAuthHeaders,
} from "@/lib/config";

// Type definitions for ADK agent response structure
interface ContentPart {
  text?: string;
  thought?: boolean;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
    id: string;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
    id: string;
  };
}

interface AdkAgentResponse {
  content?: {
    parts: ContentPart[];
  };
  author?: string;
  actions?: {
    stateDelta?: {
      research_plan?: string;
      final_report_with_citations?: boolean;
      url_to_short_id?: Record<string, string>;
      sources?: Record<string, { title: string; url: string }>;
    };
  };
  usageMetadata?: {
    candidatesTokenCount: number;
    promptTokenCount: number;
    totalTokenCount: number;
  };
  output?: string;
  response?: string;
  role?: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Parse the request body
    const requestBody = (await request.json()) as {
      goal: GoalInput;
      sessionId?: string;
      userId?: string;
    };

    // Validate required fields
    if (!requestBody.goal?.title || !requestBody.goal?.description) {
      return NextResponse.json(
        {
          success: false,
          error: "Goal title and description are required",
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // Prepare session and user IDs
    const sessionId = requestBody.sessionId || `session-${Date.now()}`;
    const userId = requestBody.userId || "user";

    // Log endpoint configuration in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `📡 Goal Planning API - Session: ${sessionId}, User: ${userId}`
      );
    }

    // Handle Agent Engine vs regular backend deployment
    if (shouldUseAgentEngine()) {
      // For Agent Engine, use the query format
      const agentEnginePayload = {
        input: {
          query: `Goal: ${requestBody.goal.title}\n\nDescription: ${requestBody.goal.description}`,
          sessionId: sessionId,
          userId: userId,
        },
      };

      // Get the appropriate endpoint based on deployment type
      const endpoint = getEndpointForPath("/run");

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
        const errorText = await response.text();
        console.error(
          "Agent Engine error:",
          response.status,
          response.statusText,
          errorText
        );
        return NextResponse.json(
          {
            success: false,
            error: `Agent Engine error: ${response.status} ${response.statusText}`,
          } as ApiResponse<never>,
          { status: response.status }
        );
      }

      // Handle Agent Engine response format
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
      // For regular backend deployment (local ADK server)

      // First, create or ensure session exists (like the example app)
      const sessionEndpoint = getEndpointForPath(
        `/apps/app/users/${userId}/sessions/${sessionId}`
      );

      try {
        const sessionAuthHeaders = await getAuthHeaders();
        const sessionResponse = await fetch(sessionEndpoint, {
          method: "POST",
          headers: {
            ...sessionAuthHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!sessionResponse.ok && sessionResponse.status !== 409) {
          console.error(
            "Session creation failed:",
            sessionResponse.status,
            await sessionResponse.text()
          );
        } else {
          console.log("Session created/verified successfully");
        }
      } catch (sessionError) {
        console.error("Session creation error:", sessionError);
      }

      // Prepare the ADK payload matching the example app's format
      const adkPayload = {
        appName: "app",
        userId: userId,
        sessionId: sessionId,
        newMessage: {
          parts: [
            {
              text: `Goal: ${requestBody.goal.title}\n\nDescription: ${requestBody.goal.description}`,
            },
          ],
          role: "user", // Added role like the example
        },
        streaming: true, // Enable real-time streaming
      };

      // Get the run endpoint
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Backend error:",
          response.status,
          response.statusText,
          errorText
        );
        return NextResponse.json(
          {
            success: false,
            error: `Backend error: ${response.status} ${response.statusText}`,
          } as ApiResponse<never>,
          { status: response.status }
        );
      }

      // Handle streaming response with enhanced ADK response parsing
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
                        let rawParsed = JSON.parse(jsonData) as
                          | AdkAgentResponse
                          | AdkAgentResponse[]
                          | string;

                        // Handle case where ADK agent returns data as a string
                        if (typeof rawParsed === "string") {
                          rawParsed = JSON.parse(rawParsed) as
                            | AdkAgentResponse
                            | AdkAgentResponse[];
                        }

                        // Handle case where ADK agent returns an array with single response
                        const parsed: AdkAgentResponse =
                          Array.isArray(rawParsed) && rawParsed.length > 0
                            ? rawParsed[0]
                            : (rawParsed as AdkAgentResponse);

                        // Forward the complete parsed response to frontend
                        // This preserves all the metadata (author, actions, etc.)
                        const sseData = {
                          content: parsed.content || {
                            parts: [
                              { text: parsed.output || parsed.response || "" },
                            ],
                          },
                          author: parsed.author,
                          actions: parsed.actions,
                          usageMetadata: parsed.usageMetadata,
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
                      console.error("Error parsing ADK response:", error);
                      // Forward original line if parsing fails
                      const encodedChunk = new TextEncoder().encode(
                        line + "\n"
                      );
                      controller.enqueue(encodedChunk);
                    }
                  } else if (line.trim() === "") {
                    // Forward empty lines (SSE event separators)
                    const encodedChunk = new TextEncoder().encode("\n");
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
    console.error("Goal planning endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process goal planning request",
      } as ApiResponse<never>,
      { status: 500 }
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
