import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the backend URL from environment or use default
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

    // Forward the request to the Python backend's docs endpoint
    const response = await fetch(`${backendUrl}/docs`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Forward any authentication headers if present
        ...(request.headers.get("authorization") && {
          authorization: request.headers.get("authorization")!,
        }),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // For docs endpoint, we might get HTML content
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("text/html")) {
      const html = await response.text();
      return new NextResponse(html, {
        status: response.status,
        headers: {
          "Content-Type": "text/html",
        },
      });
    } else {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Backend health check error:", error);
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
