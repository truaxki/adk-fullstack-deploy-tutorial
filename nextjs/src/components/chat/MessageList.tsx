"use client";

import { MessageItem } from "./MessageItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Loader2, MessageCircle } from "lucide-react";
import { Message } from "@/types";
import { ProcessedEvent } from "@/components/ActivityTimeline";

interface MessageListProps {
  messages: Message[];
  messageEvents?: Map<string, ProcessedEvent[]>;
  isLoading?: boolean;
  onCopy?: (text: string, messageId: string) => void;
  copiedMessageId?: string | null;
  scrollAreaRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Message list component that efficiently renders all messages
 * with proper scrolling and performance optimization
 */
export function MessageList({
  messages,
  messageEvents,
  isLoading = false,
  onCopy,
  copiedMessageId,
  scrollAreaRef,
}: MessageListProps) {
  // If no messages, show empty state
  if (messages.length === 0) {
    return (
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-3">
            <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">
              No messages yet. Start a conversation!
            </p>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-6">
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        {messages.map((message, index) => (
          <MessageItem
            key={message.id}
            message={message}
            messageEvents={messageEvents}
            // Only show loading for the last message
            isLoading={isLoading && index === messages.length - 1}
            onCopy={onCopy}
            copiedMessageId={copiedMessageId}
          />
        ))}

        {/* Show "Thinking..." if the last message is human and we are loading */}
        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].type === "human" && (
            <div className="flex items-start gap-3 max-w-[90%]">
              <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 bg-muted border rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
      </div>
    </ScrollArea>
  );
}
