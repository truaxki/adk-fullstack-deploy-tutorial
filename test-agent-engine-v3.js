const { GoogleAuth } = require("google-auth-library");

// Configuration using environment variables (safer than hardcoding)
const config = {
  project: "adk-deploy-465915",
  location: "us-central1",
  reasoningEngineId: "1348995214164885504",
  serviceAccountKeyBase64:
    "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiYWRrLWRlcGxveS00NjU5MTUiLAogICJwcml2YXRlX2tleV9pZCI6ICJiYmI2NWUxMjI3OWU5YjFkMTlmYzJhMGUxMGJiZTkzNDc1OWFhMTM3IiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdmdJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLZ3dnZ1NrQWdFQUFvSUJBUURDUHJQYVdlQlFZaTFZXG43a0xCZHlscjJKZGU5eVV0UzlzSW5nMDViL0RRMkcraFRFVHRUTlRrQlA0T0hkZGlNNTZ4Y2dxa2NlZmlFMnhGXG5RUmVidHR3VVplK3J5VGxyelNmQ0ZKdlFOSlpSankrRVc0eWZJK3Fia2piLzRDcDNHSC9KaVRld0dPNG5CWVZYXG5mMHo2UllVeno4SnA1Z2RHdWtQWERibG8vQVNXelAzR2JuamtNTmRsMVhEdU1EUFFIMndWY3I2bERtY1hrSXFLXG5tZFp3V3BpWXl5VGsrSG9sbHVHdWthSnFzVFd5VmpUaE5GSEZ1eGlxTmtsY3dORVlKMm5UTzhKL25qOUF2Y1ByXG40L3hyVXJwUGpCL1h3czJob3Q4TEtqbDBjVzRsNkJyMU9SV3dWTUdwQ3V5WGc3TlFjNXpnc2ltSjlDMnRDUVJ0XG5pM29qR1U4L0FnTUJBQUVDZ2dFQUMrVGxCSERPY0gyaWd6aUxzK2NGRFVxRThsYTEyeEV6QjFNT1FqOGRndHhOXG44WldHL3ZUZWNGdng1cEZqTitzclEzaFZPSDZWRVYzWkdtQ0MvcER5NXZqYTlTenNMREt5eFlxWGcrZEVjUmdRXG5jODFiVGY5WUJWQ3R0M3RWZmxkc3M3MklRR3MyWWdOUGgrME9uS0NYS0hZSFZJNjJVVmxrZ0EyaUZkQ2d3MDhNXG5pUHRMWEdwd0FtaDk1cThaOUp2QXprUHNaekdhTkZ5N1ZZZlAzdEF4bmIrR2wrUmVhb2wxWWU3Z3B0V0FicytDXG55bzZ4cnhPNkpObkt4UmxzYWhBZW9iR1AzamlGUzJ2MUhuODR1eE10elB2bXZHNFMwcjdLdGFCK29WZXVpUzRKXG50OCtYSnFjdDZlOTJYOXJSYnVzeUVWRVpvUGRkdGxzL1FWVDk0NEVsR1FLQmdRRCsrQjU1WDVuNWdBUDJzWHJzXG5BRlJPOWtOVDlHUUVGaGdHcy9ibVh1TWNaeFcvVTBwRDA5dVBiUnFTSTczN1Zwb2IvZHBrdXEyTjN3ckxaZ2xDXG5kc1N0bk9kRVErR1M5WkxWdFIrd3dGZWNVMXdRUU5QWkF2OTF4Z1gxLzlhc2xEMEZRSGlQb1daUnhPb0FlcmZLXG5BSDZPTXNuN0xxUURsNXpLZGhYSmhYK0RMUUtCZ1FEREI3eWRmTEVmUzRrZDZ2MVRVQmxjWnlrZlYrMzdSL2M2XG5BM2t4R014K1RaT3hRNm9jRzBMQ0g0TERuZVBGNnJLZUZUVElnU3V6dGkrcHF5eVZmUzVoZ3M0Y0lsS2Q0VkhQXG5QdGpDTFA4RU05VitQNjFjUzFtQ29nTEJoU3V6YW5hR3NVbWQxbVBYM2FsYTVtN1J5aVRXdzZaSlpvcDl6Q0NvXG5LZGNXVlZKUG13S0JnUUMyNlBxN3FjakZBNEJVYm5nM2Eva1BlSDFPY2lsNkFQdVZlMjlwVHJMd3drY0lyVkMrXG5uZktKendSYnlJWlhFNGFWQkNTelZIU0RMWG9KOXBZMzl3b2JYazlPV3NBdGREeTFVUzE5MkU1Qm1FK1lYVmxjXG4rbGlYZmNyeThtbG4veVJUYXkvU0lrQkw4czdJTDBGQUNlREFWRkV3QUFLcmpRMXU5UTJtTno0RnRRS0JnUUNpXG5hNmdOOUJGQ1FkTGdZcG8wTHduZjVWM2U1NGllODFFV05GeFNvaGR6dkVHYXFBSmNRK3UxNVM0dW9TaFc1RjE2XG52NmhrcndacE5QbStzSHFCeUcyKzhZT2E5STZmUTAyeGJlSncyNjVKbnExVzVjc0hpUXp6ZU44WXNVSXl1aUFaXG5qajREdjg4SXNHWmcrSFVrSzlmQUw5SWxZTXRIZHA5ZnpQQitmZkg5cndLQmdDQmFiVWx5MnVrYm0wRlpmcXBqXG56U1h6OENFREp2dFFwazdUNEtCNytzZjlxZGNBMWxCaUxvSDZralZBb2dybjIrZ0wwTGU1SU9mNUsxVlNkV3I4XG5LdjZZd0JNR1VBQ3p1RUpwZ05tSjBxVVBBY3JjRDB6TGhiUWwwZUhaMzJHdXV4OEd6U2xKeStkbkQvaVFWaWVtXG4vNDhiZG10Z3ZaY1FRWnVldUJoSDk1eVhcbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsCiAgImNsaWVudF9lbWFpbCI6ICJhZ2VudC1lbmdpbmUtZnJvbnRlbmRAYWRrLWRlcGxveS00NjU5MTUuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJjbGllbnRfaWQiOiAiMTEyMzE5OTc3NTM3MTY4MjUyMjY0IiwKICAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLAogICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLAogICJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwKICAiY2xpZW50X3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS9hZ2VudC1lbmdpbmUtZnJvbnRlbmQlNDBhZGstZGVwbG95LTQ2NTkxNS5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgInVuaXZlcnNlX2RvbWFpbiI6ICJnb29nbGVhcGlzLmNvbSIKfQo=",
};

