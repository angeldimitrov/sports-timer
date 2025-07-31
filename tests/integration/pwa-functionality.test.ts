/**
 * PWA Functionality Integration Tests
 * 
 * Comprehensive integration test suite for Progressive Web App features:
 * - Service Worker registration and lifecycle management
 * - App installation and standalone mode functionality
 * - Offline capability and cache management
 * - Background sync and update mechanisms
 * - Push notifications for timer completion
 * - Cross-platform PWA behavior testing
 * - Performance optimization and resource caching
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { render, screen, fireEvent } from '@testing-library/react'
import { usePWA } from '../../src/hooks/use-pwa'
import { useTimer } from '../../src/hooks/use-timer'
import { TimerConfig } from '../../src/lib/timer-engine'

// Mock Service Worker
const mockServiceWorkerRegistration = {
  installing: null,
  waiting: null,
  active: {
    state: 'activated',
    scriptURL: '/sw.js',
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  scope: '/',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  update: jest.fn(() => Promise.resolve()),
  unregister: jest.fn(() => Promise.resolve(true)),
  pushManager: {
    subscribe: jest.fn(() => Promise.resolve({
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      keys: {
        p256dh: 'test-key',
        auth: 'test-auth'
      }
    })),
    getSubscription: jest.fn(() => Promise.resolve(null))
  }
}

const mockServiceWorker = {
  register: jest.fn(() => Promise.resolve(mockServiceWorkerRegistration)),
  getRegistration: jest.fn(() => Promise.resolve(mockServiceWorkerRegistration)),
  getRegistrations: jest.fn(() => Promise.resolve([mockServiceWorkerRegistration])),
  ready: Promise.resolve(mockServiceWorkerRegistration),
  controller: mockServiceWorkerRegistration.active
}

// Mock Cache API
const mockCache = {
  match: jest.fn(() => Promise.resolve(undefined)),
  add: jest.fn(() => Promise.resolve()),
  addAll: jest.fn(() => Promise.resolve()),
  delete: jest.fn(() => Promise.resolve(true)),
  keys: jest.fn(() => Promise.resolve([])),
  put: jest.fn(() => Promise.resolve())
}

const mockCaches = {
  open: jest.fn(() => Promise.resolve(mockCache)),
  delete: jest.fn(() => Promise.resolve(true)),
  keys: jest.fn(() => Promise.resolve(['boxing-timer-v1'])),
  match: jest.fn(() => Promise.resolve(undefined))
}

// Mock Install Prompt
const mockBeforeInstallPrompt = {
  preventDefault: jest.fn(),
  prompt: jest.fn(() => Promise.resolve()),
  userChoice: Promise.resolve({ outcome: 'accepted' }),
  platforms: ['web']
}

// Mock Notification API
const mockNotification = {
  permission: 'granted' as NotificationPermission,
  requestPermission: jest.fn(() => Promise.resolve('granted' as NotificationPermission))
}

describe('PWA Functionality Integration Tests', () => {
  let mockMessageChannel: MessageChannel
  let mockPort1: MessagePort
  let mockPort2: MessagePort

  const testConfig: TimerConfig = {
    workDuration: 180, // 3 minutes
    restDuration: 60,  // 1 minute
    totalRounds: 3,
    enableWarning: true
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock MessageChannel for Service Worker communication
    mockPort1 = {
      postMessage: jest.fn(),
      onmessage: null,
      onmessageerror: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      start: jest.fn(),
      close: jest.fn()
    } as any

    mockPort2 = { ...mockPort1 } as any

    mockMessageChannel = {
      port1: mockPort1,
      port2: mockPort2
    }

    // Setup global mocks
    Object.defineProperty(global, 'MessageChannel', {
      value: jest.fn(() => mockMessageChannel),
      writable: true
    })

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true,
      configurable: true
    })

    Object.defineProperty(global, 'caches', {
      value: mockCaches,
      writable: true
    })

    Object.defineProperty(global, 'Notification', {
      value: mockNotification,
      writable: true
    })

    // Reset mock implementations
    mockCache.match.mockResolvedValue(undefined)
    mockCaches.match.mockResolvedValue(undefined)
    mockServiceWorker.register.mockResolvedValue(mockServiceWorkerRegistration)
  })

  afterEach(() => {
    // Clean up global mocks
    delete (navigator as any).serviceWorker
    delete (global as any).caches
    delete (global as any).Notification
    delete (global as any).MessageChannel
  })

  describe('Service Worker Registration and Lifecycle', () => {
    /**
     * Test service worker registration during app initialization
     * Business Rule: Service worker should register automatically for PWA functionality
     */
    test('should register service worker on app initialization', async () => {
      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableAutoUpdate: true
      }))

      await waitFor(() => {
        expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', {
          scope: '/'
        })
        expect(result.current.isServiceWorkerRegistered).toBe(true)
      })
    })

    /**
     * Test service worker update detection and handling
     * Business Rule: App should detect and handle service worker updates
     */
    test('should detect and handle service worker updates', async () => {
      const onUpdateAvailable = jest.fn()
      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableAutoUpdate: true,
        onUpdateAvailable
      }))

      // Simulate service worker with waiting update
      mockServiceWorkerRegistration.waiting = {
        state: 'installed',
        scriptURL: '/sw.js',
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      } as any

      await waitFor(() => {
        expect(result.current.hasUpdate).toBe(true)
        expect(onUpdateAvailable).toHaveBeenCalled()
      })

      // Install update
      act(() => {
        result.current.installUpdate()
      })

      expect(mockServiceWorkerRegistration.waiting!.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING'
      })
    })

    /**
     * Test service worker communication for timer state sync
     * Business Rule: Timer state should sync with service worker for background operation
     */
    test('should sync timer state with service worker', async () => {
      const { result: pwaResult } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableAutoUpdate: true
      }))

      const { result: timerResult } = renderHook(() => useTimer({
        config: testConfig
      }))

      await waitFor(() => {
        expect(pwaResult.current.isServiceWorkerRegistered).toBe(true)
      })

      // Start timer
      act(() => {
        timerResult.current.start()
      })

      // Sync timer state with service worker
      act(() => {
        pwaResult.current.sendMessageToSW({
          type: 'TIMER_STATE_SYNC',
          payload: {
            status: timerResult.current.state.status,
            timeRemaining: timerResult.current.state.timeRemaining,
            currentRound: timerResult.current.state.currentRound
          }
        })
      })

      expect(mockServiceWorkerRegistration.active.postMessage).toHaveBeenCalledWith({
        type: 'TIMER_STATE_SYNC',
        payload: expect.objectContaining({
          status: 'running',
          timeRemaining: expect.any(Number),
          currentRound: 1
        })
      })
    })

    /**
     * Test service worker error handling and recovery
     * Business Rule: Service worker errors should not break app functionality
     */
    test('should handle service worker errors gracefully', async () => {
      const onError = jest.fn()
      
      // Mock service worker registration failure
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'))

      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        onError
      }))

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
        expect(result.current.isServiceWorkerRegistered).toBe(false)
      })

      // App should still function without service worker
      expect(result.current.isSupported).toBe(true)
    })
  })

  describe('App Installation and Standalone Mode', () => {
    /**
     * Test install prompt detection and handling
     * Business Rule: App should detect when it can be installed as PWA
     */
    test('should detect and handle install prompt', async () => {
      const onInstallPromptReady = jest.fn()
      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableInstallPrompt: true,
        onInstallPromptReady
      }))

      // Simulate beforeinstallprompt event
      act(() => {
        const event = new CustomEvent('beforeinstallprompt')
        Object.assign(event, mockBeforeInstallPrompt)
        window.dispatchEvent(event as any)
      })

      await waitFor(() => {
        expect(result.current.canInstall).toBe(true)
        expect(onInstallPromptReady).toHaveBeenCalled()
      })

      // Trigger install prompt
      await act(async () => {
        await result.current.install()
      })

      expect(mockBeforeInstallPrompt.prompt).toHaveBeenCalled()
    })

    /**
     * Test standalone mode detection
     * Business Rule: App should detect when running in standalone PWA mode
     */
    test('should detect standalone mode correctly', () => {
      // Test iOS standalone mode
      Object.defineProperty(navigator, 'standalone', {
        value: true,
        writable: true
      })

      const { result: iosResult } = renderHook(() => usePWA({
        swPath: '/sw.js'
      }))

      expect(iosResult.current.isStandalone).toBe(true)

      // Test Android/Chrome standalone mode
      Object.defineProperty(navigator, 'standalone', {
        value: false,
        writable: true
      })

      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn(() => ({
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        })),
        writable: true
      })

      const { result: androidResult } = renderHook(() => usePWA({
        swPath: '/sw.js'
      }))

      expect(androidResult.current.isStandalone).toBe(true)
    })

    /**
     * Test installation success and failure handling
     * Business Rule: Installation outcomes should be properly tracked
     */
    test('should handle installation outcomes', async () => {
      const onInstallSuccess = jest.fn()
      const onInstallDeclined = jest.fn()

      // Test successful installation
      const { result: successResult } = renderHook(() => usePWA({
        swPath: '/sw.js',
        onInstallSuccess,
        onInstallDeclined
      }))

      const acceptedPrompt = {
        ...mockBeforeInstallPrompt,
        userChoice: Promise.resolve({ outcome: 'accepted' })
      }

      act(() => {
        const event = new CustomEvent('beforeinstallprompt')
        Object.assign(event, acceptedPrompt)
        window.dispatchEvent(event as any)
      })

      await act(async () => {
        await successResult.current.install()
      })

      await waitFor(() => {
        expect(onInstallSuccess).toHaveBeenCalled()
      })

      // Test declined installation
      const { result: declineResult } = renderHook(() => usePWA({
        swPath: '/sw.js',
        onInstallSuccess,
        onInstallDeclined
      }))

      const declinedPrompt = {
        ...mockBeforeInstallPrompt,
        userChoice: Promise.resolve({ outcome: 'dismissed' })
      }

      act(() => {
        const event = new CustomEvent('beforeinstallprompt')
        Object.assign(event, declinedPrompt)
        window.dispatchEvent(event as any)
      })

      await act(async () => {
        await declineResult.current.install()
      })

      await waitFor(() => {
        expect(onInstallDeclined).toHaveBeenCalled()
      })
    })
  })

  describe('Offline Capability and Cache Management', () => {
    /**
     * Test offline detection and behavior
     * Business Rule: App should detect online/offline status and adapt behavior
     */
    test('should detect offline status and adapt behavior', () => {
      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableOfflineSupport: true
      }))

      // Initial online state
      expect(result.current.isOnline).toBe(true)

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })

      act(() => {
        const offlineEvent = new Event('offline')
        window.dispatchEvent(offlineEvent)
      })

      expect(result.current.isOnline).toBe(false)

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      })

      act(() => {
        const onlineEvent = new Event('online')
        window.dispatchEvent(onlineEvent)
      })

      expect(result.current.isOnline).toBe(true)
    })

    /**
     * Test cache management for offline functionality
     * Business Rule: Critical resources should be cached for offline use
     */
    test('should manage cache for offline functionality', async () => {
      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableOfflineSupport: true,
        cacheName: 'boxing-timer-v1'
      }))

      // Test resource preloading
      const criticalResources = [
        '/',
        '/static/css/main.css',
        '/static/js/main.js',
        '/sounds/bell.mp3',
        '/sounds/beep.mp3'
      ]

      await act(async () => {
        await result.current.preloadResources(criticalResources)
      })

      expect(mockCaches.open).toHaveBeenCalledWith('boxing-timer-v1')
      expect(mockCache.addAll).toHaveBeenCalledWith(criticalResources)

      // Test cache availability check
      mockCache.match.mockResolvedValue(new Response('cached content'))

      await act(async () => {
        const isAvailable = await result.current.checkCacheAvailability('/sounds/bell.mp3')
        expect(isAvailable).toBe(true)
      })
    })

    /**
     * Test offline timer functionality
     * Business Rule: Timer should work fully offline with cached resources
     */
    test('should support full timer functionality offline', async () => {
      // Set up offline environment
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })

      // Mock cached audio resources
      mockCache.match.mockImplementation((request) => {
        const url = typeof request === 'string' ? request : request.url
        if (url.includes('/sounds/')) {
          return Promise.resolve(new Response(new ArrayBuffer(1024)))
        }
        return Promise.resolve(undefined)
      })

      const { result: pwaResult } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableOfflineSupport: true
      }))

      const { result: timerResult } = renderHook(() => useTimer({
        config: testConfig
      }))

      // Timer should work offline
      act(() => {
        timerResult.current.start()
      })

      expect(timerResult.current.state.status).toBe('running')

      // Audio resources should be available from cache
      await act(async () => {
        const bellAvailable = await pwaResult.current.checkCacheAvailability('/sounds/bell.mp3')
        const beepAvailable = await pwaResult.current.checkCacheAvailability('/sounds/beep.mp3')
        
        expect(bellAvailable).toBe(true)
        expect(beepAvailable).toBe(true)
      })
    })

    /**
     * Test cache cleanup and version management
     * Business Rule: Old cache versions should be cleaned up automatically
     */
    test('should manage cache versions and cleanup', async () => {
      mockCaches.keys.mockResolvedValue([
        'boxing-timer-v1',
        'boxing-timer-v2',
        'boxing-timer-v3'
      ])

      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        cacheName: 'boxing-timer-v3'
      }))

      // Cleanup old cache versions
      await act(async () => {
        await result.current.cleanupCaches(['boxing-timer-v3'])
      })

      expect(mockCaches.delete).toHaveBeenCalledWith('boxing-timer-v1')
      expect(mockCaches.delete).toHaveBeenCalledWith('boxing-timer-v2')
      expect(mockCaches.delete).not.toHaveBeenCalledWith('boxing-timer-v3')
    })
  })

  describe('Background Sync and Notifications', () => {
    /**
     * Test background sync for timer completion
     * Business Rule: Timer completion should sync even when app is backgrounded
     */
    test('should sync timer completion in background', async () => {
      const { result: pwaResult } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableBackgroundSync: true
      }))

      const { result: timerResult } = renderHook(() => useTimer({
        config: testConfig
      }))

      await waitFor(() => {
        expect(pwaResult.current.isServiceWorkerRegistered).toBe(true)
      })

      // Start timer
      act(() => {
        timerResult.current.start()
      })

      // Simulate app going to background
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      })

      act(() => {
        const visibilityEvent = new Event('visibilitychange')
        document.dispatchEvent(visibilityEvent)
      })

      // Complete timer (simulated)
      act(() => {
        timerResult.current.stop()
      })

      // Should register background sync
      expect(mockServiceWorkerRegistration.active.postMessage).toHaveBeenCalledWith({
        type: 'BACKGROUND_SYNC',
        payload: {
          action: 'TIMER_COMPLETED',
          data: expect.objectContaining({
            totalRounds: testConfig.totalRounds,
            workoutDuration: expect.any(Number)
          })
        }
      })
    })

    /**
     * Test push notifications for timer events
     * Business Rule: Users should receive notifications for important timer events
     */
    test('should handle push notifications for timer events', async () => {
      // Setup notification permissions
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        writable: true
      })

      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enablePushNotifications: true
      }))

      await waitFor(() => {
        expect(result.current.isServiceWorkerRegistered).toBe(true)
      })

      // Subscribe to push notifications
      await act(async () => {
        await result.current.subscribeToPushNotifications()
      })

      expect(mockServiceWorkerRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(String)
      })

      // Test notification scheduling
      await act(async () => {
        await result.current.scheduleNotification({
          title: 'Boxing Timer',
          body: 'Round completed! Rest time starting.',
          tag: 'timer-round-complete',
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png'
        })
      })

      expect(mockServiceWorkerRegistration.active.postMessage).toHaveBeenCalledWith({
        type: 'SCHEDULE_NOTIFICATION',
        payload: expect.objectContaining({
          title: 'Boxing Timer',
          body: 'Round completed! Rest time starting.'
        })
      })
    })

    /**
     * Test background timer continuation
     * Business Rule: Timer should continue running accurately in background
     */
    test('should continue timer accurately in background', async () => {
      jest.useFakeTimers()

      const { result: pwaResult } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableBackgroundSync: true
      }))

      const { result: timerResult } = renderHook(() => useTimer({
        config: testConfig
      }))

      // Start timer
      act(() => {
        timerResult.current.start()
      })

      // Advance 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000)
      })

      expect(timerResult.current.state.timeElapsed).toBe(30000)

      // Simulate going to background
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      })

      act(() => {
        const visibilityEvent = new Event('visibilitychange')
        document.dispatchEvent(visibilityEvent)
      })

      // Continue timer in background (advance another 30 seconds)
      act(() => {
        jest.advanceTimersByTime(30000)
      })

      // Return to foreground
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      })

      act(() => {
        const visibilityEvent = new Event('visibilitychange')
        document.dispatchEvent(visibilityEvent)
      })

      // Timer should sync with background time
      expect(timerResult.current.state.timeElapsed).toBe(60000)

      jest.useRealTimers()
    })
  })

  describe('Cross-Platform PWA Behavior', () => {
    /**
     * Test iOS Safari PWA behavior
     * Business Rule: App should work correctly on iOS Safari with PWA limitations
     */
    test('should handle iOS Safari PWA limitations', () => {
      // Mock iOS Safari environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
        writable: true
      })

      Object.defineProperty(navigator, 'standalone', {
        value: true,
        writable: true
      })

      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js'
      }))

      expect(result.current.isStandalone).toBe(true)
      expect(result.current.canInstall).toBe(false) // iOS doesn't support beforeinstallprompt
      expect(result.current.platform).toBe('ios')
    })

    /**
     * Test Android Chrome PWA behavior
     * Business Rule: App should support full PWA features on Android Chrome
     */
    test('should support full PWA features on Android Chrome', async () => {
      // Mock Android Chrome environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        writable: true
      })

      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableInstallPrompt: true
      }))

      expect(result.current.installPromptSupported).toBe(true)
      expect(result.current.platform).toBe('android')

      // Test install prompt
      act(() => {
        const event = new CustomEvent('beforeinstallprompt')
        Object.assign(event, mockBeforeInstallPrompt)
        window.dispatchEvent(event as any)
      })

      await waitFor(() => {
        expect(result.current.canInstall).toBe(true)
      })
    })

    /**
     * Test desktop PWA behavior
     * Business Rule: Desktop PWA should support window controls overlay and shortcuts
     */
    test('should support desktop PWA features', () => {
      // Mock desktop Chrome environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        writable: true
      })

      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn((query) => ({
          matches: query === '(display-mode: standalone)',
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        })),
        writable: true
      })

      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableShortcuts: true
      }))

      expect(result.current.platform).toBe('desktop')
      expect(result.current.isStandalone).toBe(true)
      expect(result.current.supportsShortcuts).toBe(true)
    })
  })

  describe('Performance Optimization', () => {
    /**
     * Test resource preloading strategy
     * Business Rule: Critical resources should be preloaded for optimal performance
     */
    test('should implement optimal resource preloading strategy', async () => {
      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableOfflineSupport: true
      }))

      // Test priority-based preloading
      const criticalResources = ['/app.js', '/app.css']
      const audioResources = ['/sounds/bell.mp3', '/sounds/beep.mp3']
      const optionalResources = ['/images/background.jpg']

      // Preload critical resources first
      await act(async () => {
        await result.current.preloadResources(criticalResources, { priority: 'high' })
      })

      expect(mockCache.addAll).toHaveBeenCalledWith(criticalResources)

      // Then preload audio resources
      await act(async () => {
        await result.current.preloadResources(audioResources, { priority: 'medium' })
      })

      expect(mockCache.addAll).toHaveBeenCalledWith(audioResources)

      // Finally preload optional resources
      await act(async () => {
        await result.current.preloadResources(optionalResources, { priority: 'low' })
      })

      expect(mockCache.addAll).toHaveBeenCalledWith(optionalResources)
    })

    /**
     * Test lazy service worker registration
     * Business Rule: Service worker registration shouldn't block initial app load
     */
    test('should implement lazy service worker registration', async () => {
      jest.useFakeTimers()

      renderHook(() => usePWA({
        swPath: '/sw.js',
        lazyRegistration: true,
        registrationDelay: 2000
      }))

      // Should not register immediately
      expect(mockServiceWorker.register).not.toHaveBeenCalled()

      // Should register after delay
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(mockServiceWorker.register).toHaveBeenCalled()
      })

      jest.useRealTimers()
    })

    /**
     * Test cache size management
     * Business Rule: Cache size should be managed to prevent storage quota issues
     */
    test('should manage cache size to prevent quota issues', async () => {
      // Mock storage estimate API
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn(() => Promise.resolve({
            usage: 50 * 1024 * 1024, // 50MB used
            quota: 100 * 1024 * 1024  // 100MB quota
          }))
        },
        writable: true
      })

      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        maxCacheSize: 80 * 1024 * 1024 // 80MB limit
      }))

      await act(async () => {
        const storageInfo = await result.current.getStorageInfo()
        expect(storageInfo.usagePercentage).toBe(50)
        expect(storageInfo.quotaExceeded).toBe(false)
      })

      // Test cache cleanup when approaching limit
      ;(navigator.storage.estimate as jest.Mock).mockResolvedValue({
        usage: 85 * 1024 * 1024, // 85MB used (over limit)
        quota: 100 * 1024 * 1024
      })

      await act(async () => {
        await result.current.cleanupCache()
      })

      expect(mockCaches.keys).toHaveBeenCalled()
      expect(mockCaches.delete).toHaveBeenCalled()
    })
  })

  describe('Error Handling and Recovery', () => {
    /**
     * Test service worker update failure recovery
     * Business Rule: Update failures should not break the app
     */
    test('should handle service worker update failure gracefully', async () => {
      const onError = jest.fn()
      
      mockServiceWorkerRegistration.update.mockRejectedValue(new Error('Update failed'))

      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableAutoUpdate: true,
        onError
      }))

      await waitFor(() => {
        expect(result.current.isServiceWorkerRegistered).toBe(true)
      })

      // Attempt update
      await act(async () => {
        try {
          await result.current.checkForUpdates()
        } catch (error) {
          // Expected to fail
        }
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(result.current.updateCheckFailed).toBe(true)

      // App should still function
      expect(result.current.isServiceWorkerRegistered).toBe(true)
    })

    /**
     * Test cache operation failure handling
     * Business Rule: Cache failures should not crash the app
     */
    test('should handle cache operation failures', async () => {
      const onError = jest.fn()
      
      mockCaches.open.mockRejectedValue(new Error('Cache failed'))

      const { result } = renderHook(() => usePWA({
        swPath: '/sw.js',
        enableOfflineSupport: true,
        onError
      }))

      await act(async () => {
        try {
          await result.current.preloadResources(['/test-resource'])
        } catch (error) {
          // Expected to fail
        }
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))

      // App should continue to work without caching
      expect(result.current.isOnline).toBe(true)
    })
  })
})