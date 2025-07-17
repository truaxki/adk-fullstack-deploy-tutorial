const { GoogleAuth } = require("google-auth-library");

// Configuration from environment variables
const config = {
  project: "adk-deploy-465915",
  location: "us-central1",
  reasoningEngineId: "1348995214164885504",
  serviceAccountKeyBase64:
    "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiYWRrLWRlcGxveS00NjU5MTUiLAogICJwcml2YXRlX2tleV9pZCI6ICJiYmI2NWUxMjI3OWU5YjFkMTlmYzJhMGUxMGJiZTkzNDc1OWFhMTM3IiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdmdJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLZ3dnZ1NrQWdFQUFvSUJBUURDUHJQYVdlQlFZaTFZXG43a0xCZHlscjJKZGU5eVV0UzlzSW5nMDViL0RRMkcraFRFVHRUTlRrQlA0T0hkZGlNNTZ4Y2dxa2NlZmlFMnhGXG5RUmVidHR3VVplK3J5VGxyelNmQ0ZKdlFOSlpSankrRVc0eWZJK3Fia2piLzRDcDNHSC9KaVRld0dPNG5CWVZYXG5mMHo2UllVeno4SnA1Z2RHdWtQWERibG8vQVNXelAzR2JuamtNTmRsMVhEdU1EUFFIMndWY3I2bERtY1hrSXFLXG5tZFp3V3BpWXl5VGsrSG9sbHVHdWthSnFzVFd5VmpUaE5GSEZ1eGlxTmtsY3dORVlKMm5UTzhKL25qOUF2Y1ByXG40L3hyVXJwUGpCL1h3czJob3Q4TEtqbDBjVzRsNkJyMU9SV3dWTUdwQ3V5WGc3TlFjNXpnc2ltSjlDMnRDUVJ0XG5pM29qR1U4L0FnTUJBQUVDZ2dFQUMrVGxCSERPY0gyaWd6aUxzK2NGRFVxRThsYTEyeEV6QjFNT1FqOGRndHhOXG44WldHL3ZUZWNGdng1cEZqTitzclEzaFZPSDZWRVYzWkdtQ0MvcER5NXZqYTlTenNMREt5eFlxWGcrZEVjUmdRXG5jODFiVGY5WUJWQ3R0M3RWZmxkc3M3MklRR3MyWWdOUGgrME9uS0NYS0hZSFZJNjJVVmxrZ0EyaUZkQ2d3MDhNXG5pUHRMWEdwd0FtaDk1cThaOUp2QXprUHNaekdhTkZ5N1ZZZlAzdEF4bmIrR2wrUmVhb2wxWWU3Z3B0V0FicytDXG55bzZ4cnhPNkpObkt4UmxzYWhBZW9iR1AzamlGUzJ2MUhuODR1eE10elB2bXZHNFMwcjdLdGFCK29WZXVpUzRKXG50OCtYSnFjdDZlOTJYOXJSYnVzeUVWRVpvUGRkdGxzL1FWVDk0NEVsR1FLQmdRRCsrQjU1WDVuNWdBUDJzWHJzXG5BRlJPOWtOVDlHUUVGaGdHcy9ibVh1TWNaeFcvVTBwRDA5dVBiUnFTSTczN1Zwb2IvZHBrdXEyTjN3ckxaZ2xDXG5kc1N0bk9kRVErR1M5WkxWdFIrd3dGZWNVMXdRUU5QWkF2OTF4Z1gxLzlhc2xEMEZRSGlQb1daUnhPb0FlcmZLXG5BSDZPTXNuN0xxUURsNXpLZGhYSmhYK0RMUUtCZ1FEREI3eWRmTEVmUzRrZDZ2MVRVQmxjWnlrZlYrMzdSL2M2XG5BM2t4R014K1RaT3hRNm9jRzBMQ0g0TERuZVBGNnJLZUZUVElnU3V6dGkrcHF5eVZmUzVoZ3M0Y0lsS2Q0VkhQXG5QdGpDTFA4RU05VitQNjFjUzFtQ29nTEJoU3V6YW5hR3NVbWQxbVBYM2FsYTVtN1J5aVRXdzZaSlpvcDl6Q0NvXG5LZGNXVlZKUG13S0JnUUMyNlBxN3FjakZBNEJVYm5nM2Eva1BlSDFPY2lsNkFQdVZlMjlwVHJMd3drY0lyVkMrXG5uZktKendSYnlJWlhFNGFWQkNTelZIU0RMWG9KOXBZMzl3b2JYazlPV3NBdGREeTFVUzE5MkU1Qm1FK1lYVmxjXG4rbGlYZmNyeThtbG4veVJUYXkvU0lrQkw4czdJTDBGQUNlREFWRkV3QUFLcmpRMXU5UTJtTno0RnRRS0JnUUNpXG5hNmdOOUJGQ1FkTGdZcG8wTHduZjVWM2U1NGllODFFV05GeFNvaGR6dkVHYXFBSmNRK3UxNVM0dW9TaFc1RjE2XG52NmhrcndacE5QbStzSHFCeUcyKzhZT2E5STZmUTAyeGJlSncyNjVKbnExVzVjc0hpUXp6ZU44WXNVSXl1aUFaXG5qajREdjg4SXNHWmcrSFVrSzlmQUw5SWxZTXRIZHA5ZnpQQitmZkg5cndLQmdDQmFiVWx5MnVrYm0wRlpmcXBqXG56U1h6OENFREp2dFFwazdUNEtCNytzZjlxZGNBMWxCaUxvSDZralZBb2dybjIrZ0wwTGU1SU9mNUsxVlNkV3I4XG5LdjZZd0JNR1VBQ3p1RUpwZ05tSjBxVVBBY3JjRDB6TGhiUWwwZUhaMzJHdXV4OEd6U2xKeStkbkQvaVFWaWVtXG4vNDhiZG10Z3ZaY1FRWnVldUJoSDk1eVhcbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsCiAgImNsaWVudF9lbWFpbCI6ICJhZ2VudC1lbmdpbmUtZnJvbnRlbmRAYWRrLWRlcGxveS00NjU5MTUuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJjbGllbnRfaWQiOiAiMTEyMzE5OTc3NTM3MTY4MjUyMjY0IiwKICAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLAogICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLAogICJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwKICAiY2xpZW50X3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS9hZ2VudC1lbmdpbmUtZnJvbnRlbmQlNDBhZGstZGVwbG95LTQ2NTkxNS5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgInVuaXZlcnNlX2RvbWFpbiI6ICJnb29nbGVhcGlzLmNvbSIKfQo=",
};

