# Clear Browser Cache for Boxing Timer

The old audio files are cached by the service worker. To get the new audio files, you need to clear the cache:

## Method 1: Browser Developer Tools
1. Open Chrome/Safari Developer Tools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Safari)
3. Under **Storage**, click **Clear Storage**
4. Click **Clear site data**
5. Refresh the page (Cmd+R or Ctrl+R)

## Method 2: Browser Console Commands
Open browser console (F12 → Console) and run:
```javascript
// Clear all caches
caches.keys().then(names => {
  names.forEach(name => {
    caches.delete(name);
  });
  console.log('All caches cleared');
});

// Unregister service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    registration.unregister();
  });
  console.log('Service workers unregistered');
});

// Force reload
location.reload(true);
```

## Method 3: Incognito/Private Window
Open the boxing timer in an incognito/private window to bypass all caches.

## Method 4: Force Refresh
- Chrome/Firefox: Ctrl+Shift+R (PC) or Cmd+Shift+R (Mac)
- Safari: Cmd+Option+R

The service worker has been updated with cache version 'boxing-timer-v2-new-audio' so old caches should be automatically cleared on next visit.