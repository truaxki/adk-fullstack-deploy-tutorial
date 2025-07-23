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
   * Handle both SSE streaming and complete JSON responses
   * - SSE streaming: Local backend with real-time event processing
   * - Complete JSON: Agent Engine with single complete response
   *
   * @param response - Fetch response (SSE stream or JSON)
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

    // Check if this is a complete JSON response (Agent Engine) or SSE stream (local backend)
    if (contentType.includes("application/json")) {
      // Handle complete JSON response from Agent Engine
      await this.handleCompleteJSONResponse(
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
   * Handle complete JSON response from Agent Engine
   * Agent Engine returns complete responses instead of streaming
   *
   * @param response - Fetch response with JSON data
   * @param aiMessageId - AI message ID for updates
   * @param callbacks - Stream processing callbacks
   * @param accumulatedTextRef - Reference to accumulated text
   * @param currentAgentRef - Reference to current agent state
   * @param setCurrentAgent - Agent state setter
   */
  private async handleCompleteJSONResponse(
    response: Response,
    aiMessageId: string,
    callbacks: StreamProcessingCallbacks,
    accumulatedTextRef: React.MutableRefObject<string>,
    currentAgentRef: React.MutableRefObject<string>,
    setCurrentAgent: (agent: string) => void
  ): Promise<void> {
    try {
      const jsonData = await response.json();
      createDebugLog(
        "JSON RESPONSE",
        "Received complete JSON response from Agent Engine",
        jsonData
      );

      // Check if this is the Agent Engine's complete response format
      if (jsonData.complete && jsonData.content) {
        // Agent Engine complete response format
        const content = jsonData.content;
        const agent = jsonData.agent || "agent_engine";

        // Update agent state
        if (agent !== currentAgentRef.current) {
          currentAgentRef.current = agent;
          setCurrentAgent(agent);
        }

        // Update accumulated text
        accumulatedTextRef.current = content;

        // Create complete message update
        const completeMessage: Message = {
          type: "ai",
          content: content,
          id: aiMessageId,
          timestamp: new Date(),
        };

        // Send complete message update to UI
        callbacks.onMessageUpdate(completeMessage);

        createDebugLog(
          "JSON COMPLETE",
          `Agent Engine message complete: ${content.length} characters`
        );
      } else {
        // If it's not the expected format, treat it as an error
        throw new Error("Unexpected response format from Agent Engine");
      }
    } catch (error) {
      createDebugLog("JSON ERROR", "Error processing JSON response", error);
      throw error;
    }
  }
}
