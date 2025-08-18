// src/lib/actions/message-actions.ts
// Server actions for loading messages from Supabase

"use server";

import { messageService } from "@/lib/services/message-service";
import { supabaseSessionServiceServer } from "@/lib/services/supabase-session-service-server";
import type { Message } from "@/types";

/**
 * Load messages from Supabase for a session
 */
export async function loadMessagesFromSupabase(
  sessionId: string,
  isSupabaseId: boolean = true
): Promise<{ success: boolean; messages: Message[]; error?: string }> {
  try {
    console.log("📖 [MESSAGE_ACTIONS] Loading messages for session:", sessionId);
    
    let supabaseSessionId = sessionId;
    
    // If it's an ADK session ID, find the Supabase session
    if (!isSupabaseId) {
      const sessionResult = await supabaseSessionServiceServer.findSessionByAdkId(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        console.warn("⚠️ [MESSAGE_ACTIONS] Supabase session not found for ADK session:", sessionId);
        return {
          success: false,
          messages: [],
          error: "Session not found in Supabase"
        };
      }
      supabaseSessionId = sessionResult.data.id;
    }
    
    // Load messages from Supabase
    const result = await messageService.loadSessionMessages(supabaseSessionId);
    
    if (!result.success) {
      return {
        success: false,
        messages: [],
        error: result.error
      };
    }
    
    // Convert Supabase messages to frontend Message format
    // Filter out system messages as the frontend doesn't support them
    const messages: Message[] = result.data
      .filter(msg => msg.message_type !== 'system')
      .map(msg => {
        let content = '';
        
        if (typeof msg.message_content === 'string') {
          content = msg.message_content;
        } else if (msg.message_content && typeof msg.message_content === 'object') {
          // Check if it has a text property
          const msgContent = msg.message_content as Record<string, unknown>;
          if (typeof msgContent.text === 'string') {
            content = msgContent.text;
          } else {
            content = JSON.stringify(msg.message_content);
          }
        } else {
          content = '';
        }
        
        return {
          id: msg.id || '',
          type: msg.message_type as 'human' | 'ai',
          content,
          timestamp: msg.created_at ? new Date(msg.created_at) : new Date()
        };
      });
    
    console.log("✅ [MESSAGE_ACTIONS] Loaded messages from Supabase:", messages.length);
    
    return {
      success: true,
      messages
    };
  } catch (error) {
    console.error("❌ [MESSAGE_ACTIONS] Error loading messages:", error);
    return {
      success: false,
      messages: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Check if we should load from Supabase or ADK
 */
export async function shouldLoadFromSupabase(
  sessionId: string
): Promise<boolean> {
  try {
    // Check if this session has messages in Supabase
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
    
    if (isUUID) {
      // This is a Supabase session ID
      const result = await messageService.loadSessionMessages(sessionId);
      return result.success && result.data.length > 0;
    } else {
      // This is an ADK session ID - check if it has a Supabase counterpart
      const sessionResult = await supabaseSessionServiceServer.findSessionByAdkId(sessionId);
      if (sessionResult.success && sessionResult.data) {
        const result = await messageService.loadSessionMessages(sessionResult.data.id);
        return result.success && result.data.length > 0;
      }
    }
    
    return false;
  } catch (error) {
    console.error("❌ [MESSAGE_ACTIONS] Error checking Supabase messages:", error);
    return false;
  }
}