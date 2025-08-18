# AI Response Logging Solution - Complete Implementation Guide

**Date:** January 18, 2025  
**Issue:** AI responses from ADK backend are not being persisted to Supabase  
**Current Status:** User messages are saved successfully, but AI responses are missing

## Executive Summary

The current SSE interceptor approach is not capturing AI responses because:
1. The TransformStream interceptor might not be properly initialized or invoked
2. The SSE event format parsing might not match the actual ADK response structure
3. There's a potential race condition with async Supabase session lookup

## Root Cause Analysis

### Current Implementation Issues

1. **SSE Interceptor Not Firing:**
   - No console logs from the interceptor are appearing
   - The `pipeThrough()` might not be processing chunks correctly
   - Missing debug logging at interceptor creation

2. **ADK Response Format:**
   - The interceptor expects specific JSON structures that might not match ADK's actual format
   - Based on frontend parsing, ADK uses: `{ content: { parts: [{ text: "..." }] }, author: "..." }`
   - The interceptor might be looking for wrong event patterns

3. **Async Session Resolution:**
   - The Supabase session lookup is async and might resolve after streaming starts
   - Could miss early response chunks

## Proposed Solution: Multi-Layer Approach

### Solution 1: Enhanced SSE Interceptor (Primary Fix)

Update the SSE interceptor with better debugging and correct format parsing:

```typescript
// src/lib/handlers/sse-stream-interceptor.ts
import { messageService } from "@/lib/services/message-service";
import { supabaseSessionServiceServer } from "@/lib/services/supabase-session-service-server";

export function createSSEInterceptor(
  adkSessionId: string,
  userId: string
): TransformStream<Uint8Array, Uint8Array> {
  console.log('🎯 [SSE_INTERCEPTOR] Creating interceptor for:', {
    adkSessionId,
    userId,
    timestamp: new Date().toISOString()
  });

  let buffer = '';
  let aiResponseContent = '';
  let supabaseSessionId: string | null = null;
  let isComplete = false;
  let chunkCount = 0;

  // Pre-fetch Supabase session ID synchronously if possible
  const sessionPromise = supabaseSessionServiceServer.findSessionByAdkId(adkSessionId);
  
  sessionPromise.then(result => {
    if (result.success && result.data) {
      supabaseSessionId = result.data.id;
      console.log('🔗 [SSE_INTERCEPTOR] Supabase session resolved:', supabaseSessionId);
    } else {
      console.error('❌ [SSE_INTERCEPTOR] Failed to resolve Supabase session');
    }
  });

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new TransformStream({
    async start(controller) {
      console.log('🚀 [SSE_INTERCEPTOR] Stream started');
      // Ensure session is resolved before processing
      const result = await sessionPromise;
      if (result.success && result.data) {
        supabaseSessionId = result.data.id;
      }
    },

    async transform(chunk, controller) {
      chunkCount++;
      console.log(`📦 [SSE_INTERCEPTOR] Processing chunk #${chunkCount}, size: ${chunk.byteLength}`);
      
      // Pass through the original chunk immediately
      controller.enqueue(chunk);

      // Decode and buffer the chunk
      const text = decoder.decode(chunk, { stream: true });
      buffer += text;
      
      console.log(`📝 [SSE_INTERCEPTOR] Buffer size: ${buffer.length}, preview: ${buffer.slice(0, 100)}...`);

      // Process complete SSE events (events end with double newline)
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete event in buffer

      for (const event of events) {
        if (!event.trim()) continue;

        try {
          // Parse SSE event
          const lines = event.split('\n');
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              eventData = line.slice(6);
              break;
            }
          }

          console.log(`🔍 [SSE_INTERCEPTOR] Event data: ${eventData.slice(0, 100)}...`);

          if (!eventData || eventData === '[DONE]') {
            if (eventData === '[DONE]' && !isComplete && aiResponseContent) {
              console.log('✅ [SSE_INTERCEPTOR] Stream complete, saving AI response');
              isComplete = true;
              await saveAIResponse(supabaseSessionId, userId, aiResponseContent);
            }
            continue;
          }

          // Try to parse as JSON
          try {
            const data = JSON.parse(eventData);
            console.log('📊 [SSE_INTERCEPTOR] Parsed JSON structure:', {
              hasContent: !!data.content,
              hasParts: !!(data.content?.parts),
              author: data.author,
              keys: Object.keys(data)
            });
            
            // Extract text based on ADK's actual format
            // Format: { content: { parts: [{ text: "...", thought?: boolean }] }, author: "..." }
            if (data.content?.parts && Array.isArray(data.content.parts)) {
              for (const part of data.content.parts) {
                // Skip thoughts (they have thought: true)
                if (part.text && !part.thought) {
                  console.log(`💬 [SSE_INTERCEPTOR] Found text content: ${part.text.slice(0, 50)}...`);
                  aiResponseContent += part.text;
                }
              }
            }
            
            // Also check for alternative formats
            if (data.content && typeof data.content === 'string') {
              aiResponseContent += data.content;
            } else if (data.text) {
              aiResponseContent += data.text;
            } else if (data.delta?.content) {
              aiResponseContent += data.delta.content;
            } else if (data.choices?.[0]?.delta?.content) {
              aiResponseContent += data.choices[0].delta.content;
            }
          } catch (parseError) {
            console.log('⚠️ [SSE_INTERCEPTOR] Not JSON, treating as text:', eventData.slice(0, 50));
            // Not JSON, might be plain text
            if (eventData && eventData !== '[DONE]') {
              aiResponseContent += eventData;
            }
          }
        } catch (error) {
          console.error('❌ [SSE_INTERCEPTOR] Error processing event:', error);
        }
      }
    },

    async flush(controller) {
      console.log('🏁 [SSE_INTERCEPTOR] Stream flushing, accumulated content length:', aiResponseContent.length);
      
      // Process any remaining buffer
      if (!isComplete && aiResponseContent.trim()) {
        console.log('💾 [SSE_INTERCEPTOR] Saving final AI response on flush');
        isComplete = true;
        await saveAIResponse(supabaseSessionId, userId, aiResponseContent);
      }
    }
  });
}

