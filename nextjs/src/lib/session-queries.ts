/**
 * Session Query Utilities
 * Functions to extract and format user queries from session messages for display in sidebar
 */

import type { AdkEvent } from '@/lib/types/adk';

interface SessionMessage {
  role: 'user' | 'assistant' | 'model';
  content: string | Record<string, unknown>;
  timestamp?: Date;
  [key: string]: unknown;
}

/**
 * Extract the first user query from a session's messages
 * Handles both standard Message format and ADK event format
 */
export function extractFirstUserQuery(
  messages: Record<string, unknown>[]
): string {
  if (!messages || messages.length === 0) {
    return '';
  }

  // Try to find first user message in standard Message format
  for (const message of messages) {
    if (isStandardMessage(message) && message.role === 'user') {
      return formatQueryForDisplay(extractContentFromMessage(message.content));
    }
    
    // Handle ADK event format
    if (isAdkEvent(message)) {
      const adkEvent = message as unknown as AdkEvent;
      if (adkEvent.content?.role === 'user') {
        // Extract text from ADK event parts
        const parts = adkEvent.content.parts || [];
        const textPart = parts.find(part => part.text && !part.thought);
        const text = textPart?.text || '';
        return formatQueryForDisplay(text);
      }
    }
  }

  // Fallback: look for any message with user-like content
  for (const message of messages) {
    const content = extractAnyUserContent(message);
    if (content) {
      return formatQueryForDisplay(content);
    }
  }

  return '';
}

/**
 * Extract full user query (untruncated) for tooltip display
 */
export function extractFullUserQuery(
  messages: Record<string, unknown>[]
): string {
  if (!messages || messages.length === 0) {
    return '';
  }

  // Same logic as extractFirstUserQuery but without truncation
  for (const message of messages) {
    if (isStandardMessage(message) && message.role === 'user') {
      return cleanTextForDisplay(extractContentFromMessage(message.content));
    }
    
    if (isAdkEvent(message)) {
      const adkEvent = message as unknown as AdkEvent;
      if (adkEvent.content?.role === 'user') {
        // Extract text from ADK event parts
        const parts = adkEvent.content.parts || [];
        const textPart = parts.find(part => part.text && !part.thought);
        const text = textPart?.text || '';
        return cleanTextForDisplay(text);
      }
    }
  }

  for (const message of messages) {
    const content = extractAnyUserContent(message);
    if (content) {
      return cleanTextForDisplay(content);
    }
  }

  return '';
}

/**
 * Format a query string for sidebar display with smart truncation
 */
function formatQueryForDisplay(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const cleaned = cleanTextForDisplay(content);
  const maxLength = 55;

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Smart truncation - try to break at word boundaries
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    // If we can break at a word boundary without losing too much content
    return truncated.substring(0, lastSpace).trim() + '...';
  }
  
  // Otherwise, truncate at character boundary
  return truncated.trim() + '...';
}

/**
 * Clean text content for display by removing extra whitespace and control characters
 */
function cleanTextForDisplay(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/[\n\r\t]/g, ' ') // Replace line breaks and tabs with spaces
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove control characters, keep printable ASCII and Unicode
    .trim();
}

/**
 * Extract content from various message content formats
 */
function extractContentFromMessage(content: string | Record<string, unknown>): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (typeof content === 'object' && content !== null) {
    // Try common content field names
    const obj = content as Record<string, unknown>;
    return (obj.text as string) || (obj.content as string) || (obj.message as string) || '';
  }
  
  return '';
}

/**
 * Try to extract user content from any message format
 */
function extractAnyUserContent(message: Record<string, unknown> | string): string {
  if (!message) return '';

  // Direct content check
  if (typeof message === 'string') {
    return message;
  }

  // Check various content locations
  const obj = message as Record<string, unknown>;
  const data = obj.data as Record<string, unknown> | undefined;
  const contentObj = obj.content as Record<string, unknown> | undefined;
  
  const possibleContent = [
    obj.content,
    obj.text,
    obj.message,
    data?.content,
    data?.text,
    contentObj?.text,
    contentObj?.content
  ];

  for (const possibleValue of possibleContent) {
    if (typeof possibleValue === 'string' && possibleValue.trim().length > 0) {
      return possibleValue;
    }
  }

  return '';
}

/**
 * Type guards for different message formats
 */
function isStandardMessage(message: Record<string, unknown>): message is SessionMessage {
  return message && 
         typeof message.role === 'string' && 
         ['user', 'assistant', 'model'].includes(message.role);
}

function isAdkEvent(message: Record<string, unknown>): boolean {
  return Boolean(message && 
         message.content && 
         typeof message.content === 'object' &&
         message.content !== null &&
         'role' in (message.content as Record<string, unknown>) &&
         Array.isArray((message.content as Record<string, unknown>).parts));
}

/**
 * Generate fallback session title when no user query is found
 */
export function generateFallbackTitle(sessionId: string, createdAt?: Date): string {
  if (createdAt) {
    return `Session ${createdAt.toLocaleDateString()}`;
  }
  
  // Use short session ID as fallback
  return `Session ${sessionId.substring(0, 8)}`;
}

/**
 * Validate that extracted query is meaningful (not empty, not just punctuation)
 */
export function isQueryMeaningful(query: string): boolean {
  if (!query || query.length === 0) {
    return false;
  }

  // Remove common punctuation and whitespace
  const cleaned = query.replace(/[.,!?;:\s-]/g, '');
  
  // Must have at least 2 alphanumeric characters
  return cleaned.length >= 2 && /[a-zA-Z0-9]/.test(cleaned);
}