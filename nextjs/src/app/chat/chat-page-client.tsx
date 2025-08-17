"use client";

import { Suspense } from "react";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { DesktopLayout } from "@/components/chat/DesktopLayout";
import { DesktopSidebar } from "@/components/chat/DesktopSidebar";
import { DesktopChatArea } from "@/components/chat/DesktopChatArea";

export default function ChatPageClient(): React.JSX.Element {
  return (
    <div className="flex flex-col h-screen">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <Suspense fallback={<div>Loading chat...</div>}>
          <ChatProvider>
            <DesktopLayout>
              <DesktopSidebar 
                onTabChange={(tab) => console.log('Tab changed:', tab)}
                onChatSelect={(chatId) => console.log('Chat selected:', chatId)}
                onNewChat={() => console.log('New chat')}
              />
              <DesktopChatArea />
            </DesktopLayout>
          </ChatProvider>
        </Suspense>
      </div>
    </div>
  );
}