// Build the base URL
const baseUrl = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.project}/locations/${config.location}/reasoningEngines/${config.reasoningEngineId}`;

async function getAuthHeaders() {
  try {
    // Decode the base64 service account key
    const serviceAccountKeyJson = Buffer.from(
      config.serviceAccountKeyBase64,
      "base64"
    ).toString("utf-8");
    const credentials = JSON.parse(serviceAccountKeyJson);

    // Create auth client
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();

    return {
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    };
  } catch (error) {
    console.error("Failed to get auth headers:", error);
    throw error;
  }
}

async function testMethod(method, payload = {}) {
  console.log(`\n🧪 Testing method: ${method}`);
  console.log(`📡 URL: ${baseUrl}:${method}`);
  console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}:${method}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const statusText = response.ok ? "✅ SUCCESS" : "❌ FAILED";
    console.log(
      `${statusText} Status: ${response.status} ${response.statusText}`
    );

    const responseText = await response.text();
    console.log(`📋 Response:`, responseText);

    return { success: response.ok, data: responseText };
  } catch (error) {
    console.error("❌ Request failed:", error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log("🚀 Starting Agent Engine API Tests");
  console.log(`🔧 Base URL: ${baseUrl}`);

  const sessionId = `test-session-${Date.now()}`;
  const userId = "test-user";
  const testQuery =
    "Goal: Test Goal\n\nDescription: This is a test query to see if the Agent Engine is working.";

  // Test 1: Try to create a session
  console.log("\n" + "=".repeat(60));
  await testMethod("create_session", {
    userId: userId,
    sessionId: sessionId,
  });

  // Test 2: Try to list sessions
  console.log("\n" + "=".repeat(60));
  await testMethod("list_sessions", {
    userId: userId,
  });

  // Test 3: Try to get a session
  console.log("\n" + "=".repeat(60));
  await testMethod("get_session", {
    userId: userId,
    sessionId: sessionId,
  });

  // Test 4: Try the original query method (should fail)
  console.log("\n" + "=".repeat(60));
  await testMethod("query", {
    input: {
      query: testQuery,
      sessionId: sessionId,
      userId: userId,
    },
  });

  // Test 5: Try query with different payload structure
  console.log("\n" + "=".repeat(60));
  await testMethod("query", {
    query: testQuery,
    sessionId: sessionId,
    userId: userId,
  });

  // Test 6: Try some other potential method names
  console.log("\n" + "=".repeat(60));
  await testMethod("run", {
    query: testQuery,
    sessionId: sessionId,
    userId: userId,
  });

  console.log("\n" + "=".repeat(60));
  await testMethod("execute", {
    query: testQuery,
    sessionId: sessionId,
    userId: userId,
  });

  console.log("\n" + "=".repeat(60));
  await testMethod("stream", {
    query: testQuery,
    sessionId: sessionId,
    userId: userId,
  });

  console.log("\n🏁 Tests completed!");
}

// Run the tests
runTests().catch(console.error);
