"use client";

import { useState, useEffect } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InputForm } from "@/components/InputForm";
import {
  Copy,
  CopyCheck,
  Loader2,
  Bot,
  User,
  Target,
  ListChecks,
  CheckCircle,
} from "lucide-react";
import { Message } from "@/types";
import {
  ProcessedEvent,
  ActivityTimeline,
} from "@/components/ActivityTimeline";

interface ChatMessagesViewProps {
  messages: Message[];
  isLoading: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  onSubmit: (query: string) => void;
  onCancel: () => void;
  sessionId: string;
  onSessionIdChange: (sessionId: string) => void;
  onLoadSession?: (sessionId: string) => void;
  displayData?: string | null;
  messageEvents?: Map<string, ProcessedEvent[]>;
  websiteCount?: number;
}

// Enhanced markdown components for better styling
const mdComponents: Partial<Components> = {
  h1: ({ children, ...props }) => (
    <h1
      className="text-xl font-bold mb-3 text-slate-100 leading-tight"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="text-lg font-semibold mb-2 text-slate-100 leading-tight"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="text-base font-medium mb-2 text-slate-100 leading-tight"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="text-sm font-medium mb-1 text-slate-200 leading-tight"
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5
      className="text-sm font-medium mb-1 text-slate-200 leading-tight"
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6
      className="text-sm font-medium mb-1 text-slate-200 leading-tight"
      {...props}
    >
      {children}
    </h6>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-2 leading-relaxed text-slate-200 last:mb-0" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="list-disc list-inside mb-2 space-y-1 text-slate-200"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="list-decimal list-inside mb-2 space-y-1 text-slate-200"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed text-slate-200" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-blue-400 pl-4 py-2 mb-2 bg-slate-800/30 rounded-r italic text-slate-300"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ children, ...props }) => (
    <code
      className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded text-sm font-mono"
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children, ...props }) => (
    <pre
      className="bg-slate-800 text-slate-200 p-3 rounded-lg mb-2 overflow-x-auto border border-slate-700"
      {...props}
    >
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <div className="mb-2 overflow-x-auto">
      <table
        className="min-w-full border-collapse border border-slate-600 text-slate-200"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border border-slate-600 bg-slate-700 px-3 py-2 text-left font-medium"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-slate-600 px-3 py-2" {...props}>
      {children}
    </td>
  ),
  a: ({ children, href, ...props }) => (
    <a
      className="text-blue-400 hover:text-blue-300 underline transition-colors"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-slate-100" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-slate-200" {...props}>
      {children}
    </em>
  ),
};

// Human message bubble component with enhanced styling
interface HumanMessageBubbleProps {
  message: Message;
  mdComponents: typeof mdComponents;
}

const HumanMessageBubble = ({
  message,
  mdComponents,
}: HumanMessageBubbleProps): React.JSX.Element => (
  <div className="flex items-start gap-3 max-w-[85%] ml-auto">
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 rounded-2xl rounded-tr-sm shadow-lg border border-blue-500/20">
      <ReactMarkdown
        components={{
          ...mdComponents,
          p: ({ children, ...props }) => (
            <p className="mb-2 leading-relaxed text-white last:mb-0" {...props}>
              {children}
            </p>
          ),
          h1: ({ children, ...props }) => (
            <h1
              className="text-xl font-bold mb-3 text-white leading-tight"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="text-lg font-semibold mb-2 text-white leading-tight"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="text-base font-medium mb-2 text-white leading-tight"
              {...props}
            >
              {children}
            </h3>
          ),
          code: ({ children, ...props }) => (
            <code
              className="bg-blue-800/50 text-blue-100 px-1.5 py-0.5 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-white" {...props}>
              {children}
            </strong>
          ),
        }}
        remarkPlugins={[remarkGfm]}
      >
        {message.content}
      </ReactMarkdown>
    </div>
    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-md border border-blue-500/30">
      <User className="h-4 w-4 text-white" />
    </div>
  </div>
);

// AI message bubble component with enhanced styling
interface AiMessageBubbleProps {
  message: Message;
  mdComponents: typeof mdComponents;
  handleCopy: (text: string, messageId: string) => void;
  copiedMessageId: string | null;
  isLoading: boolean;
  messageEvents?: Map<string, ProcessedEvent[]>;
  websiteCount?: number;
}

