"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  MessageCircle, 
  Search, 
  Image, 
  FileText, 
  GitBranch, 
  MoreHorizontal,
  Star,
  Sparkles,
  Plus
} from "lucide-react";
import { useChatContext } from "@/components/chat/ChatProvider";
import { fetchActiveSessionsAction } from "@/lib/actions/session-list-actions";

interface ActiveSession {
  id: string;
  userId: string;
  appName: string;
  lastUpdateTime: Date | null;
  messageCount: number;
  title?: string;
}

interface DesktopSidebarProps {
  className?: string;
  onTabChange?: (tab: "research" | "chat") => void;
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
}

/**
 * DesktopSidebar - AgentLocker style sidebar component
 * Features:
 * - Branding with logo and app name
 * - Research/Chat tabs
 * - Navigation menu (Images, Files, Branches, More)
 * - Chat history with active states
 * - Starred conversations section
 * - Upgrade to Pro button
 */
export function DesktopSidebar({ 
  className = "",
  onTabChange,
  onChatSelect,
  onNewChat
}: DesktopSidebarProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"research" | "chat">("chat");
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  
  // Get session context from ChatProvider
  const {
    userId,
    sessionId,
    handleSessionSwitch,
    handleCreateNewSession
  } = useChatContext();

  // Fetch active sessions
  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    
    try {
      setIsLoadingSessions(true);
      const result = await fetchActiveSessionsAction(userId);
      
      if (result.success) {
        setSessions(result.sessions);
      } else {
        console.error("Failed to fetch sessions:", result.error);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [userId]);

  // Load sessions when userId changes
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleTabChange = (tab: "research" | "chat") => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleChatSelect = (chatId: string) => {
    handleSessionSwitch(chatId);
    onChatSelect?.(chatId);
  };

  const handleNewChat = async () => {
    if (userId) {
      await handleCreateNewSession(userId);
      onNewChat?.();
    }
  };

  return (
    <div className={`w-80 h-full bg-white border-r border-gray-200 flex flex-col ${className}`}>
      {/* Branding Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm"></div>
          </div>
          <span className="font-semibold text-gray-900">AgentLocker</span>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleTabChange("research")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === "research"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Research
          </button>
          <button
            onClick={() => handleTabChange("chat")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === "chat"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Chat
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="p-4 border-b border-gray-200">
        <nav className="space-y-1">
          <button className="flex items-center gap-3 w-full p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
            <Image className="w-4 h-4" />
            <span className="text-sm">Images</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Files</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
            <GitBranch className="w-4 h-4" />
            <span className="text-sm">Branches</span>
            <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">2</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
            <span className="text-sm">More</span>
          </button>
        </nav>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-3 p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors mb-4"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Chat</span>
        </button>

        {/* Sessions List */}
        <div className="space-y-1">
          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
              <span className="text-sm text-gray-500 ml-2">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-4">
              <span className="text-sm text-gray-500">No sessions yet</span>
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleChatSelect(session.id)}
                className={`flex items-center gap-3 w-full p-2 rounded-lg text-left transition-colors ${
                  session.id === sessionId
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{session.title}</div>
                  <div className="text-xs text-gray-500">
                    {session.messageCount} messages
                  </div>
                </div>
                {session.lastUpdateTime && (
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(session.lastUpdateTime).toLocaleDateString()}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Starred Section - Placeholder for future feature */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Starred</span>
            </div>
            <button className="text-xs text-blue-600 hover:text-blue-700">
              View All
            </button>
          </div>
          <div className="text-center py-2">
            <span className="text-xs text-gray-500">Coming soon</span>
          </div>
        </div>
      </div>

      {/* Upgrade Section */}
      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Upgrade to Pro</span>
        </button>
        <div className="flex items-center justify-center mt-2">
          <span className="text-xs text-gray-500">Beta new</span>
        </div>
      </div>
    </div>
  );
}
