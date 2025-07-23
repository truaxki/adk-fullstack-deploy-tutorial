/**
 * Agent Engine Handler for Run SSE API Route
 *
 * Handles requests for Agent Engine deployment configuration.
 * This handler processes streaming JSON fragments from Agent Engine and converts them to SSE format.
 * Note: Agent Engine returns JSON fragments (not standard SSE), so we parse and reformat them.
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
 * Agent Engine JSON Fragment Types
 * Based on the actual format Agent Engine returns
 */
interface AgentEngineContentPart {
  text?: string;
  thought?: boolean;
  function_call?: {
    name: string;
    args: Record<string, unknown>;
    id: string;
  };
  function_response?: {
    name: string;
    response: Record<string, unknown>;
    id: string;
  };
}

interface AgentEngineFragment {
  content?: {
    parts?: AgentEngineContentPart[];
  };
  role?: string;
  author?: string;
  usage_metadata?: {
    candidates_token_count?: number;
    prompt_token_count?: number;
    total_token_count?: number;
    thoughts_token_count?: number;
  };
  invocation_id?: string;
  actions?: {
    state_delta?: Record<string, unknown>;
    artifact_delta?: Record<string, unknown>;
    requested_auth_configs?: Record<string, unknown>;
  };
}

/**
 * JSON Fragment Processor Class
 * Handles parsing, accumulation, and SSE emission in existing frontend format
 */
class JSONFragmentProcessor {
  private buffer: string = "";
  private currentAgent: string = "";

  constructor(
    private controller: ReadableStreamDefaultController<Uint8Array>
  ) {}

  /**
   * Process incoming chunk of data from Agent Engine
   * May contain partial or multiple JSON fragments
   */
  processChunk(chunk: string): void {
    console.log(`🔄 [JSON PROCESSOR] Processing chunk: ${chunk.length} bytes`);
    console.log(
      `📝 [JSON PROCESSOR] Raw chunk content:`,
      JSON.stringify(
        chunk.substring(0, 500) + (chunk.length > 500 ? "..." : "")
      )
    );

    this.buffer += chunk;

    // Try to extract complete JSON objects from buffer
    this.extractCompleteFragments();
  }

  /**
   * Extract complete JSON fragments from buffer
   * Agent Engine sends JSON objects separated by newlines (usually)
   */
  private extractCompleteFragments(): void {
    const lines = this.buffer.split("\n");

    // Keep the last line in buffer (might be incomplete)
    this.buffer = lines.pop() || "";

    // Process complete lines as JSON fragments
    for (const line of lines) {
      if (line.trim()) {
        this.processJSONFragment(line.trim());
      }
    }
  }

  /**
   * Process a single JSON fragment and emit as SSE
   */
  private processJSONFragment(fragmentStr: string): void {
    try {
      console.log(
        `📝 [JSON PROCESSOR] Processing fragment: ${fragmentStr.substring(
          0,
          100
        )}...`
      );
      console.log(
        `🔍 [JSON PROCESSOR] Full fragment:`,
        JSON.stringify(fragmentStr)
      );

      const fragment: AgentEngineFragment = JSON.parse(fragmentStr);
      console.log(
        `✅ [JSON PROCESSOR] Parsed fragment:`,
        JSON.stringify(fragment, null, 2)
      );

      // Update agent if present
      if (fragment.author && fragment.author !== this.currentAgent) {
        this.currentAgent = fragment.author;
      }

      // Emit fragment in SSE format expected by existing frontend
      if (fragment.content?.parts || fragment.author) {
        this.emitSSEData(fragment);
      }

      // Handle usage metadata (for debugging)
      if (fragment.usage_metadata) {
        console.log(
          `📊 [JSON PROCESSOR] Token usage:`,
          fragment.usage_metadata
        );
      }
    } catch (error) {
      console.error(
        "❌ [JSON PROCESSOR] Failed to parse JSON fragment:",
        error
      );
      console.error("❌ [JSON PROCESSOR] Fragment content:", fragmentStr);
      // Continue processing other fragments - don't let one bad fragment break the stream
    }
  }

