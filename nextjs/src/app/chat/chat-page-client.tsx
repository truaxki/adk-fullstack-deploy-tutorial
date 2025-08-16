"use client";

import { Suspense } from "react";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { UserMenu } from "@/components/auth/UserMenu";

export default function ChatPageClient(): React.JSX.Element {
  return (
    <div className="flex flex-col h-screen">
      {/* Header with UserMenu */}
      <div className="flex justify-between items-center p-4 border-b bg-white shadow-sm">
        <h1 className="text-xl font-semibold">Chat Application</h1>
        <UserMenu />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <Suspense fallback={<div>Loading chat...</div>}>
          <ChatProvider>
            <ChatContainer />
          </ChatProvider>
        </Suspense>
      </div>
    </div>
  );
}