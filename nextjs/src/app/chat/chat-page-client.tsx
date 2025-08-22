"use client";

import { Suspense } from "react";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatLayout } from "@/components/chat/ChatLayout";

export default function ChatPageClient(): React.JSX.Element {
  return (
    <div className="h-dvh flex flex-col">
      <Suspense
        fallback={
          <div className="flex-1 grid place-items-center text-muted-foreground animate-fade-in">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
              <span className="text-sm">Loading chat...</span>
            </div>
          </div>
        }
      >
        <ChatProvider>
          <ChatLayout />
        </ChatProvider>
      </Suspense>
    </div>
  );
}