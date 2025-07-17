import { NextRequest, NextResponse } from "next/server";
import { endpointConfig, getAuthHeaders } from "@/lib/config";

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

    // Create a readable stream to forward the response
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader();

        if (!reader) {
          controller.close();
          return;
        }

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                console.log(`🏁 Stream complete`);
                controller.close();
                break;
              }

              // Forward the raw chunk directly to frontend
              controller.enqueue(value);
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
