import {
  getEndpointForPath,
  getAuthHeaders,
  shouldUseAgentEngine,
} from "@/lib/config";
import type {
  AdkSession,
  AdkSessionWithEvents,
  ListSessionsResponse,
  ListEventsResponse,
} from "@/lib/types/adk";

/**
 * ADK Session History Service - Handles session and event retrieval for chat history
 * Ported from web project and adapted for nextjs project architecture
 *
 * This service provides:
 * - Session retrieval by ID
 * - Event listing for sessions
 * - Combined session + events for historical loading
 * - Support for both Agent Engine and Local Backend deployments
 */

/**
 * Gets the ADK app name from environment or defaults
 */
function getAdkAppName(): string {
  return process.env.ADK_APP_NAME || "app";
}

/**
 * Base ADK Session History Service
 * Provides common functionality for both Agent Engine and Local Backend
 */
export abstract class AdkSessionHistoryService {
  abstract getSession(
    userId: string,
    sessionId: string
  ): Promise<AdkSession | null>;
  abstract listSessions(userId: string): Promise<ListSessionsResponse>;
  abstract listEvents(
    userId: string,
    sessionId: string
  ): Promise<ListEventsResponse>;

  /**
   * Retrieves a session with all its events (for historical context)
   * This is the main method used for loading chat history
   */
  async getSessionWithEvents(
    userId: string,
    sessionId: string
  ): Promise<AdkSessionWithEvents | null> {
    try {
      console.log("🔍 [ADK_SESSION_HISTORY] Fetching session and events:", {
        userId,
        sessionId,
      });

      // Fetch session only (backend includes events in session detail)
      // Note: /events endpoint returns 404, so we only use the session detail
      const session = await this.getSession(userId, sessionId);

      console.log("📦 [ADK_SESSION_HISTORY] Session response:", {
        session: session
          ? {
              id: session.id,
              app_name: session.app_name,
              eventsCount: session.events?.length || 0,
            }
          : null,
      });

      if (!session) {
        console.log("❌ [ADK_SESSION_HISTORY] Session not found");
        return null;
      }

      // Use events directly from session detail (backend includes them)
      const events = session.events || [];
      console.log(
        "🔄 [ADK_SESSION_HISTORY] Using events from session detail:",
        {
          eventsCount: events.length,
          reason:
            "Backend includes events in session detail response (no separate /events endpoint)",
        }
      );

      console.log("🔄 [ADK_SESSION_HISTORY] Processing events:", {
        eventsType: typeof events,
        isArray: Array.isArray(events),
        length: Array.isArray(events) ? events.length : "N/A",
        events: events,
      });

      const validEvents = Array.isArray(events) ? events : [];

      // Sort events by timestamp to ensure proper chronological order
      const sortedEvents = validEvents.sort(
        (a, b) => a.timestamp - b.timestamp
      );

      console.log("✅ [ADK_SESSION_HISTORY] Final result:", {
        sessionId: session.id,
        eventsCount: sortedEvents.length,
      });

      return {
        ...session,
        events: sortedEvents,
      };
    } catch (error) {
      console.error(
        "❌ [ADK_SESSION_HISTORY] Error fetching session with events:",
        error
      );
      // Return session with empty events array if events fetch fails
      try {
        const session = await this.getSession(userId, sessionId);
        if (session) {
          return {
            ...session,
            events: [],
          };
        }
      } catch (sessionError) {
        console.error("Error fetching session as fallback:", sessionError);
      }
      throw error;
    }
  }
}

/**
 * Agent Engine ADK Session History Service
 * Handles session history for Agent Engine deployments
 */
