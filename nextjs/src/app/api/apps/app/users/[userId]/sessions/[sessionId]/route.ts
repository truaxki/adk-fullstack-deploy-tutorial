import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    userId: string;
    sessionId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { userId, sessionId } = await params;

    // Get the backend URL from environment or use default
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

    // Forward the request to the Python backend
    const response = await fetch(
      `${backendUrl}/apps/app/users/${userId}/sessions/${sessionId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward any authentication headers if present
          ...(request.headers.get("authorization") && {
            authorization: request.headers.get("authorization")!,
          }),
        },
        body: JSON.stringify({}), // Empty body as per original implementation
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
