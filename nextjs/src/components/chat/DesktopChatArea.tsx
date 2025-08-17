"use client";

import React from "react";
import { useChatContext } from "@/components/chat/ChatProvider";

export function DesktopChatArea(): React.JSX.Element {
  const { messages, userId, sessionId } = useChatContext();

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Chat
        </h2>
        <p className="text-sm text-gray-500">
          Session: {sessionId ? sessionId.substring(0, 8) : "No session selected"}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center text-gray-500">
          Messages will appear here
        </div>
      </div>

      {/* Input Area - Placeholder */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-center text-gray-400 text-sm">
          Input area (coming in Phase 5)
        </div>
      </div>
    </div>
  );
}