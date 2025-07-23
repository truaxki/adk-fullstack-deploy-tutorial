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
  isFinal?: boolean; // Added for the new processor
}

/**
 * Processes JSON fragments from Agent Engine streaming response.
 * Agent Engine sends a single large JSON object in chunks. We need to extract
 * complete "parts" from the growing JSON buffer and stream them immediately.
 * Handles parsing, accumulation, and SSE emission in existing frontend format
 */
class JSONFragmentProcessor {
  private buffer: string = "";
  private currentAgent: string = "";
  private processedPartsCount: number = 0; // Track how many parts we've already processed

  constructor(
    private controller: ReadableStreamDefaultController<Uint8Array>
  ) {}

  /**
   * Process incoming chunk of data from Agent Engine.
   * Accumulates chunks and attempts to extract complete parts as they become available.
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

    // Try to extract complete parts from the growing buffer
    this.extractAndStreamCompleteParts();
  }

  /**
   * Attempts to extract complete parts from the current buffer and stream them.
   * This handles the case where we have an incomplete JSON object but some parts within it are complete.
   */
  private extractAndStreamCompleteParts(): void {
    try {
      // Try to find the start of the content.parts array
      const contentPartsMatch = this.buffer.match(
        /"content"\s*:\s*{\s*"parts"\s*:\s*\[/
      );
      if (!contentPartsMatch) {
        console.log(
          "📝 [JSON PROCESSOR] No content.parts array found yet, waiting for more chunks..."
        );
        return;
      }

      const partsArrayStart =
        contentPartsMatch.index! + contentPartsMatch[0].length;

      // Extract the parts array content (everything after the opening bracket)
      const afterPartsStart = this.buffer.substring(partsArrayStart);

      // Try to extract complete parts objects
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;
      let partStartPos = -1;
      let extractedPartsCount = 0;

      for (let i = 0; i < afterPartsStart.length; i++) {
        const char = afterPartsStart[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === "\\") {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === "{") {
          if (braceCount === 0) {
            partStartPos = i;
          }
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (braceCount === 0 && partStartPos !== -1) {
            // We have a complete part object
            const partJson = afterPartsStart.substring(partStartPos, i + 1);

            // Only process parts we haven't processed yet
            if (extractedPartsCount >= this.processedPartsCount) {
              try {
                const part = JSON.parse(partJson);
                this.streamPart(part);
                console.log(
                  `✅ [JSON PROCESSOR] Extracted and streamed part ${
                    this.processedPartsCount + 1
                  }`
                );
              } catch (parseError) {
                console.log(
                  `⚠️ [JSON PROCESSOR] Failed to parse extracted part: ${parseError}`
                );
              }
            }

            extractedPartsCount++;
            partStartPos = -1;
          }
        }
      }

      // Update our processed parts count
      this.processedPartsCount = extractedPartsCount;
    } catch {
      console.log(
        "📝 [JSON PROCESSOR] Buffer contains incomplete JSON, waiting for more chunks..."
      );
    }
  }

  /**
   * Stream a single part to the frontend in the expected SSE format
   */
  private streamPart(part: AgentEngineContentPart): void {
    const sseData = {
      content: {
        parts: [part],
      },
      author: this.currentAgent || "goal_planning_agent",
    };

    console.log(`📤 [JSON PROCESSOR] Emitting SSE data for single part`);

    const sseMessage = `data: ${JSON.stringify(sseData)}\n\n`;
    this.controller.enqueue(new TextEncoder().encode(sseMessage));
  }

  /**
   * Process a complete JSON fragment (called when we have the full response)
   */
  processCompleteFragment(fragment: AgentEngineFragment): void {
    console.log(
      `✅ [JSON PROCESSOR] Processing complete fragment for agent: ${fragment.author}`
    );

    this.currentAgent = fragment.author || "goal_planning_agent";

    // Check if there are any remaining parts we haven't streamed yet
    if (fragment.content?.parts) {
      const remainingParts = fragment.content.parts.slice(
        this.processedPartsCount
      );

      if (remainingParts.length > 0) {
        console.log(
          `📤 [JSON PROCESSOR] Streaming ${remainingParts.length} remaining parts`
        );

        for (const part of remainingParts) {
          this.streamPart(part);
        }
      }
    }

    // Stream any additional data (actions, usage_metadata, etc.)
    if (
      fragment.actions ||
      fragment.usage_metadata ||
      fragment.invocation_id ||
      fragment.isFinal
    ) {
      const additionalData: Record<string, unknown> = {
        author: fragment.author || "goal_planning_agent",
      };

      if (fragment.actions) additionalData.actions = fragment.actions;
      if (fragment.usage_metadata)
        additionalData.usage_metadata = fragment.usage_metadata;
      if (fragment.invocation_id)
        additionalData.invocation_id = fragment.invocation_id;
      if (fragment.isFinal) additionalData.isFinal = fragment.isFinal;

      console.log(`📤 [JSON PROCESSOR] Emitting final metadata`);
      const sseMessage = `data: ${JSON.stringify(additionalData)}\n\n`;
      this.controller.enqueue(new TextEncoder().encode(sseMessage));
    }

    // Log token usage if available
    if (fragment.usage_metadata) {
      console.log("📊 [JSON PROCESSOR] Token usage:", fragment.usage_metadata);
    }
  }

  /**
   * Finalize the stream processing
   */
  finalize(): void {
    console.log("🏁 [JSON PROCESSOR] Finalizing stream");

    // Try to parse any remaining buffer content
    if (this.buffer.trim()) {
      try {
        const fragment: AgentEngineFragment = JSON.parse(this.buffer);
        this.processCompleteFragment(fragment);
      } catch (error) {
        console.error(
          "❌ [JSON PROCESSOR] Failed to parse remaining buffer on finalize:",
          this.buffer,
          error
        );
      }
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
      } catch (error) {
        // Response body might not be available or already consumed
        console.error(
          "An error occurred while trying to read the error response body from Agent Engine:",
          error
        );
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      isValid: false,
      error: `Agent Engine configuration error: ${errorMessage}`,
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
