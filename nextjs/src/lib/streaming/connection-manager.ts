/**
 * Connection Manager
 *
 * This module handles SSE streaming connection lifecycle management including
 * connection establishment, data streaming, error handling, and cleanup.
 */

import { v4 as uuidv4 } from "uuid";
import { Message } from "@/types";
import {
  SSEConnectionState,
  StreamProcessingCallbacks,
  StreamingAPIPayload,
  ConnectionManagerOptions,
} from "./types";
import { processSseEventData } from "./stream-processor";
import { createDebugLog } from "./stream-utils";

/**
 * Manages SSE streaming connections
 */
export class StreamingConnectionManager {
  private connectionState: SSEConnectionState = "idle";
  private retryFn: <T>(fn: () => Promise<T>) => Promise<T>;
  private endpoint: string;
  private abortController: AbortController | null = null;

  constructor(options: ConnectionManagerOptions = {}) {
    this.retryFn = options.retryFn || ((fn) => fn());
    this.endpoint = options.endpoint || "/api/run_sse";
  }

  /**
   * Gets the current connection state
   */
  public getConnectionState(): SSEConnectionState {
    return this.connectionState;
  }

  /**
   * Starts a streaming connection and processes SSE events in real-time
   *
   * @param apiPayload - API request payload
   * @param callbacks - Stream processing callbacks
   * @param accumulatedTextRef - Reference to accumulated text
   * @param currentAgentRef - Reference to current agent state
   * @param setCurrentAgent - Agent state setter
   * @param setIsLoading - Loading state setter
   * @returns Promise that resolves when streaming completes
   */
  public async submitMessage(
    apiPayload: StreamingAPIPayload,
    callbacks: StreamProcessingCallbacks,
    accumulatedTextRef: React.MutableRefObject<string>,
    currentAgentRef: React.MutableRefObject<string>,
    setCurrentAgent: (agent: string) => void,
    setIsLoading: (loading: boolean) => void
  ): Promise<void> {
    this.connectionState = "connecting";
    setIsLoading(true);
    accumulatedTextRef.current = "";
    currentAgentRef.current = "";
    this.abortController = new AbortController();

    // Generate AI message ID
    const aiMessageId = uuidv4();

    // Create initial AI message
    const initialAiMessage: Message = {
      type: "ai",
      content: "",
      id: aiMessageId,
      timestamp: new Date(),
    };
    callbacks.onMessageUpdate(initialAiMessage);

    try {
      createDebugLog(
        "CONNECTION",
        "Sending API request with payload",
        apiPayload
      );

      const response = await this.retryFn(() =>
        fetch(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiPayload),
          signal: this.abortController?.signal,
        })
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      this.connectionState = "connected";

      // Handle SSE streaming with proper event processing
      await this.handleSSEStream(
        response,
        aiMessageId,
        callbacks,
        accumulatedTextRef,
        currentAgentRef,
        setCurrentAgent
      );

      this.connectionState = "idle";
      setIsLoading(false);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        this.connectionState = "closed";
        createDebugLog("CONNECTION", "Request was cancelled by the user");
      } else {
        this.connectionState = "error";
        createDebugLog("CONNECTION", "Streaming error", error);
      }

