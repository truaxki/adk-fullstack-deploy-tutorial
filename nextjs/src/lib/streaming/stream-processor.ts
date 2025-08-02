/**
 * Stream Processor
 *
 * This module handles the processing of parsed SSE data into UI updates.
 * It coordinates message updates, event timeline updates, and website count updates
 * based on the parsed SSE data.
 *
 * Implements the Official ADK Termination Signal Pattern:
 * - Streaming chunks are accumulated and displayed progressively
 * - Complete responses are used as termination signals (not displayed)
 * - When complete response matches accumulated text, streaming stops
 */

import { flushSync } from "react-dom";
import { Message } from "@/types";
import { ProcessedEvent } from "@/components/ActivityTimeline";
import { StreamProcessingCallbacks } from "./types";
import { extractDataFromSSE } from "./sse-parser";
import { createDebugLog } from "../handlers/run-sse-common";

/**
 * Processes SSE event data and triggers appropriate callbacks
 *
 * This function takes raw JSON data, parses it using the SSE parser,
 * and then processes the results to trigger UI updates through callbacks.
 * Based on the working example's real-time streaming approach.
 *
 * @param jsonData - Raw SSE JSON data string
 * @param aiMessageId - ID of the AI message being streamed
 * @param callbacks - Callback functions for UI updates
 * @param accumulatedTextRef - Reference to accumulated text for message updates
 * @param currentAgentRef - Reference to current agent state
 * @param setCurrentAgent - State setter for current agent
 */
export async function processSseEventData(
  jsonData: string,
  aiMessageId: string,
  callbacks: StreamProcessingCallbacks,
  accumulatedTextRef: { current: string },
  currentAgentRef: { current: string },
  setCurrentAgent: (agent: string) => void
): Promise<void> {
  const {
    textParts,
    thoughtParts,
    agent,
    finalReportWithCitations,
    functionCall,
    functionResponse,
    sourceCount,
    sources,
  } = extractDataFromSSE(jsonData);

  // Use frontend-generated aiMessageId for consistent message correlation
  // Backend sends different IDs for each SSE event, which would create separate messages
  const actualMessageId = aiMessageId;

  // Update current agent if changed
  if (agent && agent !== currentAgentRef.current) {
    currentAgentRef.current = agent;
    setCurrentAgent(agent);
  }

  // Update website count if sources found
  if (sourceCount > 0) {
    callbacks.onWebsiteCountUpdate(Math.max(sourceCount, 0));
  }

  // Process function calls
  if (functionCall) {
    processFunctionCall(functionCall, actualMessageId, callbacks.onEventUpdate);
  }

  // Process function responses
  if (functionResponse) {
    processFunctionResponse(
      functionResponse,
      actualMessageId,
      callbacks.onEventUpdate
    );
  }

  // Process AI thoughts - show in timeline for transparency
  if (thoughtParts.length > 0) {
    processThoughts(
      thoughtParts,
      agent,
      actualMessageId,
      callbacks.onEventUpdate
    );
  }

  // Process text content using OFFICIAL ADK TERMINATION SIGNAL PATTERN
  if (textParts.length > 0) {
    await processTextContent(
      textParts,
      agent,
      actualMessageId,
      accumulatedTextRef,
      callbacks.onMessageUpdate
    );
  }

  // Process sources if available
  if (sources) {
    createDebugLog(
      "SSE HANDLER",
      "Adding Retrieved Sources timeline event:",
      sources
    );
    callbacks.onEventUpdate(actualMessageId, {
      title: "Retrieved Sources",
      data: { type: "sources", content: sources },
    });
  }

  // Handle final report with citations - use existing message ID, don't create fake messages
  if (agent === "report_composer_with_citations" && finalReportWithCitations) {
    createDebugLog(
      "SSE HANDLER",
      "Updating existing message with final report for agent:",
      agent
    );
    // Update the existing message with the final report content
    // Don't create a new message with fake ID - use the aiMessageId from backend events
    callbacks.onMessageUpdate({
      type: "ai",
      content: String(finalReportWithCitations),
      id: aiMessageId, // Use the real backend-provided ID
      timestamp: new Date(Date.now()), // For now, but this should come from backend too
    });
  }
}

