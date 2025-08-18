// src/lib/services/supabase-session-service.ts
// Service for managing chat sessions in Supabase database

import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChatSessionDB,
  ChatSessionInsert,
  ChatSessionUpdate,
  UserStateDB,
  UserStateInsert,
  // UserStateUpdate - removed unused import
  EnhancedSession,
  SupabaseResponse
} from '@/types/supabase-db';

/**
 * Service class for managing Supabase chat sessions and user state
 * Provides bridge between Supabase auth and ADK backend sessions
 */
export class SupabaseSessionService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    // Client will be created lazily
  }

  private async getClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      console.log('🔧 [SupabaseSessionService] Using browser client');
      this.supabase = createClient();
    }
    return this.supabase;
  }

  // ============================================
  // READ OPERATIONS (SAFE - Phase 1)
  // ============================================

  /**
   * Load all sessions for a user from Supabase
   * @param userId - Supabase auth user ID
   * @returns Array of chat sessions or error
   */
  async loadUserSessions(userId: string): Promise<SupabaseResponse<ChatSessionDB[]>> {
    try {
      console.log('[SupabaseSessionService] Loading sessions for user:', userId);
      
      const supabase = await this.getClient();
      
      // Check if user is authenticated first
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('[SupabaseSessionService] Auth user check:', {
        authUser: authUser?.id,
        requestedUserId: userId,
        isAuthenticated: !!authUser
      });
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        // Better error logging for Supabase errors
        console.error('[SupabaseSessionService] Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        return {
          success: false,
          error: `Supabase error: ${error.message}${error.details ? ` - ${error.details}` : ''}${error.hint ? ` (Hint: ${error.hint})` : ''}`
        };
      }

      console.log('[SupabaseSessionService] Query successful, data length:', data?.length || 0);
      
      // If we have data, sort it in JavaScript by updated_at or created_at
      let sortedData = data;
      if (data && data.length > 0) {
        // Log the first record to see what columns are available
        console.log('[SupabaseSessionService] Sample record columns:', Object.keys(data[0]));
        
        sortedData = [...data].sort((a, b) => {
          // Try updated_at first, fall back to created_at
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB.getTime() - dateA.getTime(); // Descending order
        });
      }

      return {
        success: true,
        data: sortedData || []
      };
    } catch (error) {
      console.error('[SupabaseSessionService] JavaScript error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown JavaScript error'
      };
    }
  }

  /**
   * Get a specific session by ID
   * @param sessionId - Supabase session ID (UUID)
   * @returns Single session or error
   */
  async getSession(sessionId: string): Promise<SupabaseResponse<ChatSessionDB | null>> {
    try {
      const supabase = await this.getClient();
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return {
            success: true,
            data: null
          };
        }
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Find a session by ADK session ID
   * @param adkSessionId - ADK backend session ID
   * @returns Session linked to ADK ID or null
   */
  async findSessionByAdkId(adkSessionId: string): Promise<SupabaseResponse<ChatSessionDB | null>> {
    try {
      const supabase = await this.getClient();
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('adk_session_id', adkSessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - this is OK
          return {
            success: true,
            data: null
          };
        }
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load user state and preferences
   * @param userId - Supabase auth user ID
   * @returns User state or null if not found
   */
  async loadUserState(userId: string): Promise<SupabaseResponse<UserStateDB | null>> {
    try {
      const supabase = await this.getClient();
      const { data, error } = await supabase
        .from('user_state')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No user state yet - this is OK for new users
          return {
            success: true,
            data: null
          };
        }
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================
  // WRITE OPERATIONS (Phase 2 - With Fallbacks)
  // ============================================

  /**
   * Create a new chat session in Supabase
   * @param session - Session data to insert
   * @returns Created session or error
   */
  async createChatSession(session: ChatSessionInsert): Promise<SupabaseResponse<ChatSessionDB>> {
    try {
      // Generate UUID for the id field since table doesn't have a default
      const sessionId = crypto.randomUUID();
      
      const supabase = await this.getClient();
      
      // Debug: Check authentication state
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('🔐 [SupabaseSessionService] Auth state check for INSERT:', {
        authUser: authUser?.id,
        authEmail: authUser?.email,
        sessionUserId: session.user_id,
        authMatch: authUser?.id === session.user_id,
        sessionId: sessionId,
        clientType: 'browser'
      });
      
      const insertData = {
        id: sessionId,
        ...session,
        message_count: session.message_count || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('📝 [SupabaseSessionService] Attempting INSERT with data:', insertData);
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[SupabaseSessionService] Error creating session:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('[SupabaseSessionService] Session created:', data.id);
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an existing chat session
   * @param sessionId - Session ID to update
   * @param updates - Fields to update
   * @returns Updated session or error
   */
  async updateChatSession(
    sessionId: string,
    updates: ChatSessionUpdate
  ): Promise<SupabaseResponse<ChatSessionDB>> {
    try {
      const supabase = await this.getClient();
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update session activity (last message time and count)
   * @param sessionId - Session ID
   * @param incrementMessageCount - Whether to increment message count
   */
  async updateSessionActivity(
    sessionId: string,
    incrementMessageCount: boolean = true
  ): Promise<SupabaseResponse<ChatSessionDB>> {
    try {
      const supabase = await this.getClient();
      // First get current message count if incrementing
      if (incrementMessageCount) {
        const { data: current, error: fetchError } = await supabase
          .from('chat_sessions')
          .select('message_count')
          .eq('id', sessionId)
          .single();

        if (fetchError) {
          return {
            success: false,
            error: fetchError.message
          };
        }

        const newCount = (current?.message_count || 0) + 1;

        const { data, error } = await supabase
          .from('chat_sessions')
          .update({
            last_message_at: new Date().toISOString(),
            message_count: newCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: error.message
          };
        }

        return {
          success: true,
          data
        };
      } else {
        // Just update last message time
        const { data, error } = await supabase
          .from('chat_sessions')
          .update({
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: error.message
          };
        }

        return {
          success: true,
          data
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create or update user state
   * @param userId - User ID
   * @param state - State to insert or update
   */
  async upsertUserState(
    userId: string,
    state: Partial<UserStateInsert>
  ): Promise<SupabaseResponse<UserStateDB>> {
    try {
      const supabase = await this.getClient();
      const { data, error } = await supabase
        .from('user_state')
        .upsert({
          user_id: userId,
          ...state,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update user preferences (UI or chat)
   * @param userId - User ID
   * @param uiPrefs - UI preferences to update
   * @param chatPrefs - Chat preferences to update
   */
  async updateUserPreferences(
    userId: string,
    uiPrefs?: Partial<UserStateDB['ui_preferences']>,
    chatPrefs?: Partial<UserStateDB['chat_preferences']>
  ): Promise<SupabaseResponse<UserStateDB>> {
    try {
      // First get current preferences
      const currentResult = await this.loadUserState(userId);
      
      let currentUiPrefs = {};
      let currentChatPrefs = {};
      
      if (currentResult.success && currentResult.data) {
        currentUiPrefs = currentResult.data.ui_preferences || {};
        currentChatPrefs = currentResult.data.chat_preferences || {};
      }

      // Merge preferences
      const updates: Partial<UserStateInsert> = {};
      
      if (uiPrefs) {
        updates.ui_preferences = { ...currentUiPrefs, ...uiPrefs };
      }
      
      if (chatPrefs) {
        updates.chat_preferences = { ...currentChatPrefs, ...chatPrefs };
      }

      return await this.upsertUserState(userId, updates);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Convert database session to enhanced session format
   * @param dbSession - Database session
   * @param adkAvailable - Whether ADK backend has this session
   */
  convertToEnhancedSession(
    dbSession: ChatSessionDB,
    adkAvailable: boolean = false
  ): EnhancedSession {
    return {
      id: dbSession.id,
      user_id: dbSession.user_id,
      session_title: dbSession.session_title || 'Untitled Session',
      session_metadata: dbSession.session_metadata || {},
      last_message_at: dbSession.last_message_at ? new Date(dbSession.last_message_at) : null,
      message_count: dbSession.message_count,
      created_at: new Date(dbSession.created_at),
      updated_at: new Date(dbSession.updated_at),
      adk_session_id: dbSession.adk_session_id || '',
      adk_available: adkAvailable,
      source: adkAvailable ? 'synced' : 'supabase'
    };
  }
}

// Export singleton instances - browser client only
export const supabaseSessionService = new SupabaseSessionService();

// Export factory function for flexibility  
export function createSupabaseSessionService() {
  return new SupabaseSessionService();
}