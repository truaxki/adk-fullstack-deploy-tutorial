"use client";

import { InputForm } from "@/components/InputForm";
import { useChatContext } from "@/components/chat/ChatProvider";

/**
 * ChatInput - Input form wrapper with context integration
 * Handles message submission through context instead of prop drilling
 */
export function ChatInput(): React.JSX.Element {
  const { handleSubmit, isLoading } = useChatContext();

  return (
    <div className="w-full">
      <InputForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        context="chat"
      />
    </div>
  );
}
