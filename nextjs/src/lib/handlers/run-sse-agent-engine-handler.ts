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
 * Agent Engine sends a single large JSON object with parts.
 * We look for complete part objects and stream them immediately when found.
 */
class JSONFragmentProcessor {
  private buffer: string = "";
  private currentAgent: string = "";
  private sentParts: Set<string> = new Set(); // Track sent parts by their content hash
  private processingQueue: Promise<void> = Promise.resolve(); // Ensure sequential processing

  constructor(
    private controller: ReadableStreamDefaultController<Uint8Array>
  ) {}

  /**
   * Process incoming chunk of data from Agent Engine.
   * Accumulates chunks and looks for complete parts to stream immediately.
   */
  processChunk(chunk: string): void {
    console.log(`🔄 [JSON PROCESSOR] Processing chunk: ${chunk.length} bytes`);
    console.log(
      `📝 [JSON PROCESSOR] Raw chunk content:`,
      JSON.stringify(chunk)
    );

    this.buffer += chunk;

    // Look for complete part objects and stream them immediately
    this.findAndStreamCompleteParts();
  }

  /**
   * Find complete part objects in the buffer and stream them immediately
   */
  private findAndStreamCompleteParts(): void {
    // Look for the parts array start
    const partsMatch = this.buffer.match(/"parts"\s*:\s*\[/);
    if (!partsMatch) {
      return; // No parts array found yet
    }

    const partsStartIndex = partsMatch.index! + partsMatch[0].length;
    const partsContent = this.buffer.substring(partsStartIndex);

    // Now look for complete part objects within the parts array
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let partStartPos = -1;

    for (let i = 0; i < partsContent.length; i++) {
      const char = partsContent[i];

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
          const partJson = partsContent.substring(partStartPos, i + 1);

          try {
            const part = JSON.parse(partJson);

            // Check if this is a valid part object
            if (part.text && typeof part.text === "string") {
              const partHash = this.hashPart(part);

              if (!this.sentParts.has(partHash)) {
                console.log(
                  `✅ [JSON PROCESSOR] Found new complete part (thought: ${part.thought}):`,
                  part.text
                );
                // Queue part for sequential streaming to maintain order
                this.queuePartForStreaming(part, partHash);
              }
            }
          } catch {
            // Not a valid JSON object, continue
          }

          partStartPos = -1;
        }
      }
    }
  }

  /**
   * Create a simple hash of a part to detect duplicates
   */
  private hashPart(part: AgentEngineContentPart): string {
    return `${part.text?.substring(0, 50)}-${
      part.thought
    }-${!!part.function_call}`;
  }

  /**
   * Queue a part for sequential streaming to prevent race conditions
   */
  private queuePartForStreaming(
    part: AgentEngineContentPart,
    partHash: string
  ): void {
    this.processingQueue = this.processingQueue
      .then(async () => {
        await this.streamPart(part);
        this.sentParts.add(partHash);
      })
      .catch((error) => {
        console.error("❌ [JSON PROCESSOR] Error in streaming queue:", error);
      });
  }

  /**
   * Stream a single part immediately to the frontend
   * For large parts, split them into smaller chunks to simulate real-time streaming
   */
  private async streamPart(part: AgentEngineContentPart): Promise<void> {
    if (!part.text) {
      return;
    }

    // Split large text into smaller streaming chunks (like ADK does naturally)
    const chunks = this.splitTextIntoStreamingChunks(part.text);

    console.log(
      `📤 [JSON PROCESSOR] Streaming part in ${chunks.length} chunks to simulate real-time SSE (thought: ${part.thought})`
    );
    console.log(`📝 [JSON PROCESSOR] Full part text:`, part.text);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Create streaming chunk with original part metadata on first chunk only
      const streamingPart: AgentEngineContentPart = {
        text: chunk,
        thought: i === 0 ? part.thought : undefined,
        function_call: i === 0 ? part.function_call : undefined,
        function_response: i === 0 ? part.function_response : undefined,
      };

      const sseData = {
        content: {
          parts: [streamingPart],
        },
        author: this.currentAgent || "goal_planning_agent",
      };

      console.log(
        `📤 [JSON PROCESSOR] Emitting chunk ${i + 1}/${chunks.length} (${
          chunk.length
        } chars):`,
        chunk
      );

      const sseMessage = `data: ${JSON.stringify(sseData)}\n\n`;
      this.controller.enqueue(new TextEncoder().encode(sseMessage));

      // Add small delay between chunks to simulate real-time streaming (like ADK)
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
      }
    }
  }

  /**
   * Split large text into smaller chunks for streaming (simulating ADK's natural behavior)
   */
  private splitTextIntoStreamingChunks(text: string): string[] {
    const chunks: string[] = [];
    const maxChunkSize = 150; // Smaller chunks for better streaming effect

    // First try to split by sentences
    const sentences = text.split(/(?<=[.!?])\s+/);

    let currentChunk = "";

    for (const sentence of sentences) {
      // If adding this sentence would exceed max size, start new chunk
      if (
        currentChunk.length > 0 &&
        (currentChunk + " " + sentence).length > maxChunkSize
      ) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk =
          currentChunk.length > 0 ? currentChunk + " " + sentence : sentence;
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    // If no sentences found, split by character count
    if (chunks.length === 0 && text.length > 0) {
      for (let i = 0; i < text.length; i += maxChunkSize) {
        chunks.push(text.substring(i, i + maxChunkSize));
      }
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Process a complete JSON fragment (called when we have the full response)
   */
  processCompleteFragment(fragment: AgentEngineFragment): void {
    console.log(
      `✅ [JSON PROCESSOR] Processing complete fragment for agent: ${fragment.author}`
    );
    console.log(`📋 [JSON PROCESSOR] Complete fragment content:`, fragment);

    this.currentAgent = fragment.author || "goal_planning_agent";

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