const baseUrl = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.project}/locations/${config.location}/reasoningEngines/${config.reasoningEngineId}`;

async function getAuthHeaders() {
  try {
    console.log("🔐 Setting up authentication...");
    const serviceAccountKeyJson = Buffer.from(
      config.serviceAccountKeyBase64,
      "base64"
    ).toString("utf-8");
    console.log("📝 Service account key decoded successfully");

    const credentials = JSON.parse(serviceAccountKeyJson);
    console.log("📋 Service account email:", credentials.client_email);

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();

    console.log("✅ Authentication successful");
    return {
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    };
  } catch (error) {
    console.error("❌ Authentication failed:", error.message);
    throw error;
  }
}

async function testSessionBased() {
  console.log("🚀 Testing Agent Engine Session-Based API");
  console.log(`🔧 Base URL: ${baseUrl}`);

  try {
    const headers = await getAuthHeaders();

    // Step 1: Create a session
    console.log("\n📡 Step 1: Creating session...");
    const createSessionPayload = {
      class_method: "create_session",
      input: {
        user_id: "test-user-123",
      },
    };

    console.log(`URL: ${baseUrl}:query`);
    console.log(
      "Create Session Payload:",
      JSON.stringify(createSessionPayload, null, 2)
    );

    const createResponse = await fetch(`${baseUrl}:query`, {
      method: "POST",
      headers,
      body: JSON.stringify(createSessionPayload),
    });

    const createStatusText = createResponse.ok ? "✅ SUCCESS" : "❌ FAILED";
    console.log(
      `\n${createStatusText} Create Session Status: ${createResponse.status} ${createResponse.statusText}`
    );

    const createResponseText = await createResponse.text();
    console.log("📋 Create Session Response:", createResponseText);

    if (!createResponse.ok) {
      return {
        success: false,
        error: `Failed to create session: ${createResponseText}`,
      };
    }

    // Parse the session response
    let sessionData;
    try {
      sessionData = JSON.parse(createResponseText);
      console.log(
        "📊 Parsed session data:",
        JSON.stringify(sessionData, null, 2)
      );
    } catch (parseError) {
      console.log("📝 Session response is not JSON");
      return { success: false, error: "Session response is not JSON" };
    }

    // Step 2: List sessions to see what we have
    console.log("\n📡 Step 2: Listing sessions...");
    const listSessionsPayload = {
      class_method: "list_sessions",
      input: {},
    };

    console.log(
      "List Sessions Payload:",
      JSON.stringify(listSessionsPayload, null, 2)
    );

    const listResponse = await fetch(`${baseUrl}:query`, {
      method: "POST",
      headers,
      body: JSON.stringify(listSessionsPayload),
    });

    const listStatusText = listResponse.ok ? "✅ SUCCESS" : "❌ FAILED";
    console.log(
      `\n${listStatusText} List Sessions Status: ${listResponse.status} ${listResponse.statusText}`
    );

    const listResponseText = await listResponse.text();
    console.log("📋 List Sessions Response:", listResponseText);

    return {
      success: true,
      data: {
        createResponse: createResponseText,
        listResponse: listResponseText,
      },
    };
  } catch (error) {
    console.error("❌ Session test failed:", error.message);
    return { success: false, error: error.message };
  }
}

async function testQuery() {
  console.log("🚀 Testing Agent Engine Query (Original)");
  console.log(`🔧 Base URL: ${baseUrl}`);

  try {
    const headers = await getAuthHeaders();

    // Test the official API format from Google Cloud documentation
    const payload = {
      class_method: "query",
      input: {
        input:
          "Goal: Test Goal\n\nDescription: This is a test query to see if the Agent Engine is working.",
      },
    };

    console.log("\n📡 Making request...");
    console.log(`URL: ${baseUrl}:query`);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(`${baseUrl}:query`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const statusText = response.ok ? "✅ SUCCESS" : "❌ FAILED";
    console.log(
      `\n${statusText} Status: ${response.status} ${response.statusText}`
    );

    const responseText = await response.text();
    console.log("📋 Response:", responseText);

    // Try to parse the response if it's JSON
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log("📊 Parsed response:", JSON.stringify(jsonResponse, null, 2));
    } catch (parseError) {
      console.log("📝 Response is not JSON (might be HTML or plain text)");
    }

    return { success: response.ok, data: responseText };
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return { success: false, error: error.message };
  }
}

async function testStreamQuery() {
  console.log("\n🌊 Testing Agent Engine Stream Query");
  console.log(`🔧 Base URL: ${baseUrl}`);

  try {
    const headers = await getAuthHeaders();

    // Test the official streaming API format from Google Cloud documentation
    const payload = {
      class_method: "stream_query",
      input: {
        input:
          "Goal: Test streaming response\n\nDescription: This is a test streaming query to see if the Agent Engine streaming is working.",
      },
    };

    console.log("\n📡 Making streaming request...");
    console.log(`URL: ${baseUrl}:streamQuery?alt=sse`);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(`${baseUrl}:streamQuery?alt=sse`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const statusText = response.ok ? "✅ SUCCESS" : "❌ FAILED";
    console.log(
      `\n${statusText} Status: ${response.status} ${response.statusText}`
    );

    if (response.ok && response.body) {
      console.log("📡 Reading SSE stream...");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let chunks = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          console.log("📦 Received chunk:", chunk);
          chunks.push(chunk);
        }
      } catch (streamError) {
        console.error("❌ Stream reading error:", streamError);
      }

      console.log("📋 Complete stream:", chunks.join(""));
      return { success: true, data: chunks.join("") };
    } else {
      const responseText = await response.text();
      console.log("📋 Response:", responseText);
      return { success: response.ok, data: responseText };
    }
  } catch (error) {
    console.error("❌ Stream test failed:", error.message);
    return { success: false, error: error.message };
  }
}

async function testCompleteWorkflow() {
  console.log("🚀 Testing Complete Agent Engine Workflow");
  console.log(`🔧 Base URL: ${baseUrl}`);

  try {
    const headers = await getAuthHeaders();
    const userId = "test-user-123";

    // Step 1: Create a session
    console.log("\n📡 Step 1: Creating session...");
    const createSessionPayload = {
      class_method: "create_session",
      input: {
        user_id: userId,
      },
    };

    console.log(`URL: ${baseUrl}:query`);
    console.log(
      "Create Session Payload:",
      JSON.stringify(createSessionPayload, null, 2)
    );

    const createResponse = await fetch(`${baseUrl}:query`, {
      method: "POST",
      headers,
      body: JSON.stringify(createSessionPayload),
    });

    const createStatusText = createResponse.ok ? "✅ SUCCESS" : "❌ FAILED";
    console.log(
      `\n${createStatusText} Create Session Status: ${createResponse.status} ${createResponse.statusText}`
    );

    const createResponseText = await createResponse.text();
    console.log("📋 Create Session Response:", createResponseText);

    if (!createResponse.ok) {
      return {
        success: false,
        error: `Failed to create session: ${createResponseText}`,
      };
    }

    // Parse the session response
    let sessionData;
    try {
      sessionData = JSON.parse(createResponseText);
      console.log(
        "📊 Parsed session data:",
        JSON.stringify(sessionData, null, 2)
      );
    } catch (parseError) {
      console.log("📝 Session response is not JSON");
      return { success: false, error: "Session response is not JSON" };
    }

    const sessionId = sessionData.output?.id;
    if (!sessionId) {
      return { success: false, error: "No session ID returned" };
    }

    // Step 2: List sessions to confirm it worked
    console.log("\n📡 Step 2: Listing sessions...");
    const listSessionsPayload = {
      class_method: "list_sessions",
      input: {
        user_id: userId,
      },
    };

    console.log(
      "List Sessions Payload:",
      JSON.stringify(listSessionsPayload, null, 2)
    );

    const listResponse = await fetch(`${baseUrl}:query`, {
      method: "POST",
      headers,
      body: JSON.stringify(listSessionsPayload),
    });

    const listStatusText = listResponse.ok ? "✅ SUCCESS" : "❌ FAILED";
    console.log(
      `\n${listStatusText} List Sessions Status: ${listResponse.status} ${listResponse.statusText}`
    );

    const listResponseText = await listResponse.text();
    console.log("📋 List Sessions Response:", listResponseText);

    // Step 3: Get the specific session to inspect what's in it
    console.log("\n📡 Step 3: Getting session details...");
    const getSessionPayload = {
      class_method: "get_session",
      input: {
        user_id: userId,
        session_id: sessionId,
      },
    };

    console.log(
      "Get Session Payload:",
      JSON.stringify(getSessionPayload, null, 2)
    );

    const getResponse = await fetch(`${baseUrl}:query`, {
      method: "POST",
      headers,
      body: JSON.stringify(getSessionPayload),
    });

    const getStatusText = getResponse.ok ? "✅ SUCCESS" : "❌ FAILED";
    console.log(
      `\n${getStatusText} Get Session Status: ${getResponse.status} ${getResponse.statusText}`
    );

    const getResponseText = await getResponse.text();
    console.log("📋 Get Session Response:", getResponseText);

    // Step 4: Stream a query to the session
    console.log("\n📡 Step 4: Streaming query to session...");
    const streamQueryPayload = {
      class_method: "stream_query",
      input: {
        user_id: userId,
        session_id: sessionId,
        message: "What is the exchange rate from US dollars to SEK today?",
      },
    };

    console.log(`Stream URL: ${baseUrl}:streamQuery?alt=sse`);
    console.log(
      "Stream Query Payload:",
      JSON.stringify(streamQueryPayload, null, 2)
    );

    const streamResponse = await fetch(`${baseUrl}:streamQuery?alt=sse`, {
      method: "POST",
      headers,
      body: JSON.stringify(streamQueryPayload),
    });

    const streamStatusText = streamResponse.ok ? "✅ SUCCESS" : "❌ FAILED";
    console.log(
      `\n${streamStatusText} Stream Query Status: ${streamResponse.status} ${streamResponse.statusText}`
    );

    if (streamResponse.ok && streamResponse.body) {
      console.log("📡 Reading SSE stream...");
      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let chunks = [];
      let chunkCount = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          chunkCount++;
          console.log(`📦 Chunk ${chunkCount}:`, chunk);
          chunks.push(chunk);

          // Limit output to prevent overwhelming the console
          if (chunkCount > 10) {
            console.log("📦 ... (truncating output after 10 chunks)");
            break;
          }
        }
      } catch (streamError) {
        console.error("❌ Stream reading error:", streamError);
      }

      console.log("📋 Complete stream (first 10 chunks):", chunks.join(""));
      return {
        success: true,
        data: {
          sessionId,
          userId,
          createResponse: createResponseText,
          listResponse: listResponseText,
          getResponse: getResponseText,
          streamResponse: chunks.join(""),
        },
      };
    } else {
      const streamResponseText = await streamResponse.text();
      console.log("📋 Stream Response:", streamResponseText);
      return {
        success: streamResponse.ok,
        data: {
          sessionId,
          userId,
          createResponse: createResponseText,
          listResponse: listResponseText,
          getResponse: getResponseText,
          streamError: streamResponseText,
        },
      };
    }
  } catch (error) {
    console.error("❌ Complete workflow test failed:", error.message);
    return { success: false, error: error.message };
  }
}

// Run the complete workflow test
console.log("🧪 Starting complete Agent Engine workflow test...");
testCompleteWorkflow()
  .then((result) => {
    console.log("\n🏁 Complete workflow test completed");
    console.log("Result:", result.success ? "SUCCESS" : "FAILED");
    if (result.data) {
      console.log("\n📊 Summary:");
      console.log("- Session ID:", result.data.sessionId);
      console.log("- User ID:", result.data.userId);
      console.log("- Create Session: SUCCESS");
      console.log(
        "- List Sessions:",
        result.data.listResponse ? "SUCCESS" : "FAILED"
      );
      console.log(
        "- Get Session:",
        result.data.getResponse ? "SUCCESS" : "FAILED"
      );
      console.log(
        "- Stream Query:",
        result.data.streamResponse ? "SUCCESS" : "FAILED"
      );
    }
  })
  .catch((error) => {
    console.error("💥 Test crashed:", error);
  });
