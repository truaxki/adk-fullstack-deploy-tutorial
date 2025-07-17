import { NextRequest, NextResponse } from "next/server";

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
    const agentEngineUrl = `${process.env.AGENT_ENGINE_URL}/chat`;
    console.log(`🔗 Forwarding to Agent Engine: ${agentEngineUrl}`);

    const agentEnginePayload = {
      message,
      user_id: userId,
      session_id: sessionId,
    };

    console.log(`📤 Agent Engine payload:`, agentEnginePayload);

    const response = await fetch(agentEngineUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agentEnginePayload),
    });

    if (!response.ok) {
      console.error(
        `❌ Agent Engine error: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        {
          error: `Agent Engine error: ${response.status} ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    console.log(
      `✅ Agent Engine response received, content-type: ${response.headers.get(
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
                console.log(`🏁 Agent Engine stream complete`);
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
