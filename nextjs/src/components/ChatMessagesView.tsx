"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputForm } from "@/components/InputForm";
import { UserIdInput } from "@/components/chat/UserIdInput";
import { SessionSelector } from "@/components/chat/SessionSelector";
import { MessageList } from "@/components/chat/MessageList";
import { Loader2, Bot, Target, ListChecks, CheckCircle } from "lucide-react";
import { Message } from "@/types";
import { ProcessedEvent } from "@/components/ActivityTimeline";

interface ChatMessagesViewProps {
  messages: Message[];
  isLoading: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  onSubmit: (query: string) => void;
  onCancel: () => void;
  sessionId: string;
  onSessionIdChange: (sessionId: string) => void;
  displayData?: string | null;
  messageEvents?: Map<string, ProcessedEvent[]>;
  websiteCount?: number;
  userId: string;
  onUserIdChange: (newUserId: string) => void;
  onUserIdConfirm: (confirmedUserId: string) => void;
  onCreateSession: (
    sessionUserId: string,
    initialMessage?: string
  ) => Promise<void>;
}

export function ChatMessagesView({
  messages,
  isLoading,
  scrollAreaRef,
  onSubmit,
  onCancel,
  sessionId,
  onSessionIdChange,
  messageEvents,
  websiteCount,
  userId,
  onUserIdChange,
  onUserIdConfirm,
  onCreateSession,
}: ChatMessagesViewProps): React.JSX.Element {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopy = async (text: string, messageId: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Fixed background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pointer-events-none"></div>

      {/* Fixed Header */}
      <div className="relative z-10 flex-shrink-0 border-b border-slate-700/50 bg-slate-800/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-100">
                Goal Planning Assistant
              </h1>
              <p className="text-xs text-slate-400">Powered by Google Gemini</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User ID Management */}
            <UserIdInput
              currentUserId={userId}
              onUserIdChange={onUserIdChange}
              onUserIdConfirm={onUserIdConfirm}
              className="text-xs"
            />

            {/* Session Management */}
            {userId && (
              <SessionSelector
                currentUserId={userId}
                currentSessionId={sessionId}
                onSessionSelect={onSessionIdChange}
                onCreateSession={onCreateSession}
                className="text-xs"
              />
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="relative z-10 flex-1 overflow-hidden">
        {messages.length === 0 ? (
          /* AI Goal Planner Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center min-h-[60vh]">
            <div className="max-w-4xl w-full space-y-8">
              {/* Main header */}
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <ListChecks className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
                <h1 className="text-4xl font-bold text-white">
                  AI Goal Planner
                </h1>
                <p className="text-xl text-neutral-300">
                  Powered by Google Gemini
                </p>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
                  Transform your goals into actionable plans with structured
                  task breakdown, clear priorities, and step-by-step guidance to
                  achieve success.
                </p>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto">
                    <Target className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="font-semibold text-green-400">
                    Goal Planning
                  </h3>
                  <p className="text-sm text-neutral-400">
                    Strategic breakdown and clear roadmap creation
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto">
                    <ListChecks className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="font-semibold text-blue-400">
                    Task Breakdown
                  </h3>
                  <p className="text-sm text-neutral-400">
                    Organized tasks and subtasks with priorities
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="font-semibold text-purple-400">
                    Achievement Path
                  </h3>
                  <p className="text-sm text-neutral-400">
                    Clear steps and milestones to reach your goals
                  </p>
                </div>
              </div>

              {/* Try asking about section */}
              <div className="space-y-4">
                <p className="text-neutral-400">Try asking about:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-sm">
                    Goal setting strategies
                  </span>
                  <span className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-sm">
                    Project planning methods
                  </span>
                  <span className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-sm">
                    Task prioritization
                  </span>
                  <span className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-sm">
                    Achievement milestones
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Message List - Use new MessageList component */
          <MessageList
            messages={messages}
            messageEvents={messageEvents}
            websiteCount={websiteCount}
            isLoading={isLoading}
            onCopy={handleCopy}
            copiedMessageId={copiedMessageId}
            scrollAreaRef={scrollAreaRef}
          />
        )}

        {/* Show "Planning..." if the last message is human and we are loading */}
        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].type === "human" && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md border border-emerald-400/30">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/50 rounded-lg px-3 py-2 backdrop-blur-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span className="text-sm text-slate-400">
                    Planning your goal...
                  </span>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Fixed Input Area */}
      <div className="relative z-10 flex-shrink-0 border-t-2 border-slate-600/80 bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-black/40">
        <div className="max-w-4xl mx-auto p-4 pt-5">
          <InputForm onSubmit={onSubmit} isLoading={isLoading} context="chat" />
          {isLoading && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={onCancel}
                className="text-red-400 hover:text-red-300 border-red-400/30 hover:border-red-400/50 bg-red-950/20 hover:bg-red-950/30"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
