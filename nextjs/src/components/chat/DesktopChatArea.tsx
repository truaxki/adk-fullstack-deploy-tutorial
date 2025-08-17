"use client";

import React, { useEffect } from "react";
import { useChatContext } from "@/components/chat/ChatProvider";
import { MessageList } from "@/components/chat/MessageList";
import { SessionHistory } from "@/components/chat/SessionHistory";

export function DesktopChatArea(): React.JSX.Element {
  const { 
    messages, 
    userId, 
    sessionId,
    isLoadingHistory  // Add this
  } = useChatContext();

  // Monitor state changes for debugging
  useEffect(() => {
    console.log('[DesktopChatArea] Session changed:', sessionId);
    console.log('[DesktopChatArea] Messages count:', messages.length);
    console.log('[DesktopChatArea] Loading history:', isLoadingHistory);
  }, [sessionId, messages.length, isLoadingHistory]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Chat Session
            </h2>
            <p className="text-sm text-gray-500">
              {sessionId ? `ID: ${sessionId.substring(0, 8)}...` : "No session selected"}
            </p>
          </div>
          {sessionId && (
            <div className="text-sm text-gray-500">
              {messages.length} messages
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
                    <p className="text-gray-500">Select a session to view messages</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-gray-500">No messages yet in this session</p>
                    <p className="text-sm text-gray-400 mt-2">Send a message to get started</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  <MessageList />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Input Area - Placeholder */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-100 rounded-lg p-3 text-center text-gray-500 text-sm">
            Message input will be added in Phase 5
          </div>
        </div>
      </div>
    </div>
  );
}