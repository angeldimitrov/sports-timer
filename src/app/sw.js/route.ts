import { NextRequest, NextResponse } from 'next/server';

/**
 * Dynamic Service Worker Generation Route
 * 
 * Generates the service worker with correct base paths for GitHub Pages deployment.
 * This ensures offline caching and PWA functionality work correctly both in 
 * development (no base path) and production (with /sports-timer base path).
 * 
 * The service worker includes:
 * - Proper asset caching with base path resolution
 * - Offline functionality for the boxing timer
 * - Background sync for settings persistence
 * - Push notification support
 * - Mobile-specific optimizations
 */

export async function GET(request: NextRequest) {
  // Get the base path from environment variable
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  // Helper function to create full URLs with base path
  const createUrl = (path: string) => `${basePath}${path}`;
  
  // Generate the service worker JavaScript code
  const serviceWorkerCode = `
/**
 * Service Worker for Boxing Timer MVP
 * 
 * Provides offline functionality and caching for the boxing timer application.
 * Implements cache-first strategy for static assets and network-first for dynamic content.
 * 
 * Features:
 * - Offline caching of core timer functionality
 * - Background sync for settings persistence
 * - Push notification support for workout reminders
 * - Automatic cache management and updates
 * - Performance optimization for mobile devices
 * - Dynamic base path support for GitHub Pages
 */

const BASE_PATH = '${basePath}';
const CACHE_NAME = 'boxing-timer-v3-basepath';
const OFFLINE_URL = BASE_PATH + '/offline.html';

// Helper function to create URLs with base path
function createUrl(path) {
  return BASE_PATH + path;
}

// Assets to cache for offline functionality
const STATIC_CACHE_URLS = [
  createUrl('/'),
  createUrl('/offline.html'),
  createUrl('/sounds/bell.mp3'),
  createUrl('/sounds/end-of-the-round.mp3'),
  createUrl('/sounds/get-ready.mp3'),
  createUrl('/sounds/great-job.mp3'),
  createUrl('/sounds/next-round-ten.mp3'),
  createUrl('/sounds/rest.mp3'),
  createUrl('/sounds/round-starts.mp3'),
  createUrl('/sounds/ten-seconds.mp3'),
  createUrl('/sounds/warning-beep.mp3'),
  createUrl('/sounds/workout-complete.mp3'),
  createUrl('/workers/timer-worker.js'),
  createUrl('/manifest.json')
];

// Dynamic content patterns (network-first strategy)
const DYNAMIC_CACHE_PATTERNS = [
  /\\/_next\\/static\\//,
  /\\/api\\//
];

// Install event - cache essential resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker with base path:', BASE_PATH);
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache static assets with error handling
        const cachePromises = STATIC_CACHE_URLS.map(async url => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(\`[SW] Cached: \${url}\`);
            }
          } catch (error) {
            console.warn(\`[SW] Failed to cache \${url}:\`, error);
          }
        });
        
        await Promise.allSettled(cachePromises);
        
        // Cache the offline page separately to ensure it's available
        try {
          await cache.add(OFFLINE_URL);
        } catch (error) {
          console.warn('[SW] Failed to cache offline page:', error);
        }
        
        console.log('[SW] Installation complete');
        
        // Force activation of new service worker
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation failed:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const deletionPromises = cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log(\`[SW] Deleting old cache: \${name}\`);
            return caches.delete(name);
          });
        
        await Promise.all(deletionPromises);
        
        // Take control of all open tabs
        await clients.claim();
        
        console.log('[SW] Activation complete');
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Handle navigation requests (pages)
        if (request.mode === 'navigate') {
          return await handleNavigationRequest(request);
        }
        
        // Handle static assets (cache-first)
        if (isStaticAsset(url)) {
          return await handleStaticAsset(request);
        }
        
        // Handle dynamic content (network-first)
        if (isDynamicContent(url)) {
          return await handleDynamicContent(request);
        }
        
        // Handle audio files with special caching
        if (isAudioFile(url)) {
          return await handleAudioFile(request);
        }
        
        // Default: try network first, fallback to cache
        return await handleDefault(request);
        
      } catch (error) {
        console.error('[SW] Fetch error:', error);
        return await handleFetchError(request);
      }
    })()
  );
});

/**
 * Handle navigation requests (HTML pages)
 * Network-first with offline fallback
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first for fresh content
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful response
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache...');
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page as last resort
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback response if offline page not available
    return new Response(
      \`<!DOCTYPE html>
       <html>
         <head>
           <title>Boxing Timer - Offline</title>
           <meta name="viewport" content="width=device-width, initial-scale=1">
           <style>
             body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 2rem; }
             h1 { color: #dc2626; }
           </style>
         </head>
         <body>
           <h1>Boxing Timer</h1>
           <p>You're offline. Please check your internet connection.</p>
           <button onclick="location.reload()">Try Again</button>
         </body>
       </html>\`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

/**
 * Handle static assets (JS, CSS, images)
 * Cache-first strategy for better performance
 */
async function handleStaticAsset(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fetch from network and cache
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Failed to fetch static asset:', request.url, error);
    
    // Return a fallback for critical assets
    if (request.url.includes('.js') || request.url.includes('.css')) {
      return new Response('', { status: 200 });
    }
    
    throw error;
  }
}

/**
 * Handle dynamic content
 * Network-first with cache fallback
 */
async function handleDynamicContent(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Handle audio files with special caching
 * Essential for offline timer functionality
 */
async function handleAudioFile(request) {
  // Try cache first (audio files rarely change)
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Always cache audio files for offline use
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Audio file not available:', request.url);
    
    // For audio files, we could generate a silent audio response
    // This prevents timer from breaking when audio is unavailable
    const silentAudio = new ArrayBuffer(44); // Minimal WAV header
    return new Response(silentAudio, {
      status: 200,
      headers: { 'Content-Type': 'audio/wav' }
    });
  }
}

/**
 * Default fetch handler
 */
async function handleDefault(request) {
  // Try network first
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Handle fetch errors
 */
async function handleFetchError(request) {
  console.error('[SW] All fetch strategies failed for:', request.url);
  
  // Return appropriate error response based on request type
  if (request.destination === 'document') {
    const offlineResponse = await caches.match(OFFLINE_URL);
    return offlineResponse || new Response('Offline', { status: 503 });
  }
  
  return new Response('Network Error', { status: 503 });
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url) {
  return url.pathname.includes('/_next/static/') ||
         url.pathname.includes('/static/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.ico') ||
         url.pathname.endsWith('.woff') ||
         url.pathname.endsWith('.woff2');
}

/**
 * Check if URL is dynamic content
 */
function isDynamicContent(url) {
  return DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

/**
 * Check if URL is an audio file
 */
function isAudioFile(url) {
  return url.pathname.endsWith('.mp3') ||
         url.pathname.endsWith('.wav') ||
         url.pathname.endsWith('.ogg') ||
         url.pathname.includes('/sounds/');
}

// Background sync for settings persistence
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-timer-settings') {
    event.waitUntil(syncTimerSettings());
  }
});

/**
 * Sync timer settings when network becomes available
 */
async function syncTimerSettings() {
  try {
    // Get pending settings from IndexedDB or localStorage
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_SETTINGS',
        message: 'Syncing timer settings...'
      });
    });
    
    console.log('[SW] Timer settings sync completed');
  } catch (error) {
    console.error('[SW] Timer settings sync failed:', error);
  }
}

// Push notification handling for workout reminders
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'Time for your boxing workout!',
    icon: createUrl('/icons/icon-192x192.svg'),
    badge: createUrl('/icons/icon-72x72.svg'),
    vibrate: [200, 100, 200],
    data: {
      url: createUrl('/'),
      action: 'start-workout'
    },
    actions: [
      {
        action: 'start-now',
        title: 'Start Now',
        icon: createUrl('/icons/icon-96x96.svg')
      },
      {
        action: 'snooze',
        title: 'Remind Later',
        icon: createUrl('/icons/icon-96x96.svg')
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Boxing Timer', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  
  const { action, data } = event.notification;
  event.notification.close();
  
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window' });
      
      // Handle different actions
      switch (action) {
        case 'start-now':
          if (clients.length > 0) {
            // Focus existing tab and start timer
            clients[0].focus();
            clients[0].postMessage({ type: 'START_TIMER' });
          } else {
            // Open new tab and start timer
            await self.clients.openWindow(createUrl('/?autostart=true'));
          }
          break;
          
        case 'snooze':
          // Schedule another notification in 15 minutes
          setTimeout(() => {
            self.registration.showNotification('Boxing Timer Reminder', {
              body: 'Ready for that boxing workout?',
              icon: createUrl('/icons/icon-192x192.svg')
            });
          }, 15 * 60 * 1000);
          break;
          
        default:
          // Default action - open the app
          if (clients.length > 0) {
            clients[0].focus();
          } else {
            await self.clients.openWindow(data?.url || createUrl('/'));
          }
      }
    })()
  );
});

// Handle service worker messages from main thread
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_AUDIO':
      event.waitUntil(cacheAudioFiles(payload));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearOldCaches());
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Cache audio files for offline use
 */
async function cacheAudioFiles(audioUrls) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachePromises = audioUrls.map(url => cache.add(url));
    await Promise.all(cachePromises);
    console.log('[SW] Audio files cached successfully');
  } catch (error) {
    console.error('[SW] Failed to cache audio files:', error);
  }
}

/**
 * Clear old caches
 */
async function clearOldCaches() {
  try {
    const cacheNames = await caches.keys();
    const deletionPromises = cacheNames
      .filter(name => name !== CACHE_NAME)
      .map(name => caches.delete(name));
    
    await Promise.all(deletionPromises);
    console.log('[SW] Old caches cleared');
  } catch (error) {
    console.error('[SW] Failed to clear old caches:', error);
  }
}

// Mobile-specific optimizations
self.addEventListener('freeze', event => {
  console.log('[SW] Page frozen, preparing for background execution');
  // Keep timer worker alive during freeze
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'PAGE_FROZEN' });
    });
  });
});

self.addEventListener('resume', event => {
  console.log('[SW] Page resumed from freeze');
  // Restore timer state
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'PAGE_RESUMED' });
    });
  });
});

// Handle timer precision requests from mobile browsers
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    // Keep service worker alive for precise timing
    console.log('[SW] Keep alive ping received');
    event.ports[0].postMessage({ type: 'KEEP_ALIVE_ACK' });
  }
});

console.log('[SW] Service Worker loaded with mobile optimizations and base path:', BASE_PATH);
`;

  // Return the service worker JavaScript with appropriate headers
  return new NextResponse(serviceWorkerCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=0, must-revalidate', // Don't cache during development
    },
  });
}