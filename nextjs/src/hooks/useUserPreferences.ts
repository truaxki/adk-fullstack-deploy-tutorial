// src/hooks/useUserPreferences.ts
// Hook for managing user preferences stored in Supabase

import { useState, useEffect, useCallback } from 'react';
import { supabaseSessionService } from '@/lib/services/supabase-session-service';
import type { UIPreferences, ChatPreferences } from '@/types/supabase-db';

/**
 * User preferences state and actions
 */
export interface UserPreferencesState {
  uiPreferences: UIPreferences | null;
  chatPreferences: ChatPreferences | null;
  currentSessionId: string | null;
  loading: boolean;
  error: string | null;
  updateUIPreferences: (prefs: Partial<UIPreferences>) => Promise<void>;
  updateChatPreferences: (prefs: Partial<ChatPreferences>) => Promise<void>;
  setCurrentSession: (sessionId: string | null) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

/**
 * Hook for managing user preferences and state
 * Provides read and write access to user preferences stored in Supabase
 * 
 * @param userId - Supabase auth user ID (null if not authenticated)
 * @returns User preferences state and update functions
 */
export function useUserPreferences(userId: string | null): UserPreferencesState {
  const [uiPreferences, setUIPreferences] = useState<UIPreferences | null>(null);
  const [chatPreferences, setChatPreferences] = useState<ChatPreferences | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user preferences from Supabase
  const loadPreferences = useCallback(async () => {
    if (!userId) {
      setUIPreferences(null);
      setChatPreferences(null);
      setCurrentSessionId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await supabaseSessionService.loadUserState(userId);
      
      if (result.success) {
        if (result.data) {
          setUIPreferences(result.data.ui_preferences || getDefaultUIPreferences());
          setChatPreferences(result.data.chat_preferences || getDefaultChatPreferences());
          setCurrentSessionId(result.data.current_session_id);
        } else {
          // New user - set defaults
          setUIPreferences(getDefaultUIPreferences());
          setChatPreferences(getDefaultChatPreferences());
          setCurrentSessionId(null);
          
          // Create initial user state in Supabase (non-blocking)
          supabaseSessionService.upsertUserState(userId, {
            ui_preferences: getDefaultUIPreferences(),
            chat_preferences: getDefaultChatPreferences()
          }).catch(err => {
            console.warn('[useUserPreferences] Failed to create initial user state:', err);
          });
        }
      } else {
        // Error loading - use defaults but show error
        setUIPreferences(getDefaultUIPreferences());
        setChatPreferences(getDefaultChatPreferences());
        setError(result.error);
      }
    } catch (err) {
      console.error('[useUserPreferences] Error loading preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
      // Use defaults on error
      setUIPreferences(getDefaultUIPreferences());
      setChatPreferences(getDefaultChatPreferences());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load preferences on mount and when userId changes
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Update UI preferences
  const updateUIPreferences = useCallback(async (prefs: Partial<UIPreferences>) => {
    if (!userId) {
      console.warn('[useUserPreferences] Cannot update preferences without user ID');
      return;
    }

    try {
      // Optimistically update local state
      setUIPreferences(prev => ({ ...prev, ...prefs }));
      
      // Update in Supabase
      const result = await supabaseSessionService.updateUserPreferences(
        userId,
        prefs,
        undefined
      );
      
      if (!result.success) {
        // Rollback on error
        console.error('[useUserPreferences] Failed to update UI preferences:', result.error);
        setError(result.error);
        // Reload to get correct state
        await loadPreferences();
      }
    } catch (err) {
      console.error('[useUserPreferences] Error updating UI preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      // Reload to get correct state
      await loadPreferences();
    }
  }, [userId, loadPreferences]);

  // Update chat preferences
  const updateChatPreferences = useCallback(async (prefs: Partial<ChatPreferences>) => {
    if (!userId) {
      console.warn('[useUserPreferences] Cannot update preferences without user ID');
      return;
    }

    try {
      // Optimistically update local state
      setChatPreferences(prev => ({ ...prev, ...prefs }));
      
      // Update in Supabase
      const result = await supabaseSessionService.updateUserPreferences(
        userId,
        undefined,
        prefs
      );
      
      if (!result.success) {
        // Rollback on error
        console.error('[useUserPreferences] Failed to update chat preferences:', result.error);
        setError(result.error);
        // Reload to get correct state
        await loadPreferences();
      }
    } catch (err) {
      console.error('[useUserPreferences] Error updating chat preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      // Reload to get correct state
      await loadPreferences();
    }
  }, [userId, loadPreferences]);

  // Set current session
  const setCurrentSession = useCallback(async (sessionId: string | null) => {
    if (!userId) {
      console.warn('[useUserPreferences] Cannot set current session without user ID');
      return;
    }

    try {
      // Optimistically update local state
      setCurrentSessionId(sessionId);
      
      // Update in Supabase
      const result = await supabaseSessionService.upsertUserState(userId, {
        current_session_id: sessionId || undefined
      });
      
      if (!result.success) {
        // Rollback on error
        console.error('[useUserPreferences] Failed to update current session:', result.error);
        setError(result.error);
        // Reload to get correct state
        await loadPreferences();
      }
    } catch (err) {
      console.error('[useUserPreferences] Error updating current session:', err);
      setError(err instanceof Error ? err.message : 'Failed to update current session');
      // Reload to get correct state
      await loadPreferences();
    }
  }, [userId, loadPreferences]);

  // Refresh preferences from database
  const refreshPreferences = useCallback(async () => {
    await loadPreferences();
  }, [loadPreferences]);

  return {
    uiPreferences,
    chatPreferences,
    currentSessionId,
    loading,
    error,
    updateUIPreferences,
    updateChatPreferences,
    setCurrentSession,
    refreshPreferences
  };
}

/**
 * Get default UI preferences
 */
function getDefaultUIPreferences(): UIPreferences {
  return {
    theme: 'system',
    sidebarOpen: true,
    sidebarWidth: 280,
    fontSize: 'medium',
    compactMode: false
  };
}

/**
 * Get default chat preferences
 */
function getDefaultChatPreferences(): ChatPreferences {
  return {
    streamingEnabled: true,
    showTimestamps: false,
    showThinkingProcess: true,
    autoSaveInterval: 30
  };
}