  /**
   * Emit fragment as SSE data in the format expected by existing frontend
   */
  private emitSSEData(fragment: AgentEngineFragment): void {
    // Convert Agent Engine format to format expected by extractDataFromSSE()
    const sseData = {
      content: fragment.content
        ? {
            parts: fragment.content.parts?.map((part) => ({
              text: part.text,
              thought: part.thought,
              functionCall: part.function_call
                ? {
                    name: part.function_call.name,
                    args: part.function_call.args,
                    id: part.function_call.id,
                  }
                : undefined,
              functionResponse: part.function_response
                ? {
                    name: part.function_response.name,
                    response: part.function_response.response,
                    id: part.function_response.id,
                  }
                : undefined,
            })),
          }
        : undefined,
      author: fragment.author,
      actions: fragment.actions,
    };

    console.log(
      `📡 [JSON PROCESSOR] Emitting SSE data for agent: ${fragment.author}`
    );
    console.log(
      `📤 [JSON PROCESSOR] SSE data being emitted:`,
      JSON.stringify(sseData, null, 2)
    );

    // Format as SSE event
    const sseEvent = `data: ${JSON.stringify(sseData)}\n\n`;
    console.log(
      `📮 [JSON PROCESSOR] Final SSE event:`,
      JSON.stringify(sseEvent)
    );
    const encodedData = new TextEncoder().encode(sseEvent);

    try {
      this.controller.enqueue(encodedData);
    } catch (error) {
      console.error("❌ [JSON PROCESSOR] Failed to emit SSE data:", error);
    }
  }

  /**
   * Finalize processing when stream ends
   */
  finalize(): void {
    console.log("🏁 [JSON PROCESSOR] Finalizing stream");

    // Process any remaining buffer content
    if (this.buffer.trim()) {
      this.processJSONFragment(this.buffer.trim());
    }
  }
}

/**
 * Handle Agent Engine streaming request with JSON fragment processing
 *
 * @param requestData - Processed request data
 * @returns Streaming SSE Response with processed JSON fragments
 */
export async function handleAgentEngineStreamRequest(
  requestData: ProcessedStreamRequest
): Promise<Response> {
  console.log(
    "🚀🚀🚀 [AGENT ENGINE] NEW JSON FRAGMENT HANDLER STARTING 🚀🚀🚀"
  );
  console.log(
    `📊 [AGENT ENGINE] Request data:`,
    JSON.stringify(requestData, null, 2)
  );

  try {
    // Format payload for Agent Engine
    const agentEnginePayload = formatAgentEnginePayload(requestData);

    // Build Agent Engine URL with the streamQuery endpoint
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
        if (errorText) {
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

    // Create streaming response that processes JSON fragments
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.error(new Error("No readable stream from Agent Engine"));
          return;
        }

        console.log(
          "🚀🚀🚀 [AGENT ENGINE] Starting JSON fragment processing 🚀🚀🚀"
        );
        console.log(
          "📋 [AGENT ENGINE] This is the NEW handler with JSONFragmentProcessor"
        );

        // Initialize JSON fragment processor
        const processor = new JSONFragmentProcessor(controller);

        // Set up timeout mechanism (5 minutes max)
        const timeoutMs = 5 * 60 * 1000; // 5 minutes
        const startTime = Date.now();
        let isStreamActive = true;

        try {
          // Read and process JSON fragments using recursive pump pattern with timeout
          const pump = async (): Promise<void> => {
            // Check for timeout
            if (Date.now() - startTime > timeoutMs) {
              console.error("❌ [AGENT ENGINE] Stream timeout after 5 minutes");
              processor.finalize();
              controller.close();
              return;
            }

            if (!isStreamActive) {
              return;
            }

            const { done, value } = await reader.read();

            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              processor.processChunk(chunk);
            }

            if (done) {
              console.log("✅ [AGENT ENGINE] JSON fragment stream completed");
              processor.finalize();
              controller.close();
              isStreamActive = false;
              return;
            }

            // Continue processing next chunk
            return pump();
          };

          await pump();
        } catch (error) {
          console.error(
            "❌ [AGENT ENGINE] JSON fragment processing error:",
            error
          );

          // Attempt graceful error recovery
          try {
            processor.finalize();
          } catch (finalizeError) {
            console.error(
              "❌ [AGENT ENGINE] Error during finalization:",
              finalizeError
            );
          }

          controller.error(error);
        } finally {
          isStreamActive = false;
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
