#!/usr/bin/env node

/**
 * Direct Agent Engine Streaming Test Script
 * Tests the Agent Engine streaming endpoint to debug response format
 */

const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, "nextjs", ".env.prod.example");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      envContent.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim();
          process.env[key.trim()] = value;
        }
      });
      console.log("✅ Loaded environment variables from .env.local");
    } else {
      console.log(
        "⚠️ No .env.local file found, using system environment variables"
      );
    }
  } catch (error) {
    console.error("❌ Error loading .env.local:", error.message);
  }
}

// Handle SSE streaming response
async function handleSSEStream(response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let chunkCount = 0;
  let totalBytes = 0;
  let buffer = "";

  console.log("\n🌊 Processing SSE Stream...");

  if (!reader) {
    console.log("❌ No response body to read");
    return;
  }

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log(
          `\n✅ Stream complete after ${chunkCount} chunks (${totalBytes} total bytes)`
        );
        if (buffer.length > 0) {
          console.log(
            "📄 Final buffer content:",
            buffer.substring(0, 200) + "..."
          );
        }
        break;
      }

      chunkCount++;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      totalBytes += chunk.length;

      console.log(`\n📦 Chunk ${chunkCount} (${chunk.length} bytes):`);
      console.log(
        "📄 Content:",
        chunk.substring(0, 200) + (chunk.length > 200 ? "..." : "")
      );

      // Try to parse as JSON to see if it's complete
      try {
        const parsed = JSON.parse(chunk);
        console.log("✅ Chunk is valid complete JSON");
        console.log("📋 JSON structure:", Object.keys(parsed));
      } catch (e) {
        console.log("❌ Chunk is not complete JSON (expected for streaming)");
      }

      // Check for SSE format
      if (chunk.includes("data:")) {
        console.log('🎯 Chunk contains SSE "data:" prefix');
      } else {
        console.log("⚠️ Chunk does not contain SSE format");
      }
    }

    // Try to parse accumulated buffer as complete JSON
    console.log("\n🧪 Testing complete buffer as JSON...");
    try {
      const completeJson = JSON.parse(buffer);
      console.log("✅ Complete buffer is valid JSON!");
      console.log("📋 JSON structure:", Object.keys(completeJson));

      if (completeJson.content && completeJson.content.parts) {
        console.log(
          "📝 Response contains content parts:",
          completeJson.content.parts.length
        );
        const textParts = completeJson.content.parts.filter(
          (part) => part.text && !part.thought
        );
        const thoughtParts = completeJson.content.parts.filter(
          (part) => part.text && part.thought
        );
        console.log(
          `📝 Text parts: ${textParts.length}, Thought parts: ${thoughtParts.length}`
        );

        if (textParts.length > 0) {
          console.log(
            "📝 First text part preview:",
            textParts[0].text.substring(0, 100) + "..."
          );
        }
      }
    } catch (e) {
      console.log("❌ Complete buffer is not valid JSON:", e.message);
    }
  } catch (error) {
    console.error("❌ Error reading stream:", error);
  }
}

// Main test function
async function testAgentEngineStreaming() {
  loadEnvFile();

  // Get config from environment
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const reasoningEngineId = process.env.REASONING_ENGINE_ID;
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const location = "us-central1"; // Default location

  if (!project || !reasoningEngineId || !serviceAccountKey) {
    console.error("❌ Missing required environment variables:");
    console.error("   GOOGLE_CLOUD_PROJECT:", !!project);
    console.error("   REASONING_ENGINE_ID:", !!reasoningEngineId);
    console.error("   GOOGLE_SERVICE_ACCOUNT_KEY_BASE64:", !!serviceAccountKey);
    process.exit(1);
  }

  console.log("🔧 Configuration:");
  console.log("   Project:", project);
  console.log("   Location:", location);
  console.log("   Reasoning Engine ID:", reasoningEngineId);

  try {
    // Get access token
    const { GoogleAuth } = require("google-auth-library");
    const credentials = JSON.parse(
      Buffer.from(serviceAccountKey, "base64").toString()
    );
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const accessToken = await auth.getAccessToken();
    console.log("✅ Authentication successful");

    // Test streaming endpoint
    const streamUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/reasoningEngines/${reasoningEngineId}:streamQuery?alt=sse`;

    console.log(`\n🧪 Testing Streaming Endpoint:`);
    console.log(`🔗 URL: ${streamUrl}`);

    const payload = {
      class_method: "stream_query",
      input: {
        user_id: "brandon",
        session_id: "8894295353486999552", // Use existing session
        message: "Test streaming response - just say hello",
      },
    };

    console.log("📤 Payload:");
    console.log(JSON.stringify(payload, null, 2));

    const response = await fetch(streamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`\n📥 Response received:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get("content-type")}`);
    console.log(`   Content-Length: ${response.headers.get("content-length")}`);
    console.log(
      `   Transfer-Encoding: ${response.headers.get("transfer-encoding")}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error response: ${errorText}`);
      return;
    }

    // Handle the streaming response
    await handleSSEStream(response);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testAgentEngineStreaming();
