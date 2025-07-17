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

    // Log endpoint configuration
    console.log(`📡 Session API - Using endpoint: ${endpoint}`);
    console.log(`📡 Deployment type: ${endpointConfig.deploymentType}`);

    // Handle Agent Engine vs regular backend deployment
    if (shouldUseAgentEngine()) {
      // For Agent Engine, actually create a session using the proper API
      const createSessionPayload = {
        class_method: "create_session",
        input: {
          user_id: userId,
        },
      };

      const authHeaders = await getAuthHeaders();
      const createSessionResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createSessionPayload),
      });

      if (!createSessionResponse.ok) {
        const errorText = await createSessionResponse.text();
        console.error(
          `Agent Engine Session Creation Error: ${createSessionResponse.status} ${createSessionResponse.statusText}`,
          errorText
        );
        return NextResponse.json(
          {
            error: `Agent Engine Session Creation Error: ${errorText}`,
            deploymentType: endpointConfig.deploymentType,
            timestamp: new Date().toISOString(),
          },
          { status: createSessionResponse.status }
        );
      }

      const sessionData = await createSessionResponse.json();
      const actualSessionId = sessionData.output?.id;

      if (!actualSessionId) {
        console.error("No session ID returned from Agent Engine");
        return NextResponse.json(
          {
            error: "Failed to create session: No session ID returned",
            deploymentType: endpointConfig.deploymentType,
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        sessionId: actualSessionId,
        userId: userId,
        status: "created",
        deploymentType: endpointConfig.deploymentType,
        timestamp: new Date().toISOString(),
        originalRequestedSessionId: sessionId,
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
