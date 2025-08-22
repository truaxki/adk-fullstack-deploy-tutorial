# Testing Vertex AI Session Persistence

## What Changed
We've transitioned your frontend from dual-session storage (Supabase + Vertex AI) to using Vertex AI as the single source of truth for sessions.

### Changes Made:
1. **`nextjs/src/lib/services/session-service.ts`**
   - Removed Supabase sync from `AgentEngineSessionService`
   - Removed Supabase sync from `LocalBackendSessionService`
   - Sessions now created only in Vertex AI (for Agent Engine deployment)

## Testing Instructions

### 1. Deploy Frontend to Vercel
```bash
# Commit the changes
git add -A
git commit -m "Transition to Vertex AI sessions only - remove Supabase sync"

# Push to your repository
git push origin dev

# Vercel should auto-deploy, or manually trigger deployment
```

### 2. Test Session Persistence

#### Step A: Create a New Session
1. Open your Vercel app: `https://your-app.vercel.app`
2. Login with OAuth
3. Start a new conversation
4. Ask the agent: "Remember that my favorite color is blue"
5. Note the conversation

#### Step B: Test Persistence Across Page Refresh
1. Refresh the browser page (F5)
2. The conversation should still be visible
3. Ask: "What is my favorite color?"
4. Agent should remember it's blue

#### Step C: Test Persistence Across Redeployment
1. Make a tiny change (like updating a UI text)
2. Deploy to Vercel again
3. Open the app after deployment
4. Your conversation history should still be there
5. The agent should still remember your favorite color

### 3. Verify Sessions in Console

Check the browser console for these key messages:
- `✅ [AGENT_ENGINE_SESSION] Session created in Vertex AI: [session-id]`
- `ℹ️ [AGENT_ENGINE_SESSION] Skipping Supabase sync - using Vertex AI as source of truth`

You should NOT see:
- `Session synced to Supabase`
- Any Supabase sync errors

### 4. Check Vertex AI Console (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to Vertex AI > Agent Builder
3. Find your agent: `astra`
4. Look for session management or logs
5. You should see sessions being created and persisted

## Expected Behavior

✅ **What Should Work:**
- Sessions persist across page refreshes
- Sessions persist across deployments
- Conversation context is maintained
- No Supabase sync attempts in logs

❌ **What Won't Work (By Design):**
- Supabase session tables won't have new entries
- Session history in Supabase admin panel won't update
- Any Supabase-based session analytics

## Troubleshooting

### Issue: Sessions Not Persisting
**Check:**
1. Browser console for session creation logs
2. Network tab for session API calls to Agent Engine
3. Ensure `AGENT_ENGINE_ID` is set correctly in Vercel env vars

### Issue: Authentication Errors
**Check:**
1. OAuth redirect URLs include your Vercel domain
2. `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` is set in Vercel
3. Service account has necessary permissions

### Issue: Old Sessions Still in Supabase
**Note:** This is expected. Old sessions will remain in Supabase but new ones won't be created there. You can optionally clean up the Supabase tables later.

## Success Criteria

- [ ] New sessions created only in Vertex AI
- [ ] Sessions persist across page refreshes
- [ ] Sessions persist across deployments
- [ ] No Supabase sync errors in console
- [ ] Agent maintains conversation context

## Next Steps

Once testing is successful:
1. Merge to main branch
2. Deploy to production
3. Monitor for any issues
4. (Optional) Clean up Supabase session tables in a future update