export class AgentEngineAdkSessionHistoryService extends AdkSessionHistoryService {
  /**
   * Retrieves a specific session by ID from Agent Engine
   */
  async getSession(
    userId: string,
    sessionId: string
  ): Promise<AdkSession | null> {
    const endpoint = getEndpointForPath("", "query");
    const appName = getAdkAppName();

    const payload = {
      class_method: "get_session",
      input: {
        user_id: userId,
        session_id: sessionId,
        app_name: appName,
      },
    };

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get session: ${response.statusText}`);
      }

      const result = await response.json();
      return result.output || null;
    } catch (error) {
      console.error("Agent Engine get session error:", error);
      throw error;
    }
  }

  /**
   * Lists all sessions for a user from Agent Engine
   */
  async listSessions(userId: string): Promise<ListSessionsResponse> {
    const endpoint = getEndpointForPath("", "query");
    const appName = getAdkAppName();

    const payload = {
      class_method: "list_sessions",
      input: {
        user_id: userId,
        app_name: appName,
      },
    };

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to list sessions: ${response.statusText}`);
      }

      const result = await response.json();
      const sessions: AdkSession[] = result.output || [];

      return {
        sessions,
        sessionIds: sessions.map((session) => session.id),
      };
    } catch (error) {
      console.error("Agent Engine list sessions error:", error);
      throw error;
    }
  }

  /**
   * Lists all events for a specific session from Agent Engine
   * Note: Events are included in the session detail response
   * This method returns empty events since we use session detail instead
   */
  async listEvents(
    userId: string,
    sessionId: string
  ): Promise<ListEventsResponse> {
    console.log(
      "ℹ️ [AGENT_ENGINE] listEvents called but using events from session detail instead:",
      sessionId
    );

    // We use events from session detail response instead of separate endpoint
    // to avoid potential API inconsistencies and reduce network calls
    return {
      events: [],
    };
  }
}

/**
 * Local Backend ADK Session History Service
 * Handles session history for local backend deployments
 */
export class LocalBackendAdkSessionHistoryService extends AdkSessionHistoryService {
  /**
   * Retrieves a specific session by ID from local backend
   */
  async getSession(
    userId: string,
    sessionId: string
  ): Promise<AdkSession | null> {
    const appName = getAdkAppName();
    const endpoint = getEndpointForPath(
      `/apps/${appName}/users/${userId}/sessions/${sessionId}`
    );

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          ...authHeaders,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get session: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error("Local backend get session error:", error);
      throw error;
    }
  }

  /**
   * Lists all sessions for a user from local backend
   */
  async listSessions(userId: string): Promise<ListSessionsResponse> {
    const appName = getAdkAppName();
    const endpoint = getEndpointForPath(
      `/apps/${appName}/users/${userId}/sessions`
    );

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          ...authHeaders,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list sessions: ${response.statusText}`);
      }

      const sessions: AdkSession[] = await response.json();

      return {
        sessions,
        sessionIds: sessions.map((session) => session.id),
      };
    } catch (error) {
      console.error("Local backend list sessions error:", error);
      throw error;
    }
  }

  /**
   * Lists all events for a specific session from local backend
   * Note: This backend doesn't have a separate /events endpoint
   * Events are included in the session detail response instead
   */
  async listEvents(
    userId: string,
    sessionId: string
  ): Promise<ListEventsResponse> {
    console.log(
      "ℹ️ [LOCAL_BACKEND] listEvents called but /events endpoint doesn't exist - events are in session detail:",
      sessionId
    );

    // This backend includes events in the session detail response
    // The separate /events endpoint returns 404, so we return empty here
    // The getSessionWithEvents method uses events from session detail instead
    return {
      events: [],
    };
  }
}

/**
 * Factory function to get the appropriate ADK session history service based on deployment configuration
 */
export function getAdkSessionHistoryService(): AdkSessionHistoryService {
  if (shouldUseAgentEngine()) {
    return new AgentEngineAdkSessionHistoryService();
  } else {
    return new LocalBackendAdkSessionHistoryService();
  }
}

/**
 * Convenience function to get session with events using the appropriate service
 * This is the main function that will be used by the chat interface
 */
export async function getSessionWithEvents(
  userId: string,
  sessionId: string
): Promise<AdkSessionWithEvents | null> {
  const service = getAdkSessionHistoryService();
  return await service.getSessionWithEvents(userId, sessionId);
}

/**
 * Convenience function to list user sessions using the appropriate service
 */
export async function listUserSessions(
  userId: string
): Promise<ListSessionsResponse> {
  const service = getAdkSessionHistoryService();
  return await service.listSessions(userId);
}
