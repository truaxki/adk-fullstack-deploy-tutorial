import { NextRequest, NextResponse } from "next/server";
import { endpointConfig, getAuthHeaders } from "@/lib/config";

// Configure maximum execution duration (5 minutes = 300 seconds)
export const maxDuration = 300;

// Type definitions for different payload formats
type AgentEnginePayload = {
  class_method: "stream_query";
  input: {
    user_id: string;
    session_id: string;
    message: string;
  };
};

type LocalPayload = {
  message: string;
  userId: string;
  sessionId: string;
};

type BackendPayload = AgentEnginePayload | LocalPayload;

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { message, userId, sessionId } = await request.json();

    console.log(
      `📨 Request received: userId=${userId}, sessionId=${sessionId}, message=${message?.substring(
        0,
        50
      )}...`
    );

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!userId?.trim()) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!sessionId?.trim()) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Forward request to Agent Engine
    console.log(`🔧 Using deployment type: ${endpointConfig.deploymentType}`);
    console.log(`🔧 Backend URL: ${endpointConfig.backendUrl}`);
    console.log(`🔧 Agent Engine URL: ${endpointConfig.agentEngineUrl}`);

    let agentEngineUrl: string;
    let agentEnginePayload: BackendPayload;

    if (endpointConfig.deploymentType === "agent_engine") {
      // Agent Engine deployment - use stream_query format
      agentEngineUrl = `${endpointConfig.agentEngineUrl}:streamQuery?alt=sse`;
      agentEnginePayload = {
        class_method: "stream_query",
        input: {
          user_id: userId,
          session_id: sessionId,
          message: message,
        },
      };
    } else {
      // Local deployment - use simple format
      agentEngineUrl = `${endpointConfig.backendUrl}/stream`;
      agentEnginePayload = {
        message: message,
        userId: userId,
        sessionId: sessionId,
      };
    }

    console.log(`🔗 Forwarding to: ${agentEngineUrl}`);
    console.log(`📤 Payload:`, agentEnginePayload);

    const authHeaders = await getAuthHeaders();
    const response = await fetch(agentEngineUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(agentEnginePayload),
    });

    if (!response.ok) {
      console.error(
        `❌ Backend error: ${response.status} ${response.statusText}`
      );
      const errorText = await response.text();
      console.error(`❌ Error details:`, errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    console.log(
      `✅ Backend response received, content-type: ${response.headers.get(
        "content-type"
      )}`
    );
    console.log(
      `📋 Response status: ${response.status} ${response.statusText}`
    );

    // Create a readable stream that extracts text from Agent Engine JSON fragments in real-time
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader();

        if (!reader) {
          console.log("❌ No response body from Agent Engine");
          controller.close();
          return;
        }

        const pump = async (): Promise<void> => {
          try {
            let chunkCount = 0;
            let jsonBuffer = "";
            // Reset processed parts count for new request
            processedPartsCount = 0;
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                console.log(
                  `🏁 Agent Engine stream complete after ${chunkCount} chunks`
                );

                // Process any remaining JSON buffer for final content
                if (jsonBuffer.trim()) {
                  console.log(
                    `📄 Processing final JSON buffer (${jsonBuffer.length} chars)`
                  );
                  try {
                    const finalJson = JSON.parse(jsonBuffer);
                    const finalEvent = `data: ${JSON.stringify(finalJson)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(finalEvent));
                    console.log(`📤 Sent final complete JSON event`);
                  } catch {
                    console.log(`⚠️ Final buffer not valid JSON, skipping`);
                  }
                }

                controller.close();
                break;
              }

              chunkCount++;
              const chunk = decoder.decode(value, { stream: true });
              jsonBuffer += chunk;

              console.log(
                `📦 Chunk ${chunkCount} received (${chunk.length} bytes)`
              );
              console.log(`📄 Chunk preview:`, chunk.substring(0, 100) + "...");

              // Extract new text from the current buffer and stream it immediately
              const newText = extractNewTextFromBuffer(jsonBuffer);
              if (newText) {
                console.log(
                  `📝 Extracted new text (${newText.length} chars):`,
                  newText.substring(0, 50) + "..."
                );

                // Create incremental SSE event with the new text
                const incrementalEvent = {
                  content: { parts: [{ text: newText }] },
                  author: "goal-planning-agent",
                  incremental: true, // Flag to indicate this is partial content
                };

                const sseEvent = `data: ${JSON.stringify(
                  incrementalEvent
                )}\n\n`;
                controller.enqueue(new TextEncoder().encode(sseEvent));
                console.log(
                  `📤 Streamed incremental text (${newText.length} chars)`
                );

                // Text tracking is now handled by processedPartsCount
              }

              // Try to parse as complete JSON to send structured events
              try {
                const completeJson = JSON.parse(jsonBuffer);
                console.log(`✅ Complete JSON received, sending final event`);

                // Send the complete response
                const finalEvent = `data: ${JSON.stringify(completeJson)}\n\n`;
                controller.enqueue(new TextEncoder().encode(finalEvent));
                console.log(`📤 Sent complete JSON event`);

                // Clear buffer after successful processing
                jsonBuffer = "";
                // Note: processedPartsCount is reset per request, handled globally
              } catch {
                // JSON still incomplete, continue accumulating and streaming text
                console.log(
                  `⏳ JSON incomplete, continuing real-time text extraction (${jsonBuffer.length} chars accumulated)`
                );
              }
            }
          } catch (e) {
            console.error("❌ Error in stream processing:", e);
            const errorEvent = `data: ${JSON.stringify({
              content: {
                parts: [
                  {
                    text: `Error processing response: ${
                      e instanceof Error ? e.message : "Unknown error"
                    }`,
                  },
                ],
              },
              author: "error",
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorEvent));
            controller.close();
          }
        };

        pump();
      },
    });

    // Return SSE stream with proper headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("❌ API Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Track processed parts count to avoid re-processing same parts
let processedPartsCount = 0;

// Extract new text content from JSON buffer - only new parts
function extractNewTextFromBuffer(jsonBuffer: string): string {
  try {
    // Find all parts in the content.parts array
    const partsPattern = /"parts"\s*:\s*\[([\s\S]*?)\]/g;
    const partsMatch = partsPattern.exec(jsonBuffer);

    if (!partsMatch) {
      console.log("❌ No parts array found in buffer");
      return "";
    }

    const partsContent = partsMatch[1];

    // Find all complete part objects (with proper JSON structure)
    const completeParts: string[] = [];
    const partPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    let partMatch;

    while ((partMatch = partPattern.exec(partsContent)) !== null) {
      const partJson = partMatch[0];

      // Verify it's a valid JSON object with text property
      try {
        const parsed = JSON.parse(partJson);
        if (parsed.text) {
          completeParts.push(partJson);
        }
      } catch {
        // Skip invalid JSON parts (incomplete chunks)
        continue;
      }
    }

    console.log(
      `📊 Found ${completeParts.length} complete parts, already processed: ${processedPartsCount}`
    );

    // Only process new parts beyond what we've already handled
    const newParts = completeParts.slice(processedPartsCount);

    if (newParts.length === 0) {
      return "";
    }

    console.log(`🆕 Processing ${newParts.length} new parts`);

    // Extract text from new parts only
    const newTextParts: string[] = [];

    for (const partJson of newParts) {
      try {
        const partObj = JSON.parse(partJson);
        if (partObj.text) {
          // Unescape JSON string content properly
          const unescapedText = partObj.text
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\")
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t");

          newTextParts.push(unescapedText);
          console.log(
            `📝 New part text: "${unescapedText.substring(0, 100)}..."`
          );
        }
      } catch (error) {
        console.error("❌ Error parsing part JSON:", error);
      }
    }

    // Update processed parts count
    processedPartsCount = completeParts.length;

    // Combine new text content
    const newText = newTextParts.join(" ");

    if (newText.length > 0) {
      console.log(
        `✨ Extracted ${newText.length} chars of new text: "${newText.substring(
          0,
          100
        )}..."`
      );
      return newText.trim();
    }

    return "";
  } catch (error) {
    console.error("❌ Error extracting text from buffer:", error);
    return "";
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
