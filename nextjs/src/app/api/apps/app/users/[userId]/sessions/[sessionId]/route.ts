import { NextRequest, NextResponse } from "next/server";
import {
  endpointConfig,
  getEndpointForPath,
  shouldUseAgentEngine,
  getAuthHeaders,
} from "@/lib/config";

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

    // Get the appropriate endpoint based on deployment type
    const endpoint = getEndpointForPath(
      `/apps/app/users/${userId}/sessions/${sessionId}`
    );

    // Log endpoint configuration in development
    if (process.env.NODE_ENV === "development") {
      console.log(`📡 Session API - Using endpoint: ${endpoint}`);
      console.log(`📡 Deployment type: ${endpointConfig.deploymentType}`);
    }

    // Handle Agent Engine vs regular backend deployment
    if (shouldUseAgentEngine()) {
      // For Agent Engine, session management is handled differently
      // Return a simple session creation response
      return NextResponse.json({
        sessionId: sessionId,
        userId: userId,
        status: "created",
        deploymentType: endpointConfig.deploymentType,
        timestamp: new Date().toISOString(),
      });
    } else {
      // For regular backend deployment (local or Cloud Run)
      const authHeaders = await getAuthHeaders();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...authHeaders,
          // Forward any authentication headers if present
          ...(request.headers.get("authorization") && {
            authorization: request.headers.get("authorization")!,
          }),
        },
        body: JSON.stringify({}), // Empty body as per original implementation
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Backend error: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }

      const data = await response.json();

      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Session creation error:", error);

    // Return deployment-specific error information
    const errorResponse = {
      error: "Failed to create session",
      deploymentType: endpointConfig.deploymentType,
      environment: endpointConfig.environment,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
