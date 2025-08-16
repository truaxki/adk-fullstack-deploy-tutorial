"use client";

import { Suspense, useState } from "react";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatContent } from "@/components/chat/ChatContent";
import { ChatInput } from "@/components/chat/ChatInput";
import { SessionSelector } from "@/components/chat/SessionSelector";
import { BackendHealthChecker } from "@/components/chat/BackendHealthChecker";
import { DesktopLayout } from "@/components/chat/DesktopLayout";
import { DesktopSidebar } from "@/components/chat/DesktopSidebar";

export default function ChatPageClient(): React.JSX.Element {
  // State for experimenting with different layouts
  const [layout, setLayout] = useState<"default" | "sidebar" | "minimal" | "custom" | "desktop">("desktop");
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Debug Controls Panel - Toggle this for testing */}
      {showDebugPanel && (
        <div className="border-b p-4 bg-muted/50">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <span className="font-semibold">Layout:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setLayout("default")}
                className={`px-3 py-1 rounded ${
                  layout === "default" ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                Default
              </button>
              <button
                onClick={() => setLayout("sidebar")}
                className={`px-3 py-1 rounded ${
                  layout === "sidebar" ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                Sidebar
              </button>
              <button
                onClick={() => setLayout("minimal")}
                className={`px-3 py-1 rounded ${
                  layout === "minimal" ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                Minimal
              </button>
              <button
                onClick={() => setLayout("custom")}
                className={`px-3 py-1 rounded ${
                  layout === "custom" ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                Custom
              </button>
              <button
                onClick={() => setLayout("desktop")}
                className={`px-3 py-1 rounded ${
                  layout === "desktop" ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                Desktop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Debug Panel Button */}
      <button
        onClick={() => setShowDebugPanel(!showDebugPanel)}
        className="fixed top-4 right-4 z-50 px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm"
      >
        {showDebugPanel ? "Hide" : "Show"} Debug
      </button>

      <Suspense fallback={<LoadingState />}>
        <ChatProvider>
          {/* Default Layout - Same as homepage */}
          {layout === "default" && <ChatContainer />}

          {/* Sidebar Layout - Chat with sidebar for sessions */}
          {layout === "sidebar" && (
            <div className="flex flex-1 overflow-hidden">
              <aside className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
                <h2 className="font-semibold mb-4">Sessions</h2>
                <SessionSelector currentUserId={""} currentSessionId={""} onSessionSelect={() => {}} onCreateSession={async (userId: string) => {}} />
                <div className="mt-6">
                  <BackendHealthChecker />
                </div>
              </aside>
              <main className="flex-1 flex flex-col">
                <ChatHeader />
                <ChatContent />
                <ChatInput />
              </main>
            </div>
          )}

          {/* Minimal Layout - Just the essentials */}
          {layout === "minimal" && (
            <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full p-4">
              <ChatContent />
              <ChatInput />
            </div>
          )}

          {/* Custom Layout - Build your own arrangement */}
          {layout === "custom" && (
            <div className="flex-1 p-4">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-12 gap-4 h-full">
                  {/* Header across the top */}
                  <div className="col-span-12 mb-4">
                    <ChatHeader />
                  </div>
                  
                  {/* Left Panel - Sessions */}
                  <div className="col-span-3 bg-card rounded-lg p-4 border">
                    <h3 className="font-semibold mb-3">Sessions</h3>
                    <SessionSelector currentUserId={""} currentSessionId={""} onSessionSelect={function (sessionId: string): void {
                                          throw new Error("Function not implemented.");
                                      } } onCreateSession={function (userId: string): Promise<void> {
                                          throw new Error("Function not implemented.");
                                      } } />
                  </div>
                  
                  {/* Center - Main Chat Area */}
                  <div className="col-span-6 flex flex-col bg-card rounded-lg border">
                    <div className="flex-1 overflow-hidden">
                      <ChatContent />
                    </div>
                    <div className="border-t p-4">
                      <ChatInput />
                    </div>
                  </div>
                  
                  {/* Right Panel - Health Status & Info */}
                  <div className="col-span-3 space-y-4">
                    <div className="bg-card rounded-lg p-4 border">
                      <h3 className="font-semibold mb-3">System Status</h3>
                      <BackendHealthChecker />
                    </div>
                    <div className="bg-card rounded-lg p-4 border">
                      <h3 className="font-semibold mb-3">Info</h3>
                      <p className="text-sm text-muted-foreground">
                        Experiment with different layouts using the debug panel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Layout - AI Desktop style */}
          {layout === "desktop" && (
            <DesktopLayout>
              <DesktopSidebar 
                onTabChange={(tab) => console.log('Tab changed:', tab)}
                onChatSelect={(chatId) => console.log('Chat selected:', chatId)}
                onNewChat={() => console.log('New chat')}
              />
              <div className="flex-1 flex flex-col">
                <div className="text-center py-8">
                  <h1 className="text-2xl font-bold text-gray-800">Main Content Area</h1>
                  <p className="text-gray-600 mt-2">GPTs Directory will go here</p>
                </div>
              </div>
            </DesktopLayout>
          )}
        </ChatProvider>
      </Suspense>
    </div>
  );
}

// Loading component
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    </div>
  );
}