async function saveAIResponse(
  sessionId: string | null,
  userId: string,
  content: string
) {
  if (!sessionId || !content.trim()) {
    console.warn('⚠️ [SSE_INTERCEPTOR] Cannot save - missing data:', {
      hasSessionId: !!sessionId,
      contentLength: content.length
    });
    return;
  }

  try {
    console.log('💾 [SSE_INTERCEPTOR] Saving AI response:', {
      sessionId,
      userId,
      contentLength: content.length,
      preview: content.slice(0, 100) + '...'
    });
    
    const sequenceNumber = await messageService.getNextSequenceNumber(sessionId);
    
    const result = await messageService.saveMessage(
      sessionId,
      userId,
      'ai',
      {
        text: content,
        role: 'assistant',
        timestamp: new Date().toISOString()
      },
      sequenceNumber
    );

    if (result.success) {
      console.log('✅ [SSE_INTERCEPTOR] AI response saved successfully:', result.messageId);
    } else {
      console.error('❌ [SSE_INTERCEPTOR] Failed to save:', result.error);
    }
  } catch (error) {
    console.error('❌ [SSE_INTERCEPTOR] Exception saving AI response:', error);
  }
}
```

### Solution 2: Frontend-Based Saving (Fallback)

If the SSE interceptor continues to fail, implement frontend-based saving after streaming completes:

```typescript
// src/hooks/useStreaming.ts - Add to existing hook
import { messageService } from "@/lib/services/message-service";

// Add this after streaming completes in the hook
const saveAIResponseToSupabase = async (
  sessionId: string,
  content: string,
  userId: string
) => {
  try {
    // Find Supabase session
    const sessionResult = await supabaseSessionServiceServer.findSessionByAdkId(sessionId);
    
    if (sessionResult.success && sessionResult.data) {
      const sequenceNumber = await messageService.getNextSequenceNumber(sessionResult.data.id);
      
      await messageService.saveMessage(
        sessionResult.data.id,
        userId,
        'ai',
        {
          text: content,
          role: 'assistant'
        },
        sequenceNumber
      );
    }
  } catch (error) {
    console.error('Failed to save AI response:', error);
  }
};

