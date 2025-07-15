"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import {
  ChatMessagesView,
  MessageWithAgent,
} from "@/components/ChatMessagesView";
import { ProcessedEvent } from "@/components/ActivityTimeline";
import {
  retryWithBackoff,
  createSession,
  waitForBackend,
  sendChatMessage,
} from "@/lib/api";

// Loading screen component for backend initialization
const BackendLoadingScreen = (): React.JSX.Element => (
  <div className="flex-1 flex flex-col items-center justify-center p-4">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <h2 className="text-xl font-semibold text-neutral-100">
        Starting Backend Services
      </h2>
      <p className="text-neutral-300">
        Please wait while we initialize the AI agents...
      </p>
    </div>
  </div>
);

export default function ChatPage(): React.JSX.Element {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [appName, setAppName] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithAgent[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [messageEvents, setMessageEvents] = useState<
    Map<string, ProcessedEvent[]>
  >(new Map());
  const [websiteCount, setWebsiteCount] = useState<number>(0);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);
  const currentAgentRef = useRef("");
  const accumulatedTextRef = useRef("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Function to extract text and metadata from SSE data
  const extractDataFromSSE = (
    data: string
  ): {
    textParts: string[];
    agent: string;
    finalReportWithCitations: boolean | undefined;
    functionCall: {
      name: string;
      args: Record<string, unknown>;
      id?: string;
    } | null;
    functionResponse: { name: string; response: unknown; id?: string } | null;
    sourceCount: number;
    sources: Record<string, { title: string; url: string }> | null;
  } => {
    try {
      const parsed = JSON.parse(data);
      console.log("[SSE PARSED EVENT]:", JSON.stringify(parsed, null, 2)); // DEBUG: Log parsed event

      let textParts: string[] = [];
      let agent = "";
      let finalReportWithCitations = undefined;
      let functionCall = null;
      let functionResponse = null;
      let sources = null;

      // Check if content.parts exists and has text
      if (parsed.content && parsed.content.parts) {
        textParts = parsed.content.parts
          .filter((part: { text?: string }) => part.text)
          .map((part: { text: string }) => part.text);

        // Check for function calls
        const functionCallPart = parsed.content.parts.find(
          (part: { functionCall?: unknown }) => part.functionCall
        );
        if (functionCallPart) {
          functionCall = functionCallPart.functionCall as {
            name: string;
            args: Record<string, unknown>;
            id?: string;
          };
        }

        // Check for function responses
        const functionResponsePart = parsed.content.parts.find(
          (part: { functionResponse?: unknown }) => part.functionResponse
        );
        if (functionResponsePart) {
          functionResponse = functionResponsePart.functionResponse as {
            name: string;
            response: unknown;
            id?: string;
          };
        }
      }

      // Extract agent information
      if (parsed.author) {
        agent = parsed.author;
        console.log("[SSE EXTRACT] Agent:", agent); // DEBUG: Log agent
      }

      if (
        parsed.actions &&
        parsed.actions.stateDelta &&
        parsed.actions.stateDelta.final_report_with_citations
      ) {
        finalReportWithCitations =
          parsed.actions.stateDelta.final_report_with_citations;
      }

      // Extract website count from research agents
      let sourceCount = 0;
      if (
        parsed.author === "section_researcher" ||
        parsed.author === "enhanced_search_executor"
      ) {
        console.log(
          "[SSE EXTRACT] Relevant agent for source count:",
          parsed.author
        ); // DEBUG
        if (parsed.actions?.stateDelta?.url_to_short_id) {
          console.log(
            "[SSE EXTRACT] url_to_short_id found:",
            parsed.actions.stateDelta.url_to_short_id
          ); // DEBUG
          sourceCount = Object.keys(
            parsed.actions.stateDelta.url_to_short_id
          ).length;
          console.log("[SSE EXTRACT] Calculated sourceCount:", sourceCount); // DEBUG
        } else {
          console.log(
            "[SSE EXTRACT] url_to_short_id NOT found for agent:",
            parsed.author
          ); // DEBUG
        }
      }

      // Extract sources if available
      if (parsed.actions?.stateDelta?.sources) {
        sources = parsed.actions.stateDelta.sources;
        console.log("[SSE EXTRACT] Sources found:", sources); // DEBUG
      }

      return {
        textParts,
        agent,
        finalReportWithCitations,
        functionCall,
        functionResponse,
        sourceCount,
        sources,
      };
    } catch (error) {
      // Log the error and a truncated version of the problematic data for easier debugging.
      const truncatedData =
        data.length > 200 ? data.substring(0, 200) + "..." : data;
      console.error(
        'Error parsing SSE data. Raw data (truncated): "',
        truncatedData,
        '". Error details:',
        error
      );
      return {
        textParts: [],
        agent: "",
        finalReportWithCitations: undefined,
        functionCall: null,
        functionResponse: null,
        sourceCount: 0,
        sources: null,
      };
    }
  };

  // Function to get event titles based on agent names
  const getEventTitle = useCallback((agent: string): string => {
    const agentTitleMap: Record<string, string> = {
      enhanced_search_executor: "Enhanced Search",
      section_researcher: "Section Research",
      report_composer_with_citations: "Report Composition",
      interactive_planner_agent: "Interactive Planning",
      default: "Agent Activity",
    };
    return agentTitleMap[agent] || agentTitleMap["default"];
  }, []);

  const processSseEventData = useCallback(
    (jsonData: string, aiMessageId: string): void => {
      const {
        textParts,
        agent,
        finalReportWithCitations,
        functionCall,
        functionResponse,
        sourceCount,
        sources,
      } = extractDataFromSSE(jsonData);

      if (sourceCount > 0) {
        console.log(
          "[SSE HANDLER] Updating websiteCount. Current sourceCount:",
          sourceCount
        );
        setWebsiteCount((prev) => Math.max(prev, sourceCount));
      }

      if (agent && agent !== currentAgentRef.current) {
        currentAgentRef.current = agent;
      }

      if (functionCall) {
        const functionCallTitle = `Function Call: ${functionCall.name}`;
        console.log(
          "[SSE HANDLER] Adding Function Call timeline event:",
          functionCallTitle
        );
        setMessageEvents((prev) =>
          new Map(prev).set(aiMessageId, [
            ...(prev.get(aiMessageId) || []),
            {
              title: functionCallTitle,
              data: {
                type: "functionCall",
                name: functionCall.name,
                args: functionCall.args,
                id: functionCall.id,
              },
            },
          ])
        );
      }

      if (functionResponse) {
        const functionResponseTitle = `Function Response: ${functionResponse.name}`;
        console.log(
          "[SSE HANDLER] Adding Function Response timeline event:",
          functionResponseTitle
        );
        setMessageEvents((prev) =>
          new Map(prev).set(aiMessageId, [
            ...(prev.get(aiMessageId) || []),
            {
              title: functionResponseTitle,
              data: {
                type: "functionResponse",
                name: functionResponse.name,
                response: functionResponse.response,
                id: functionResponse.id,
              },
            },
          ])
        );
      }

      if (textParts.length > 0 && agent !== "report_composer_with_citations") {
        if (agent !== "interactive_planner_agent") {
          const eventTitle = getEventTitle(agent);
          console.log(
            "[SSE HANDLER] Adding Text timeline event for agent:",
            agent,
            "Title:",
            eventTitle,
            "Data:",
            textParts.join(" ")
          );
          setMessageEvents((prev) =>
            new Map(prev).set(aiMessageId, [
              ...(prev.get(aiMessageId) || []),
              {
                title: eventTitle,
                data: { type: "text", content: textParts.join(" ") },
              },
            ])
          );
        } else {
          // interactive_planner_agent text updates the main AI message
          for (const text of textParts) {
            accumulatedTextRef.current += text + " ";
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? {
                      ...msg,
                      content: accumulatedTextRef.current.trim(),
                      agent: currentAgentRef.current || msg.agent,
                    }
                  : msg
              )
            );
          }
        }
      }

      if (sources) {
        console.log(
          "[SSE HANDLER] Adding Retrieved Sources timeline event:",
          sources
        );
        setMessageEvents((prev) =>
          new Map(prev).set(aiMessageId, [
            ...(prev.get(aiMessageId) || []),
            {
              title: "Retrieved Sources",
              data: { type: "sources", content: sources },
            },
          ])
        );
      }

      if (
        agent === "report_composer_with_citations" &&
        finalReportWithCitations
      ) {
        const finalReportMessageId = Date.now().toString() + "_final";
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: String(finalReportWithCitations),
            id: finalReportMessageId,
            agent: currentAgentRef.current,
            finalReportWithCitations: true,
          },
        ]);
      }
    },
    [setWebsiteCount, setMessageEvents, setMessages, getEventTitle]
  );

  const handleSubmit = useCallback(
    async (query: string): Promise<void> => {
      if (!query.trim()) return;

      setIsLoading(true);
      try {
        // Create session if it doesn't exist
        let currentUserId = userId;
        let currentSessionId = sessionId;
        let currentAppName = appName;

        if (!currentSessionId || !currentUserId || !currentAppName) {
          console.log("Creating new session...");
          const generatedSessionId = uuidv4();
          const sessionData = await retryWithBackoff(() =>
            createSession(generatedSessionId)
          );
          currentUserId = sessionData.userId;
          currentSessionId = sessionData.sessionId;
          currentAppName = sessionData.appName;

          setUserId(currentUserId);
          setSessionId(currentSessionId);
          setAppName(currentAppName);
          console.log("Session created successfully:", {
            currentUserId,
            currentSessionId,
            currentAppName,
          });
        }

        // Add user message to chat
        const userMessageId = Date.now().toString();
        setMessages((prev) => [
          ...prev,
          { type: "human", content: query, id: userMessageId },
        ]);

        // Create AI message placeholder
        const aiMessageId = Date.now().toString() + "_ai";
        currentAgentRef.current = ""; // Reset current agent
        accumulatedTextRef.current = ""; // Reset accumulated text

        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: "",
            id: aiMessageId,
            agent: "",
          },
        ]);

        // Send the message with retry logic
        const response = await retryWithBackoff(() =>
          sendChatMessage({
            appName: currentAppName,
            userId: currentUserId,
            sessionId: currentSessionId,
            newMessage: {
              parts: [{ text: query }],
              role: "user",
            },
            streaming: false,
          })
        );

        // Handle SSE streaming
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = "";
        let eventDataBuffer = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();

            if (value) {
              lineBuffer += decoder.decode(value, { stream: true });
            }

            let eolIndex;
            // Process all complete lines in the buffer, or the remaining buffer if 'done'
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

              if (line.trim() === "") {
                // Empty line: dispatch event
                if (eventDataBuffer.length > 0) {
                  // Remove trailing newline before parsing
                  const jsonDataToParse = eventDataBuffer.endsWith("\n")
                    ? eventDataBuffer.slice(0, -1)
                    : eventDataBuffer;
                  console.log(
                    "[SSE DISPATCH EVENT]:",
                    jsonDataToParse.substring(0, 200) + "..."
                  ); // DEBUG
                  processSseEventData(jsonDataToParse, aiMessageId);
                  eventDataBuffer = ""; // Reset for next event
                }
              } else if (line.startsWith("data:")) {
                eventDataBuffer += line.substring(5).trimStart() + "\n"; // Add newline as per spec for multi-line data
              } else if (line.startsWith(":")) {
                // Comment line, ignore
              } // Other SSE fields (event, id, retry) can be handled here if needed
            }

            if (done) {
              // If the loop exited due to 'done', and there's still data in eventDataBuffer
              // (e.g., stream ended after data lines but before an empty line delimiter)
              if (eventDataBuffer.length > 0) {
                const jsonDataToParse = eventDataBuffer.endsWith("\n")
                  ? eventDataBuffer.slice(0, -1)
                  : eventDataBuffer;
                console.log(
                  "[SSE DISPATCH FINAL EVENT]:",
                  jsonDataToParse.substring(0, 200) + "..."
                ); // DEBUG
                processSseEventData(jsonDataToParse, aiMessageId);
                eventDataBuffer = ""; // Clear buffer
              }
              break; // Exit the while(true) loop
            }
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error:", error);
        // Update the AI message placeholder with an error message
        const aiMessageId = Date.now().toString() + "_ai_error";
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: `Sorry, there was an error processing your request: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            id: aiMessageId,
          },
        ]);
        setIsLoading(false);
      }
    },
    [userId, sessionId, appName, processSseEventData]
  );

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    const checkBackend = async (): Promise<void> => {
      setIsCheckingBackend(true);

      const isReady = await waitForBackend();
      setIsBackendReady(isReady);
      setIsCheckingBackend(false);

      if (!isReady) {
        console.error("Backend failed to start within the specified time");
      }
    };

    checkBackend();
  }, []);

  const handleCancel = useCallback((): void => {
    setMessages([]);
    setMessageEvents(new Map());
    setWebsiteCount(0);
    window.location.reload();
  }, []);

  return (
    <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <div
          className={`flex-1 overflow-y-auto ${
            messages.length === 0 || isCheckingBackend ? "flex" : ""
          }`}
        >
          {isCheckingBackend ? (
            <BackendLoadingScreen />
          ) : !isBackendReady ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-red-400">
                  Backend Unavailable
                </h2>
                <p className="text-neutral-300">
                  Unable to connect to backend services at localhost:8000
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              onCancel={handleCancel}
            />
          ) : (
            <ChatMessagesView
              messages={messages}
              isLoading={isLoading}
              scrollAreaRef={scrollAreaRef}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              messageEvents={messageEvents}
              websiteCount={websiteCount}
            />
          )}
        </div>
      </main>
    </div>
  );
}
