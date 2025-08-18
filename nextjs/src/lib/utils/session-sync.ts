// src/lib/utils/session-sync.ts
// Utility for synchronizing sessions between ADK backend and Supabase

import { supabaseSessionService } from '@/lib/services/supabase-session-service';
import type { SessionMetadata } from '@/types/supabase-db';

/**
 * Result of session synchronization attempt
 */
export interface SyncResult {
  success: boolean;
  supabaseSessionId?: string;
  error?: string;
}

/**
 * Sync session metadata between ADK backend and Supabase
 * This creates or updates a Supabase record for an ADK session
 * 
 * @param userId - Supabase auth user ID
 * @param adkSessionId - ADK backend session ID
 * @param sessionTitle - Optional session title
 * @param metadata - Optional session metadata
 * @returns Sync result with Supabase session ID if successful
 */
export async function syncSessionMetadata(
  userId: string,
  adkSessionId: string,
  sessionTitle?: string,
  metadata?: SessionMetadata
): Promise<SyncResult> {
  try {
    // Check if this ADK session already exists in Supabase
    const existingResult = await supabaseSessionService.findSessionByAdkId(adkSessionId);
    
    if (existingResult.success && existingResult.data) {
      // Session already exists, update it
      const updateResult = await supabaseSessionService.updateChatSession(
        existingResult.data.id,
        {
          session_title: sessionTitle || existingResult.data.session_title,
          session_metadata: metadata || existingResult.data.session_metadata,
        }
      );
      
      if (updateResult.success) {
        return {
          success: true,
          supabaseSessionId: updateResult.data.id
        };
      } else {
        return {
          success: false,
          error: updateResult.error
        };
      }
    }
    
    // Create new Supabase session record
    const createResult = await supabaseSessionService.createChatSession({
      user_id: userId,
      adk_session_id: adkSessionId,
      session_title: sessionTitle || `Session ${new Date().toLocaleDateString()}`,
      session_metadata: metadata || {},
      message_count: 0
    });
    
    if (createResult.success) {
      return {
        success: true,
        supabaseSessionId: createResult.data.id
      };
    } else {
      return {
        success: false,
        error: createResult.error
      };
    }
  } catch (error) {
    console.error('[SessionSync] Error syncing session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown sync error'
    };
  }
}

/**
 * Link an existing ADK session to a Supabase user
 * This is useful when a session was created before user authentication
 * 
 * @param userId - Supabase auth user ID
 * @param adkSessionId - ADK backend session ID to link
 * @returns Success status and Supabase session ID
 */
export async function linkAdkSession(
  userId: string,
  adkSessionId: string
): Promise<SyncResult> {
  return syncSessionMetadata(userId, adkSessionId);
}

/**
 * Update the last activity timestamp for a session
 * This helps track which sessions are actively being used
 * 
 * @param sessionId - Either Supabase session ID or ADK session ID
 * @param incrementMessages - Whether to increment the message count
 * @returns Success status
 */
export async function updateLastActivity(
  sessionId: string,
  incrementMessages: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if this is a UUID (Supabase session ID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
    
    if (isUUID) {
      // Direct Supabase session ID
      const result = await supabaseSessionService.updateSessionActivity(
        sessionId,
        incrementMessages
      );
      return {
        success: result.success,
        error: result.success ? undefined : result.error
      };
    } else {
      // ADK session ID - find the corresponding Supabase record
      const findResult = await supabaseSessionService.findSessionByAdkId(sessionId);
      
      if (findResult.success && findResult.data) {
        const result = await supabaseSessionService.updateSessionActivity(
          findResult.data.id,
          incrementMessages
        );
        return {
          success: result.success,
          error: result.success ? undefined : result.error
        };
      }
      
      // No Supabase record found - this is OK, not all sessions are synced
      return {
        success: true
      };
    }
  } catch (error) {
    console.error('[SessionSync] Error updating last activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Batch sync multiple ADK sessions to Supabase
 * Useful for migrating existing sessions or ensuring consistency
 * 
 * @param userId - Supabase auth user ID
 * @param adkSessions - Array of ADK session IDs to sync
 * @returns Array of sync results
 */
export async function batchSyncSessions(
  userId: string,
  adkSessions: Array<{ id: string; title?: string; metadata?: SessionMetadata }>
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  
  for (const session of adkSessions) {
    const result = await syncSessionMetadata(
      userId,
      session.id,
      session.title,
      session.metadata
    );
    results.push(result);
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}