const AiMessageBubble = ({
  message,
  mdComponents,
  handleCopy,
  copiedMessageId,
  isLoading,
  messageEvents,
  websiteCount,
}: AiMessageBubbleProps): React.JSX.Element => {
  // Check if we have timeline events to show
  const hasTimelineEvents =
    messageEvents &&
    messageEvents.has(message.id) &&
    messageEvents.get(message.id)!.length > 0;

  // If message has no content and is loading, show thinking indicator with timeline
  if (!message.content && isLoading) {
    return (
      <div className="flex items-start gap-3 max-w-[90%]">
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md border border-emerald-400/30">
          <Bot className="h-4 w-4 text-white" />
        </div>

        <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4 shadow-lg">
          {/* Activity Timeline during thinking */}
          {hasTimelineEvents && (
            <ActivityTimeline
              processedEvents={messageEvents.get(message.id) || []}
              isLoading={isLoading}
              websiteCount={websiteCount || 0}
            />
          )}

          {/* Loading indicator */}
          <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            <span className="text-sm text-slate-400">
              Planning your goal...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // If message has no content and not loading, show timeline if available
  if (!message.content) {
    // If we have timeline events, show them even without content
    if (hasTimelineEvents) {
      return (
        <div className="flex items-start gap-3 max-w-[90%]">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md border border-emerald-400/30">
            <Bot className="h-4 w-4 text-white" />
          </div>

          <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4 shadow-lg">
            <ActivityTimeline
              processedEvents={messageEvents.get(message.id) || []}
              isLoading={isLoading}
              websiteCount={websiteCount || 0}
            />

            {/* Show processing indicator */}
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 mt-2">
              <span className="text-sm text-slate-400">Processing...</span>
            </div>
          </div>
        </div>
      );
    }

    // Otherwise show no content indicator
    return (
      <div className="flex items-start gap-3 max-w-[90%]">
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md border border-emerald-400/30">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
          <span className="text-sm text-slate-400">No content</span>
        </div>
      </div>
    );
  }

  // Regular message display
  return (
    <div className="flex items-start gap-3 max-w-[90%]">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md border border-emerald-400/30">
        <Bot className="h-4 w-4 text-white" />
      </div>

      <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4 shadow-lg relative group">
        {/* Activity Timeline */}
        {messageEvents && messageEvents.has(message.id) && (
          <ActivityTimeline
            processedEvents={messageEvents.get(message.id) || []}
            isLoading={isLoading}
            websiteCount={websiteCount || 0}
          />
        )}

        <div className="prose prose-invert max-w-none">
          <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Copy button */}
        <button
          onClick={() => handleCopy(message.content, message.id)}
          className="absolute top-3 right-3 p-2 hover:bg-slate-700/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Copy message"
        >
          {copiedMessageId === message.id ? (
            <CopyCheck className="h-4 w-4 text-emerald-400" />
          ) : (
            <Copy className="h-4 w-4 text-slate-400 hover:text-slate-300" />
          )}
        </button>

        {/* Timestamp */}
        <div className="mt-3 pt-2 border-t border-slate-700/50">
          <span className="text-xs text-slate-400">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export function ChatMessagesView({
  messages,
  isLoading,
  scrollAreaRef,
  onSubmit,
  onCancel,
  sessionId,
  onSessionIdChange,
  onLoadSession,
  messageEvents,
  websiteCount,
}: ChatMessagesViewProps): React.JSX.Element {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isEditingSessionId, setIsEditingSessionId] = useState(false);
  const [tempSessionId, setTempSessionId] = useState(sessionId);

  useEffect(() => {
    setTempSessionId(sessionId);
  }, [sessionId]);

  const handleCopy = async (text: string, messageId: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleNewChat = (): void => {
    const newSessionId = crypto.randomUUID();
    onSessionIdChange(newSessionId);
    onLoadSession?.(newSessionId);
  };

  const handleSessionIdEdit = (): void => {
    setTempSessionId(sessionId);
    setIsEditingSessionId(true);
  };

  const handleSessionIdSave = (): void => {
    if (tempSessionId.trim()) {
      onSessionIdChange(tempSessionId.trim());
      onLoadSession?.(tempSessionId.trim());
    }
    setIsEditingSessionId(false);
  };

  const handleSessionIdCancel = (): void => {
    setTempSessionId(sessionId);
    setIsEditingSessionId(false);
  };

  const handleSessionIdKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      handleSessionIdSave();
    } else if (e.key === "Escape") {
      handleSessionIdCancel();
    }
  };

  // Find the ID of the last AI message
  const lastAiMessage = messages
    .slice()
    .reverse()
    .find((m) => m.type === "ai");
  const lastAiMessageId = lastAiMessage?.id;

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
            {/* Session ID Display/Edit */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Session:</span>
              {isEditingSessionId ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempSessionId}
                    onChange={(e) => setTempSessionId(e.target.value)}
                    onKeyDown={handleSessionIdKeyPress}
                    className="bg-slate-700 text-slate-200 text-xs px-2 py-1 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none w-64"
                    placeholder="Enter session ID..."
                    autoFocus
                  />
                  <button
                    onClick={handleSessionIdSave}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleSessionIdCancel}
                    className="text-xs text-slate-400 hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-mono bg-slate-700/50 px-2 py-1 rounded">
                    {sessionId || "No session"}
                  </span>
                  <button
                    onClick={handleSessionIdEdit}
                    className="text-xs text-slate-400 hover:text-slate-300"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <Button
              onClick={handleNewChat}
              variant="outline"
              className="bg-slate-700/50 hover:bg-slate-700 text-slate-200 border-slate-600/50 hover:border-slate-500 transition-colors"
            >
              New Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto min-h-full">
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
                      task breakdown, clear priorities, and step-by-step
                      guidance to achieve success.
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
              messages.map((message) => {
                // Determine if the current AI message is the last one
                const isCurrentMessageTheLastAiMessage =
                  message.type === "ai" && message.id === lastAiMessageId;

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === "human" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.type === "human" ? (
                      <HumanMessageBubble
                        message={message}
                        mdComponents={mdComponents}
                      />
                    ) : (
                      <AiMessageBubble
                        message={message}
                        mdComponents={mdComponents}
                        handleCopy={handleCopy}
                        copiedMessageId={copiedMessageId}
                        // Pass isLoading only if it's the last AI message and global isLoading is true
                        isLoading={
                          isCurrentMessageTheLastAiMessage && isLoading
                        }
                        messageEvents={messageEvents}
                        websiteCount={websiteCount}
                      />
                    )}
                  </div>
                );
              })
            )}

            {/* Show "Planning..." if the last message is human and we are loading */}
            {isLoading &&
              messages.length > 0 &&
              messages[messages.length - 1].type === "human" && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md border border-emerald-400/30">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                      <span className="text-sm text-slate-400">
                        Planning your goal...
                      </span>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </ScrollArea>
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
