"use client";

import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Calendar,
  Loader2,
  Plus,
  // AlertCircle - removed unused import
} from "lucide-react";
import { toast } from "sonner";

interface SessionSelectorProps {
  currentUserId: string;
  currentSessionId: string;
  sessionHistory: Array<{
    id: string;
    title: string;
    lastActivity: Date | null;
    source: 'vertex-ai' | 'adk';
    messageCount?: number;
    querySnippet?: string;
    fullQuery?: string;
  }>;
  loadingSessions: boolean;
  onSessionSelect: (sessionId: string) => void;
  onCreateSession: (userId: string) => Promise<string>;
  onRefreshSessions: () => Promise<void>;
  className?: string;
}

export function SessionSelector({
  currentUserId,
  currentSessionId,
  sessionHistory,
  loadingSessions,
  onSessionSelect,
  onCreateSession,
  onRefreshSessions,
  className = "",
}: SessionSelectorProps): React.JSX.Element {
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);

  // Handle session selection or creation
  const handleSessionSelect = async (value: string): Promise<void> => {
    if (value === "create-new") {
      // Create new session
      setIsCreatingSession(true);
      try {
        await onCreateSession(currentUserId);

        // Refresh session list after creation to ensure it appears
        console.log("🔄 [SESSION_SELECTOR] Refreshing sessions after creation");
        setTimeout(() => {
          onRefreshSessions();
        }, 500); // Small delay to allow backend to process
      } catch (error) {
        console.error("Failed to create session:", error);

        // Show error toast to user
        toast.error("Failed to create session", {
          description: "Could not create a new session. Please try again.",
        });
      } finally {
        setIsCreatingSession(false);
      }
    } else {
      // Select existing session
      onSessionSelect(value);
    }
  };

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return "No activity";
    
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className={`${className}`}>
      {!currentUserId ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <MessageSquare className="w-4 h-4" />
          <span>No user set</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Session:</span>
          <Select value={currentSessionId} onValueChange={handleSessionSelect}>
            <SelectTrigger className="w-44 h-12 text-xs bg-slate-700/50 border-slate-600/50 text-slate-100 hover:bg-slate-600/50 focus:border-emerald-500 px-4 py-1">
              <SelectValue
                placeholder={
                  loadingSessions
                    ? "Loading sessions..."
                    : sessionHistory.length === 0
                    ? "Create your first session"
                    : "Select session"
                }
              />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 min-w-44">
              {/* Loading state */}
              {loadingSessions && (
                <div className="flex items-center gap-2 p-3 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading sessions...</span>
                </div>
              )}

              {/* Sessions list */}
              {!loadingSessions && (
                <>
                  {sessionHistory.map((session) => (
                    <SelectItem
                      key={session.id}
                      value={session.id}
                      className="text-slate-100 focus:bg-slate-700 focus:text-slate-50 cursor-pointer py-3 px-3"
                    >
                      <div className="flex flex-col items-start w-full min-w-0">
                        <div className="flex items-center gap-2 w-full">
                          <span 
                            className="font-medium text-slate-100 text-sm truncate flex-1"
                            title={session.fullQuery || session.querySnippet || session.title}
                          >
                            {session.querySnippet || session.title}
                          </span>
                          <span className="text-xs px-2 py-1 bg-slate-600 rounded text-slate-300 flex-shrink-0">
                            {session.source}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span className="font-mono">
                            {session.id.substring(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="flex-shrink-0">
                            {formatDate(session.lastActivity)}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {/* Create New Session Option */}
                  <SelectItem
                    value="create-new"
                    className="text-slate-100 focus:bg-slate-700 focus:text-slate-50 border-t border-slate-600 mt-1 cursor-pointer py-3 px-3"
                    disabled={isCreatingSession}
                  >
                    <div className="flex items-center gap-2">
                      {isCreatingSession ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Plus className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      )}
                      <span className="text-emerald-400 font-medium">
                        {isCreatingSession
                          ? "Creating..."
                          : "Create New Session"}
                      </span>
                    </div>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