      const errorMessage: Message = {
        type: "ai",
        content:
          (error as Error).name === "AbortError"
            ? "Request cancelled."
            : `Sorry, there was an error processing your request: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
        id: uuidv4(),
        timestamp: new Date(),
      };
      callbacks.onMessageUpdate(errorMessage);
      setIsLoading(false);
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Cancels the current streaming connection
   *
   * @param accumulatedTextRef - Reference to accumulated text (for cleanup)
   * @param currentAgentRef - Reference to current agent state (for cleanup)
   * @param setCurrentAgent - Agent state setter (for cleanup)
   * @param setIsLoading - Loading state setter
   */
  public cancelRequest(
    accumulatedTextRef: React.MutableRefObject<string>,
    currentAgentRef: React.MutableRefObject<string>,
    setCurrentAgent: (agent: string) => void,
    setIsLoading: (loading: boolean) => void
  ): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.connectionState = "closed";
    setIsLoading(false);

    // Clear any accumulated state
    accumulatedTextRef.current = "";
    currentAgentRef.current = "";
    setCurrentAgent("");
  }

  /**
   * Handle SSE streaming from both local backend and Agent Engine
   * - Local backend: text/plain SSE events
   * - Agent Engine: application/json SSE events with streaming parts
   *
   * @param response - Fetch response with SSE stream
   * @param aiMessageId - AI message ID for updates
   * @param callbacks - Stream processing callbacks
   * @param accumulatedTextRef - Reference to accumulated text
   * @param currentAgentRef - Reference to current agent state
   * @param setCurrentAgent - Agent state setter
   */
  private async handleSSEStream(
    response: Response,
    aiMessageId: string,
    callbacks: StreamProcessingCallbacks,
    accumulatedTextRef: React.MutableRefObject<string>,
    currentAgentRef: React.MutableRefObject<string>,
    setCurrentAgent: (agent: string) => void
  ): Promise<void> {
    const contentType = response.headers.get("content-type") || "";

    createDebugLog("ROUTING", `Content-Type: ${contentType}`);

    // Check response type:
    // - Local backend: text/plain SSE events
    // - Agent Engine: application/json streaming fragments (NOT SSE)
    if (contentType.includes("application/json")) {
      createDebugLog("ROUTING", "Taking Agent Engine JSON path");
      // Handle streaming JSON fragments from Agent Engine
      await this.handleAgentEngineJsonStream(
        response,
        aiMessageId,
        callbacks,
        accumulatedTextRef,
        currentAgentRef,
        setCurrentAgent
      );
      return;
    }

    // Handle SSE streaming response from local backend
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No readable stream available");
    }

    const decoder = new TextDecoder();
    let lineBuffer = "";
    let eventDataBuffer = "";

    createDebugLog("SSE START", "Beginning to process streaming response");

    // Use recursive pump function instead of while(true) loop
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read();

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;
        createDebugLog("SSE CHUNK", `Received ${chunk.length} bytes`);
      }

      // Process all complete lines in the buffer
      let eolIndex;
      while (
        (eolIndex = lineBuffer.indexOf("\n")) >= 0 ||
        (done && lineBuffer.length > 0)
      ) {
        let line: string;
        if (eolIndex >= 0) {
          line = lineBuffer.substring(0, eolIndex);
          lineBuffer = lineBuffer.substring(eolIndex + 1);
        } else {
          // Only if done and lineBuffer has content without a trailing newline
          line = lineBuffer;
          lineBuffer = "";
        }

        createDebugLog("SSE LINE", `Processing line: "${line}"`);

        if (line.trim() === "") {
          // Empty line: dispatch event
          if (eventDataBuffer.length > 0) {
            const jsonDataToParse = eventDataBuffer.endsWith("\n")
              ? eventDataBuffer.slice(0, -1)
              : eventDataBuffer;

            createDebugLog(
              "SSE DISPATCH EVENT",
              jsonDataToParse.substring(0, 200) + "..."
            );

            // Process the event immediately for real-time updates
            try {
              try {
                processSseEventData(
                  jsonDataToParse,
                  aiMessageId,
                  callbacks,
                  accumulatedTextRef,
                  currentAgentRef,
                  setCurrentAgent
                );
              } catch (error) {
                console.error(
                  "❌ [SSE ERROR] Failed to process final SSE event:",
                  error
                );
                console.error(
                  "❌ [SSE ERROR] Problematic JSON:",
                  jsonDataToParse.substring(0, 500)
                );
              }
            } catch (error) {
              console.error(
                "❌ [SSE ERROR] Failed to process SSE event:",
                error
              );
              console.error(
                "❌ [SSE ERROR] Problematic JSON:",
                jsonDataToParse.substring(0, 500)
              );
            }
            eventDataBuffer = ""; // Reset for next event
          }
        } else if (line.startsWith("data:")) {
          // Accumulate data lines for this event
          eventDataBuffer += line.substring(5).trimStart() + "\n";
          createDebugLog(
            "SSE DATA",
            `Added to buffer: "${line.substring(5).trimStart()}"`
          );
        } else if (line.startsWith(":")) {
          createDebugLog("SSE COMMENT", `Ignoring comment: "${line}"`);
          // Comment line, ignore
        }
      }

      if (done) {
        // Handle any remaining data in buffer
        if (eventDataBuffer.length > 0) {
          const jsonDataToParse = eventDataBuffer.endsWith("\n")
            ? eventDataBuffer.slice(0, -1)
            : eventDataBuffer;

          createDebugLog(
            "SSE DISPATCH FINAL EVENT",
            jsonDataToParse.substring(0, 200) + "..."
          );

          try {
            processSseEventData(
              jsonDataToParse,
              aiMessageId,
              callbacks,
              accumulatedTextRef,
              currentAgentRef,
              setCurrentAgent
            );
          } catch (error) {
            console.error(
              "❌ [SSE ERROR] Failed to process final SSE event:",
              error
            );
            console.error(
              "❌ [SSE ERROR] Problematic JSON:",
              jsonDataToParse.substring(0, 500)
            );
          }
          eventDataBuffer = "";
        }
        createDebugLog("SSE END", "Stream processing finished");
        return; // Exit recursion
      }

      // Continue processing next chunk
      return pump();
    };

    try {
      await pump();
    } catch (error) {
      createDebugLog("SSE ERROR", "Error reading stream", error);
      throw error;
    }
  }

  /**
   * Handle streaming JSON fragments from Agent Engine (not SSE format)
   * Agent Engine sends raw JSON chunks that need to be assembled and processed
   *
   * @param response - Fetch response with streaming JSON fragments
   * @param aiMessageId - AI message ID for updates
   * @param callbacks - Stream processing callbacks
   * @param accumulatedTextRef - Reference to accumulated text
   * @param currentAgentRef - Reference to current agent state
   * @param setCurrentAgent - Agent state setter
   */
  private async handleAgentEngineJsonStream(
    response: Response,
    aiMessageId: string,
    callbacks: StreamProcessingCallbacks,
    accumulatedTextRef: React.MutableRefObject<string>,
    currentAgentRef: React.MutableRefObject<string>,
    setCurrentAgent: (agent: string) => void
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No readable stream available");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    const sentParts: Set<string> = new Set();

    createDebugLog("AGENT ENGINE", "Starting JSON line processing");

    // Use recursive pump function to process complete JSON lines
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read();

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        createDebugLog(
          "AGENT ENGINE",
          `Received ${chunk.length} bytes, buffer now ${buffer.length} bytes`
        );

        // Process complete JSON lines (backend already processed fragments)
        this.processCompleteJsonLines(
          buffer,
          sentParts,
          aiMessageId,
          callbacks,
          accumulatedTextRef,
          currentAgentRef,
          setCurrentAgent
        );

        // Clear processed lines from buffer
        const lines = buffer.split("\n");
        buffer = lines[lines.length - 1]; // Keep incomplete line
      }

      if (done) {
        createDebugLog("AGENT ENGINE", "JSON stream completed");
        return;
      }

      return pump();
    };

    try {
      await pump();
    } catch (error) {
      createDebugLog(
        "AGENT ENGINE ERROR",
        "Error processing JSON fragments",
        error
      );
      throw error;
    }
  }

  /**
   * Process complete JSON lines sent from backend (no fragment processing needed)
   */
  private processCompleteJsonLines(
    buffer: string,
    sentParts: Set<string>,
    aiMessageId: string,
    callbacks: StreamProcessingCallbacks,
    accumulatedTextRef: React.MutableRefObject<string>,
    currentAgentRef: React.MutableRefObject<string>,
    setCurrentAgent: (agent: string) => void
  ): void {
    // Split buffer into lines and process complete lines
    const lines = buffer.split("\n");

    // Process all complete lines (all but the last, which might be incomplete)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      createDebugLog(
        "JSON LINE",
        `Processing line: ${line.substring(0, 50)}...`
      );

      try {
        const jsonData = JSON.parse(line);

        // Process each part in the JSON data
        if (jsonData.content?.parts && Array.isArray(jsonData.content.parts)) {
          for (const part of jsonData.content.parts) {
            if (part.text && typeof part.text === "string") {
              const partHash = this.hashPart(part);

              if (!sentParts.has(partHash)) {
                createDebugLog(
                  "COMPLETE JSON LINE",
                  `Processing part (thought: ${
                    part.thought
                  }): ${part.text.substring(0, 100)}...`
                );

                // Process Agent Engine JSON directly (no SSE pipeline needed)
                this.processAgentEngineJsonPart(
                  jsonData,
                  part,
                  aiMessageId,
                  callbacks,
                  accumulatedTextRef,
                  currentAgentRef,
                  setCurrentAgent
                );

                sentParts.add(partHash);
                break; // Only process one part per line to maintain order
              }
            }
          }
        }
      } catch (error) {
        createDebugLog(
          "JSON PARSE ERROR",
          `Failed to parse line: ${line}`,
          error
        );
      }
    }
  }

  /**
   * Process Agent Engine JSON part directly (no SSE conversion needed)
   */
  private processAgentEngineJsonPart(
    jsonData: {
      author?: string;
      content?: { parts: Array<{ text: string; thought?: boolean }> };
    },
    part: { text: string; thought?: boolean },
    aiMessageId: string,
    callbacks: StreamProcessingCallbacks,
    accumulatedTextRef: React.MutableRefObject<string>,
    currentAgentRef: React.MutableRefObject<string>,
    setCurrentAgent: (agent: string) => void
  ): void {
    // Update current agent
    if (jsonData.author && jsonData.author !== currentAgentRef.current) {
      currentAgentRef.current = jsonData.author;
      setCurrentAgent(jsonData.author);
    }

    // Handle thoughts vs regular content differently (same as SSE processing)
    if (part.thought) {
      // Process thoughts: send to onEventUpdate (same as processThoughts in SSE)
      callbacks.onEventUpdate(aiMessageId, {
        title: "🤔 AI Thinking",
        data: { type: "thinking", content: part.text },
      });
    } else {
      // Process regular content: add to accumulated text and send to onMessageUpdate
      accumulatedTextRef.current += part.text;

      const messageUpdate: Message = {
        type: "ai",
        content: accumulatedTextRef.current, // Use accumulated content
        id: aiMessageId,
        timestamp: new Date(),
      };

      callbacks.onMessageUpdate(messageUpdate);
    }

    createDebugLog(
      "AGENT ENGINE PROCESSED",
      `Processed part directly (thought: ${part.thought}, author: ${
        jsonData.author
      }): ${part.text.substring(0, 100)}...`
    );
  }

  /**
   * Generate a hash for a part to track if we've already sent it
   */
  private hashPart(part: { text?: string; thought?: boolean }): string {
    const textPreview = part.text?.substring(0, 100) || "";
    const thought = part.thought || false;
    return `${textPreview}-${thought}-${textPreview.length}`;
  }
}
