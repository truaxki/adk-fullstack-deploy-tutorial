/**
 * Streaming utilities for SSE (Server-Sent Events) handling
 * Provides reusable streaming logic for both Agent Engine and local backend deployments
 */

import { SSE_HEADERS } from "./common";

/**
 * Type definitions for ADK agent response structure (used by local backend)
 */
export interface ContentPart {
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

export interface AdkAgentResponse {
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

/**
 * Create a streaming response with proper SSE headers
 */
export function createStreamingResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: SSE_HEADERS,
  });
}

/**
 * Create a simple pass-through stream (for Agent Engine)
 * This forwards SSE chunks directly from the source without processing
 */
export function createPassThroughStream(
  sourceResponse: Response,
  deploymentType: "agent_engine" | "local_backend"
): ReadableStream {
  return new ReadableStream({
    start(controller) {
      if (!sourceResponse.body) {
        console.log(
          `❌ No response body from ${deploymentType} for goal planning`
        );
        controller.close();
        return;
      }

      console.log(
        `✅ ${deploymentType} goal planning response body exists, starting stream reader...`
      );

      const reader = sourceResponse.body.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;

      async function pump(): Promise<void> {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log(
                `🏁 Goal planning stream complete after ${chunkCount} chunks`
              );
              break;
            }

            chunkCount++;
            const chunk = decoder.decode(value, { stream: true });
            console.log(
              `📦 Goal planning chunk ${chunkCount} received (${chunk.length} bytes):`,
              chunk.substring(0, 200) + (chunk.length > 200 ? "..." : "")
            );

            // Forward the SSE chunk as-is
            controller.enqueue(new TextEncoder().encode(chunk));
            console.log(
              `✅ Goal planning chunk ${chunkCount} forwarded to client`
            );
          }
        } catch (error) {
          console.error(
            `❌ Error reading ${deploymentType} goal planning stream:`,
            error
          );
        } finally {
          console.log(
            `🔚 Closing goal planning stream controller after ${chunkCount} chunks`
          );
          controller.close();
        }
      }

      pump();
    },
  });
}

/**
 * Create a processing stream for local backend ADK responses
 * This parses and transforms ADK responses into the expected SSE format
 */
export function createAdkProcessingStream(
  sourceResponse: Response
): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const reader = sourceResponse.body?.getReader();
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
              processAdkSseLine(line, controller);
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
}

/**
 * Process a single SSE line from ADK backend
 */
function processAdkSseLine(
  line: string,
  controller: ReadableStreamDefaultController
): void {
  if (line.startsWith("data: ")) {
    try {
      const jsonData = line.substring(6); // Remove 'data: ' prefix
      if (jsonData.trim()) {
        const parsedResponse = parseAdkResponse(jsonData);

        // Forward the complete parsed response to frontend
        // This preserves all the metadata (author, actions, etc.)
        const sseData = {
          content: parsedResponse.content || {
            parts: [
              { text: parsedResponse.output || parsedResponse.response || "" },
            ],
          },
          author: parsedResponse.author,
          actions: parsedResponse.actions,
          usageMetadata: parsedResponse.usageMetadata,
        };

        const formattedChunk = `data: ${JSON.stringify(sseData)}\n\n`;
        const encodedChunk = new TextEncoder().encode(formattedChunk);
        controller.enqueue(encodedChunk);
      }
    } catch (error) {
      console.error("Error parsing ADK response:", error);
      // Forward original line if parsing fails
      const encodedChunk = new TextEncoder().encode(line + "\n");
      controller.enqueue(encodedChunk);
    }
  } else if (line.trim() === "") {
    // Forward empty lines (SSE event separators)
    const encodedChunk = new TextEncoder().encode("\n");
    controller.enqueue(encodedChunk);
  }
}

/**
 * Parse ADK response handling various response formats
 */
function parseAdkResponse(jsonData: string): AdkAgentResponse {
  let rawParsed = JSON.parse(jsonData) as
    | AdkAgentResponse
    | AdkAgentResponse[]
    | string;

  // Handle case where ADK agent returns data as a string
  if (typeof rawParsed === "string") {
    rawParsed = JSON.parse(rawParsed) as AdkAgentResponse | AdkAgentResponse[];
  }

  // Handle case where ADK agent returns an array with single response
  const parsed: AdkAgentResponse =
    Array.isArray(rawParsed) && rawParsed.length > 0
      ? rawParsed[0]
      : (rawParsed as AdkAgentResponse);

  return parsed;
}

/**
 * Utility to check if a fetch response is suitable for streaming
 */
export function validateStreamingResponse(
  response: Response,
  deploymentType: "agent_engine" | "local_backend"
): boolean {
  if (!response.ok) {
    console.error(
      `❌ ${deploymentType} goal planning stream error:`,
      response.status,
      response.statusText
    );
    return false;
  }

  if (!response.body) {
    console.error(`❌ ${deploymentType} response has no body for streaming`);
    return false;
  }

  return true;
}
