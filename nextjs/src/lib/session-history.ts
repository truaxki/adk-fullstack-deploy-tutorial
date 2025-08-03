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
 * Simplified approach using smart endpoint routing (like web project)
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
 * ADK Session Service - Handles all session-related API calls
 * Uses smart endpoint routing to work with both local backend and Agent Engine
 */
export class AdkSessionService {
  /**
   * Retrieves a specific session by ID
   */
  static async getSession(
    userId: string,
    sessionId: string
  ): Promise<AdkSession | null> {
    const appName = getAdkAppName();

    if (shouldUseAgentEngine()) {
      // Agent Engine: Use v1beta1 sessions API
      const endpoint = getEndpointForPath(`/${sessionId}`, "sessions");

      console.log("🔗 [ADK SESSION SERVICE] Agent Engine getSession request:", {
        endpoint,
        method: "GET",
        sessionId,
      });

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            ...authHeaders,
          },
        });

        console.log(
          "📡 [ADK SESSION SERVICE] Agent Engine getSession response:",
          {
            status: response.status,
            statusText: response.statusText,
          }
        );

        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          throw new Error(`Failed to get session: ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        console.error(
          "❌ [ADK SESSION SERVICE] Agent Engine getSession error:",
          error
        );
        throw error;
      }
    } else {
      // Local Backend: GET with path
      const endpoint = getEndpointForPath(
        `/apps/${appName}/users/${userId}/sessions/${sessionId}`
      );

      console.log(
        "🔗 [ADK SESSION SERVICE] Local Backend getSession request:",
        {
          endpoint,
          method: "GET",
          userId,
          sessionId,
          appName,
        }
      );

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            ...authHeaders,
          },
        });

        console.log(
          "📡 [ADK SESSION SERVICE] Local Backend getSession response:",
          {
            status: response.status,
            statusText: response.statusText,
          }
        );

        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          throw new Error(`Failed to get session: ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        console.error(
          "❌ [ADK SESSION SERVICE] Local Backend getSession error:",
          error
        );
        throw error;
      }
    }
  }

  /**
   * Lists all sessions for a user
   */
  static async listSessions(userId: string): Promise<ListSessionsResponse> {
    const appName = getAdkAppName();

    if (shouldUseAgentEngine()) {
      // Agent Engine: Use v1beta1 sessions API
      const endpoint = getEndpointForPath("", "sessions");

      console.log(
        "🔗 [ADK SESSION SERVICE] Agent Engine listSessions request:",
        {
          endpoint,
          method: "GET",
        }
      );

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            ...authHeaders,
          },
        });

        console.log(
          "📡 [ADK SESSION SERVICE] Agent Engine listSessions response:",
          {
            status: response.status,
            statusText: response.statusText,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to list sessions: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log(
          "🔍 [ADK SESSION SERVICE] Raw response data:",
          responseData
        );

        // Agent Engine sessions API returns sessions with 'name' field, need to extract ID
        const rawSessions = responseData.sessions || responseData || [];
        const sessions: AdkSession[] = rawSessions.map(
          (session: {
            name?: string;
            createTime?: string;
            updateTime?: string;
            userId?: string;
          }) => {
            // Extract session ID from name field: "projects/.../sessions/SESSION_ID"
            const sessionId = session.name
              ? session.name.split("/sessions/")[1]
              : null;

            return {
              id: sessionId,
              app_name: getAdkAppName(), // Add app_name for compatibility
              user_id: session.userId,
              state: null,
              last_update_time: session.updateTime || session.createTime,
              // Keep original fields for reference
              name: session.name,
              createTime: session.createTime,
              updateTime: session.updateTime,
            };
          }
        );

        console.log("✅ [ADK SESSION SERVICE] Agent Engine success:", {
          responseType: typeof responseData,
          isArray: Array.isArray(responseData),
          hasSessionsProperty: "sessions" in (responseData || {}),
          sessionsCount: Array.isArray(sessions)
            ? sessions.length
            : "not-array",
          sessionIds: Array.isArray(sessions)
            ? sessions.map((s) => s.id || "no-id")
            : "not-array",
        });

        return {
          sessions: Array.isArray(sessions) ? sessions : [],
          sessionIds: Array.isArray(sessions)
            ? sessions.map((session) => session.id)
            : [],
        };
      } catch (error) {
        console.error(
          "❌ [ADK SESSION SERVICE] Agent Engine listSessions error:",
          error
        );
        throw error;
      }
    } else {
      // Local Backend: GET with path
      const endpoint = getEndpointForPath(
        `/apps/${appName}/users/${userId}/sessions`
      );

      console.log(
        "🔗 [ADK SESSION SERVICE] Local Backend listSessions request:",
        {
          endpoint,
          method: "GET",
          userId,
          appName,
        }
      );

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            ...authHeaders,
          },
        });

        console.log("📡 [ADK SESSION SERVICE] Local Backend response:", {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get("content-type"),
        });

        if (!response.ok) {
          throw new Error(`Failed to list sessions: ${response.statusText}`);
        }

        const sessions: AdkSession[] = await response.json();

        console.log("✅ [ADK SESSION SERVICE] Local Backend success:", {
          sessionsCount: sessions.length,
          sessionIds: sessions.map((s) => s.id || "no-id"),
        });

        return {
          sessions,
          sessionIds: sessions.map((session) => session.id),
        };
      } catch (error) {
        console.error("❌ [ADK SESSION SERVICE] Local Backend error:", error);
        throw error;
      }
    }
  }

  /**
   * Lists all events for a specific session
   */
  static async listEvents(
    userId: string,
    sessionId: string
  ): Promise<ListEventsResponse> {
    const appName = getAdkAppName();

    if (shouldUseAgentEngine()) {
      // Agent Engine: Use v1beta1 sessions API
      const endpoint = getEndpointForPath(`/${sessionId}/events`, "sessions");

      console.log("🔗 [ADK SESSION SERVICE] Agent Engine listEvents request:", {
        endpoint,
        method: "GET",
        sessionId,
      });

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            ...authHeaders,
          },
        });

        console.log(
          "📡 [ADK SESSION SERVICE] Agent Engine listEvents response:",
          {
            status: response.status,
            statusText: response.statusText,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to list events: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log(
          "🔍 [ADK SESSION SERVICE] Agent Engine listEvents raw response:",
          responseData
        );

        console.log(
          "📊 [ADK SESSION SERVICE] Agent Engine listEvents parsed:",
          {
            responseType: typeof responseData,
            isArray: Array.isArray(responseData),
            hasEventsProperty: "events" in (responseData || {}),
            eventsCount: Array.isArray(responseData?.events)
              ? responseData.events.length
              : "not-array",
            eventIds: Array.isArray(responseData?.events)
              ? responseData.events
                  .map((event: any) => event.id || event.name || "no-id")
                  .slice(0, 3)
              : "not-array",
          }
        );

        return responseData;
      } catch (error) {
        console.error(
          "❌ [ADK SESSION SERVICE] Agent Engine listEvents error:",
          error
        );
        throw error;
      }
    } else {
      // Local Backend: GET with path
      const endpoint = getEndpointForPath(
        `/apps/${appName}/users/${userId}/sessions/${sessionId}/events`
      );

      console.log(
        "🔗 [ADK SESSION SERVICE] Local Backend listEvents request:",
        {
          endpoint,
          method: "GET",
          userId,
          sessionId,
          appName,
        }
      );

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            ...authHeaders,
          },
        });

        console.log(
          "📡 [ADK SESSION SERVICE] Local Backend listEvents response:",
          {
            status: response.status,
            statusText: response.statusText,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to list events: ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        console.error(
          "❌ [ADK SESSION SERVICE] Local Backend listEvents error:",
          error
        );
        throw error;
      }
    }
  }

  /**
   * Retrieves a session with all its events (for historical context)
   */
  static async getSessionWithEvents(
    userId: string,
    sessionId: string
  ): Promise<AdkSessionWithEvents | null> {
    try {
      console.log("🔍 [ADK SESSION SERVICE] Fetching session and events:", {
        userId,
        sessionId,
      });

      // Fetch session only (backend includes events in session detail)
      const session = await AdkSessionService.getSession(userId, sessionId);

      console.log("📦 [ADK SESSION SERVICE] Session response:", {
        session: session
          ? {
              id: session.id,
              app_name: session.app_name,
              eventsCount: session.events?.length || 0,
              hasEventsProperty: "events" in session,
              eventsType: typeof session.events,
              eventsIsArray: Array.isArray(session.events),
            }
          : null,
      });

      if (!session) {
        console.log("❌ [ADK SESSION SERVICE] Session not found");
        return null;
      }

      // Use events directly from session detail (backend includes them)
      const events = session.events || [];
      console.log(
        "🔄 [ADK SESSION SERVICE] Using events from session detail:",
        {
          eventsCount: events.length,
        }
      );

      return {
        ...session,
        events,
      };
    } catch (error) {
      console.error(
        "❌ [ADK SESSION SERVICE] Error fetching session with events:",
        error
      );
      throw error;
    }
  }
}

/**
 * Convenience functions that use the AdkSessionService
 */
export async function getSessionWithEvents(
  userId: string,
  sessionId: string
): Promise<AdkSessionWithEvents | null> {
  return await AdkSessionService.getSessionWithEvents(userId, sessionId);
}

export async function listUserSessions(
  userId: string
): Promise<ListSessionsResponse> {
  return await AdkSessionService.listSessions(userId);
}
