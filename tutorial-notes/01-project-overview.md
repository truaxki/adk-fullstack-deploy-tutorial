# Project Overview: ADK Fullstack Deploy Tutorial

## What is this project?

This is a **full-stack application** that demonstrates how to build an AI-powered chat interface using:
- **Google's Agent Development Kit (ADK)**: A Python framework for building AI agents
- **Next.js**: A React framework for the frontend
- **Streaming**: Real-time responses from the AI agent

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │ ──SSE→  │   Next.js    │ ──API→  │  ADK Agent  │
│  (Chat UI)  │ ←────   │   Frontend   │ ←────   │  (Python)   │
└─────────────┘         └──────────────┘         └─────────────┘
```

## Key Technologies

### Backend (Python)
- **google-adk**: Google's Agent Development Kit for building AI agents
- **vertexai**: Google's AI platform SDK
- **python-dotenv**: Environment variable management
- **uv**: Modern Python package manager (faster than pip)

### Frontend (Next.js)
- **Next.js 15**: React framework with server-side rendering
- **React 19**: UI library
- **TailwindCSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built UI components
- **Server-Sent Events (SSE)**: For streaming responses

## What does the app do?

The application creates a **goal-planning AI agent** that:
1. Takes high-level goals from users
2. Creates structured plans to achieve those goals
3. Streams responses in real-time
4. Shows an activity timeline of the agent's thinking process

## Project Structure

```
adk-fullstack-deploy-tutorial/
│
├── app/                    # Python backend
│   ├── agent.py           # Main AI agent logic
│   ├── config.py          # Configuration & environment
│   └── utils/             # Helper utilities
│
├── nextjs/                # Frontend application
│   ├── src/
│   │   ├── app/          # Next.js app router
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities & config
│   └── package.json      # Node dependencies
│
├── Makefile              # Build & run commands
└── pyproject.toml        # Python dependencies
```

## Development Flow

1. **Backend runs on port 8000**: Serves the ADK agent API
2. **Frontend runs on port 3000**: Serves the chat UI
3. **Proxy setup**: Frontend proxies API calls to backend
4. **Streaming**: Uses Server-Sent Events for real-time updates