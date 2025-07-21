"use client";

import { UserIdInput } from "./UserIdInput";
import { SessionSelector } from "./SessionSelector";
import { useSession } from "@/hooks/useSession";

interface SessionManagerProps {
  className?: string;
  onSessionChange?: (sessionId: string) => void;
  onUserChange?: (userId: string) => void;
}

/**
 * Session management component that coordinates user ID and session selection
 * Uses the useSession hook for state management and persistence
 */
export function SessionManager({
  className = "",
  onSessionChange,
  onUserChange,
}: SessionManagerProps) {
  const {
    userId,
    sessionId,
    handleUserIdChange,
    handleUserIdConfirm,
    handleCreateNewSession,
    handleSessionSwitch,
  } = useSession();

  // Handle user ID changes with optional callback
  const handleUserIdChangeWrapper = (newUserId: string) => {
    handleUserIdChange(newUserId);
    if (onUserChange) {
      onUserChange(newUserId);
    }
  };

  // Handle user ID confirmation with optional callback
  const handleUserIdConfirmWrapper = (confirmedUserId: string) => {
    handleUserIdConfirm(confirmedUserId);
    if (onUserChange) {
      onUserChange(confirmedUserId);
    }
  };

  // Handle session switching with optional callback
  const handleSessionSwitchWrapper = (newSessionId: string) => {
    handleSessionSwitch(newSessionId);
    if (onSessionChange) {
      onSessionChange(newSessionId);
    }
  };

  // Handle new session creation with optional callback
  const handleCreateNewSessionWrapper = async (
    sessionUserId: string,
    initialMessage?: string
  ) => {
    await handleCreateNewSession(sessionUserId, initialMessage);
    if (onSessionChange && sessionId) {
      onSessionChange(sessionId);
    }
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* User ID Management */}
      <UserIdInput
        currentUserId={userId}
        onUserIdChange={handleUserIdChangeWrapper}
        onUserIdConfirm={handleUserIdConfirmWrapper}
        className="text-xs"
      />

      {/* Session Management */}
      {userId && (
        <SessionSelector
          currentUserId={userId}
          currentSessionId={sessionId}
          onSessionSelect={handleSessionSwitchWrapper}
          onCreateSession={handleCreateNewSessionWrapper}
          className="text-xs"
        />
      )}
    </div>
  );
}
