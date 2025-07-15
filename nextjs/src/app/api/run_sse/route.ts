import { NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Parse the request body
    const requestBody = await request.json();

    // Get the backend URL from environment or use default
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

    // Forward the request to the Python backend
    const response = await fetch(`${backendUrl}/run_sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward any authentication headers if present
        ...(request.headers.get("authorization") && {
          authorization: request.headers.get("authorization")!,
        }),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Backend error: ${response.status} ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create a new ReadableStream to proxy the SSE response
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        function pump(): Promise<void> {
          return reader!
            .read()
            .then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }

              // Decode the chunk and forward it
              const chunk = decoder.decode(value, { stream: true });
              const encodedChunk = new TextEncoder().encode(chunk);
              controller.enqueue(encodedChunk);

              // Continue reading
              return pump();
            })
            .catch((error) => {
              console.error("SSE stream error:", error);
              controller.error(error);
            });
        }

        return pump();
      },
    });

    // Return the streaming response with appropriate headers for SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("SSE endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process SSE request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
