"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatMessagesView } from "@/components/ChatMessagesView";
import { ProcessedEvent } from "@/components/ActivityTimeline";
import { Message } from "@/types";

// Type for stored session data
interface StoredSession {
  id: string;
  userId: string;
  title: string;
  lastActivity: string;
  messageCount: number;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [messageEvents, setMessageEvents] = useState<
    Map<string, ProcessedEvent[]>
  >(new Map());
  const [websiteCount, setWebsiteCount] = useState<number>(0);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);

  // User ID and session management state
  const [userId, setUserId] = useState<string>("");

  // Session storage key for localStorage
  const getSessionStorageKey = (userId: string) => `chat_sessions_${userId}`;
  const getMessagesStorageKey = (userId: string, sessionId: string) =>
    `chat_messages_${userId}_${sessionId}`;

  // Load sessions from localStorage (for local mode)
  const loadSessionsFromStorage = useCallback((userId: string) => {
    try {
      const stored = localStorage.getItem(getSessionStorageKey(userId));
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading sessions from storage:", error);
      return [];
    }
  }, []);

  // Save sessions to localStorage (for local mode)
  const saveSessionsToStorage = useCallback(
    (userId: string, sessions: StoredSession[]) => {
      try {
        localStorage.setItem(
          getSessionStorageKey(userId),
          JSON.stringify(sessions)
        );
      } catch (error) {
        console.error("Error saving sessions to storage:", error);
      }
    },
    []
  );

  // Load messages for a specific session
  const loadMessagesFromStorage = useCallback(
    (userId: string, sessionId: string) => {
      try {
        const stored = localStorage.getItem(
          getMessagesStorageKey(userId, sessionId)
        );
        if (stored) {
          const parsedMessages = JSON.parse(stored);
          // Convert timestamp strings back to Date objects
          return parsedMessages.map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        }
        return [];
      } catch (error) {
        console.error("Error loading messages from storage:", error);
        return [];
      }
    },
    []
  );

  // Save messages for a specific session
  const saveMessagesToStorage = useCallback(
    (userId: string, sessionId: string, messages: Message[]) => {
      try {
        localStorage.setItem(
          getMessagesStorageKey(userId, sessionId),
          JSON.stringify(messages)
        );
      } catch (error) {
        console.error("Error saving messages to storage:", error);
      }
    },
    []
  );

  // Generate session title from first message
  const generateSessionTitle = useCallback((firstMessage: string): string => {
    if (!firstMessage) return "New Session";

    // Take first 30 characters and add ellipsis if longer
    const truncated =
      firstMessage.length > 30
        ? firstMessage.substring(0, 30) + "..."
        : firstMessage;

    // Remove newlines and extra spaces
    return truncated.replace(/\s+/g, " ").trim();
  }, []);

  // Handle session switching
  const handleSessionSwitch = useCallback(
    (newSessionId: string) => {
      console.log(
        `🔄 handleSessionSwitch called: current=${sessionId}, new=${newSessionId}, userId=${userId}`
      );

      if (!userId || newSessionId === sessionId) {
        console.log(`⏭️ Skipping session switch: no userId or same session`);
        return;
      }

      // Save current session messages before switching
      if (sessionId && messages.length > 0) {
        console.log(
          `💾 Saving ${messages.length} messages for current session: ${sessionId}`
        );
        saveMessagesToStorage(userId, sessionId, messages);

        // Update session in localStorage with latest activity
        const storedSessions = loadSessionsFromStorage(userId);
        const sessionIndex = storedSessions.findIndex(
          (s: StoredSession) => s.id === sessionId
        );
        if (sessionIndex !== -1) {
          storedSessions[sessionIndex] = {
            ...storedSessions[sessionIndex],
            lastActivity: new Date().toISOString(),
            messageCount: messages.length,
          };
          saveSessionsToStorage(userId, storedSessions);
          console.log(`✅ Updated session metadata for: ${sessionId}`);
        }
      }

      // Switch to new session
      console.log(`🎯 Setting sessionId state to: ${newSessionId}`);
      setSessionId(newSessionId);

      // Load messages for new session
      const sessionMessages = loadMessagesFromStorage(userId, newSessionId);
      console.log(
        `📨 Loaded ${sessionMessages.length} messages for session: ${newSessionId}`
      );
      setMessages(sessionMessages);

      // Clear events and website count for new session
      setMessageEvents(new Map());
      setWebsiteCount(0);
      console.log(`🧹 Cleared events and website count for new session`);
    },
    [
      userId,
      sessionId,
      messages,
      saveMessagesToStorage,
      loadSessionsFromStorage,
      saveSessionsToStorage,
      loadMessagesFromStorage,
    ]
  );

  // Update messages whenever they change (for persistence)
  useEffect(() => {
    if (userId && sessionId && messages.length > 0) {
      saveMessagesToStorage(userId, sessionId, messages);
    }
  }, [userId, sessionId, messages, saveMessagesToStorage]);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const accumulatedTextRef = useRef<string>("");
  const currentAgentRef = useRef<string>("");

  // Retry logic with exponential backoff (from example app)
  const retryWithBackoff = async (
    fn: () => Promise<Response>,
    maxRetries: number = 10,
    maxDuration: number = 120000 // 2 minutes
  ): Promise<Response> => {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (Date.now() - startTime > maxDuration) {
        throw new Error(`Retry timeout after ${maxDuration}ms`);
      }

      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
        console.log(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };

  // Backend health check (from example app)
  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/run_sse", {
        method: "OPTIONS",
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.ok;
    } catch (error) {
      console.log("Backend not ready yet:", error);
      return false;
    }
  };

  // Backend health checking effect (from example app)
  useEffect(() => {
    const checkBackend = async () => {
      setIsCheckingBackend(true);

      // Check if backend is ready with retry logic
      const maxAttempts = 60; // 2 minutes with 2-second intervals
      let attempts = 0;

      while (attempts < maxAttempts) {
        const isReady = await checkBackendHealth();
        if (isReady) {
          setIsBackendReady(true);
          setIsCheckingBackend(false);
          return;
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
      }

      // If we get here, backend didn't come up in time
      setIsCheckingBackend(false);
      console.error("Backend failed to start within 2 minutes");
    };

    checkBackend();
  }, []);

  // User ID management with localStorage persistence
  useEffect(() => {
    // Load user ID from localStorage on mount
    const savedUserId = localStorage.getItem("agent-engine-user-id");
    if (savedUserId) {
      setUserId(savedUserId);
    }
  }, []);

  // Handle user ID changes
  const handleUserIdChange = useCallback((newUserId: string): void => {
    setUserId(newUserId);
  }, []);

  // Handle user ID confirmation
  const handleUserIdConfirm = useCallback((confirmedUserId: string): void => {
    setUserId(confirmedUserId);
    localStorage.setItem("agent-engine-user-id", confirmedUserId);
  }, []);

  // Handle new session creation
  const handleCreateNewSession = useCallback(
    async (sessionUserId: string, initialMessage?: string): Promise<void> => {
      if (!sessionUserId) {
        throw new Error("User ID is required to create a session");
      }

      // Generate random session ID using the GitHub gist approach
      const randomPart =
        Math.random().toString(36).substring(2, 10) +
        Math.random().toString(36).substring(2, 10);
      const requestedSessionId = `session-${randomPart}`;

      // First, create the session via the API to get the actual session ID
      let actualSessionId = requestedSessionId;
      try {
        const sessionResponse = await fetch(
          `/api/apps/app/users/${sessionUserId}/sessions/${requestedSessionId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          // For Agent Engine, use the actual session ID returned by the backend
          actualSessionId = sessionData.sessionId || requestedSessionId;
          console.log(
            `✅ Session created: requested=${requestedSessionId}, actual=${actualSessionId}`
          );
          console.log(`📝 Session data:`, sessionData);
        } else {
          console.warn(
            "⚠️ Session creation API failed, using requested ID:",
            sessionResponse.status
          );
          // Fall back to using the requested ID
        }
      } catch (error) {
        console.warn("Session creation API error, using requested ID:", error);
        // Fall back to using the requested ID
      }

      // Generate session title from initial message or use default
      const sessionTitle = initialMessage
        ? generateSessionTitle(initialMessage)
        : `Session ${actualSessionId.slice(-8)}`;

      console.log(
        `📋 Creating session object: ID=${actualSessionId}, Title=${sessionTitle}`
      );

      // Create new session object with the actual session ID
      const newSession: StoredSession = {
        id: actualSessionId,
        userId: sessionUserId,
        title: sessionTitle,
        lastActivity: new Date().toISOString(),
        messageCount: 0,
      };

      // Save new session to localStorage
      const storedSessions = loadSessionsFromStorage(sessionUserId);
      const updatedSessions = [newSession, ...storedSessions];
      saveSessionsToStorage(sessionUserId, updatedSessions);
      console.log(`💾 Saved session to localStorage:`, newSession);

      // Switch to the new session using the actual session ID
      console.log(`🔄 Switching to session: ${actualSessionId}`);
      handleSessionSwitch(actualSessionId);

      // If there's an initial message, send it
      if (initialMessage) {
        console.log(
          `📨 Sending initial message to session: ${actualSessionId}`
        );
        // Use a direct API call to avoid circular dependency
        setIsLoading(true);
        try {
          const initialMessagePayload = {
            message: initialMessage,
            userId: sessionUserId,
            sessionId: actualSessionId,
          };
          console.log(`📤 Initial message payload:`, initialMessagePayload);

          const response = await fetch("/api/run_sse", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(initialMessagePayload),
          });

          if (!response.ok) {
            throw new Error(
              `API error: ${response.status} ${response.statusText}`
            );
          }

          // Handle the response stream similar to handleSubmit
          // For now, we'll just mark as not loading
          setIsLoading(false);
        } catch (error) {
          console.error("Error sending initial message:", error);
          setIsLoading(false);
        }
      }
    },
    [
      generateSessionTitle,
      loadSessionsFromStorage,
      saveSessionsToStorage,
      handleSessionSwitch,
    ]
  );

  // Enhanced SSE data extraction based on example app
  const extractDataFromSSE = (
    data: string
  ): {
    textParts: string[];
    thoughtParts: string[];
    agent: string;
    finalReportWithCitations?: boolean;
    functionCall?: { name: string; args: Record<string, unknown>; id: string };
    functionResponse?: {
      name: string;
      response: Record<string, unknown>;
      id: string;
    };
    sourceCount: number;
    sources?: Record<string, { title: string; url: string }>;
  } => {
    try {
      const parsed = JSON.parse(data);
      console.log("[SSE PARSED EVENT]:", JSON.stringify(parsed, null, 2));

      let textParts: string[] = [];
      let agent = "";
      let finalReportWithCitations = undefined;
      let functionCall = undefined;
      let functionResponse = undefined;
      let sources = undefined;

      // Extract text from content.parts (separate thoughts from regular text)
      let thoughtParts: string[] = [];
      if (parsed.content && parsed.content.parts) {
        // Extract regular text (non-thoughts)
        textParts = parsed.content.parts
          .filter(
            (part: { text?: string; thought?: boolean }) =>
              part.text && !part.thought
          )
          .map((part: { text: string }) => part.text);

        // Extract thoughts separately
        thoughtParts = parsed.content.parts
          .filter(
            (part: { text?: string; thought?: boolean }) =>
              part.text && part.thought
          )
          .map((part: { text: string }) => part.text);

        // Check for function calls
        const functionCallPart = parsed.content.parts.find(
          (part: { functionCall?: unknown }) => part.functionCall
        );
        if (functionCallPart) {
          functionCall = functionCallPart.functionCall as {
            name: string;
            args: Record<string, unknown>;
            id: string;
          };
        }

        // Check for function responses
        const functionResponsePart = parsed.content.parts.find(
          (part: { functionResponse?: unknown }) => part.functionResponse
        );
        if (functionResponsePart) {
          functionResponse = functionResponsePart.functionResponse as {
            name: string;
            response: Record<string, unknown>;
            id: string;
          };
        }
      }

      // Extract agent information
      if (parsed.author) {
        agent = parsed.author;
        console.log("[SSE EXTRACT] Agent:", agent);
      }

      // Extract final report flag
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
      if (parsed.actions?.stateDelta?.url_to_short_id) {
        console.log(
          "[SSE EXTRACT] url_to_short_id found:",
          parsed.actions.stateDelta.url_to_short_id
        );
        sourceCount = Object.keys(
          parsed.actions.stateDelta.url_to_short_id
        ).length;
        console.log("[SSE EXTRACT] Calculated sourceCount:", sourceCount);
      }

      // Extract sources if available
      if (parsed.actions?.stateDelta?.sources) {
        sources = parsed.actions.stateDelta.sources;
        console.log("[SSE EXTRACT] Sources found:", sources);
      }

      return {
        textParts,
        thoughtParts,
        agent,
        finalReportWithCitations,
        functionCall,
        functionResponse,
        sourceCount,
        sources,
      };
    } catch (error) {
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
        thoughtParts: [],
        agent: "",
        finalReportWithCitations: undefined,
        functionCall: undefined,
        functionResponse: undefined,
        sourceCount: 0,
        sources: undefined,
      };
    }
  };

  // Get event title for single agent (simplified from multi-agent version)
  const getEventTitle = (agentName: string): string => {
    // For single agent, focus on activity type rather than agent name
    if (agentName === "goal-planning-agent") {
      return "🎯 Planning Strategy";
    }
    if (agentName.includes("plan") || agentName.includes("planning")) {
      return "🎯 Planning Strategy";
    }
    if (agentName.includes("research") || agentName.includes("search")) {
      return "🔍 Researching Information";
    }
    if (agentName.includes("analysis") || agentName.includes("evaluating")) {
      return "📊 Analyzing Content";
    }
    if (agentName.includes("writing") || agentName.includes("report")) {
      return "✍️ Writing Response";
    }
    return `Processing (${agentName || "AI Agent"})`;
  };

  // Enhanced SSE event processing based on example app
  const processSseEventData = useCallback(
    (jsonData: string, aiMessageId: string): void => {
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

      // Handle thoughts - show in timeline for transparency like the example
      if (thoughtParts.length > 0) {
        console.log(
          "[SSE HANDLER] Processing thought parts for agent:",
          agent,
          "Thoughts:",
          thoughtParts
        );

        setMessageEvents((prev) =>
          new Map(prev).set(aiMessageId, [
            ...(prev.get(aiMessageId) || []),
            {
              title: "🤔 AI Thinking",
              data: { type: "thinking", content: thoughtParts.join(" ") },
            },
          ])
        );
      }

      if (textParts.length > 0) {
        // Handle different agent types like the example app
        if (
          agent === "goal-planning-agent" ||
          agent === "goal-planning-agent" ||
          agent === "interactive_planner_agent" ||
          agent === "root_agent"
        ) {
          // MAIN PLANNING AGENT → Stream text directly to main message (real-time effect)
          console.log(
            "[SSE HANDLER] Streaming text directly to main message for agent:",
            agent
          );
          for (const text of textParts) {
            accumulatedTextRef.current += text + " ";
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? {
                      ...msg,
                      content: accumulatedTextRef.current.trim(),
                    }
                  : msg
              )
            );
          }
        } else if (agent !== "report_composer_with_citations") {
          // OTHER AGENTS → Timeline events only (research, function calls, etc.)
          // BUT NOT for final report composition
          const eventTitle = getEventTitle(agent);
          console.log(
            "[SSE HANDLER] Adding Text timeline event for agent:",
            agent,
            "Title:",
            eventTitle
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
        }
        // Note: report_composer_with_citations is handled separately below
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

      // Handle final report with citations like the example app
      if (
        agent === "report_composer_with_citations" &&
        finalReportWithCitations
      ) {
        console.log(
          "[SSE HANDLER] Creating final report message for agent:",
          agent
        );
        const finalReportMessageId = Date.now().toString() + "_final";
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: String(finalReportWithCitations),
            id: finalReportMessageId,
            timestamp: new Date(),
          },
        ]);
      }
    },
    []
  );

  // Enhanced goal submission with retry logic and better error handling
  const handleSubmit = useCallback(
    async (
      query: string,
      requestUserId?: string,
      requestSessionId?: string
    ): Promise<void> => {
      if (!query.trim()) return;

      // Use provided userId or current state
      const currentUserId = requestUserId || userId;
      if (!currentUserId) {
        throw new Error("User ID is required to send messages");
      }

      setIsLoading(true);
      try {
        // Use provided session ID or current state
        let currentSessionId = requestSessionId || sessionId;
        console.log(
          `🎯 handleSubmit: requestSessionId=${requestSessionId}, sessionId=${sessionId}, currentSessionId=${currentSessionId}`
        );

        if (!currentSessionId) {
          console.log(`⚠️ No session ID available, generating new one`);
          currentSessionId = uuidv4();
          setSessionId(currentSessionId);
          console.log(`🆕 Generated new session ID: ${currentSessionId}`);
        } else {
          console.log(`✅ Using existing session ID: ${currentSessionId}`);
        }

        // Add user message to chat
        const userMessage: Message = {
          type: "human",
          content: query,
          id: uuidv4(),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);

        // Create AI message placeholder
        const aiMessageId = uuidv4();
        accumulatedTextRef.current = "";
        currentAgentRef.current = "";

        const aiMessage: Message = {
          type: "ai",
          content: "",
          id: aiMessageId,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Send to Agent Engine API with enhanced payload
        const apiPayload = {
          message: query,
          userId: currentUserId,
          sessionId: currentSessionId,
        };
        console.log(`📤 Sending API request with payload:`, apiPayload);

        const response = await retryWithBackoff(() =>
          fetch("/api/run_sse", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(apiPayload),
          })
        );

        if (!response.ok) {
          throw new Error(
            `API error: ${response.status} ${response.statusText}`
          );
        }

        // Handle SSE streaming with standard format
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = "";
        let eventDataBuffer = "";

        console.log("[SSE START] Beginning to process streaming response");

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();

            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              lineBuffer += chunk;
              console.log(
                `[SSE CHUNK] Received ${chunk.length} bytes:`,
                chunk.substring(0, 200) + (chunk.length > 200 ? "..." : "")
              );
            }

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
                line = lineBuffer;
                lineBuffer = "";
              }

              console.log(`[SSE LINE] Processing line: "${line}"`);

              if (line.trim() === "") {
                // Empty line: dispatch event
                if (eventDataBuffer.length > 0) {
                  const jsonDataToParse = eventDataBuffer.endsWith("\n")
                    ? eventDataBuffer.slice(0, -1)
                    : eventDataBuffer;
                  console.log(
                    "[SSE DISPATCH EVENT] Processing event data:",
                    jsonDataToParse.substring(0, 200) + "..."
                  );
                  processSseEventData(jsonDataToParse, aiMessageId);
                  eventDataBuffer = "";
                }
              } else if (line.startsWith("data:")) {
                const eventData = line.substring(5).trimStart();
                eventDataBuffer += eventData + "\n";
                console.log(`[SSE DATA] Added to buffer: "${eventData}"`);
              } else if (line.startsWith(":")) {
                console.log(`[SSE COMMENT] Ignoring comment: "${line}"`);
                // Comment line, ignore
              } else {
                console.log(`[SSE OTHER] Unknown line format: "${line}"`);
              }
            }

            if (done) {
              console.log("[SSE DONE] Stream ended, processing final buffer");
              if (eventDataBuffer.length > 0) {
                const jsonDataToParse = eventDataBuffer.endsWith("\n")
                  ? eventDataBuffer.slice(0, -1)
                  : eventDataBuffer;
                console.log(
                  "[SSE DISPATCH FINAL EVENT] Processing final event:",
                  jsonDataToParse.substring(0, 200) + "..."
                );
                processSseEventData(jsonDataToParse, aiMessageId);
                eventDataBuffer = "";
              }
              break;
            }
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error:", error);
        const errorMessage: Message = {
          type: "ai",
          content: `Sorry, there was an error processing your request: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          id: uuidv4(),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsLoading(false);
      }
    },
    [sessionId, userId, processSseEventData]
  );

  // Auto-scroll to bottom when new messages arrive
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

  // Enhanced cancel handler with backend state reset
  const handleCancel = useCallback((): void => {
    setIsLoading(false);
    // Clear any accumulated text
    accumulatedTextRef.current = "";
    currentAgentRef.current = "";
    // Clear timeline events
    setMessageEvents(new Map());
    setWebsiteCount(0);
    // Remove the last message if it's an empty AI message
    setMessages((prev) => {
      const filtered = prev.filter((msg) => msg.content.trim() !== "");
      return filtered;
    });
  }, []);

  // Backend loading screen component (from example app)
  const BackendLoadingScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <div className="w-full max-w-2xl z-10 bg-neutral-900/50 backdrop-blur-md p-8 rounded-2xl border border-neutral-700 shadow-2xl shadow-black/60">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
            ✨ AI Goal Planning Assistant 🚀
          </h1>

          <div className="flex flex-col items-center space-y-4">
            {/* Spinning animation */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-neutral-600 border-t-blue-500 rounded-full animate-spin"></div>
              <div
                className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-500 rounded-full animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1.5s",
                }}
              ></div>
            </div>

            <div className="space-y-2">
              <p className="text-xl text-neutral-300">
                Waiting for backend to be ready...
              </p>
              <p className="text-sm text-neutral-400">
                This may take a moment on first startup
              </p>
            </div>

            {/* Animated dots */}
            <div className="flex space-x-1">
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
      {/* Main chat area - full width */}
      <main className="flex-1 flex flex-col overflow-hidden">
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
                  Unable to connect to backend services
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <ChatMessagesView
              messages={messages}
              isLoading={isLoading}
              scrollAreaRef={scrollAreaRef}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              sessionId={sessionId}
              onSessionIdChange={handleSessionSwitch}
              messageEvents={messageEvents}
              websiteCount={websiteCount}
              userId={userId}
              onUserIdChange={handleUserIdChange}
              onUserIdConfirm={handleUserIdConfirm}
              onCreateSession={handleCreateNewSession}
            />
          )}
        </div>
      </main>
    </div>
  );
}
