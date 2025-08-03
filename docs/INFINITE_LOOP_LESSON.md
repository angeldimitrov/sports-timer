# Lesson Learned: React Infinite Loop Debugging

## The Problem
- **Symptom**: "Maximum update depth exceeded" error when clicking play button
- **Location**: `use-timer.ts:169` - setState in timer event handler
- **Trigger**: Started after CSS changes for mobile scroll fix

## The Mistake
Instead of comparing with a working branch (main), I immediately assumed the hooks needed "fixing" and made these changes:

1. **useAudio Hook Changes**:
   - Added `useMemo` to wrap return object
   - Removed dependencies from `useCallback` functions
   - Changed function implementations to avoid "dependency chains"

2. **useTimer Hook Changes**:
   - Added ref pattern for `onEvent` callback
   - Removed `[onEvent]` dependency from `initializeTimer`

## The Reality
- **Main/prod didn't have this issue** - the hooks were fine!
- My "fixes" were actually **causing more problems**
- The infinite loop might have been:
  1. A pre-existing edge case that got triggered
  2. Or introduced by my attempted fixes themselves

## The Solution
**Revert to main branch versions** - if it works in production, don't "fix" it!

```bash
git checkout main -- src/hooks/use-audio.ts src/hooks/use-timer.ts
```

## Key Lessons

### 1. Always Compare with Working Code
Before making fixes, check if the issue exists in main/production:
```bash
git diff main --name-only
git diff main path/to/file.ts
```

### 2. Understand the Timeline
- What changed between working and broken states?
- Don't assume correlation equals causation (CSS changes → React loops?)

### 3. Avoid Premature Optimization
- Don't add `useMemo` everywhere "just in case"
- Don't remove dependencies without understanding why they're there
- Trust the existing code if it works in production

### 4. Test Incrementally
- Make one change at a time
- Test after each change
- Revert if things get worse

### 5. Document Patterns
If this is a recurring issue ("we had like 1000 time before"), then:
- Document the root cause pattern
- Create a checklist for debugging
- Consider architectural changes to prevent it

## Common React Infinite Loop Patterns

1. **Changing Dependencies**:
   ```typescript
   // BAD: Creates new object every render
   const config = { ...someConfig };
   useEffect(() => {}, [config]); // Runs every render!
   ```

2. **State Updates in Render**:
   ```typescript
   // BAD: Updates state during render
   if (someCondition) {
     setState(newValue); // Causes re-render loop!
   }
   ```

3. **Callback Dependencies**:
   ```typescript
   // Can be problematic if callback changes often
   const callback = useCallback(() => {}, [dependency]);
   useEffect(() => {}, [callback]); // Re-runs when callback changes
   ```

## Debugging Checklist

1. **Check main branch**: Does the issue exist there?
2. **Review recent changes**: What files were modified?
3. **Isolate the change**: Revert files one by one
4. **Look for patterns**: Changing objects, arrays, or functions in dependencies
5. **Test thoroughly**: Both unit tests and manual testing

## Prevention Strategies

1. **Stable References**: Use `useCallback` and `useMemo` appropriately
2. **Dependency Analysis**: Understand why each dependency is needed
3. **Code Reviews**: Have someone else check hook dependencies
4. **Testing**: Write tests that would catch infinite loops
5. **Monitoring**: Add performance monitoring in production

---

Remember: If it works in production, be very careful about "fixing" it!