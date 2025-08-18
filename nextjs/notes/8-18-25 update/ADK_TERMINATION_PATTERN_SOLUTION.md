# ADK Response Logging - Termination Pattern Solution

**Date:** January 18, 2025  
**Key Discovery:** ADK uses a termination signal pattern where the final complete message equals the accumulated chunks

## The ADK Streaming Pattern

ADK follows this specific pattern:
1. **Incremental chunks** are sent as the response is generated
2. **Final complete message** is sent that exactly matches the accumulated text
3. When `newChunk === accumulatedText`, this signals the end of streaming

## Updated SSE Interceptor Solution

The interceptor needs to implement the same accumulation and termination detection:

```typescript
// src/lib/handlers/sse-stream-interceptor.ts
import { messageService } from "@/lib/services/message-service";
import { supabaseSessionServiceServer } from "@/lib/services/supabase-session-service-server";

/**
 * Creates a transform stream that intercepts SSE events using ADK's termination pattern
 */
export function createSSEInterceptor(
  adkSessionId: string,
  userId: string
): TransformStream<Uint8Array, Uint8Array> {
  console.log('🎯 [SSE_INTERCEPTOR] Creating interceptor with ADK termination pattern for:', {
    adkSessionId,
    userId,
    timestamp: new Date().toISOString()
  });

  let buffer = '';
  let accumulatedContent = ''; // Accumulated text from chunks
  let supabaseSessionId: string | null = null;
  let hasReceivedTerminationSignal = false;
  let chunkCount = 0;

  // Pre-fetch Supabase session ID
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

  return new TransformStream({
    async start(controller) {
      console.log('🚀 [SSE_INTERCEPTOR] Stream started, waiting for session resolution...');
      // Ensure session is resolved before processing
      const result = await sessionPromise;
      if (result.success && result.data) {
        supabaseSessionId = result.data.id;
        console.log('✅ [SSE_INTERCEPTOR] Session ready:', supabaseSessionId);
      }
    },

    async transform(chunk, controller) {
      chunkCount++;
      
      // Pass through the original chunk immediately (don't block streaming)
      controller.enqueue(chunk);

      // Decode and buffer the chunk
      const text = decoder.decode(chunk, { stream: true });
      buffer += text;

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

          if (!eventData) continue;

          // Check for [DONE] signal
          if (eventData === '[DONE]') {
            console.log('🏁 [SSE_INTERCEPTOR] Received [DONE] signal');
            if (!hasReceivedTerminationSignal && accumulatedContent) {
              // Save the accumulated content
              await saveAIResponse(supabaseSessionId, userId, accumulatedContent);
            }
            continue;
          }

          // Try to parse as JSON
          try {
            const data = JSON.parse(eventData);
            
            // Extract text based on ADK's format
            // Format: { content: { parts: [{ text: "...", thought?: boolean }] }, author: "..." }
            if (data.content?.parts && Array.isArray(data.content.parts)) {
              for (const part of data.content.parts) {
                // Skip thoughts (they have thought: true)
                if (part.text && !part.thought) {
                  const textChunk = part.text;
                  
                  // 🎯 IMPLEMENT ADK TERMINATION SIGNAL PATTERN
                  if (textChunk === accumulatedContent && accumulatedContent.length > 0) {
                    // This is the termination signal!
                    console.log('🛑 [SSE_INTERCEPTOR] ADK Termination Signal Detected!', {
                      contentLength: accumulatedContent.length,
                      preview: accumulatedContent.slice(0, 100) + '...'
                    });
                    
                    hasReceivedTerminationSignal = true;
                    
                    // Save the complete AI response
                    await saveAIResponse(supabaseSessionId, userId, accumulatedContent);
                    
                    // Don't accumulate this chunk (it's the complete message)
                    continue;
                  }
                  
                  // This is a streaming chunk - accumulate it
                  if (!hasReceivedTerminationSignal) {
                    console.log(`📝 [SSE_INTERCEPTOR] Chunk #${chunkCount}: "${textChunk.slice(0, 50)}..."`);
                    accumulatedContent += textChunk; // Direct concatenation (no spaces)
                  }
                }
              }
            }
          } catch (parseError) {
            console.log('⚠️ [SSE_INTERCEPTOR] Failed to parse JSON:', parseError);
          }
        } catch (error) {
          console.error('❌ [SSE_INTERCEPTOR] Error processing event:', error);
        }
      }
    },

    async flush(controller) {
      console.log('🏁 [SSE_INTERCEPTOR] Stream flushing');
      
      // If we haven't received termination signal but have content, save it
      if (!hasReceivedTerminationSignal && accumulatedContent.trim()) {
        console.log('💾 [SSE_INTERCEPTOR] No termination signal received, saving accumulated content');
        await saveAIResponse(supabaseSessionId, userId, accumulatedContent);
      }
    }
  });
}

