// src/lib/handlers/sse-stream-interceptor.ts
// Intercepts SSE stream to capture and save AI responses to Supabase
// Implements ADK's termination signal pattern: chunks followed by complete message

import { messageService } from "@/lib/services/message-service";
import { supabaseSessionServiceServer } from "@/lib/services/supabase-session-service-server";

/**
 * Creates a transform stream that intercepts SSE events using ADK's termination pattern
 * ADK Pattern: Sends incremental chunks, then sends complete message as termination signal
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
  let accumulatedContent = ''; // Accumulated text from chunks (ADK pattern)
  let supabaseSessionId: string | null = null;
  let hasReceivedTerminationSignal = false;
  let chunkCount = 0;
  let eventCount = 0;

  // Pre-fetch Supabase session ID
  const sessionPromise = supabaseSessionServiceServer.findSessionByAdkId(adkSessionId);
  
  sessionPromise.then(result => {
    if (result.success && result.data) {
      supabaseSessionId = result.data.id;
      console.log('🔗 [SSE_INTERCEPTOR] Supabase session resolved:', {
        supabaseSessionId,
        adkSessionId,
        userId: result.data.user_id
      });
    } else {
      console.error('❌ [SSE_INTERCEPTOR] Failed to resolve Supabase session:', {
        adkSessionId,
        error: result.error
      });
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
      
      console.log(`📦 [SSE_INTERCEPTOR] Chunk #${chunkCount}:`, {
        chunkSize: chunk.byteLength,
        bufferSize: buffer.length,
        preview: text.slice(0, 100)
      });

      // Process complete SSE events (events end with double newline)
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete event in buffer

      for (const event of events) {
        if (!event.trim()) continue;

        eventCount++;
        console.log(`📨 [SSE_INTERCEPTOR] Processing event #${eventCount}`);

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
            console.log('🏁 [SSE_INTERCEPTOR] Received [DONE] signal', {
              hasTerminationSignal: hasReceivedTerminationSignal,
              contentLength: accumulatedContent.length
            });
            
            if (!hasReceivedTerminationSignal && accumulatedContent) {
              // Save the accumulated content
              await saveAIResponse(supabaseSessionId, userId, accumulatedContent);
              hasReceivedTerminationSignal = true;
            }
            continue;
          }

          // Try to parse as JSON
          try {
            const data = JSON.parse(eventData);
            
            console.log('📊 [SSE_INTERCEPTOR] Parsed JSON structure:', {
              hasContent: !!data.content,
              hasParts: !!(data.content?.parts),
              partsLength: data.content?.parts?.length,
              author: data.author,
              keys: Object.keys(data)
            });
            
            // Extract text based on ADK's format
            // Format: { content: { parts: [{ text: "...", thought?: boolean }] }, author: "..." }
            if (data.content?.parts && Array.isArray(data.content.parts)) {
              for (const part of data.content.parts) {
                // Skip thoughts (they have thought: true)
                if (part.text && !part.thought) {
                  const textChunk = part.text;
                  
                  console.log(`📝 [SSE_INTERCEPTOR] Text chunk found:`, {
                    chunkLength: textChunk.length,
                    accumulatedLength: accumulatedContent.length,
                    isTermination: textChunk === accumulatedContent && accumulatedContent.length > 0,
                    preview: textChunk.slice(0, 50)
                  });
                  
                  // 🎯 IMPLEMENT ADK TERMINATION SIGNAL PATTERN
                  // When chunk equals accumulated content, it's the complete message
                  if (textChunk === accumulatedContent && accumulatedContent.length > 0) {
                    // This is the termination signal!
                    console.log('🛑 [SSE_INTERCEPTOR] ADK Termination Signal Detected!', {
                      contentLength: accumulatedContent.length,
                      preview: accumulatedContent.slice(0, 200)
                    });
                    
                    hasReceivedTerminationSignal = true;
                    
                    // Save the complete AI response
                    await saveAIResponse(supabaseSessionId, userId, accumulatedContent);
                    
                    // Don't accumulate this chunk (it's the complete message)
                    continue;
                  }
                  
                  // This is a streaming chunk - accumulate it
                  if (!hasReceivedTerminationSignal) {
                    console.log(`➕ [SSE_INTERCEPTOR] Accumulating chunk #${chunkCount}`);
                    accumulatedContent += textChunk; // Direct concatenation (no spaces)
                    console.log(`📏 [SSE_INTERCEPTOR] Total accumulated: ${accumulatedContent.length} chars`);
                  }
                }
              }
            }
            
            // Also check for alternative formats (fallback)
            if (!hasReceivedTerminationSignal) {
              let altContent = '';
              
              if (data.content && typeof data.content === 'string') {
                altContent = data.content;
              } else if (data.text) {
                altContent = data.text;
              } else if (data.delta?.content) {
                altContent = data.delta.content;
              } else if (data.choices?.[0]?.delta?.content) {
                altContent = data.choices[0].delta.content;
              }
              
              if (altContent) {
                console.log('📝 [SSE_INTERCEPTOR] Alternative format content found:', altContent.slice(0, 50));
                accumulatedContent += altContent;
              }
            }
          } catch (parseError) {
            console.log('⚠️ [SSE_INTERCEPTOR] Failed to parse JSON:', {
              error: parseError.message,
              data: eventData.slice(0, 100)
            });
          }
        } catch (error) {
          console.error('❌ [SSE_INTERCEPTOR] Error processing event:', error);
        }
      }
    },

    async flush(controller) {
      console.log('🏁 [SSE_INTERCEPTOR] Stream flushing', {
        hasTerminationSignal: hasReceivedTerminationSignal,
        accumulatedLength: accumulatedContent.length,
        eventCount,
        chunkCount
      });
      
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
      hasContent: !!content,
      contentLength: content?.length || 0
    });
    return;
  }

  try {
    console.log('💾 [SSE_INTERCEPTOR] Saving AI response to Supabase:', {
      sessionId,
      userId,
      contentLength: content.length,
      preview: content.slice(0, 200)
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
      console.error('❌ [SSE_INTERCEPTOR] Failed to save:', {
        error: result.error,
        sessionId,
        userId
      });
    }
  } catch (error) {
    console.error('❌ [SSE_INTERCEPTOR] Exception saving AI response:', error);
  }
}