import {
  getEndpointForPath,
  getAuthHeaders,
  shouldUseAgentEngine,
} from "@/lib/config";
import { syncSessionMetadata } from "@/lib/utils/session-sync";

/**
 * Gets the ADK app name from environment or defaults
 */
function getAdkAppName(): string {
  return process.env.ADK_APP_NAME || "app";
}

/**
 * Session creation result with success status and session details
 */
export interface SessionCreationResult {
  success: boolean;
  sessionId?: string;
  created?: boolean;
  error?: string;
  deploymentType?: string;
  // New fields for Supabase integration
  supabaseSessionId?: string;
  synced?: boolean;
}

/**
 * Abstract base class for session management services
 */
export abstract class SessionService {
  abstract createSession(userId: string): Promise<SessionCreationResult>;
}

/**
 * Agent Engine session service implementation
 * Handles session creation using Agent Engine's API
 */
export class AgentEngineSessionService extends SessionService {
  async createSession(userId: string): Promise<SessionCreationResult> {
    console.log('🚀 [AGENT_ENGINE_SESSION] Creating session for user:', userId);
    
    const sessionEndpoint = getEndpointForPath("", "query");
    console.log('🔗 [AGENT_ENGINE_SESSION] Endpoint:', sessionEndpoint);

    const createSessionPayload = {
      class_method: "create_session",
      input: {
        user_id: userId,
      },
    };

    try {
      const authHeaders = await getAuthHeaders();
      console.log('📡 [AGENT_ENGINE_SESSION] Making request to ADK backend...');
      
      const createSessionResponse = await fetch(sessionEndpoint, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createSessionPayload),
      });

      console.log('📡 [AGENT_ENGINE_SESSION] Response status:', createSessionResponse.status);

      if (createSessionResponse.ok) {
        const sessionData = await createSessionResponse.json();
        console.log('📊 [AGENT_ENGINE_SESSION] Session data received:', sessionData);
        
        const actualSessionId = sessionData.output?.id;
        console.log('🆔 [AGENT_ENGINE_SESSION] Extracted session ID:', actualSessionId);
        
        if (actualSessionId) {
          // Try to sync with Supabase (non-blocking)
          let supabaseSessionId: string | undefined;
          let synced = false;
          
          try {
            console.log('🔄 [AGENT_ENGINE_SESSION] Starting Supabase sync...');
            const syncResult = await syncSessionMetadata(
              userId,
              actualSessionId,
              `Session ${new Date().toLocaleDateString()}`,
              { deployment_type: 'agent_engine' }
            );
            
            if (syncResult.success) {
              supabaseSessionId = syncResult.supabaseSessionId;
              synced = true;
              console.log(`✅ [AGENT_ENGINE_SESSION] Session synced to Supabase: ${supabaseSessionId}`);
            } else {
              console.warn('⚠️ [AGENT_ENGINE_SESSION] Supabase sync failed:', syncResult.error);
            }
          } catch (syncError) {
            console.warn('⚠️ [AGENT_ENGINE_SESSION] Supabase sync error (non-critical):', syncError);
          }

          return {
            success: true,
            sessionId: actualSessionId,
            created: true,
            deploymentType: "agent_engine",
            supabaseSessionId,
            synced,
          };
        }
      }

      console.warn("Agent Engine session creation failed");
      return {
        success: false,
        sessionId: "",
        created: false,
        error: "Agent Engine session creation failed",
        deploymentType: "agent_engine",
      };
    } catch (sessionError) {
      console.warn("Agent Engine session creation error:", sessionError);
      return {
        success: false,
        sessionId: "",
        created: false,
        error: `Agent Engine session creation error: ${
          sessionError instanceof Error
            ? sessionError.message
            : String(sessionError)
        }`,
        deploymentType: "agent_engine",
      };
    }
  }
}

/**
 * Local Backend session service implementation
 * Handles session creation using local backend API
 */
export class LocalBackendSessionService extends SessionService {
  async createSession(userId: string): Promise<SessionCreationResult> {
    const appName = getAdkAppName();
    const sessionEndpoint = getEndpointForPath(
      `/apps/${appName}/users/${userId}/sessions`
    );

    try {
      const sessionAuthHeaders = await getAuthHeaders();
      const sessionResponse = await fetch(sessionEndpoint, {
        method: "POST",
        headers: {
          ...sessionAuthHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        console.error(
          "Local backend session creation failed:",
          sessionResponse.status,
          errorText
        );
        return {
          success: false,
          error: `Local backend session creation failed: ${sessionResponse.status} ${errorText}`,
          deploymentType: "local_backend",
        };
      }

      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.id;

      if (!sessionId) {
        return {
          success: false,
          error: "Local backend did not return a session ID",
          deploymentType: "local_backend",
        };
      }

      console.log("Local backend session created successfully:", sessionId);

      // Try to sync with Supabase (non-blocking)
      let supabaseSessionId: string | undefined;
      let synced = false;
      
      try {
        const syncResult = await syncSessionMetadata(
          userId,
          sessionId,
          `Session ${new Date().toLocaleDateString()}`,
          { deployment_type: 'local_backend' }
        );
        
        if (syncResult.success) {
          supabaseSessionId = syncResult.supabaseSessionId;
          synced = true;
          console.log(`✅ Session synced to Supabase: ${supabaseSessionId}`);
        } else {
          console.warn('⚠️ Supabase sync failed, continuing with ADK session only');
        }
      } catch (syncError) {
        console.warn('⚠️ Supabase sync error (non-critical):', syncError);
      }

      return {
        success: true,
        sessionId,
        created: true,
        deploymentType: "local_backend",
        supabaseSessionId,
        synced,
      };
    } catch (sessionError) {
      console.error("Local backend session creation error:", sessionError);
      return {
        success: false,
        error: `Local backend session creation error: ${
          sessionError instanceof Error
            ? sessionError.message
            : String(sessionError)
        }`,
        deploymentType: "local_backend",
      };
    }
  }
}

/**
 * Factory function to get the appropriate session service based on deployment configuration
 */
export function getSessionService(): SessionService {
  if (shouldUseAgentEngine()) {
    return new AgentEngineSessionService();
  } else {
    return new LocalBackendSessionService();
  }
}

/**
 * Convenience function to create a session using the appropriate service
 * This function determines the deployment strategy and delegates to the correct service
 * Now includes automatic Supabase synchronization
 */
export async function createSessionWithService(
  userId: string
): Promise<SessionCreationResult> {
  const service = getSessionService();
  return await service.createSession(userId);
}
