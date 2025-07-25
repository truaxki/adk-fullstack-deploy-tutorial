/**
 * Stream Processor
 *
 * This module handles the processing of parsed SSE data into UI updates.
 * It coordinates message updates, event timeline updates, and website count updates
 * based on the parsed SSE data.
 */

import { Message } from "@/types";
import { ProcessedEvent } from "@/components/ActivityTimeline";
import { StreamProcessingCallbacks } from "./types";
import { extractDataFromSSE } from "./sse-parser";
import { createDebugLog } from "@/lib/handlers/run-sse-common";
import { getEventTitle } from "./stream-utils";

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
export function processSseEventData(
  jsonData: string,
  aiMessageId: string,
  callbacks: StreamProcessingCallbacks,
  accumulatedTextRef: { current: string },
  currentAgentRef: { current: string },
  setCurrentAgent: (agent: string) => void
): void {
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

  createDebugLog("SSE HANDLER", "Processing SSE event", {
    agent,
    textParts: textParts.length,
    thoughtParts: thoughtParts.length,
    sourceCount,
  });

  // Update website count if sources found
  if (sourceCount > 0) {
    createDebugLog(
      "SSE HANDLER",
      "Updating websiteCount. Current sourceCount:",
      sourceCount
    );
    callbacks.onWebsiteCountUpdate(Math.max(sourceCount, 0));
  }

  // Update current agent if changed
  if (agent && agent !== currentAgentRef.current) {
    currentAgentRef.current = agent;
    setCurrentAgent(agent);
  }

  // Process function calls
  if (functionCall) {
    processFunctionCall(functionCall, aiMessageId, callbacks.onEventUpdate);
  }

  // Process function responses
  if (functionResponse) {
    processFunctionResponse(
      functionResponse,
      aiMessageId,
      callbacks.onEventUpdate
    );
  }

  // Process AI thoughts - show in timeline for transparency
  if (thoughtParts.length > 0) {
    processThoughts(thoughtParts, agent, aiMessageId, callbacks.onEventUpdate);
  }

  // Process text content - different handling based on agent type (like working example)
  if (textParts.length > 0) {
    processTextContent(
      textParts,
      agent,
      aiMessageId,
      accumulatedTextRef,
      callbacks.onMessageUpdate,
      callbacks.onEventUpdate
    );
  }

  // Process sources if available
  if (sources) {
    createDebugLog(
      "SSE HANDLER",
      "Adding Retrieved Sources timeline event:",
      sources
    );
    callbacks.onEventUpdate(aiMessageId, {
      title: "Retrieved Sources",
      data: { type: "sources", content: sources },
    });
  }

  // Handle final report with citations (like working example)
  if (agent === "report_composer_with_citations" && finalReportWithCitations) {
    createDebugLog(
      "SSE HANDLER",
      "Creating final report message for agent:",
      agent
    );
    const finalReportMessageId = Date.now().toString() + "_final";
    const finalReportMessage: Message = {
      type: "ai",
      content: String(finalReportWithCitations),
      id: finalReportMessageId,
      timestamp: new Date(),
    };
    callbacks.onMessageUpdate(finalReportMessage);
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
 * @param onEventUpdate - Event update callback for timeline
 */
function processTextContent(
  textParts: string[],
  agent: string,
  aiMessageId: string,
  accumulatedTextRef: { current: string },
  onMessageUpdate: (message: Message) => void,
  onEventUpdate: (messageId: string, event: ProcessedEvent) => void
): void {
  // Handle different agent types like the working example
  if (
    agent === "goal_planning_agent" ||
    agent === "interactive_planner_agent" ||
    agent === "root_agent"
  ) {
    // MAIN PLANNING AGENT → Stream text directly to main message (real-time effect)
    createDebugLog(
      "SSE HANDLER",
      `Streaming text directly to main message for agent: ${agent}`
    );
    for (const text of textParts) {
      accumulatedTextRef.current += text + " ";
      const updatedMessage: Message = {
        type: "ai",
        content: accumulatedTextRef.current.trim(),
        id: aiMessageId,
        timestamp: new Date(),
      };
      onMessageUpdate(updatedMessage);
    }
  } else if (agent !== "report_composer_with_citations") {
    // OTHER AGENTS → Timeline events only (research, function calls, etc.)
    // BUT NOT for final report composition
    const eventTitle = getEventTitle(agent);
    createDebugLog(
      "SSE HANDLER",
      `Adding Text timeline event for agent: ${agent} with title: ${eventTitle}`
    );
    onEventUpdate(aiMessageId, {
      title: eventTitle,
      data: { type: "text", content: textParts.join(" ") },
    });
  }
  // Note: report_composer_with_citations is handled separately in main function
}
