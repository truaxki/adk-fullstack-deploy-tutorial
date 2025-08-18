// src/lib/handlers/sse-stream-interceptor.ts
// Intercepts SSE stream to capture and save AI responses to Supabase

import { messageService } from "@/lib/services/message-service";
import { supabaseSessionServiceServer } from "@/lib/services/supabase-session-service-server";

/**
 * Creates a transform stream that intercepts SSE events to save AI responses
 */
export function createSSEInterceptor(
  adkSessionId: string,
  userId: string
): TransformStream<Uint8Array, Uint8Array> {
  let buffer = '';
  let aiResponseContent = '';
  let supabaseSessionId: string | null = null;
  let isComplete = false;

  // Get Supabase session ID asynchronously
  supabaseSessionServiceServer.findSessionByAdkId(adkSessionId).then(result => {
    if (result.success && result.data) {
      supabaseSessionId = result.data.id;
      console.log('🔗 [SSE_INTERCEPTOR] Found Supabase session:', supabaseSessionId);
    }
  });

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new TransformStream({
    async transform(chunk, controller) {
      // Pass through the original chunk immediately
      controller.enqueue(chunk);

      // Decode and buffer the chunk for processing
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

          if (!eventData || eventData === '[DONE]') {
            if (eventData === '[DONE]' && !isComplete) {
              isComplete = true;
              // Save the complete AI response
              await saveAIResponse(supabaseSessionId, userId, aiResponseContent);
            }
            continue;
          }

          // Try to parse as JSON
          try {
            const data = JSON.parse(eventData);
            
            // Extract text content from different possible formats
            let textContent = '';
            
            // Handle different response formats
            if (data.content) {
              textContent = data.content;
            } else if (data.delta?.content) {
              textContent = data.delta.content;
            } else if (data.choices?.[0]?.delta?.content) {
              textContent = data.choices[0].delta.content;
            } else if (data.choices?.[0]?.text) {
              textContent = data.choices[0].text;
            } else if (data.text) {
              textContent = data.text;
            }

            if (textContent) {
              aiResponseContent += textContent;
            }
          } catch (parseError) {
            // Not JSON, might be plain text
            if (eventData) {
              aiResponseContent += eventData;
            }
          }
        } catch (error) {
          console.error('❌ [SSE_INTERCEPTOR] Error processing event:', error);
        }
      }
    },

    async flush(controller) {
      // Process any remaining buffer
      if (buffer.trim() && !isComplete) {
        isComplete = true;
        await saveAIResponse(supabaseSessionId, userId, aiResponseContent);
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
    console.warn('⚠️ [SSE_INTERCEPTOR] Cannot save AI response - missing session ID or content');
    return;
  }

  try {
    console.log('💾 [SSE_INTERCEPTOR] Saving AI response to Supabase');
    
    // Get the next sequence number
    const sequenceNumber = await messageService.getNextSequenceNumber(sessionId);
    
    // Save the AI response
    const result = await messageService.saveMessage(
      sessionId,
      userId,
      'ai',
      {
        text: content,
        role: 'assistant'
      },
      sequenceNumber
    );

    if (result.success) {
      console.log('✅ [SSE_INTERCEPTOR] AI response saved to Supabase');
    } else {
      console.error('❌ [SSE_INTERCEPTOR] Failed to save AI response:', result.error);
    }
  } catch (error) {
    console.error('❌ [SSE_INTERCEPTOR] Error saving AI response:', error);
  }
}