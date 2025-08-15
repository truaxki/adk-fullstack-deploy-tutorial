# Debugging Log

## Purpose
Track issues encountered during migration and their solutions. This log helps identify patterns and provides quick solutions for common problems.

## Format
```
Date: YYYY-MM-DD HH:MM
Phase: [1-6]
Issue: Brief description
Symptoms: What was observed
Cause: Root cause identified
Solution: How it was fixed
Time to Fix: X minutes
```

---

## Common Issues and Solutions

### Issue: Sessions don't load after setting user ID
**Symptoms**: Empty session list despite valid user ID
**Common Causes**:
- Backend not running
- Network error
- Invalid user ID format
- CORS issues
**Quick Fix**:
1. Check backend is running: `uv run adk api_server app --allow_origins="*"`
2. Check Network tab for failed requests
3. Verify user ID format (alphanumeric, hyphens, underscores only)
4. Check console for CORS errors

### Issue: Messages don't appear after sending
**Symptoms**: Input clears but no message shows
**Common Causes**:
- No session selected
- WebSocket not connected
- Backend error
**Quick Fix**:
1. Verify session ID is set
2. Check WebSocket connection in Network tab
3. Look for backend errors in terminal
4. Try refreshing the page

### Issue: Chat history doesn't load when switching sessions
**Symptoms**: Previous messages remain or empty chat shown
**Common Causes**:
- useEffect not triggering
- State not updating
- API call failing
**Quick Fix**:
1. Add console.log to verify effect triggers
2. Check if sessionId updates in React DevTools
3. Verify API returns data

### Issue: "New Chat" creates session but doesn't select it
**Symptoms**: Session appears in list but not selected
**Common Causes**:
- Async timing issue
- State update race condition
- Missing await
**Quick Fix**:
1. Ensure proper await on async calls
2. Add slight delay if needed
3. Verify new session ID is captured

### Issue: TypeScript errors on build
**Symptoms**: Red squiggles in editor, build fails
**Common Causes**:
- Missing type imports
- Incorrect prop types
- Version mismatches
**Quick Fix**:
1. Run `npm run type-check`
2. Fix any missing imports
3. Verify all props have correct types
4. Check tsconfig.json settings

### Issue: Styling looks wrong in desktop layout
**Symptoms**: Components misaligned or wrong colors
**Common Causes**:
- Conflicting CSS classes
- Missing Tailwind classes
- Parent container constraints
**Quick Fix**:
1. Use browser DevTools to inspect
2. Check for conflicting styles
3. Verify Tailwind classes exist
4. Check parent container dimensions

### Issue: Memory leak warning in console
**Symptoms**: React warning about memory leaks
**Common Causes**:
- Missing cleanup in useEffect
- WebSocket not closing
- Event listeners not removed
**Quick Fix**:
1. Add cleanup functions to all useEffects
2. Ensure WebSocket closes on unmount
3. Remove all event listeners in cleanup

---

## Migration Issues Log

### Entry 1
```
Date: 
Phase: 
Issue: 
Symptoms: 
Cause: 
Solution: 
Time to Fix: 
```

### Entry 2
```
Date: 
Phase: 
Issue: 
Symptoms: 
Cause: 
Solution: 
Time to Fix: 
```

### Entry 3
```
Date: 
Phase: 
Issue: 
Symptoms: 
Cause: 
Solution: 
Time to Fix: 
```

---

## Performance Issues

### Slow Session Loading
- Check backend response time
- Verify no N+1 queries
- Check network latency
- Consider adding pagination

### Laggy Typing
- Check for excessive re-renders
- Verify debouncing on input
- Check React DevTools Profiler
- Optimize component memoization

### Memory Growth
- Check for array mutations
- Verify cleanup functions
- Look for infinite loops
- Check event listener accumulation

---

## Browser-Specific Issues

### Safari
- WebSocket compatibility
- Date parsing differences
- CSS grid issues
- localStorage restrictions

### Firefox
- Smooth scroll behavior
- Flexbox differences
- Console API variations
- WebRTC limitations

### Edge
- Legacy mode issues
- Extension conflicts
- Cache problems
- Security policy differences

---

## Tips for Faster Debugging

1. **Use React DevTools**
   - Check component props
   - Verify state updates
   - Profile performance
   - Track re-renders

2. **Use Network Tab**
   - Monitor API calls
   - Check WebSocket frames
   - Verify request/response
   - Check for failed requests

3. **Add Strategic Logging**
   - Log at state changes
   - Log in useEffects
   - Log API responses
   - Log error catches

4. **Binary Search Method**
   - Comment out half the code
   - See if issue persists
   - Narrow down the problem
   - Isolate the cause

5. **Git Bisect**
   - Use git bisect to find breaking commit
   - Test each commit
   - Identify exact change
   - Revert if needed

---

## Emergency Contacts

- Backend Issues: Check ADK documentation
- React Issues: Check React docs
- TypeScript Issues: Check TS handbook
- Tailwind Issues: Check Tailwind docs
- WebSocket Issues: Check Socket.io docs

---

## Lessons Learned

Document key learnings here for future migrations:

1. 
2. 
3. 
4. 
5.
