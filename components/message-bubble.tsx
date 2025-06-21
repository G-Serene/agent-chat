/**
 * Message Bubble Component - Simplified
 */

import React, { memo } from 'react';
import { Message } from '@ai-sdk/react';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  onArtifactToggle?: (artifactId?: string) => void;
  isStreaming?: boolean;
  isLastMessage?: boolean;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onArtifactToggle,
  isStreaming = false,
  isLastMessage = false
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex gap-3 max-w-3xl w-full mx-auto",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser 
          ? "bg-muted text-muted-foreground" 
          : "bg-secondary text-secondary-foreground"
      )}>
        {isUser ? "U" : "AI"}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 space-y-2",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-lg px-4 py-3 max-w-none",
          isUser 
            ? "bg-muted text-foreground ml-auto max-w-[80%]" 
            : "bg-secondary text-secondary-foreground"
        )}>
          {/* Simple text content */}
          <MarkdownRenderer content={message.content} />

          {/* Streaming indicator */}
          {isStreaming && isLastMessage && !isUser && (
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
