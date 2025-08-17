"use client";

import React, { useEffect, useRef } from "react";
import { useChatContext } from "@/components/chat/ChatProvider";
import { MessageList } from "@/components/chat/MessageList";
import { SessionHistory } from "@/components/chat/SessionHistory";
import { ChatInput } from "@/components/chat/ChatInput";
import { ActivityTimeline } from "@/components/ActivityTimeline";

export function DesktopChatArea(): React.JSX.Element {
  const { 
    messages, 
    userId, 
    sessionId,
    isLoadingHistory,
    messageEvents,  // Already added in Phase 3
    isLoading       // Add this for streaming state
  } = useChatContext();

  // Auto-scroll reference
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Debug session state
  useEffect(() => {
    console.log('[DesktopChatArea] Session state:', {
      userId,
      sessionId,
      hasMessages: messages.length > 0,
      isLoadingHistory
    });
  }, [userId, sessionId, messages.length, isLoadingHistory]);


  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Chat Session
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {sessionId && (
                <>
                  <span>Session: {sessionId.substring(0, 8)}...</span>
                  <span>•</span>
                  <span>User: {userId || 'Not set'}</span>
                </>
              )}
            </div>
          </div>
          {sessionId && (
            <div className="text-right">
              <div className="text-sm font-medium text-gray-700">
                {messages.length} messages
              </div>
              {messageEvents.size > 0 && (
                <div className="text-xs text-gray-500">
                  {messageEvents.size} events tracked
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area with better styling */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-6">
          {/* Loading State */}
          <SessionHistory
            isLoadingHistory={isLoadingHistory}
            hasMessages={messages.length > 0}
            sessionId={sessionId}
            userId={userId}
            error={null}
          />

          {/* Message Display */}
          {!isLoadingHistory && (
            <>
              {!sessionId ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">Select a session from the sidebar</p>
                    <p className="text-sm text-gray-400 mt-2">Or create a new chat to get started</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">Start a new conversation</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Type a message below or press Enter to send
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  <MessageList 
                    messages={messages}
                    messageEvents={messageEvents}
                    isLoading={isLoading}
                  />
                  {/* Streaming indicator */}
                  {isLoading && (
                    <div className="mt-4 flex items-center gap-2 text-gray-500">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
                      <span className="text-sm ml-2">AI is thinking...</span>
                    </div>
                  )}
                  <div ref={scrollEndRef} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Input Area with better styling */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <ChatInput />
        </div>
      </div>
    </div>
  );
}