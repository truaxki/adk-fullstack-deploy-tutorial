// https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/use/overview#requests_3
// https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/use/adk#get-session

import { NextRequest } from "next/server";
import {
  endpointConfig,
  getAgentEngineQueryEndpoint,
  getAgentEngineStreamEndpoint,
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
  author?: string;
  usageMetadata?: unknown;
  actions?: unknown;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Parse the request body
    const requestBody = await request.json();

    // Get the appropriate endpoints based on deployment type
    const sessionEndpoint = shouldUseAgentEngine()
      ? getAgentEngineQueryEndpoint()
      : `${endpointConfig.backendUrl}/run_sse`;
    const streamEndpoint = shouldUseAgentEngine()
      ? getAgentEngineStreamEndpoint()
      : `${endpointConfig.backendUrl}/run_sse`;

    // Log endpoint configuration (always log in production for debugging)
    console.log(`📡 Run SSE API - Session endpoint: ${sessionEndpoint}`);
    console.log(`📡 Run SSE API - Stream endpoint: ${streamEndpoint}`);
    console.log(`📡 Deployment type: ${endpointConfig.deploymentType}`);
    console.log(`📡 Request body:`, JSON.stringify(requestBody, null, 2));
    console.log(`📡 Should use Agent Engine: ${shouldUseAgentEngine()}`);
    console.log(`📡 user id: ${requestBody.userId}`);
    console.log(`📡 session id: ${requestBody.sessionId}`);

    // Handle Agent Engine vs regular backend deployment
    if (shouldUseAgentEngine()) {
      // Check if this is a session listing request
      if (requestBody.action === "list_sessions") {
        const userId = requestBody.userId;
        if (!userId) {
          return new Response(
            JSON.stringify({
              error: "User ID is required for listing sessions",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const listSessionsPayload = {
          class_method: "list_sessions",
          input: {
            user_id: userId,
          },
        };

        const authHeaders = await getAuthHeaders();
        const listResponse = await fetch(sessionEndpoint, {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(listSessionsPayload),
        });

        if (!listResponse.ok) {
          const errorText = await listResponse.text();
          console.error(
            `Agent Engine List Sessions Error: ${listResponse.status} ${listResponse.statusText}`,
            errorText
          );
          return new Response(
            JSON.stringify({ error: `Failed to list sessions: ${errorText}` }),
            {
              status: listResponse.status,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const sessionData = await listResponse.json();
        return new Response(
          JSON.stringify(sessionData.output || { sessions: [] }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // For Agent Engine, use the session-based API structure for messages
      const userId = requestBody.userId || `user-${Date.now()}`;
      const message = requestBody.query || requestBody.message || "";

      // Check if we already have a session ID from the request
      let sessionId = requestBody.sessionId;
      console.log(
        `🔍 Agent Engine run_sse: userId=${userId}, incoming sessionId=${sessionId}`
      );

      // If no session ID provided, create a new session
      if (!sessionId) {
        const createSessionPayload = {
          class_method: "create_session",
          input: {
            user_id: userId,
          },
        };

        const authHeaders = await getAuthHeaders();
        const createSessionResponse = await fetch(sessionEndpoint, {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createSessionPayload),
        });

        if (!createSessionResponse.ok) {
          const errorText = await createSessionResponse.text();
          console.error(
            `Agent Engine Session Creation Error: ${createSessionResponse.status} ${createSessionResponse.statusText}`,
            errorText
          );
          return new Response(
            JSON.stringify({
              error: `Agent Engine Session Creation Error: ${errorText}`,
            }),
            {
              status: createSessionResponse.status,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const sessionData = await createSessionResponse.json();
        sessionId = sessionData.output?.id;

        if (!sessionId) {
          console.error("No session ID returned from Agent Engine");
          return new Response(
            JSON.stringify({
              error: "Failed to create session: No session ID returned",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      // Now stream the query to the session
      const streamQueryPayload = {
        class_method: "stream_query",
        input: {
          user_id: userId,
          session_id: sessionId,
          message: message,
        },
      };

      console.log(
        `🚀 Starting Agent Engine stream query for session: ${sessionId}`
      );
      console.log(
        `📤 Stream payload:`,
        JSON.stringify(streamQueryPayload, null, 2)
      );

      // Use the streaming endpoint (already defined above)
      const streamAuthHeaders = await getAuthHeaders();

      const streamResponse = await fetch(streamEndpoint, {
        method: "POST",
        headers: {
          ...streamAuthHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(streamQueryPayload),
      });

      console.log(
        `📡 Agent Engine stream response status: ${streamResponse.status} ${streamResponse.statusText}`
      );
      console.log(
        `📡 Response headers:`,
        Object.fromEntries(streamResponse.headers.entries())
      );

      if (!streamResponse.ok) {
        const errorText = await streamResponse.text();
        console.error(
          `❌ Agent Engine Stream Error: ${streamResponse.status} ${streamResponse.statusText}`,
          errorText
        );
        return new Response(
          JSON.stringify({
            error: `Agent Engine Stream Error: ${errorText}`,
          }),
          {
            status: streamResponse.status,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle Agent Engine SSE response - forward the stream directly
      console.log(`🌊 Setting up stream forwarding...`);

      const stream = new ReadableStream({
        start(controller) {
          if (!streamResponse.body) {
            console.log(`❌ No response body from Agent Engine`);
            controller.close();
            return;
          }

          console.log(
            `✅ Agent Engine response body exists, starting stream reader...`
          );
          const reader = streamResponse.body.getReader();
          const decoder = new TextDecoder();
          let chunkCount = 0;
          let buffer = ""; // Buffer to accumulate incomplete JSON

          async function pump() {
            try {
              while (true) {
                const { done, value } = await reader.read();

                if (done) {
                  console.log(`🏁 Stream complete after ${chunkCount} chunks`);
                  // Process any remaining data in buffer
                  if (buffer.trim()) {
                    console.log(
                      `🔄 Processing final buffer content: ${buffer.substring(
                        0,
                        100
                      )}...`
                    );
                    try {
                      const parsedJson = JSON.parse(buffer.trim());
                      const sseFormattedChunk = `data: ${JSON.stringify(
                        parsedJson
                      )}\n\n`;
                      controller.enqueue(
                        new TextEncoder().encode(sseFormattedChunk)
                      );
                      console.log(`✅ Final buffer forwarded as SSE to client`);
                    } catch (parseError) {
                      console.error(
                        "❌ Failed to parse final buffer as JSON:",
                        parseError
                      );
                    }
                  }
                  break;
                }

                chunkCount++;
                const rawChunk = decoder.decode(value, { stream: true });
                console.log(
                  `📦 Chunk ${chunkCount} received (${rawChunk.length} bytes):`,
                  rawChunk.substring(0, 200) +
                    (rawChunk.length > 200 ? "..." : "")
                );

                // Add chunk to buffer
                buffer += rawChunk;

                // Try to extract complete JSON objects from buffer
                let jsonStart = 0;
                let braceCount = 0;
                let inString = false;
                let escaped = false;

                for (let i = 0; i < buffer.length; i++) {
                  const char = buffer[i];

                  if (escaped) {
                    escaped = false;
                    continue;
                  }

                  if (char === "\\") {
                    escaped = true;
                    continue;
                  }

                  if (char === '"') {
                    inString = !inString;
                    continue;
                  }

                  if (!inString) {
                    if (char === "{") {
                      if (braceCount === 0) {
                        jsonStart = i;
                      }
                      braceCount++;
                    } else if (char === "}") {
                      braceCount--;
                      if (braceCount === 0) {
                        // Found complete JSON object
                        const jsonStr = buffer.substring(jsonStart, i + 1);
                        console.log(
                          `🎯 Found complete JSON (${jsonStr.length} bytes):`,
                          jsonStr.substring(0, 100) + "..."
                        );

                        try {
                          const parsedJson = JSON.parse(jsonStr);
                          const sseFormattedChunk = `data: ${JSON.stringify(
                            parsedJson
                          )}\n\n`;
                          console.log(
                            `🔄 Transformed complete JSON to SSE format`
                          );

                          controller.enqueue(
                            new TextEncoder().encode(sseFormattedChunk)
                          );
                          console.log(
                            `✅ Complete JSON forwarded as SSE to client`
                          );

                          // Remove processed JSON from buffer
                          buffer = buffer.substring(i + 1);
                          i = -1; // Reset loop
                          jsonStart = 0;
                        } catch (parseError) {
                          console.error(
                            "❌ Failed to parse extracted JSON:",
                            parseError
                          );
                          console.error(
                            "❌ Problematic JSON:",
                            jsonStr.substring(0, 200)
                          );
                          // Continue trying to find next complete JSON
                        }
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error("❌ Error reading Agent Engine stream:", error);
            } finally {
              console.log(
                `🔚 Closing stream controller after ${chunkCount} chunks`
              );
              controller.close();
            }
          }

          pump();
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

      // Transform the request body to match ADK backend format
      const userId = requestBody.userId || `user-${Date.now()}`;
      const sessionId = requestBody.sessionId || `session-${Date.now()}`;
      const message = requestBody.query || requestBody.message || "";

      // First, create or ensure session exists
      const sessionEndpoint = `${endpointConfig.backendUrl}/apps/app/users/${userId}/sessions/${sessionId}`;

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

      // Prepare the ADK payload matching the expected format
      const adkPayload = {
        appName: "app",
        userId: userId,
        sessionId: sessionId,
        newMessage: {
          parts: [
            {
              text: message,
            },
          ],
          role: "user",
        },
        streaming: true,
      };

      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${endpointConfig.backendUrl}/run_sse`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
          // Forward any authentication headers if present
          ...(request.headers.get("authorization") && {
            authorization: request.headers.get("authorization")!,
          }),
        },
        body: JSON.stringify(adkPayload),
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

                        // Forward the complete parsed response to frontend
                        // This preserves all the metadata (author, actions, thoughts, etc.)
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
