import { useState, useCallback, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { fetchActiveSessionsAction } from '@/lib/actions/session-list-actions';

export interface UseSessionReturn {
  // State
  sessionId: string;
  userId: string;
  user: User | null;
  sessionHistory: Array<{
    id: string;
    title: string;
    lastActivity: Date | null;
    source: 'vertex-ai' | 'adk';
    messageCount?: number;
  }>;
  loadingSessions: boolean;

  // User ID management
  handleUserIdChange: (newUserId: string) => void;
  handleUserIdConfirm: (confirmedUserId: string) => void;

  // Session management
  handleSessionSwitch: (newSessionId: string) => void;
  handleCreateNewSession: (sessionUserId: string) => Promise<string>;
  refreshSessionHistory: () => Promise<void>;
}

/**
 * Custom hook for managing chat sessions with Supabase authentication
 */
export function useSession(): UseSessionReturn {
  const [sessionId, setSessionId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [sessionHistory, setSessionHistory] = useState<Array<{
    id: string;
    title: string;
    lastActivity: Date | null;
    source: 'vertex-ai' | 'adk';
    messageCount?: number;
  }>>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  const supabase = createClient();

  // Handle session switching
  const handleSessionSwitch = useCallback(
    (newSessionId: string): void => {
      console.log(
        `🔄 handleSessionSwitch called: current=${sessionId}, new=${newSessionId}, userId=${userId}`
      );

      if (!userId || newSessionId === sessionId) {
        console.log(`⏭️ Skipping session switch: no userId or same session`);
        return;
      }

      // Switch to new session
      console.log(`🎯 Setting sessionId state to: ${newSessionId}`);
      setSessionId(newSessionId);

      console.log(`✅ Session switch completed to: ${newSessionId}`);
    },
    [userId, sessionId]
  );

  // Handle new session creation
  const handleCreateNewSession = useCallback(
    async (sessionUserId: string): Promise<string> => {
      console.log('🚀 [useSession] handleCreateNewSession called with userId:', sessionUserId);
      console.log('🔍 [useSession] Current auth state:', {
        hookUserId: userId,
        paramUserId: sessionUserId,
        authUser: user?.id,
        authEmail: user?.email,
        idsMatch: sessionUserId === user?.id
      });
      
      if (!sessionUserId) {
        throw new Error("User ID is required to create a session");
      }

      // Validate user ID matches authenticated user
      if (user?.id && sessionUserId !== user.id) {
        console.error('❌ [useSession] User ID mismatch!', {
          expected: user.id,
          received: sessionUserId
        });
        throw new Error(`User ID mismatch: expected ${user.id}, got ${sessionUserId}`);
      }

      let actualSessionId = "";

      try {
        console.log('📡 [useSession] Importing session action...');
        // Import Server Action dynamically to avoid circular dependencies in hooks
        const { createSessionAction } = await import(
          "@/lib/actions/session-actions"
        );

        console.log('🚀 [useSession] Calling createSessionAction with userId:', sessionUserId);
        const sessionResult = await createSessionAction(sessionUserId);

        if (sessionResult.success) {
          // Use the session ID returned by the backend
          if (!sessionResult.sessionId) {
            throw new Error(
              "Session creation succeeded but no session ID was returned"
            );
          }
          actualSessionId = sessionResult.sessionId;
          console.log(
            `✅ Session created via Server Action: ${actualSessionId}`
          );
          console.log(`📝 Session result:`, sessionResult);
        } else {
          console.error(
            "❌ Session creation Server Action failed:",
            sessionResult.error
          );
          throw new Error(`Session creation failed: ${sessionResult.error}`);
        }
      } catch (error) {
        console.error("❌ Session creation Server Action error:", error);
        throw error;
      }

      console.log(`🔄 Switching to new session: ${actualSessionId}`);
      handleSessionSwitch(actualSessionId);
      
      return actualSessionId;
    },
    [handleSessionSwitch, user?.id, user?.email, userId]
  );

  // Handle user ID changes
  const handleUserIdChange = useCallback((newUserId: string): void => {
    setUserId(newUserId);
  }, []);

  // Handle user ID confirmation
  const handleUserIdConfirm = useCallback((confirmedUserId: string): void => {
    setUserId(confirmedUserId);
    // Keep user ID in localStorage for convenience
    localStorage.setItem("agent-engine-user-id", confirmedUserId);
  }, []);

  // Load session history from Vertex AI via Agent Engine
  const refreshSessionHistory = useCallback(async (): Promise<void> => {
    console.log('🔄 [useSession] Refreshing session history for user:', userId);
    
    if (!userId) {
      console.log('👤 [useSession] No userId, clearing session history');
      setSessionHistory([]);
      return;
    }

    try {
      setLoadingSessions(true);
      console.log('📡 [useSession] Loading sessions from Vertex AI (Agent Engine)...');
      
      const result = await fetchActiveSessionsAction(userId);
      
      console.log('📊 [useSession] Vertex AI load result:', {
        success: result.success,
        dataLength: result.success ? result.sessions.length : 0,
        error: !result.success ? result.error : undefined
      });
      
      if (result.success) {
        const sessions = result.sessions.map(session => ({
          id: session.id,
          title: session.title || `Session ${new Date(session.lastUpdateTime || Date.now()).toLocaleDateString()}`,
          lastActivity: session.lastUpdateTime,
          source: 'vertex-ai' as const,
          messageCount: session.messageCount
        }));
        
        console.log('📚 [useSession] Processed Vertex AI sessions:', sessions);
        setSessionHistory(sessions);
        console.log(`✅ [useSession] Loaded ${sessions.length} sessions from Vertex AI`);
      } else {
        console.warn('⚠️ [useSession] Failed to load session history:', result.error);
        setSessionHistory([]);
      }
    } catch (error) {
      console.error('❌ [useSession] Error loading session history:', error);
      setSessionHistory([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [userId]);

  // Supabase authentication integration
  useEffect(() => {
    const getUser = async () => {
      console.log('👤 [useSession] Fetching authenticated user...');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      console.log('👤 [useSession] Auth user result:', {
        user: user ? {
          id: user.id,
          email: user.email,
          provider: user.app_metadata?.provider,
          created_at: user.created_at
        } : null,
        error: error?.message,
        hasUser: !!user
      });
      
      setUser(user);
      if (user?.id) {
        console.log('✅ [useSession] Setting userId from auth:', user.id);
        setUserId(user.id);
      } else {
        console.warn('⚠️ [useSession] No authenticated user ID available');
      }
    };
    
    getUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 [useSession] Auth state change:', {
          event,
          hasSession: !!session,
          hasUser: !!session?.user
        });
        
        const authUser = session?.user ?? null;
        console.log('👤 [useSession] Auth state change - user details:', {
          user: authUser ? {
            id: authUser.id,
            email: authUser.email,
            provider: authUser.app_metadata?.provider
          } : null
        });
        
        setUser(authUser);
        if (authUser?.id) {
          console.log('✅ [useSession] Auth change - setting userId:', authUser.id);
          setUserId(authUser.id);
        } else {
          console.log('🚪 [useSession] Auth change - clearing user data');
          setUserId("");
          setSessionId(""); // Clear session when user signs out
          setSessionHistory([]); // Clear session history
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Fallback: Load user ID from localStorage for backward compatibility
  useEffect(() => {
    if (!user) {
      const savedUserId = localStorage.getItem("agent-engine-user-id");
      if (savedUserId) {
        setUserId(savedUserId);
      }
    }
  }, [user]);

  // Load session history when userId changes
  useEffect(() => {
    if (userId) {
      refreshSessionHistory();
    }
  }, [userId, refreshSessionHistory]);

  return {
    // State
    sessionId,
    userId,
    user,
    sessionHistory,
    loadingSessions,

    // User ID management
    handleUserIdChange,
    handleUserIdConfirm,

    // Session management
    handleSessionSwitch,
    handleCreateNewSession,
    refreshSessionHistory,
  };
}
