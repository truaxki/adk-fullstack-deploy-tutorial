// src/lib/services/message-service.ts
// Service for managing chat messages in Supabase

import { supabaseSessionServiceServer } from './supabase-session-service-server';
import type { SupabaseResponse } from '@/types/supabase-db';

export interface ChatMessage {
  id?: string;
  session_id: string;
  user_id: string;
  message_type: 'human' | 'ai' | 'system';
  message_content: any; // JSONB content
  message_role?: string;
  sequence_number: number;
  created_at?: string;
}

export interface MessageSaveResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Service for saving and retrieving chat messages from Supabase
 */
export class MessageService {
  private supabase: any = null;

  private async getClient() {
    if (!this.supabase) {
      const { createClient } = await import('@/lib/supabase/server');
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Save a message to Supabase
   */
  async saveMessage(
    sessionId: string,
    userId: string,
    messageType: 'human' | 'ai' | 'system',
    messageContent: any,
    sequenceNumber: number
  ): Promise<MessageSaveResult> {
    try {
      const supabase = await this.getClient();
      
      console.log('💾 [MessageService] Saving message:', {
        sessionId,
        userId,
        messageType,
        sequenceNumber
      });

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          user_id: userId,
          message_type: messageType,
          message_content: messageContent,
          message_role: messageType === 'human' ? 'user' : messageType === 'ai' ? 'assistant' : 'system',
          sequence_number: sequenceNumber
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [MessageService] Error saving message:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ [MessageService] Message saved:', data.id);
      return {
        success: true,
        messageId: data.id
      };
    } catch (error) {
      console.error('❌ [MessageService] Exception saving message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Save multiple messages in a batch
   */
  async saveMessages(
    messages: ChatMessage[]
  ): Promise<{ success: boolean; savedCount: number; error?: string }> {
    try {
      const supabase = await this.getClient();
      
      console.log('💾 [MessageService] Batch saving messages:', messages.length);

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messages)
        .select();

      if (error) {
        console.error('❌ [MessageService] Error batch saving messages:', error);
        return {
          success: false,
          savedCount: 0,
          error: error.message
        };
      }

      console.log('✅ [MessageService] Batch saved messages:', data.length);
      return {
        success: true,
        savedCount: data.length
      };
    } catch (error) {
      console.error('❌ [MessageService] Exception batch saving messages:', error);
      return {
        success: false,
        savedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load all messages for a session
   */
  async loadSessionMessages(
    sessionId: string
  ): Promise<SupabaseResponse<ChatMessage[]>> {
    try {
      const supabase = await this.getClient();
      
      console.log('📖 [MessageService] Loading messages for session:', sessionId);

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('sequence_number', { ascending: true });

      if (error) {
        console.error('❌ [MessageService] Error loading messages:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ [MessageService] Loaded messages:', data?.length || 0);
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('❌ [MessageService] Exception loading messages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get the next sequence number for a session
   */
  async getNextSequenceNumber(sessionId: string): Promise<number> {
    try {
      const supabase = await this.getClient();
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('sequence_number')
        .eq('session_id', sessionId)
        .order('sequence_number', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // No messages yet, start at 1
        if (error.code === 'PGRST116') {
          return 1;
        }
        console.error('❌ [MessageService] Error getting sequence number:', error);
        return 1;
      }

      return (data?.sequence_number || 0) + 1;
    } catch (error) {
      console.error('❌ [MessageService] Exception getting sequence number:', error);
      return 1;
    }
  }

  /**
   * Delete all messages for a session
   */
  async deleteSessionMessages(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await this.getClient();
      
      console.log('🗑️ [MessageService] Deleting messages for session:', sessionId);

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        console.error('❌ [MessageService] Error deleting messages:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ [MessageService] Messages deleted for session:', sessionId);
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ [MessageService] Exception deleting messages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const messageService = new MessageService();