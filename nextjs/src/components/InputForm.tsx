"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles } from "lucide-react";

interface InputFormProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  context?: "homepage" | "chat"; // Add context prop for different placeholder text
}

export function InputForm({
  onSubmit,
  isLoading,
  context = "homepage",
}: InputFormProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current && context === "homepage") {
      textareaRef.current.focus();
    }
  }, [context]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSubmit(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const placeholderText =
    context === "chat"
      ? "Ask a follow-up question or request changes..."
      : "Ask me anything... e.g., A report on the latest Google I/O";

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`
          relative flex items-end gap-3 p-3 rounded-2xl border transition-all duration-200
          ${
            isFocused
              ? "border-emerald-400/50 bg-slate-800/80 shadow-lg shadow-emerald-500/10"
              : "border-slate-700/50 bg-slate-800/50 hover:border-slate-600/50"
          }
          backdrop-blur-sm
        `}
        >
          {/* AI Sparkle Icon */}
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md border border-emerald-400/30">
            <Sparkles className="h-4 w-4 text-white" />
          </div>

          {/* Input Area */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholderText}
              rows={1}
              className="
                resize-none border-0 bg-transparent text-slate-200 placeholder-slate-400
                focus:ring-0 focus:outline-none min-h-[40px] max-h-32
                scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-600
                px-0 py-2
              "
              style={{
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            />

            {/* Character count for long messages */}
            {inputValue.length > 500 && (
              <div className="absolute bottom-1 right-1 text-xs text-slate-500 bg-slate-800/80 rounded px-1">
                {inputValue.length}/2000
              </div>
            )}
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !inputValue.trim()}
            className={`
              flex-shrink-0 h-10 w-10 rounded-xl transition-all duration-200
              ${
                inputValue.trim() && !isLoading
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 border-emerald-400/30 shadow-md hover:shadow-lg"
                  : "bg-slate-700/50 hover:bg-slate-700 border-slate-600/50"
              }
              border disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Send
                className={`h-4 w-4 ${
                  inputValue.trim() ? "text-white" : "text-slate-400"
                }`}
              />
            )}
          </Button>
        </div>

        {/* Hint Text */}
        <div className="mt-2 px-3">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {context === "homepage" && (
              <>
                <span className="mx-1">•</span>
                <span>
                  Try: &ldquo;Create a business plan for a coffee shop&rdquo;
                </span>
              </>
            )}
          </p>
        </div>
      </form>
    </div>
  );
}
