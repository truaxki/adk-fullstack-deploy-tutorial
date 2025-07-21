import { NextRequest } from "next/server";
import { GoalInput } from "@/types";
import { getEndpointForPath, getAuthHeaders } from "@/lib/config";

/**
 * Common types shared by all deployment strategies
 */
export interface ProcessedRequest {
  goal: GoalInput;
  sessionId: string;
  userId: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface SessionCreationResult {
  sessionId: string;
  created: boolean;
}

/**
 * SSE response headers used by all deployment strategies
 */
export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

/**
 * CORS headers for OPTIONS requests
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

/**
 * Parse and validate the incoming request body
 */
export async function parseRequest(request: NextRequest): Promise<{
  data: ProcessedRequest | null;
  validation: ValidationResult;
}> {
  try {
    const requestBody = (await request.json()) as {
      goal: GoalInput;
      sessionId?: string;
      userId?: string;
    };

    // Validate required fields
    const validation = validateGoalRequest(requestBody);
    if (!validation.isValid) {
      return { data: null, validation };
    }

    // Prepare session and user IDs with defaults
    const sessionId = requestBody.sessionId || `session-${Date.now()}`;
    const userId = requestBody.userId || "user";

    return {
      data: {
        goal: requestBody.goal,
        sessionId,
        userId,
      },
      validation: { isValid: true },
    };
  } catch (error) {
    console.error("Request parsing error:", error);
    return {
      data: null,
      validation: {
        isValid: false,
        error: "Invalid request format",
      },
    };
  }
}

/**
 * Validate the goal request structure
 */
export function validateGoalRequest(requestBody: {
  goal: GoalInput;
  sessionId?: string;
  userId?: string;
}): ValidationResult {
  if (!requestBody.goal?.title || !requestBody.goal?.description) {
    return {
      isValid: false,
      error: "Goal title and description are required",
    };
  }

  if (
    typeof requestBody.goal.title !== "string" ||
    typeof requestBody.goal.description !== "string"
  ) {
    return {
      isValid: false,
      error: "Goal title and description must be strings",
    };
  }

  if (
    requestBody.goal.title.trim().length === 0 ||
    requestBody.goal.description.trim().length === 0
  ) {
    return {
      isValid: false,
      error: "Goal title and description cannot be empty",
    };
  }

  return { isValid: true };
}

/**
 * Format goal data into a message string
 */
export function formatGoalMessage(goal: GoalInput): string {
  return `Goal: ${goal.title}\n\nDescription: ${goal.description}`;
}

/**
 * Create session using the appropriate endpoint for deployment strategy
 */
export async function createSessionForAgentEngine(
  userId: string,
  sessionId: string
): Promise<SessionCreationResult> {
  const sessionEndpoint = getEndpointForPath("", "query");

  const createSessionPayload = {
    class_method: "create_session",
    input: {
      user_id: userId,
    },
  };

  try {
    const authHeaders = await getAuthHeaders();
    const createSessionResponse = await fetch(sessionEndpoint, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createSessionPayload),
    });

    if (createSessionResponse.ok) {
      const sessionData = await createSessionResponse.json();
      const actualSessionId = sessionData.output?.id;
      if (actualSessionId) {
        return {
          sessionId: actualSessionId,
          created: true,
        };
      }
    }

    console.warn(
      "Agent Engine session creation failed, using provided sessionId"
    );
    return {
      sessionId,
      created: false,
    };
  } catch (sessionError) {
    console.warn("Agent Engine session creation warning:", sessionError);
    return {
      sessionId,
      created: false,
    };
  }
}

/**
 * Create session for local backend deployment
 */
export async function createSessionForLocalBackend(
  userId: string,
  sessionId: string
): Promise<SessionCreationResult> {
  const sessionEndpoint = getEndpointForPath(
    `/apps/app/users/${userId}/sessions/${sessionId}`
  );

  try {
    const sessionAuthHeaders = await getAuthHeaders();
    const sessionResponse = await fetch(sessionEndpoint, {
      method: "POST",
      headers: {
        ...sessionAuthHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const success = sessionResponse.ok || sessionResponse.status === 409;

    if (!success) {
      console.error(
        "Local backend session creation failed:",
        sessionResponse.status,
        await sessionResponse.text()
      );
    } else {
      console.log("Local backend session created/verified successfully");
    }

    return {
      sessionId,
      created: success,
    };
  } catch (sessionError) {
    console.error("Local backend session creation error:", sessionError);
    return {
      sessionId,
      created: false,
    };
  }
}

/**
 * Centralized logging for goal planning operations
 */
export function logGoalPlanningRequest(
  sessionId: string,
  userId: string,
  goal: GoalInput,
  deploymentType: "agent_engine" | "local_backend"
): void {
  console.log(
    `📡 Goal Planning API [${deploymentType}] - Session: ${sessionId}, User: ${userId}`
  );
  console.log(`📡 Goal:`, goal);
}

/**
 * Log streaming operation start
 */
export function logStreamStart(
  sessionId: string,
  deploymentType: "agent_engine" | "local_backend"
): void {
  console.log(
    `🚀 Starting ${deploymentType} goal planning stream for session: ${sessionId}`
  );
}

/**
 * Log streaming response details
 */
export function logStreamResponse(
  status: number,
  statusText: string,
  headers: Headers,
  deploymentType: "agent_engine" | "local_backend"
): void {
  console.log(
    `📡 ${deploymentType} goal planning stream response status: ${status} ${statusText}`
  );
  console.log(`📡 Response headers:`, Object.fromEntries(headers.entries()));
}
