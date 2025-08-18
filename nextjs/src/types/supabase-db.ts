// src/types/supabase-db.ts
// Database types for Supabase integration

/**
 * Represents a chat session bridging Supabase auth and ADK backend
 * This table links Supabase users to their ADK sessions
 */
export interface ChatSessionDB {
    id: string; // UUID primary key
    user_id: string; // References auth.users(id)
    adk_session_id: string | null; // Links to ADK backend session
    session_title: string | null;
    session_metadata: SessionMetadata | null;
    last_message_at: string | null; // ISO timestamp
    message_count: number;
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
  }
  
  /**
   * Session metadata stored as JSONB in database
   */
  export interface SessionMetadata {
    deployment_type?: 'agent_engine' | 'local_backend';
    last_agent?: string;
    website_count?: number;
    tags?: string[];
    additional_data?: Record<string, unknown>; // Allow additional metadata without using 'any'
  }
  
  /**
   * User state and preferences stored in Supabase
   */
  export interface UserStateDB {
    user_id: string; // Primary key, references auth.users(id)
    current_session_id: string | null; // References chat_sessions.id
    ui_preferences: UIPreferences | null;
    chat_preferences: ChatPreferences | null;
    last_active: string | null; // ISO timestamp
    updated_at: string; // ISO timestamp
  }
  
  /**
   * UI preferences stored as JSONB
   */
  export interface UIPreferences {
    theme?: 'light' | 'dark' | 'system';
    sidebarOpen?: boolean;
    sidebarWidth?: number;
    fontSize?: 'small' | 'medium' | 'large';
    compactMode?: boolean;
    additional_preferences?: Record<string, unknown>; // Allow additional preferences without using 'any'
  }
  
  /**
   * Chat preferences stored as JSONB
   */
  export interface ChatPreferences {
    defaultModel?: string;
    streamingEnabled?: boolean;
    showTimestamps?: boolean;
    showThinkingProcess?: boolean;
    autoSaveInterval?: number; // in seconds
    additional_settings?: Record<string, unknown>; // Allow additional preferences without using 'any'
  }
  
  /**
   * Insert/Update types (without auto-generated fields)
   */
  export interface ChatSessionInsert {
    user_id: string;
    adk_session_id?: string;
    session_title?: string;
    session_metadata?: SessionMetadata;
    last_message_at?: string;
    message_count?: number;
  }
  
  export interface ChatSessionUpdate {
    session_title?: string;
    session_metadata?: SessionMetadata;
    last_message_at?: string;
    message_count?: number;
    updated_at?: string;
  }
  
  export interface UserStateInsert {
    user_id: string;
    current_session_id?: string;
    ui_preferences?: UIPreferences;
    chat_preferences?: ChatPreferences;
    last_active?: string;
  }
  
  export interface UserStateUpdate {
    current_session_id?: string;
    ui_preferences?: UIPreferences;
    chat_preferences?: ChatPreferences;
    last_active?: string;
    updated_at?: string;
  }
  
  /**
   * Response types for Supabase operations
   */
  export type SupabaseResponse<T> = 
    | { success: true; data: T }
    | { success: false; error: string };
  
  /**
   * Extended session type combining ADK and Supabase data
   */
  export interface EnhancedSession {
    // Supabase fields
    id: string; // Supabase session ID
    user_id: string;
    session_title: string;
    session_metadata: SessionMetadata;
    last_message_at: Date | null;
    message_count: number;
    created_at: Date;
    updated_at: Date;
    
    // ADK backend fields
    adk_session_id: string;
    adk_available: boolean; // Whether ADK backend has this session
    
    // Computed fields
    source: 'supabase' | 'adk' | 'synced';
  }

  /**
   * Chat Messages table types
   */
  export interface ChatMessageDB {
    id: string;
    session_id: string;
    user_id: string;
    message_type: 'human' | 'ai' | 'system';
    message_content: Record<string, unknown>; // JSONB - use Record instead of 'any'
    message_role?: string;
    sequence_number: number;
    created_at: string;
  }

  export type ChatMessageInsert = Omit<ChatMessageDB, 'id' | 'created_at'>;
  export type ChatMessageUpdate = Partial<Omit<ChatMessageDB, 'id' | 'created_at'>>;
  
  // Export for convenience
  export type ChatMessage = ChatMessageDB;
