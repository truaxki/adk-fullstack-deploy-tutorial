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

    // Use the existing configuration system to determine the backend URL
    console.log(`🔧 Using deployment type: ${endpointConfig.deploymentType}`);
    console.log(`🔧 Backend URL: ${endpointConfig.backendUrl}`);
    console.log(`🔧 Agent Engine URL: ${endpointConfig.agentEngineUrl}`);

    let agentEngineUrl: string;
    let agentEnginePayload: BackendPayload;
    let headers: Record<string, string>;

    if (
      endpointConfig.deploymentType === "agent_engine" &&
      endpointConfig.agentEngineUrl
    ) {
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
      headers = await getAuthHeaders();
    } else {
      // Local or other deployment - use simple format
      agentEngineUrl = `${endpointConfig.backendUrl}/run_sse`;
      agentEnginePayload = {
        message,
        userId,
        sessionId,
      };
      headers = {
        "Content-Type": "application/json",
      };
    }

    console.log(`🔗 Forwarding to: ${agentEngineUrl}`);
    console.log(`📤 Payload:`, agentEnginePayload);

    const response = await fetch(agentEngineUrl, {
      method: "POST",
      headers,
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
    console.log(
      `📋 All response headers:`,
      Object.fromEntries(response.headers.entries())
    );

    // Debug: Check if this is actually an error response disguised as 200 OK
    if (response.headers.get("content-type")?.includes("application/json")) {
      console.log(
        "⚠️ Agent Engine returned JSON instead of SSE stream - this might be an error"
      );

      // Let's peek at the response to see if it's an error
      const clonedResponse = response.clone();
      try {
        const jsonResponse = await clonedResponse.json();
        console.log(
          "📄 Agent Engine JSON response:",
          JSON.stringify(jsonResponse, null, 2)
        );

        // If this is an error, return it immediately
        if (jsonResponse.error || jsonResponse.status === "error") {
          console.error("❌ Agent Engine returned error:", jsonResponse);
          return NextResponse.json(
            { error: `Agent Engine error: ${JSON.stringify(jsonResponse)}` },
            { status: 500 }
          );
        }
      } catch (e) {
        console.log("📄 Could not parse as JSON, continuing with stream...", e);
      }
    }

    // Create a readable stream to forward the response
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader();

        if (!reader) {
          console.log("❌ No response body from Agent Engine");
          controller.close();
          return;
        }

        const pump = async () => {
          try {
            let chunkCount = 0;
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                console.log(`🏁 Stream complete after ${chunkCount} chunks`);
                controller.close();
                break;
              }

              chunkCount++;
              const chunk = decoder.decode(value, { stream: true });
              console.log(
                `📦 Chunk ${chunkCount} received (${chunk.length} bytes):`
              );
              console.log(
                `📄 Chunk content:`,
                chunk.substring(0, 500) + (chunk.length > 500 ? "..." : "")
              );

              // Check if this looks like SSE format or raw JSON
              if (chunk.includes("data:")) {
                console.log("✅ Detected SSE format - forwarding directly");
                controller.enqueue(value);
              } else {
                console.log("🔄 Detected raw JSON - converting to SSE format");
                // Convert raw JSON to SSE format
                const sseChunk = `data: ${chunk}\n\n`;
                controller.enqueue(new TextEncoder().encode(sseChunk));
              }
            }
          } catch (error) {
            console.error(`❌ Stream error:`, error);
            controller.error(error);
          }
        };

        pump();
      },
    });

    // Return the stream with proper headers
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
    console.error(`❌ API Route error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
