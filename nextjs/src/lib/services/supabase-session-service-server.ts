// src/lib/services/supabase-session-service-server.ts
// Server-only version of Supabase session service

import { createClient } from '@/lib/supabase/server';
import type {
  ChatSessionDB,
  ChatSessionInsert,
  ChatSessionUpdate,
  UserStateDB,
  UserStateInsert,
  SupabaseResponse
} from '@/types/supabase-db';

/**
 * Server-only service class for managing Supabase chat sessions
 * This version always uses the server client with cookie authentication
 */
export class SupabaseSessionServiceServer {
  private supabase: any = null;

  private async getClient() {
    if (!this.supabase) {
      console.log('🔧 [SupabaseSessionServiceServer] Creating server client with cookies');
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Load all sessions for a user from Supabase
   */
  async loadUserSessions(userId: string): Promise<SupabaseResponse<ChatSessionDB[]>> {
    try {
      console.log('[SupabaseSessionServiceServer] Loading sessions for user:', userId);
      
      const supabase = await this.getClient();
      
      // Check if user is authenticated first
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('[SupabaseSessionServiceServer] Auth user check:', {
        authUser: authUser?.id,
        requestedUserId: userId,
        isAuthenticated: !!authUser
      });
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('[SupabaseSessionServiceServer] Supabase error details:', {
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

      console.log('[SupabaseSessionServiceServer] Query successful, data length:', data?.length || 0);
      
      // Sort by updated_at or created_at
      let sortedData = data;
      if (data && data.length > 0) {
        sortedData = [...data].sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });
      }

      return {
        success: true,
        data: sortedData || []
      };
    } catch (error) {
      console.error('[SupabaseSessionServiceServer] JavaScript error:', {
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
          return { success: true, data: null };
        }
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Find a session by ADK session ID
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
          return { success: true, data: null };
        }
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a new chat session in Supabase
   */
  async createChatSession(session: ChatSessionInsert): Promise<SupabaseResponse<ChatSessionDB>> {
    try {
      const sessionId = crypto.randomUUID();
      const supabase = await this.getClient();
      
      // Debug: Check authentication state
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('🔐 [SupabaseSessionServiceServer] Auth state check for INSERT:', {
        authUser: authUser?.id,
        authEmail: authUser?.email,
        sessionUserId: session.user_id,
        authMatch: authUser?.id === session.user_id,
        sessionId: sessionId,
        clientType: 'server'
      });
      
      const insertData = {
        id: sessionId,
        ...session,
        message_count: session.message_count || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('📝 [SupabaseSessionServiceServer] Attempting INSERT with data:', insertData);
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[SupabaseSessionServiceServer] Error creating session:', error);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseSessionServiceServer] Session created:', data.id);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an existing chat session
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
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(
    sessionId: string,
    incrementMessageCount: boolean = true
  ): Promise<SupabaseResponse<ChatSessionDB>> {
    try {
      const supabase = await this.getClient();
      
      if (incrementMessageCount) {
        const { data: current, error: fetchError } = await supabase
          .from('chat_sessions')
          .select('message_count')
          .eq('id', sessionId)
          .single();

        if (fetchError) {
          return { success: false, error: fetchError.message };
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
          return { success: false, error: error.message };
        }

        return { success: true, data };
      } else {
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
          return { success: false, error: error.message };
        }

        return { success: true, data };
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
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load user state and preferences
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
          return { success: true, data: null };
        }
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance for server use
export const supabaseSessionServiceServer = new SupabaseSessionServiceServer();