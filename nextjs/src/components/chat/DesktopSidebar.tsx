"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageCircle, 
  // Search - removed unused import
  Image as ImageIcon, 
  FileText, 
  GitBranch, 
  MoreHorizontal,
  Star,
  Sparkles,
  Plus,
  User,
  LogOut
} from "lucide-react";
import { useChatContext } from "@/components/chat/ChatProvider";
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

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
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  
  const router = useRouter();
  const supabase = createClient();
  
  // Get session context from ChatProvider - this now includes Supabase session history
  const {
    // userId - removed unused variable
    sessionId,
    sessionHistory,
    loadingSessions,
    handleSessionSwitch,
    handleCreateNewSession,
    refreshSessionHistory
  } = useChatContext();

  // Debug logging for sidebar
  React.useEffect(() => {
    console.log('📋 [DesktopSidebar] Session state update:', {
      sessionId,
      sessionHistoryLength: sessionHistory.length,
      loadingSessions,
      sessionHistory
    });
  }, [sessionId, sessionHistory, loadingSessions]);

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Sessions are now provided by ChatProvider via useSession hook
  // No need to fetch separately - sessionHistory and loadingSessions come from context

  const handleTabChange = (tab: "research" | "chat") => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleChatSelect = (chatId: string) => {
    handleSessionSwitch(chatId);
    onChatSelect?.(chatId);
  };

  const handleNewChat = async () => {
    console.log('🆕 [DesktopSidebar] Creating new chat for user:', user?.id);
    setSessionError(null);
    
    if (!user?.id) {
      console.error('❌ [DesktopSidebar] No user ID available');
      setSessionError('Please set a User ID first');
      return;
    }
    
    setIsCreatingSession(true);
    
    try {
      console.log('🚀 [DesktopSidebar] Calling handleCreateNewSession...');
      const newSessionId = await handleCreateNewSession(user.id);
      console.log('✅ [DesktopSidebar] New session created:', newSessionId);
      
      // Refresh the session list to show the new session
      console.log('🔄 [DesktopSidebar] Refreshing session history...');
      await refreshSessionHistory();
      console.log('✅ [DesktopSidebar] Session history refreshed');
      
      // The session was already switched by handleCreateNewSession, but ensure it's selected
      if (newSessionId) {
        console.log('🔄 [DesktopSidebar] Switching to new session:', newSessionId);
        handleSessionSwitch(newSessionId);
      }
      
      onNewChat?.();
    } catch (error) {
      console.error('❌ [DesktopSidebar] Session creation failed:', error);
      setSessionError('Failed to create new chat. Please try again.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
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

      {/* User Section */}
      {user ? (
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-xs text-gray-500">Signed in as</div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => router.push('/auth')}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Sign in to continue
          </button>
        </div>
      )}

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
            <ImageIcon className="w-4 h-4" />
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
          disabled={isCreatingSession || !user}
          className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-100 disabled:hover:bg-transparent"
        >
          {isCreatingSession ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Creating...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New Chat</span>
            </>
          )}
        </button>

        {/* Error Message */}
        {sessionError && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {sessionError}
          </div>
        )}

        {/* Sessions List */}
        <div className="space-y-1">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
              <span className="text-sm text-gray-500 ml-2">Loading sessions...</span>
            </div>
          ) : sessionHistory.length === 0 ? (
            <div className="text-center py-4">
              <span className="text-sm text-gray-500">No sessions yet</span>
            </div>
          ) : (
            sessionHistory.map((session) => (
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
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">
                      {session.source}
                    </span>
                    {session.lastActivity && (
                      <span>• {session.lastActivity.toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
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