/**
 * Processes function call events
 *
 * @param functionCall - Function call data from parsed SSE
 * @param aiMessageId - AI message ID for timeline
 * @param onEventUpdate - Event update callback
 */
function processFunctionCall(
  functionCall: { name: string; args: Record<string, unknown>; id: string },
  aiMessageId: string,
  onEventUpdate: (messageId: string, event: ProcessedEvent) => void
): void {
  const functionCallTitle = `Function Call: ${functionCall.name}`;
  createDebugLog(
    "SSE HANDLER",
    "Adding Function Call timeline event:",
    functionCallTitle
  );

  onEventUpdate(aiMessageId, {
    title: functionCallTitle,
    data: {
      type: "functionCall",
      name: functionCall.name,
      args: functionCall.args,
      id: functionCall.id,
    },
  });
}

/**
 * Processes function response events
 *
 * @param functionResponse - Function response data from parsed SSE
 * @param aiMessageId - AI message ID for timeline
 * @param onEventUpdate - Event update callback
 */
function processFunctionResponse(
  functionResponse: {
    name: string;
    response: Record<string, unknown>;
    id: string;
  },
  aiMessageId: string,
  onEventUpdate: (messageId: string, event: ProcessedEvent) => void
): void {
  const functionResponseTitle = `Function Response: ${functionResponse.name}`;
  createDebugLog(
    "SSE HANDLER",
    "Adding Function Response timeline event:",
    functionResponseTitle
  );

  onEventUpdate(aiMessageId, {
    title: functionResponseTitle,
    data: {
      type: "functionResponse",
      name: functionResponse.name,
      response: functionResponse.response,
      id: functionResponse.id,
    },
  });
}

/**
 * Processes AI thought parts
 *
 * @param thoughtParts - Array of thought strings from parsed SSE
 * @param agent - Current agent name
 * @param aiMessageId - AI message ID for timeline
 * @param onEventUpdate - Event update callback
 */
function processThoughts(
  thoughtParts: string[],
  agent: string,
  aiMessageId: string,
  onEventUpdate: (messageId: string, event: ProcessedEvent) => void
): void {
  createDebugLog(
    "SSE HANDLER",
    `Processing thought parts for agent: ${agent}`,
    { thoughts: thoughtParts }
  );

  onEventUpdate(aiMessageId, {
    title: "🤔 AI Thinking",
    data: { type: "thinking", content: thoughtParts.join(" ") },
  });
}

/**
 * Processes text content parts based on agent type (like working example)
 *
 * @param textParts - Array of text strings from parsed SSE
 * @param agent - Current agent name
 * @param aiMessageId - AI message ID
 * @param accumulatedTextRef - Reference to accumulated text
 * @param onMessageUpdate - Message update callback
 */
async function processTextContent(
  textParts: string[],
  agent: string,
  aiMessageId: string,
  accumulatedTextRef: { current: string },
  onMessageUpdate: (message: Message) => void
): Promise<void> {
  // Process each text chunk using OFFICIAL ADK TERMINATION SIGNAL PATTERN
  for (const text of textParts) {
    const currentAccumulated = accumulatedTextRef.current;

    // 🎯 OFFICIAL ADK TERMINATION SIGNAL PATTERN (matches Angular implementation):
    // if (newChunk == this.streamingTextMessage.text) { return; }
    if (text === currentAccumulated && currentAccumulated.length > 0) {
      // Official ADK pattern: this is the termination signal, don't add to UI
      return;
    }

    // This is a streaming chunk - add it to accumulated text and display
    // Official ADK pattern: direct concatenation (no spaces between chunks)
    accumulatedTextRef.current += text; // Direct concatenation like official ADK

    const updatedMessage: Message = {
      type: "ai",
      content: accumulatedTextRef.current.trim(),
      id: aiMessageId,
      timestamp: new Date(),
    };

    // Force immediate update to prevent React batching
    flushSync(() => {
      onMessageUpdate(updatedMessage);
    });
  }
}
