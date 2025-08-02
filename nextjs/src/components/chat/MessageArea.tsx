"use client";

import { useState } from "react";
import { Loader2, Bot } from "lucide-react";
import { MessageList } from "@/components/chat/MessageList";
import { useChatContext } from "@/components/chat/ChatProvider";
import {
  SessionHistory,
  SessionHistoryPlaceholder,
} from "@/components/chat/SessionHistory";

/**
 * MessageArea - Message display and interaction logic
 * Extracted from ChatMessagesView message display section
 * Handles message list rendering, copy functionality, and loading states
 */
export function MessageArea(): React.JSX.Element {
  const {
    messages,
    messageEvents,
    websiteCount,
    isLoading,
    isLoadingHistory,
    userId,
    sessionId,
    scrollAreaRef,
  } = useChatContext();

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopy = async (text: string, messageId: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  return (
    <>
      {/* Session History Loading States */}
      <SessionHistory
        isLoadingHistory={isLoadingHistory}
        hasMessages={messages.length > 0}
        sessionId={sessionId}
        userId={userId}
      />

      {/* Session History Placeholder */}
      <SessionHistoryPlaceholder
        isLoadingHistory={isLoadingHistory}
        hasMessages={messages.length > 0}
        sessionId={sessionId}
      />

      {/* Message List */}
      <MessageList
        messages={messages}
        messageEvents={messageEvents}
        websiteCount={websiteCount}
        isLoading={isLoading}
        onCopy={handleCopy}
        copiedMessageId={copiedMessageId}
        scrollAreaRef={scrollAreaRef}
      />

      {/* Show "Planning..." if the last message is human and we are loading */}
      {isLoading &&
        messages.length > 0 &&
        messages[messages.length - 1].type === "human" && (
          <div className="max-w-4xl mx-auto w-full px-4 py-6">
            <div className="flex items-start gap-3 max-w-[90%]">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md border border-emerald-400/30">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4 shadow-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span className="text-sm text-slate-400">
                    Planning your goal...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