// Call this when streaming ends (in the SSE event handler)
if (data === '[DONE]' || isComplete) {
  await saveAIResponseToSupabase(sessionId, accumulatedText, userId);
}
```

### Solution 3: Server Action Approach (Most Reliable)

Create a dedicated server action that saves messages after completion:

```typescript
// src/lib/actions/message-actions.ts - Add new function
export async function saveAIResponse(
  adkSessionId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Find Supabase session
    const sessionResult = await supabaseSessionServiceServer.findSessionByAdkId(adkSessionId);
    
    if (!sessionResult.success || !sessionResult.data) {
      return { success: false, error: "Session not found" };
    }
    
    // Get sequence number
    const sequenceNumber = await messageService.getNextSequenceNumber(sessionResult.data.id);
    
    // Save message
    const result = await messageService.saveMessage(
      sessionResult.data.id,
      user.id,
      'ai',
      {
        text: content,
        role: 'assistant',
        timestamp: new Date().toISOString()
      },
      sequenceNumber
    );
    
    return result;
  } catch (error) {
    console.error('Error saving AI response:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
```

Then call from frontend after streaming:

```typescript
// In the streaming completion handler
import { saveAIResponse } from '@/lib/actions/message-actions';

// When streaming completes
if (isComplete) {
  await saveAIResponse(sessionId, accumulatedContent);
}
```

## Implementation Steps

### Step 1: Debug Current Implementation
1. Add comprehensive logging to SSE interceptor
2. Verify the interceptor is being created and invoked
3. Log raw SSE events to understand format

### Step 2: Fix SSE Interceptor
1. Update event parsing to match ADK format
2. Handle async session resolution properly
3. Add error recovery

### Step 3: Implement Fallback
1. Add frontend-based saving as backup
2. Create server action for reliable saving
3. Test with multiple message types

### Step 4: Testing
1. Test with single messages
2. Test with streaming responses
3. Test with thoughts and function calls
4. Verify sequence numbers are correct

## Testing SQL Queries

```sql
-- Check if AI responses are being saved
SELECT 
  s.adk_session_id,
  COUNT(CASE WHEN m.message_type = 'human' THEN 1 END) as human_count,
  COUNT(CASE WHEN m.message_type = 'ai' THEN 1 END) as ai_count
FROM chat_sessions s
LEFT JOIN chat_messages m ON s.id = m.session_id
WHERE s.user_id = auth.uid()
GROUP BY s.id, s.adk_session_id
ORDER BY s.created_at DESC;

-- View latest messages with content preview
SELECT 
  m.message_type,
  m.sequence_number,
  LEFT(m.message_content->>'text', 100) as content_preview,
  m.created_at
FROM chat_messages m
JOIN chat_sessions s ON m.session_id = s.id
WHERE s.user_id = auth.uid()
ORDER BY m.created_at DESC
LIMIT 10;
```

## Expected Outcome

After implementing these fixes:
1. ✅ Every user message will have a corresponding AI response in the database
2. ✅ Messages will maintain proper sequence numbers
3. ✅ Full conversation history will be available for replay
4. ✅ Analytics and audit trails will be complete

## Priority Recommendation

**Immediate Action:** Implement the enhanced SSE interceptor (Solution 1) with comprehensive logging. This maintains the cleanest architecture.

**Backup Plan:** If SSE interception proves unreliable, implement Solution 3 (Server Action) as it's the most robust approach, though it requires frontend changes.

**Long-term:** Consider implementing all three approaches with a configuration flag to choose the active method, providing maximum flexibility and reliability.

## File Changes Required

1. **Update:** `src/lib/handlers/sse-stream-interceptor.ts` - Enhanced logging and parsing
2. **Update:** `src/lib/handlers/run-sse-local-backend-handler.ts` - Add debug logging
3. **Optional:** `src/lib/actions/message-actions.ts` - Add saveAIResponse action
4. **Optional:** `src/hooks/useStreaming.ts` - Add frontend saving logic

## Success Metrics

- AI response capture rate: 100%
- Message sequence integrity: No gaps
- Performance impact: < 50ms additional latency
- Error rate: < 0.1%
