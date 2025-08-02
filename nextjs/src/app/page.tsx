import { Suspense } from "react";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatLayout } from "@/components/chat/ChatLayout";

export default function HomePage(): React.JSX.Element {
  return (
    <div className="flex flex-col h-screen">
      <Suspense fallback={<div>Loading chat...</div>}>
        <ChatProvider>
          <ChatLayout />
        </ChatProvider>
      </Suspense>
    </div>
  );
}
