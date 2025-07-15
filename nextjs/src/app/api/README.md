# Next.js API Routes - Backend Proxy

This directory contains API routes that proxy requests to the Python backend server.

## Available Routes

### Session Management
- **POST** `/api/apps/app/users/[userId]/sessions/[sessionId]`
  - Creates a new chat session
  - Proxies to: `{BACKEND_URL}/apps/app/users/{userId}/sessions/{sessionId}`

### Health Check
- **GET** `/api/docs`
  - Backend health check endpoint
  - Proxies to: `{BACKEND_URL}/docs`
  - Used to verify backend availability

### Chat Streaming
- **POST** `/api/run_sse`
  - Server-Sent Events endpoint for real-time chat
  - Proxies to: `{BACKEND_URL}/run_sse`
  - Handles streaming responses from AI agents

## Configuration

### Environment Variables
Set the following environment variable to configure the backend URL:

```bash
BACKEND_URL=http://127.0.0.1:8000
```

If not set, defaults to `http://127.0.0.1:8000`.

### Development Setup
1. Ensure the Python backend is running on the configured port
2. The Next.js development server will proxy API requests automatically
3. All routes include proper error handling and CORS headers

## API Utilities

The `/src/lib/api.ts` file provides utility functions for:
- Session creation with retry logic
- Backend health checking
- Chat message streaming
- Exponential backoff retry mechanisms

## Error Handling

All routes include:
- Proper error responses with HTTP status codes
- Request forwarding with authentication headers
- Comprehensive logging for debugging
- Graceful fallbacks for backend unavailability 
