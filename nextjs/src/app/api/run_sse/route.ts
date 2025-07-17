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
            let extractedTextLength = 0; // Track how much text we've already sent
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
              const newText = extractNewTextFromBuffer(
                jsonBuffer,
                extractedTextLength
              );
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

                // Update tracking
                extractedTextLength += newText.length;
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
                extractedTextLength = 0;
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

// Extract new text content from JSON buffer using regex patterns
function extractNewTextFromBuffer(
  jsonBuffer: string,
  alreadyExtractedLength: number
): string {
  try {
    // Extract ALL text content from JSON parts (including thoughts for transparency)
    const allTextMatches: string[] = [];

    // Find all parts in the content.parts array
    const partsPattern = /"parts"\s*:\s*\[([\s\S]*?)\]/g;
    const partsMatch = partsPattern.exec(jsonBuffer);

    if (partsMatch) {
      const partsContent = partsMatch[1];

      // Find individual part objects within the parts array
      const partPattern = /\{[^}]*"text"\s*:\s*"([^"]*(?:\\.[^"]*)*)"[^}]*\}/g;
      let partMatch;

      while ((partMatch = partPattern.exec(partsContent)) !== null) {
        const textContent = partMatch[1];

        // Unescape JSON string content properly
        const unescapedText = textContent
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\")
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t");

        allTextMatches.push(unescapedText);
        console.log(
          "📝 Found text content:",
          unescapedText.substring(0, 50) + "..."
        );
      }
    }

    // Combine all text content (thoughts + regular text)
    const fullText = allTextMatches.join(" ");
    console.log(
      `📊 Total extracted text: ${fullText.length} chars, already sent: ${alreadyExtractedLength} chars`
    );

    // Return only the new portion that we haven't sent yet
    if (fullText.length > alreadyExtractedLength) {
      const newText = fullText.substring(alreadyExtractedLength);
      console.log(`✨ New text to stream: "${newText.substring(0, 100)}..."`);
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
