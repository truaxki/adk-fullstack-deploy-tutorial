# 🚀 Agent Engine Session Deployment Instructions

## 📋 Overview
This guide walks you through deploying your agent with persistent Vertex AI sessions and testing via your Vercel frontend.

## ✅ Pre-deployment Checklist

### 1. Verify Configuration
- [x] `agent_engine_app.py` has VertexAI session service integration
- [x] `AGENT_ENGINE_ID=5717733143318888448` in both `.env` files
- [x] `GOOGLE_CLOUD_PROJECT=agentlocker-466121` set correctly
- [x] `GOOGLE_CLOUD_LOCATION=us-central1` set correctly

### 2. OAuth Configuration for Production Testing
Your OAuth redirect is currently set to localhost. For Vercel testing, update your Google OAuth settings:

1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID
3. Add your Vercel domain to "Authorized redirect URIs":
   ```
   https://your-app.vercel.app/auth/callback
   ```
4. Keep localhost for local development:
   ```
   http://localhost:3000/auth/callback
   ```

## 🚀 Deployment Steps

### Step 1: Deploy Agent with Session Support
```bash
cd C:\Users\ktrua\OneDrive\Desktop\Code-tutorials\adk-fullstack-deploy-tutorial
python app/agent_engine_app.py
```

**Expected output:**
```
🚀 Starting Agent Engine deployment...
📋 Deploying agent: astra
📋 Project: agentlocker-466121
📋 Location: us-central1
...
✅ Agent deployed successfully!
🆔 Agent Engine ID: projects/245627026184/locations/us-central1/reasoningEngines/5717733143318888448
```

### Step 2: Verify Session Integration
```bash
python app/use_existing_sessions.py
```

**Expected output:**
```
🔍 AGENT ENGINE SESSION VERIFICATION
==================================================

1️⃣ Verifying session service connectivity...
✅ Session service is accessible
   App Name: 5717733143318888448
   Project: agentlocker-466121
   Location: us-central1

2️⃣ Checking for existing sessions...
📭 No existing sessions found

✅ Session verification complete!
💡 Your deployed Agent Engine is ready for persistent sessions.
🎯 Next: Test via your Vercel/Next.js frontend.
```

## 🧪 Testing Sessions via Vercel

### Step 1: Deploy to Vercel
1. Push your changes to your git repository
2. Vercel should auto-deploy (or manually trigger)
3. Ensure environment variables are set in Vercel dashboard

### Step 2: Test Session Persistence
1. **Open your Vercel app** in browser
2. **Login** with OAuth
3. **Start a conversation** - ask the agent something
4. **Note the conversation content**
5. **Refresh the page or close/reopen**
6. **Verify:** Previous conversation should still be there

### Step 3: Test Session Persistence Across Deployments
1. **Make a small change** to your code (like updating a UI text)
2. **Deploy the update** to Vercel
3. **Open the app** after deployment
4. **Verify:** Your conversation history should still be preserved

## 🔍 Troubleshooting

### Issue: Sessions Not Persisting
**Check:**
- Agent Engine deployment includes session service
- Frontend is using correct `AGENT_ENGINE_ID`
- User authentication is working properly

**Debug:**
```bash
# Check deployment metadata includes session service
cat logs/deployment_metadata.json
```

Should include:
```json
{
  "session_service": {
    "type": "VertexAiSessionService",
    "persistent": true,
    "configuration": {
      "project": "agentlocker-466121",
      "location": "us-central1",
      "agent_engine_id": "5717733143318888448"
    }
  }
}
```

### Issue: OAuth Redirect Errors
**Fix:** Update OAuth redirect URLs in Google Cloud Console to include your Vercel domain

### Issue: "Session service verification failed"
**Check:**
- Google Cloud credentials are properly set
- Service account has necessary permissions
- Project ID and location match deployment

## ✅ Success Criteria

- [ ] Agent deploys without errors
- [ ] Session verification script passes
- [ ] Can start conversation via Vercel app
- [ ] Conversation persists after page refresh
- [ ] Conversation persists after redeployment

## 📊 Monitoring Sessions

To check sessions in Google Cloud Console:
1. Go to [Vertex AI > Agent Builder](https://console.cloud.google.com/vertex-ai)
2. Navigate to your project: `agentlocker-466121`
3. Look for session management or conversation history

## 🎯 Next Steps After Successful Testing

1. **Merge to main branch**
2. **Update production OAuth settings**
3. **Deploy to production**
4. **Monitor session performance in production**

## 📝 Notes

- Sessions are automatically managed by the deployed Agent Engine
- No local session testing needed with `adk web`
- Session state persists across agent redeployments
- Sessions scale automatically with user load