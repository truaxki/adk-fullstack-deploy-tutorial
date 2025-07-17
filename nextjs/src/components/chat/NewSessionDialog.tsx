"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, User, MessageSquare, Loader2 } from "lucide-react";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSession: (userId: string, initialMessage?: string) => Promise<void>;
  currentUserId: string;
  isLoading?: boolean;
}

export function NewSessionDialog({
  open,
  onOpenChange,
  onCreateSession,
  currentUserId,
  isLoading = false,
}: NewSessionDialogProps): React.JSX.Element {
  const [initialMessage, setInitialMessage] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Handle session creation
  const handleCreateSession = async (): Promise<void> => {
    if (!currentUserId) {
      return;
    }

    setIsCreating(true);
    try {
      await onCreateSession(currentUserId, initialMessage.trim() || undefined);
      // Reset state after successful creation
      setInitialMessage("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create session:", error);
      // Error handling is done by parent component
    } finally {
      setIsCreating(false);
    }
  };

  // Handle dialog close
  const handleClose = (): void => {
    if (!isCreating) {
      setInitialMessage("");
      onOpenChange(false);
    }
  };

  // Handle key press for quick creation
  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ): void => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCreateSession();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User ID Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              User ID
            </label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                {currentUserId}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Session will be created for this user
              </span>
            </div>
          </div>

          {/* Optional Initial Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Initial Message (Optional)
            </label>
            <Textarea
              value={initialMessage}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setInitialMessage(e.target.value)
              }
              onKeyDown={handleKeyPress}
              placeholder="Enter your first message to start the conversation..."
              className="min-h-[100px] resize-none"
              disabled={isCreating || isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Press Cmd/Ctrl+Enter to create session quickly
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreating || isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={!currentUserId || isCreating || isLoading}
              className="flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Session
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
