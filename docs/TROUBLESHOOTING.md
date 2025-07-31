# Troubleshooting Guide 🔧

This guide helps you diagnose and resolve common issues with the Boxing Timer MVP.

## Table of Contents
- [Quick Diagnostics](#quick-diagnostics)
- [Timer Issues](#timer-issues)
- [Audio Problems](#audio-problems)
- [PWA & Installation Issues](#pwa--installation-issues)
- [Performance Problems](#performance-problems)
- [Build & Deployment Issues](#build--deployment-issues)
- [Browser Compatibility](#browser-compatibility)
- [Development Issues](#development-issues)

## Quick Diagnostics

### Enable Debug Mode
Enable comprehensive logging in browser console:
```javascript
// In browser console
localStorage.setItem('debug', 'boxing-timer:*');
// Refresh page to see debug logs
```

### Check Browser Compatibility
```javascript
// Run in browser console to check feature support
console.log({
  webAudio: !!(window.AudioContext || window.webkitAudioContext),
  webWorkers: !!window.Worker,
  wakeLock: 'wakeLock' in navigator,
  serviceWorker: 'serviceWorker' in navigator,
  notifications: 'Notification' in window,
  localStorage: !!window.localStorage
});
```

### System Information
```javascript
// Get detailed system info
console.log({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  cookieEnabled: navigator.cookieEnabled,
  onLine: navigator.onLine,
  hardwareConcurrency: navigator.hardwareConcurrency,
  memory: performance.memory?.usedJSHeapSize
});
```

---

## Timer Issues

### Timer Not Starting

#### Symptoms
- Clicking "Start" button has no effect
- Timer display shows "00:00" and doesn't change
- No audio cues play

#### Diagnosis
```javascript
// Check timer state in console
console.log('Timer state:', window.timerEngine?.getState());

// Check Web Worker status
console.log('Worker available:', !!window.Worker);

// Check if timer engine initialized
console.log('Timer ready:', window.timerEngine?.isReady());
```

#### Solutions

1. **Refresh Page**
   ```bash
   # Hard refresh to clear cache
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

2. **Clear Browser Data**
   ```bash
   # In browser console
   localStorage.clear();
   sessionStorage.clear();
   // Then refresh page
   ```

3. **Check Web Worker Path**
   ```javascript
   // Verify worker file exists
   fetch('/workers/timer-worker.js')
     .then(response => console.log('Worker status:', response.status))
     .catch(error => console.error('Worker not found:', error));
   ```

4. **Fallback Mode**
   ```javascript
   // Force fallback timer (no Web Workers)
   localStorage.setItem('boxing-timer:force-fallback', 'true');
   // Refresh page
   ```

### Timer Accuracy Issues

#### Symptoms
- Timer counting too fast or slow
- Inconsistent timing between rounds
- Timer jumps or skips seconds

#### Diagnosis
```javascript
// Test timer precision
const startTime = Date.now();
setTimeout(() => {
  const elapsed = Date.now() - startTime;
  const error = Math.abs(elapsed - 1000);
  console.log(`Timer error: ${error}ms (should be <100ms)`);
}, 1000);
```

#### Solutions

1. **Close Other Tabs**
   - Browser throttling affects Web Worker performance
   - Keep only the timer tab open during workouts

2. **Check CPU Usage**
   - High CPU usage can affect timing precision
   - Close resource-intensive applications

3. **Update Browser**
   - Ensure you're using a recent browser version
   - Clear browser cache after update

4. **Enable High Performance Mode**
   ```javascript
   // Disable battery saver mode
   // Check in browser console:
   console.log('Battery status:', navigator.getBattery?.());
   ```

### Timer Freezing or Stopping

#### Symptoms
- Timer stops unexpectedly
- Display freezes but audio continues
- Round progression stops

#### Diagnosis
```javascript
// Check for JavaScript errors
console.log('Recent errors:', window.errorLog || 'None');

// Check Web Worker status
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('Service workers:', registrations.length);
  });
}
```

#### Solutions

1. **Check Browser Tab Visibility**
   ```javascript
   // Ensure tab is visible
   console.log('Tab visible:', !document.hidden);
   ```

2. **Disable Power Saving**
   - Turn off battery saver mode
   - Plug in device if on battery

3. **Reset Timer Engine**
   ```javascript
   // Reset in console
   window.timerEngine?.destroy();
   location.reload();
   ```

---

## Audio Problems

### No Sound Playing

#### Symptoms
- Visual timer works but no audio
- Volume slider has no effect
- Audio initialization fails

#### Diagnosis
```javascript
// Check audio system status
console.log('Audio state:', {
  initialized: window.audioManager?.isInitialized(),
  webAudioSupport: !!(window.AudioContext || window.webkitAudioContext),
  volume: window.audioManager?.getVolume(),
  muted: window.audioManager?.isMuted()
});

// Test browser audio permissions
navigator.permissions?.query({name: 'microphone'}).then(result => {
  console.log('Audio permission:', result.state);
});
```

#### Solutions

1. **User Interaction Required**
   ```javascript
   // Audio must be initiated by user action
   // Click anywhere on the page, then start timer
   document.addEventListener('click', () => {
     window.audioManager?.initialize();
   }, { once: true });
   ```

2. **Check Browser Settings**
   - Ensure site is not muted in browser
   - Check system volume is up
   - Verify autoplay is allowed

3. **Clear Audio Cache**
   ```javascript
   // Clear audio cache
   localStorage.removeItem('boxing-timer:audio-settings');
   location.reload();
   ```

4. **Test Audio Files**
   ```javascript
   // Test if audio files load
   const audio = new Audio('/sounds/bell.mp3');
   audio.play().then(() => {
     console.log('Audio file works');
   }).catch(error => {
     console.error('Audio file failed:', error);
   });
   ```

### Audio Cutting Out or Distorted

#### Symptoms
- Audio plays but sounds choppy
- Bell sounds cut off early
- Echo or distortion effects

#### Diagnosis
```javascript
// Check audio buffer status
console.log('Audio buffers loaded:', window.audioManager?.getLoadedBuffers?.());

// Check for audio context issues
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
console.log('Audio context state:', audioContext.state);
```

#### Solutions

1. **Reload Audio System**
   ```javascript
   // Reinitialize audio in console
   window.audioManager?.destroy();
   setTimeout(() => {
     window.audioManager?.initialize();
   }, 1000);
   ```

2. **Check Network Connection**
   - Slow connection can cause audio loading issues
   - Try on different network

3. **Reduce Audio Quality (if custom files)**
   - Convert to lower bitrate MP3
   - Reduce file size for faster loading

### Audio Delay or Sync Issues

#### Symptoms
- Audio plays after visual cue
- Round sounds don't match timer display
- Inconsistent audio timing

#### Solutions

1. **Use Web Audio API**
   ```javascript
   // Ensure Web Audio API is being used
   console.log('Using Web Audio:', window.audioManager?.hasWebAudioSupport?.());
   ```

2. **Preload Audio**
   ```javascript
   // Manually preload all sounds
   window.audioManager?.preloadAllAudio?.();
   ```

3. **Check Device Performance**
   - Audio processing requires CPU resources
   - Close other applications

---

## PWA & Installation Issues

### Cannot Install as App

#### Symptoms
- No "Install App" button appears
- Installation prompt doesn't show
- "Add to Home Screen" not available

#### Diagnosis
```javascript
// Check PWA criteria
console.log('PWA status:', {
  serviceWorker: 'serviceWorker' in navigator,
  manifest: document.querySelector('link[rel="manifest"]'),
  https: location.protocol === 'https:' || location.hostname === 'localhost',
  beforeInstallPrompt: window.installPromptEvent !== undefined
});

// Check service worker registration
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service worker registered:', registrations.length > 0);
});
```

#### Solutions

1. **Verify HTTPS**
   - PWA installation requires HTTPS (or localhost)
   - Check URL starts with `https://`

2. **Check Browser Support**
   ```javascript
   // PWA support varies by browser
   const supportsPWA = 'serviceWorker' in navigator && 'PushManager' in window;
   console.log('PWA supported:', supportsPWA);
   ```

3. **Clear Service Worker**
   ```javascript
   // Unregister and re-register service worker
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => registration.unregister());
     location.reload();
   });
   ```

4. **Meet PWA Criteria**
   - App must be used for sufficient time
   - Must have valid manifest file
   - Service worker must be registered

### App Not Working Offline

#### Symptoms
- App shows "offline" message
- Features don't work without internet
- Service worker not caching properly

#### Diagnosis
```javascript
// Check cache status
caches.keys().then(cacheNames => {
  console.log('Available caches:', cacheNames);
  
  cacheNames.forEach(cacheName => {
    caches.open(cacheName).then(cache => {
      cache.keys().then(keys => {
        console.log(`Cache ${cacheName}:`, keys.length, 'items');
      });
    });
  });
});
```

#### Solutions

1. **Update Service Worker**
   ```javascript
   // Force service worker update
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => {
       registration.update();
     });
   });
   ```

2. **Clear All Caches**
   ```javascript
   // Clear service worker caches
   caches.keys().then(cacheNames => {
     return Promise.all(
       cacheNames.map(cacheName => caches.delete(cacheName))
     );
   }).then(() => {
     console.log('All caches cleared');
     location.reload();
   });
   ```

---

## Performance Problems

### Slow Loading

#### Symptoms
- App takes long to load initially
- Slow response to button clicks
- Laggy animations

#### Diagnosis
```javascript
// Check performance metrics
console.log('Performance:', {
  loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
  domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
  memory: performance.memory?.usedJSHeapSize || 'Not available'
});

// Check network speed
navigator.connection && console.log('Network:', {
  effectiveType: navigator.connection.effectiveType,
  downlink: navigator.connection.downlink,
  rtt: navigator.connection.rtt
});
```

#### Solutions

1. **Clear Browser Cache**
   ```bash
   # Clear all browser data
   # Or use incognito/private mode for testing
   ```

2. **Check Network Connection**
   - Test on different network
   - Check for network throttling in dev tools

3. **Reduce Resource Usage**
   ```javascript
   // Close other tabs and applications
   // Check memory usage in dev tools
   ```

### High Memory Usage

#### Symptoms
- Browser becomes sluggish
- Tab crashes or reloads
- Device heats up during use

#### Diagnosis
```javascript
// Monitor memory usage
setInterval(() => {
  if (performance.memory) {
    console.log('Memory usage:', {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
    });
  }
}, 10000);
```

#### Solutions

1. **Restart Browser**
   - Close all tabs and restart browser
   - Clear browser cache

2. **Check for Memory Leaks**
   ```javascript
   // Look for growing object counts in dev tools
   // Performance tab → Memory profiling
   ```

3. **Reduce Background Activity**
   - Pause other browser tabs
   - Close unnecessary applications

---

## Build & Deployment Issues

### Build Failures

#### Common Error: "Module not found"
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors
```bash
# Check TypeScript compilation
npm run type-check

# Fix type errors or temporarily skip
npm run build -- --ignore-ts-errors
```

#### Out of Memory Errors
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Deployment Issues

#### 404 Errors on GitHub Pages
```javascript
// Check basePath configuration in next.config.mjs
console.log('Base path:', process.env.NEXT_PUBLIC_BASE_PATH);

// Verify asset paths
console.log('Asset paths should include base path for production');
```

#### Service Worker Not Updating
```bash
# Force service worker update in browser
# Application tab → Service Workers → Update
```

#### Assets Not Loading
```bash
# Check build output
ls -la out/
# Verify all required files are present
```

---

## Browser Compatibility

### Safari Issues

#### Audio Problems on iOS Safari
```javascript
// iOS Safari requires user interaction for audio
document.addEventListener('touchstart', () => {
  window.audioManager?.initialize();
}, { once: true });
```

#### Wake Lock Not Working
```javascript
// Wake Lock API not supported in Safari
// Fallback: Use video element to prevent sleep
const video = document.createElement('video');
video.src = 'data:video/mp4;base64,AAAAHGZ0eXBNUDQyAAACAA==';
video.setAttribute('loop', '');
video.setAttribute('muted', '');
video.setAttribute('playsinline', '');
video.play();
```

### Firefox Issues

#### Web Worker Path Issues
```javascript
// Ensure worker paths are absolute
const worker = new Worker('/workers/timer-worker.js');
```

#### Audio Context Suspended
```javascript
// Resume audio context on user interaction
document.addEventListener('click', () => {
  if (window.audioContext?.state === 'suspended') {
    window.audioContext.resume();
  }
}, { once: true });
```

### Chrome Issues

#### Extension Interference
- Disable browser extensions
- Test in incognito mode

#### Memory Limitations
- Chrome may limit memory for background tabs
- Keep timer tab active during workouts

---

## Development Issues

### Hot Reload Not Working

```bash
# Check Next.js version compatibility
npm list next

# Clear Next.js cache
rm -rf .next
npm run dev
```

### TypeScript Errors in IDE

```bash
# Restart TypeScript language server
# VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Check TypeScript version
npx tsc --version
```

### Test Failures

```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests in watch mode for debugging
npm run test:watch

# Check Playwright browser installation
npx playwright install
```

### Environment Variables Not Loading

```bash
# Check .env.local file exists and format
cat .env.local

# Restart development server
npm run dev
```

---

## Still Having Issues?

### Report a Bug
1. **Check existing issues**: [GitHub Issues](https://github.com/angeldimitrov/sports-timer/issues)
2. **Use bug report template** with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS details
   - Console error messages
   - Screenshots if relevant

### Get Help
- **GitHub Discussions**: General questions and community help
- **Stack Overflow**: Technical questions (tag: boxing-timer)
- **Email Support**: For urgent issues

### Debug Information to Include
When reporting issues, include:

```javascript
// Run in browser console and include output
console.log('Debug Info:', {
  url: location.href,
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString(),
  localStorage: Object.keys(localStorage).filter(key => key.includes('boxing-timer')),
  errors: window.errorLog || [],
  features: {
    webAudio: !!(window.AudioContext || window.webkitAudioContext),
    webWorkers: !!window.Worker,
    wakeLock: 'wakeLock' in navigator,
    serviceWorker: 'serviceWorker' in navigator
  }
});
```

This troubleshooting guide should help resolve most common issues. For complex problems, don't hesitate to reach out to the community or maintainers!