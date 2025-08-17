import { useState, useCallback, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export interface UseSessionReturn {
  // State
  sessionId: string;
  userId: string;
  user: User | null;

  // User ID management
  handleUserIdChange: (newUserId: string) => void;
  handleUserIdConfirm: (confirmedUserId: string) => void;

  // Session management
  handleSessionSwitch: (newSessionId: string) => void;
  handleCreateNewSession: (sessionUserId: string) => Promise<string>;
}

/**
 * Custom hook for managing chat sessions with Supabase authentication
 */
export function useSession(): UseSessionReturn {
  const [sessionId, setSessionId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  
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
      if (!sessionUserId) {
        throw new Error("User ID is required to create a session");
      }

      let actualSessionId = "";

      try {
        // Import Server Action dynamically to avoid circular dependencies in hooks
        const { createSessionAction } = await import(
          "@/lib/actions/session-actions"
        );

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
    [handleSessionSwitch]
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

  // Supabase authentication integration
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user?.id) {
        setUserId(user.id);
      }
    };
    
    getUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const authUser = session?.user ?? null;
        setUser(authUser);
        if (authUser?.id) {
          setUserId(authUser.id);
        } else {
          setUserId("");
          setSessionId(""); // Clear session when user signs out
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

  return {
    // State
    sessionId,
    userId,
    user,

    // User ID management
    handleUserIdChange,
    handleUserIdConfirm,

    // Session management
    handleSessionSwitch,
    handleCreateNewSession,
  };
}
