"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, MessageCircle, Plus, User, LogOut } from "lucide-react";
import { useChatContext } from "@/components/chat/ChatProvider";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { SessionHistory } from "@/components/chat/SessionHistory";
import { BackendHealthChecker } from "@/components/chat/BackendHealthChecker";
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ChatLayout(): React.JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();
  
  const {
    messages,
    sessionId,
    sessionHistory,
    loadingSessions,
    isLoadingHistory,
    isLoading,
    handleSessionSwitch,
    handleCreateNewSession,
    refreshSessionHistory
  } = useChatContext();

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleNewChat = async () => {
    setSessionError(null);
    
    if (!user?.id) {
      setSessionError('Please sign in first');
      return;
    }
    
    setIsCreatingSession(true);
    
    try {
      const newSessionId = await handleCreateNewSession(user.id);
      await refreshSessionHistory();
      
      if (newSessionId) {
        handleSessionSwitch(newSessionId);
      }
    } catch (error) {
      console.error('Session creation failed:', error);
      setSessionError('Failed to create new chat. Please try again.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const handleChatSelect = (chatId: string) => {
    handleSessionSwitch(chatId);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  return (
    <div className="flex h-dvh bg-background text-foreground seaborn-grid">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-80 
        transform transition-transform duration-200 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        bg-card border-r border-border flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img 
              src="/AgentLocker-.png"
              alt="AgentLocker"
              className="w-8 h-8 object-contain"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-sm">AgentLocker</span>
              <span className="text-xs text-tab10-orange font-medium">Research Platform</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* User Section */}
        {user ? (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Signed in as</div>
                  <div className="text-sm font-medium text-foreground truncate">
                    {user.email}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-8 w-8 p-0"
              >
                <LogOut className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 border-b border-border">
            <Button
              onClick={() => router.push('/auth')}
              className="w-full"
              size="sm"
            >
              Sign in to continue
            </Button>
          </div>
        )}

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            disabled={isCreatingSession || !user}
            className="w-full mb-4 bg-tab10-blue hover:bg-tab10-blue/90 text-white border-0"
          >
            {isCreatingSession ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" strokeWidth={2} />
            )}
            {isCreatingSession ? 'Initializing...' : 'New Research Session'}
          </Button>

          {/* Error Message */}
          {sessionError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {sessionError}
            </div>
          )}

          {/* Sessions List */}
          <div className="space-y-1">
            {loadingSessions ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span className="text-sm text-muted-foreground ml-2">Loading sessions...</span>
              </div>
            ) : sessionHistory.length === 0 ? (
              <div className="text-center py-4">
                <span className="text-sm text-muted-foreground">No sessions yet</span>
              </div>
            ) : (
              sessionHistory.map((session) => (
                <Button
                  key={session.id}
                  onClick={() => handleChatSelect(session.id)}
                  variant={session.id === sessionId ? "secondary" : "ghost"}
                  className={`w-full justify-start h-auto p-3 ${session.id === sessionId ? 'accent-line-blue' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${session.id === sessionId ? 'bg-tab10-blue' : 'bg-muted'}`}></div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium truncate">{session.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                        session.source === 'adk' ? 'bg-tab10-green/10 text-tab10-green' :
                        session.source === 'vertex-ai' ? 'bg-tab10-orange/10 text-tab10-orange' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {session.source}
                      </span>
                      {session.messageCount !== undefined && (
                        <span>• {session.messageCount}</span>
                      )}
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
                <span className="sr-only">Toggle sidebar</span>
              </Button>
              <div className="flex items-center gap-3">
                <img 
                  src="/AgentLocker-.png"
                  alt="AgentLocker"
                  className="w-6 h-6 object-contain lg:hidden"
                />
                {sessionId && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-tab10-green rounded-full"></div>
                    <span className="text-sm text-muted-foreground font-mono">
                      {sessionId.substring(0, 8)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BackendHealthChecker />
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <main className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            {!sessionId ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center max-w-md">
                  <div className="mb-6">
                    <img 
                      src="/AgentLocker-.png"
                      alt="AgentLocker"
                      className="w-20 h-20 mx-auto mb-4 object-contain"
                    />
                    <div className="w-12 h-1 bg-tab10-blue mx-auto mb-2"></div>
                    <div className="w-6 h-1 bg-tab10-orange mx-auto"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    AgentLocker Research Platform
                  </h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Welcome to your research workspace. Start a new session to begin analyzing data and generating insights.
                  </p>
                  <Button onClick={handleNewChat} disabled={!user} className="bg-tab10-blue hover:bg-tab10-blue/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Initialize Research Session
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <SessionHistory
                  isLoadingHistory={isLoadingHistory}
                  hasMessages={messages.length > 0}
                  sessionId={sessionId}
                  userId={user?.id || ''}
                  error={null}
                />
                {!isLoadingHistory && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-tab10-blue/10 to-tab10-orange/10 rounded-xl flex items-center justify-center">
                        <MessageCircle className="w-8 h-8 text-tab10-blue" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Research Session Active
                      </h3>
                      <p className="text-muted-foreground">
                        Begin your analysis by typing a research question or data query below.
                      </p>
                      <div className="flex justify-center mt-4 gap-2">
                        <div className="w-2 h-2 bg-tab10-blue rounded-full"></div>
                        <div className="w-2 h-2 bg-tab10-orange rounded-full"></div>
                        <div className="w-2 h-2 bg-tab10-green rounded-full"></div>
                      </div>
                    </div>
                  </div>
                ) : !isLoadingHistory ? (
                  <div className="p-4">
                    <MessageList 
                      messages={messages}
                      isLoading={isLoading}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* Input Area */}
          {sessionId && (
            <div className="border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
              <div className="p-4">
                <ChatInput />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}