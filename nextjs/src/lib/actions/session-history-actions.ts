"use server";

import { getSessionWithEvents } from "@/lib/session-history";
import { convertAdkEventsToMessages } from "@/lib/message-converter";
import { supabaseSessionServiceServer } from "@/lib/services/supabase-session-service-server";
import type { Message } from "@/types";
import type { ProcessedEvent } from "@/components/ActivityTimeline";

/**
 * Server Action for loading session history
 * This keeps Google Auth Library on the server side and returns processed data to client
 */

export interface SessionHistoryResult {
  success: boolean;
  messages: Message[];
  messageEvents: Map<string, ProcessedEvent[]>;
  error?: string;
  fromCache?: boolean; // Indicates if data was loaded from Supabase cache
}

export async function loadSessionHistoryAction(
  userId: string,
  sessionId: string
): Promise<SessionHistoryResult> {
  try {
    console.log("🔄 [SESSION_HISTORY_ACTION] Loading session history:", {
      userId,
      sessionId,
    });

    // First, try to check if this session exists in Supabase cache
    // This is a quick check to see if we should load from ADK or not
    let isSupabaseSession = false;
    let adkSessionId = sessionId; // Assume it's an ADK ID initially

    // Check if this might be a Supabase UUID (basic check for UUID format)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
    
    if (isUUID) {
      // This might be a Supabase session ID, try to get the ADK session ID
      console.log("🔍 [SESSION_HISTORY_ACTION] Checking Supabase for session:", sessionId);
      const supabaseResult = await supabaseSessionServiceServer.getSession(sessionId);
      
      if (supabaseResult.success && supabaseResult.data) {
        isSupabaseSession = true;
        if (supabaseResult.data.adk_session_id) {
          adkSessionId = supabaseResult.data.adk_session_id;
          console.log("✅ [SESSION_HISTORY_ACTION] Found ADK session ID in Supabase:", adkSessionId);
        } else {
          // Supabase session exists but no ADK ID - might be a new session
          console.log("⚠️ [SESSION_HISTORY_ACTION] Supabase session has no ADK ID yet");
          return {
            success: true,
            messages: [],
            messageEvents: new Map(),
            fromCache: true
          };
        }
      }
    } else {
      // This is likely an ADK session ID, check if it's cached in Supabase
      const findResult = await supabaseSessionServiceServer.findSessionByAdkId(sessionId);
      if (findResult.success && findResult.data) {
        console.log("📦 [SESSION_HISTORY_ACTION] Found session in Supabase cache");
        // We found it in cache, but still load from ADK for now
        // In future, we could cache messages in Supabase too
      }
    }

    // Fetch session with events from ADK backend (server-side)
    const sessionWithEvents = await getSessionWithEvents(userId, adkSessionId);

    if (!sessionWithEvents) {
      console.log("⚠️ [SESSION_HISTORY_ACTION] Session not found in ADK");
      
      // If this was a Supabase session, return empty but indicate it exists
      if (isSupabaseSession) {
        return {
          success: true,
          messages: [],
          messageEvents: new Map(),
          fromCache: true
        };
      }
      
      return {
        success: true,
        messages: [],
        messageEvents: new Map(),
      };
    }

    console.log("📦 [SESSION_HISTORY_ACTION] Session history loaded from ADK:", {
      sessionId: sessionWithEvents.id,
      eventsCount: sessionWithEvents.events?.length || 0,
    });

    // Convert ADK events to frontend messages
    const { messages: historicalMessages, timelineActivities } =
      convertAdkEventsToMessages(sessionWithEvents.events || []);

    console.log("✅ [SESSION_HISTORY_ACTION] Historical messages converted:", {
      messagesCount: historicalMessages.length,
      timelineActivitiesCount: timelineActivities.length,
    });

    // Process timeline events for messages that have them
    const messageEvents = new Map<string, ProcessedEvent[]>();
    historicalMessages.forEach((message) => {
      if (message.timelineActivities && message.timelineActivities.length > 0) {
        // Convert timeline activities to ProcessedEvent format
        const processedEvents: ProcessedEvent[] =
          message.timelineActivities.map((activity) => {
            // For thinking activities, extract metadata content to match real-time streaming format
            if (
              activity.metadata &&
              typeof activity.metadata === "object" &&
              "type" in activity.metadata &&
              activity.metadata.type === "thinking"
            ) {
              return {
                title: activity.title,
                data: {
                  type: "thinking",
                  content: activity.metadata.content || "",
                },
              };
            }

            // For other activities, use the existing format
            return {
              title: activity.title,
              data: {
                type: activity.type,
                agent: activity.agent,
                timestamp: activity.timestamp,
                metadata: activity.metadata,
              },
            };
          });
        messageEvents.set(message.id, processedEvents);
      }
    });

    // Update Supabase cache with latest activity (non-blocking)
    if (isSupabaseSession || adkSessionId !== sessionId) {
      // Update activity timestamp and message count
      try {
        if (isSupabaseSession) {
          await supabaseSessionServiceServer.updateChatSession(sessionId, {
            message_count: historicalMessages.length,
            last_message_at: historicalMessages.length > 0 
              ? new Date().toISOString() 
              : undefined
          });
        } else {
          // Update by ADK ID
          const findResult = await supabaseSessionServiceServer.findSessionByAdkId(adkSessionId);
          if (findResult.success && findResult.data) {
            await supabaseSessionServiceServer.updateChatSession(findResult.data.id, {
              message_count: historicalMessages.length,
              last_message_at: historicalMessages.length > 0 
                ? new Date().toISOString() 
                : undefined
            });
          }
        }
      } catch (error) {
        // Non-critical error, just log it
        console.warn("⚠️ [SESSION_HISTORY_ACTION] Failed to update Supabase cache:", error);
      }
    }

    console.log(
      "✅ [SESSION_HISTORY_ACTION] Session history loaded successfully"
    );

    return {
      success: true,
      messages: historicalMessages as Message[],
      messageEvents,
      fromCache: false
    };
  } catch (error) {
    console.error(
      "❌ [SESSION_HISTORY_ACTION] Error loading session history:",
      error
    );
    return {
      success: false,
      messages: [],
      messageEvents: new Map(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Server Action for loading all user sessions
 * Loads from Supabase cache first, with ADK fallback
 */
export interface UserSessionsResult {
  success: boolean;
  sessions: Array<{
    id: string;
    title: string;
    lastMessageAt: Date | null;
    messageCount: number;
    createdAt: Date;
    source: 'supabase' | 'adk';
  }>;
  error?: string;
}

export async function loadUserSessionsAction(userId: string): Promise<UserSessionsResult> {
  try {
    console.log("🔄 [SESSION_HISTORY_ACTION] Loading user sessions:", userId);

    // First try to load from Supabase cache
    const supabaseResult = await supabaseSessionServiceServer.loadUserSessions(userId);

    if (supabaseResult.success && supabaseResult.data.length > 0) {
      console.log("✅ [SESSION_HISTORY_ACTION] Loaded sessions from Supabase:", 
        supabaseResult.data.length);

      const sessions = supabaseResult.data.map(session => ({
        id: session.id,
        title: session.session_title || `Session ${new Date(session.created_at).toLocaleDateString()}`,
        lastMessageAt: session.last_message_at ? new Date(session.last_message_at) : null,
        messageCount: session.message_count,
        createdAt: new Date(session.created_at),
        source: 'supabase' as const
      }));

      return {
        success: true,
        sessions
      };
    }

    // If no sessions in Supabase or error, we could try ADK backend here
    // For now, just return empty array
    console.log("⚠️ [SESSION_HISTORY_ACTION] No sessions found in Supabase");
    
    return {
      success: true,
      sessions: []
    };
  } catch (error) {
    console.error("❌ [SESSION_HISTORY_ACTION] Error loading user sessions:", error);
    return {
      success: false,
      sessions: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