/**
 * Save AI response to Supabase
 */
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
    console.log('💾 [SSE_INTERCEPTOR] Saving AI response to Supabase:', {
      sessionId,
      userId,
      contentLength: content.length,
      preview: content.slice(0, 200) + '...'
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
      console.log('✅ [SSE_INTERCEPTOR] AI response saved successfully:', {
        messageId: result.messageId,
        sequenceNumber,
        contentLength: content.length
      });
    } else {
      console.error('❌ [SSE_INTERCEPTOR] Failed to save:', result.error);
    }
  } catch (error) {
    console.error('❌ [SSE_INTERCEPTOR] Exception saving AI response:', error);
  }
}
```

## Key Changes for ADK Pattern

1. **Accumulation Logic**: 
   - Accumulate text chunks by direct concatenation (no spaces)
   - Track accumulated content separately from individual chunks

2. **Termination Detection**:
   - Compare each new text chunk with accumulated content
   - When `chunk === accumulated`, it's the termination signal
   - Save to Supabase when termination is detected

3. **Fallback Handling**:
   - If no termination signal but stream ends, save accumulated content
   - Handle [DONE] signal as additional safeguard

## Alternative: Hook into Frontend's Existing Logic

Since your frontend already handles this pattern correctly, you could also save from there:

```typescript
// In src/lib/streaming/stream-processor.ts, modify processTextContent:

async function processTextContent(
  textParts: string[],
  agent: string,
  aiMessageId: string,
  accumulatedTextRef: { current: string },
  onMessageUpdate: (message: Message) => void
): Promise<void> {
  for (const text of textParts) {
    const currentAccumulated = accumulatedTextRef.current;

    // ADK TERMINATION SIGNAL PATTERN
    if (text === currentAccumulated && currentAccumulated.length > 0) {
      createDebugLog(
        "STREAM PROCESSOR",
        "Received termination signal, ensuring final message state",
        {
          finalContentLength: currentAccumulated.length,
        }
      );

      const finalMessage: Message = {
        type: "ai",
        content: currentAccumulated.trim(),
        id: aiMessageId,
        timestamp: new Date(),
      };

      flushSync(() => {
        onMessageUpdate(finalMessage);
      });

      // 🎯 ADD THIS: Save to Supabase when termination detected
      saveAIResponseToSupabase(aiMessageId, currentAccumulated);
      
      return;
    }

    // Accumulate streaming chunk
    accumulatedTextRef.current += text;

    const updatedMessage: Message = {
      type: "ai",
      content: accumulatedTextRef.current.trim(),
      id: aiMessageId,
      timestamp: new Date(),
    };

    flushSync(() => {
      onMessageUpdate(updatedMessage);
    });
  }
}

// Add this helper function
async function saveAIResponseToSupabase(messageId: string, content: string) {
  // Import server action
  const { saveAIResponse } = await import('@/lib/actions/message-actions');
  
  // Get session ID from somewhere (might need to pass it down)
  const sessionId = getCurrentSessionId(); // You'll need to implement this
  
  await saveAIResponse(sessionId, content);
}
```

## Testing the Fix

1. **Add console logs** to verify the termination pattern is detected
2. **Check the database** after each message to confirm saving
3. **Test with various message lengths** to ensure accumulation works

## SQL to Verify

```sql
-- Check message balance after implementing fix
SELECT 
  s.adk_session_id,
  s.created_at,
  COUNT(CASE WHEN m.message_type = 'human' THEN 1 END) as human_msgs,
  COUNT(CASE WHEN m.message_type = 'ai' THEN 1 END) as ai_msgs,
  MAX(m.created_at) as last_message
FROM chat_sessions s
LEFT JOIN chat_messages m ON s.id = m.session_id
WHERE s.user_id = auth.uid()
GROUP BY s.id, s.adk_session_id, s.created_at
ORDER BY s.created_at DESC;
```

## Expected Result

With this implementation:
- The interceptor will accumulate chunks exactly like the frontend
- When the termination signal is detected, it saves the complete response
- Messages will be properly paired (human + AI) in the database
- The solution respects ADK's streaming pattern without breaking it
