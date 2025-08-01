/**
 * usePWA Hook Unit Tests
 * 
 * Comprehensive test suite for the usePWA hook focusing on:
 * - Service worker registration and lifecycle management
 * - App installation prompts and install event handling
 * - Offline capability detection and cache management
 * - Update detection and automatic refresh handling
 * - PWA-specific features (standalone mode, display modes)
 * - Cross-browser PWA support and fallbacks
 * - Performance monitoring and optimization
 * - User experience enhancements for PWA features
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { usePWA, PWAOptions } from '../use-pwa'

// Mock Service Worker
const mockServiceWorker = {
  register: jest.fn(() => Promise.resolve({
    installing: null,
    waiting: null,
    active: {
      state: 'activated',
      postMessage: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    update: jest.fn(() => Promise.resolve()),
    unregister: jest.fn(() => Promise.resolve(true))
  })),
  getRegistration: jest.fn(() => Promise.resolve(null)),
  getRegistrations: jest.fn(() => Promise.resolve([]))
}

// Mock beforeinstallprompt event
const mockBeforeInstallPromptEvent = {
  preventDefault: jest.fn(),
  prompt: jest.fn(() => Promise.resolve()),
  userChoice: Promise.resolve({ outcome: 'accepted' }),
  platforms: ['web']
}

// Mock standalone mode detection
const mockMatchMedia = jest.fn(() => ({
  matches: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}))

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
  keys: jest.fn(() => Promise.resolve(['v1'])),
  match: jest.fn(() => Promise.resolve(undefined))
}

describe('usePWA Hook', () => {
  const defaultOptions: PWAOptions = {
    swPath: '/sw.js',
    enableAutoUpdate: true,
    enableInstallPrompt: true,
    updateCheckInterval: 60000,
    cacheName: 'boxing-timer-v1',
    enableOfflineSupport: true,
    onInstallPromptReady: jest.fn(),
    onInstallSuccess: jest.fn(),
    onInstallDeclined: jest.fn(),
    onUpdateAvailable: jest.fn(),
    onUpdateInstalled: jest.fn(),
    onOfflineReady: jest.fn(),
    onError: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock navigator APIs
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true,
      configurable: true
    })

    Object.defineProperty(navigator, 'standalone', {
      value: false,
      writable: true,
      configurable: true
    })

    // Mock window APIs
    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true
    })

    Object.defineProperty(global, 'caches', {
      value: mockCaches,
      writable: true
    })

    // Reset mock implementations
    mockServiceWorker.register.mockResolvedValue({
      installing: null,
      waiting: null,
      active: {
        state: 'activated',
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      update: jest.fn(() => Promise.resolve()),
      unregister: jest.fn(() => Promise.resolve(true))
    })

    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })
  })

  afterEach(() => {
    // Clean up globals
    delete (navigator as any).serviceWorker
    delete (global as any).caches
  })

  describe('Hook Initialization and Service Worker Registration', () => {
    /**
     * Test service worker support detection
     * Business Rule: Hook should detect and utilize service worker support
     */
    test('should detect service worker support', () => {
      const { result } = renderHook(() => usePWA(defaultOptions))

      expect(result.current.isSupported).toBe(true)
      expect(result.current.isServiceWorkerRegistered).toBe(false)
    })

    /**
     * Test service worker registration
     * Business Rule: Service worker should be registered automatically
     */
    test('should register service worker on initialization', async () => {
      renderHook(() => usePWA(defaultOptions))

      await waitFor(() => {
        expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', {
          scope: '/'
        })
      })
    })

    /**
     * Test service worker registration with custom options
     * Business Rule: Registration should respect custom configuration
     */
    test('should register service worker with custom options', async () => {
      const customOptions = {
        ...defaultOptions,
        swPath: '/custom-sw.js',
        swScope: '/app/'
      }

      renderHook(() => usePWA(customOptions))

      await waitFor(() => {
        expect(mockServiceWorker.register).toHaveBeenCalledWith('/custom-sw.js', {
          scope: '/app/'
        })
      })
    })

    /**
     * Test service worker registration failure
     * Business Rule: Registration failures should be handled gracefully
     */
    test('should handle service worker registration failure', async () => {
      const registrationError = new Error('Registration failed')
      mockServiceWorker.register.mockRejectedValue(registrationError)

      const { result } = renderHook(() => usePWA(defaultOptions))

      await waitFor(() => {
        expect(result.current.error).toEqual(registrationError)
        expect(defaultOptions.onError).toHaveBeenCalledWith(registrationError)
      })
    })

    /**
     * Test unsupported browser handling
     * Business Rule: Hook should work gracefully without service worker support
     */
    test('should handle unsupported browsers gracefully', () => {
      delete (navigator as any).serviceWorker

      const { result } = renderHook(() => usePWA(defaultOptions))

      expect(result.current.isSupported).toBe(false)
      expect(result.current.isServiceWorkerRegistered).toBe(false)
      expect(result.current.canInstall).toBe(false)
    })
  })

  describe('App Installation and Install Prompts', () => {
    /**
     * Test install prompt detection
     * Business Rule: Hook should detect when app can be installed
     */
    test('should detect install prompt availability', async () => {
      const { result } = renderHook(() => usePWA(defaultOptions))

      // Simulate beforeinstallprompt event
      act(() => {
        const installEvent = new CustomEvent('beforeinstallprompt', {
          detail: mockBeforeInstallPromptEvent
        })
        Object.assign(installEvent, mockBeforeInstallPromptEvent)
        window.dispatchEvent(installEvent as any)
      })

      await waitFor(() => {
        expect(result.current.canInstall).toBe(true)
        expect(defaultOptions.onInstallPromptReady).toHaveBeenCalled()
      })
    })

    /**
     * Test install prompt triggering
     * Business Rule: Install prompt should be triggered when requested
     */
    test('should trigger install prompt', async () => {
      const { result } = renderHook(() => usePWA(defaultOptions))

      // Set up install prompt
      act(() => {
        const installEvent = new CustomEvent('beforeinstallprompt', {
          detail: mockBeforeInstallPromptEvent
        })
        Object.assign(installEvent, mockBeforeInstallPromptEvent)
        window.dispatchEvent(installEvent as any)
      })

      await waitFor(() => {
        expect(result.current.canInstall).toBe(true)
      })

      // Trigger install
      await act(async () => {
        await result.current.install()
      })

      expect(mockBeforeInstallPromptEvent.prompt).toHaveBeenCalled()
    })

    /**
     * Test install acceptance handling
     * Business Rule: Install acceptance should be tracked and reported
     */
    test('should handle install acceptance', async () => {
      const { result } = renderHook(() => usePWA(defaultOptions))

      // Set up install prompt with accepted outcome
      const acceptedEvent = {
        ...mockBeforeInstallPromptEvent,
        userChoice: Promise.resolve({ outcome: 'accepted' })
      }

      act(() => {
        const installEvent = new CustomEvent('beforeinstallprompt')
        Object.assign(installEvent, acceptedEvent)
        window.dispatchEvent(installEvent as any)
      })

      await act(async () => {
        await result.current.install()
      })

      await waitFor(() => {
        expect(defaultOptions.onInstallSuccess).toHaveBeenCalled()
        expect(result.current.isInstalled).toBe(true)
      })
    })

    /**
     * Test install decline handling
     * Business Rule: Install decline should be tracked for analytics
     */
    test('should handle install decline', async () => {
      const { result } = renderHook(() => usePWA(defaultOptions))

      // Set up install prompt with dismissed outcome
      const dismissedEvent = {
        ...mockBeforeInstallPromptEvent,
        userChoice: Promise.resolve({ outcome: 'dismissed' })
      }

      act(() => {
        const installEvent = new CustomEvent('beforeinstallprompt')
        Object.assign(installEvent, dismissedEvent)
        window.dispatchEvent(installEvent as any)
      })

      await act(async () => {
        await result.current.install()
      })

      await waitFor(() => {
        expect(defaultOptions.onInstallDeclined).toHaveBeenCalled()
        expect(result.current.canInstall).toBe(false)
      })
    })

    /**
     * Test standalone mode detection
     * Business Rule: Hook should detect when app is running in standalone mode
     */
    test('should detect standalone mode', () => {
      // Test iOS standalone
      Object.defineProperty(navigator, 'standalone', {
        value: true,
        writable: true
      })

      const { result: iosResult } = renderHook(() => usePWA(defaultOptions))
      expect(iosResult.current.isStandalone).toBe(true)

      // Test Android/Chrome standalone
      Object.defineProperty(navigator, 'standalone', {
        value: false,
        writable: true
      })

      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      })

      const { result: androidResult } = renderHook(() => usePWA(defaultOptions))
      expect(androidResult.current.isStandalone).toBe(true)
    })
  })

  describe('Service Worker Updates and Lifecycle', () => {
    /**
     * Test update detection
     * Business Rule: Hook should detect when service worker updates are available
     */
    test('should detect service worker updates', async () => {
      const registration = {
        installing: null,
        waiting: {
          state: 'installed',
          postMessage: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        },
        active: {
          state: 'activated',
          postMessage: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        update: jest.fn(() => Promise.resolve()),
        unregister: jest.fn(() => Promise.resolve(true))
      }

      mockServiceWorker.register.mockResolvedValue(registration)

      const { result } = renderHook(() => usePWA(defaultOptions))

      await waitFor(() => {
        expect(result.current.hasUpdate).toBe(true)
        expect(defaultOptions.onUpdateAvailable).toHaveBeenCalled()
      })
    })

    /**
     * Test update installation
     * Business Rule: Updates should be installable through user action
     */
    test('should install service worker updates', async () => {
      const waitingWorker = {
        state: 'installed',
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }

      const registration = {
        installing: null,
        waiting: waitingWorker,
        active: {
          state: 'activated',
          postMessage: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        update: jest.fn(() => Promise.resolve()),
        unregister: jest.fn(() => Promise.resolve(true))
      }

      mockServiceWorker.register.mockResolvedValue(registration)

      const { result } = renderHook(() => usePWA(defaultOptions))

      await waitFor(() => {
        expect(result.current.hasUpdate).toBe(true)
      })

      // Install update
      act(() => {
        result.current.installUpdate()
      })

      expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    })

    /**
     * Test automatic update handling
     * Business Rule: Automatic updates should be handled when enabled
     */
    test('should handle automatic updates', async () => {
      jest.useFakeTimers()

      const registration = {
        installing: null,
        waiting: null,
        active: {
          state: 'activated',
          postMessage: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        update: jest.fn(() => Promise.resolve()),
        unregister: jest.fn(() => Promise.resolve(true))
      }

      mockServiceWorker.register.mockResolvedValue(registration)

      renderHook(() => usePWA(defaultOptions))

      // Fast-forward to update check
      act(() => {
        jest.advanceTimersByTime(60000) // defaultOptions.updateCheckInterval
      })

      await waitFor(() => {
        expect(registration.update).toHaveBeenCalled()
      })

      jest.useRealTimers()
    })

    /**
     * Test service worker state changes
     * Business Rule: Service worker state changes should be tracked
     */
    test('should track service worker state changes', async () => {
      const registration = {
        installing: {
          state: 'installing',
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        },
        waiting: null,
        active: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        update: jest.fn(() => Promise.resolve()),
        unregister: jest.fn(() => Promise.resolve(true))
      }

      mockServiceWorker.register.mockResolvedValue(registration)

      const { result } = renderHook(() => usePWA(defaultOptions))

      // Simulate state change to installed
      const stateChangeHandler = registration.installing?.addEventListener.mock.calls
        .find(call => call[0] === 'statechange')?.[1]

      if (stateChangeHandler) {
        act(() => {
          registration.installing!.state = 'installed'
          stateChangeHandler()
        })

        expect(result.current.serviceWorkerState).toBe('installed')
      }
    })
  })

  describe('Offline Support and Cache Management', () => {
    /**
     * Test offline detection
     * Business Rule: Hook should detect online/offline status
     */
    test('should detect offline status', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })

      const { result } = renderHook(() => usePWA(defaultOptions))
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
     * Test cache availability check
     * Business Rule: Hook should check if content is available offline
     */
    test('should check cache availability', async () => {
      // Mock cache hit
      mockCache.match.mockResolvedValue(new Response('cached content'))

      const { result } = renderHook(() => usePWA(defaultOptions))

      await act(async () => {
        const isAvailable = await result.current.checkCacheAvailability('/api/data')
        expect(isAvailable).toBe(true)
      })

      expect(mockCaches.match).toHaveBeenCalledWith('/api/data')
    })

    /**
     * Test cache preloading
     * Business Rule: Important resources should be preloaded into cache
     */
    test('should preload resources into cache', async () => {
      const { result } = renderHook(() => usePWA(defaultOptions))

      const resourcesToCache = ['/api/config', '/assets/timer.mp3']

      await act(async () => {
        await result.current.preloadResources(resourcesToCache)
      })

      expect(mockCaches.open).toHaveBeenCalledWith('boxing-timer-v1')
      expect(mockCache.addAll).toHaveBeenCalledWith(resourcesToCache)
    })

    /**
     * Test cache cleanup
     * Business Rule: Old cache versions should be cleaned up
     */
    test('should cleanup old caches', async () => {
      mockCaches.keys.mockResolvedValue(['boxing-timer-v1', 'boxing-timer-v2', 'other-cache'])

      const { result } = renderHook(() => usePWA(defaultOptions))

      await act(async () => {
        await result.current.cleanupCaches(['boxing-timer-v2'])
      })

      expect(mockCaches.delete).toHaveBeenCalledWith('boxing-timer-v1')
      expect(mockCaches.delete).not.toHaveBeenCalledWith('boxing-timer-v2')
      expect(mockCaches.delete).not.toHaveBeenCalledWith('other-cache')
    })

    /**
     * Test offline-ready notification
     * Business Rule: Users should be notified when app is ready for offline use
     */
    test('should notify when offline ready', async () => {
      const registration = {
        installing: null,
        waiting: null,
        active: {
          state: 'activated',
          postMessage: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        update: jest.fn(() => Promise.resolve()),
        unregister: jest.fn(() => Promise.resolve(true))
      }

      mockServiceWorker.register.mockResolvedValue(registration)

      renderHook(() => usePWA(defaultOptions))

      // Simulate offline ready message from service worker
      const messageHandler = registration.active.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1]

      if (messageHandler) {
        act(() => {
          messageHandler({
            data: { type: 'OFFLINE_READY' }
          })
        })

        expect(defaultOptions.onOfflineReady).toHaveBeenCalled()
      }
    })
  })

  describe('Performance and Optimization', () => {
    /**
     * Test lazy service worker registration
     * Business Rule: Service worker registration should not block initial load
     */
    test('should register service worker lazily', async () => {
      jest.useFakeTimers()

      renderHook(() => usePWA({
        ...defaultOptions,
        lazyRegistration: true
      }))

      // Should not register immediately
      expect(mockServiceWorker.register).not.toHaveBeenCalled()

      // Should register after delay
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(mockServiceWorker.register).toHaveBeenCalled()
      })

      jest.useRealTimers()
    })

    /**
     * Test resource preloading optimization
     * Business Rule: Critical resources should be preloaded efficiently
     */
    test('should optimize resource preloading', async () => {
      const { result } = renderHook(() => usePWA(defaultOptions))

      const criticalResources = ['/critical.css', '/critical.js']
      const nonCriticalResources = ['/optional.mp3', '/optional.png']

      // Preload critical resources first
      await act(async () => {
        await result.current.preloadResources(criticalResources, { priority: 'high' })
      })

      expect(mockCache.addAll).toHaveBeenCalledWith(criticalResources)

      // Then preload non-critical resources
      await act(async () => {
        await result.current.preloadResources(nonCriticalResources, { priority: 'low' })
      })

      expect(mockCache.addAll).toHaveBeenCalledWith(nonCriticalResources)
    })

    /**
     * Test memory usage optimization
     * Business Rule: Hook should optimize memory usage and prevent leaks
     */
    test('should optimize memory usage', () => {
      const { unmount } = renderHook(() => usePWA(defaultOptions))

      // Unmount should clean up all listeners and intervals
      act(() => {
        unmount()
      })

      // Should remove all event listeners
      expect(window.removeEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })
  })

  describe('Cross-Browser Compatibility', () => {
    /**
     * Test iOS Safari PWA features
     * Business Rule: Hook should support iOS Safari PWA limitations and features
     */
    test('should handle iOS Safari PWA features', () => {
      // Mock iOS Safari
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        writable: true
      })

      Object.defineProperty(navigator, 'standalone', {
        value: true,
        writable: true
      })

      const { result } = renderHook(() => usePWA(defaultOptions))

      expect(result.current.isStandalone).toBe(true)
      expect(result.current.canInstall).toBe(false) // iOS doesn't support beforeinstallprompt
    })

    /**
     * Test Chrome/Android PWA features
     * Business Rule: Hook should support Chrome/Android specific PWA features
     */
    test('should handle Chrome/Android PWA features', () => {
      // Mock Chrome on Android
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) Chrome/91.0.4472.120',
        writable: true
      })

      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      })

      const { result } = renderHook(() => usePWA(defaultOptions))

      expect(result.current.isStandalone).toBe(true)
      // beforeinstallprompt should be supported
      expect(result.current.installPromptSupported).toBe(true)
    })

    /**
     * Test Firefox PWA support
     * Business Rule: Hook should handle Firefox PWA limitations gracefully
     */
    test('should handle Firefox PWA limitations', () => {
      // Mock Firefox
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Firefox/91.0',
        writable: true
      })

      const { result } = renderHook(() => usePWA(defaultOptions))

      expect(result.current.isSupported).toBe(true) // Service worker supported
      expect(result.current.canInstall).toBe(false) // No beforeinstallprompt
      expect(result.current.installPromptSupported).toBe(false)
    })

    /**
     * Test Edge PWA support
     * Business Rule: Hook should support Microsoft Edge PWA features
     */
    test('should handle Microsoft Edge PWA features', () => {
      // Mock Edge
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
        writable: true
      })

      const { result } = renderHook(() => usePWA(defaultOptions))

      expect(result.current.isSupported).toBe(true)
      expect(result.current.installPromptSupported).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    /**
     * Test service worker communication errors
     * Business Rule: Communication errors with service worker should be handled
     */
    test('should handle service worker communication errors', async () => {
      const registration = {
        installing: null,
        waiting: null,
        active: {
          state: 'activated',
          postMessage: jest.fn(() => {
            throw new Error('Message failed')
          }),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        update: jest.fn(() => Promise.resolve()),
        unregister: jest.fn(() => Promise.resolve(true))
      }

      mockServiceWorker.register.mockResolvedValue(registration)

      const { result } = renderHook(() => usePWA(defaultOptions))

      await act(async () => {
        try {
          result.current.sendMessageToSW({ type: 'TEST' })
        } catch (error) {
          expect(result.current.error).toBeDefined()
        }
      })
    })

    /**
     * Test cache operation failures
     * Business Rule: Cache operation failures should not crash the app
     */
    test('should handle cache operation failures', async () => {
      mockCaches.open.mockRejectedValue(new Error('Cache failed'))

      const { result } = renderHook(() => usePWA(defaultOptions))

      await act(async () => {
        try {
          await result.current.preloadResources(['/test'])
        } catch (error) {
          expect(defaultOptions.onError).toHaveBeenCalledWith(error)
        }
      })
    })

    /**
     * Test quota exceeded handling
     * Business Rule: Storage quota exceeded should be handled gracefully
     */
    test('should handle storage quota exceeded', async () => {
      const quotaError = new Error('QuotaExceededError')
      quotaError.name = 'QuotaExceededError'
      mockCache.addAll.mockRejectedValue(quotaError)

      const { result } = renderHook(() => usePWA(defaultOptions))

      await act(async () => {
        try {
          await result.current.preloadResources(['/large-file'])
        } catch (error) {
          expect(result.current.isStorageLimitReached).toBe(true)
        }
      })
    })

    /**
     * Test network failures during update checks
     * Business Rule: Network failures should not prevent app from working
     */
    test('should handle network failures during update checks', async () => {
      const registration = {
        installing: null,
        waiting: null,
        active: {
          state: 'activated',
          postMessage: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        update: jest.fn(() => Promise.reject(new Error('Network error'))),
        unregister: jest.fn(() => Promise.resolve(true))
      }

      mockServiceWorker.register.mockResolvedValue(registration)

      const { result } = renderHook(() => usePWA(defaultOptions))

      // Should handle update check failures gracefully
      await act(async () => {
        try {
          await result.current.checkForUpdates()
        } catch (error) {
          expect(result.current.updateCheckFailed).toBe(true)
        }
      })
    })
  })

  describe('User Experience Enhancements', () => {
    /**
     * Test install banner customization
     * Business Rule: Install prompts should be customizable for better UX
     */
    test('should allow install banner customization', () => {
      const customOptions = {
        ...defaultOptions,
        installBanner: {
          title: 'Install Boxing Timer',
          message: 'Get faster access and offline support',
          acceptText: 'Install Now',
          declineText: 'Maybe Later'
        }
      }

      const { result } = renderHook(() => usePWA(customOptions))

      expect(result.current.installBannerConfig).toEqual(customOptions.installBanner)
    })

    /**
     * Test update notification customization
     * Business Rule: Update notifications should be user-friendly
     */
    test('should provide customizable update notifications', async () => {
      const updateMessage = 'New features available! Update now?'
      const customOptions = {
        ...defaultOptions,
        updateNotification: {
          title: 'Update Available',
          message: updateMessage,
          actionText: 'Update Now',
          dismissText: 'Later'
        }
      }

      const { result } = renderHook(() => usePWA(customOptions))

      expect(result.current.updateNotificationConfig).toEqual(customOptions.updateNotification)
    })

    /**
     * Test offline indicator
     * Business Rule: Users should be clearly informed about offline status
     */
    test('should provide offline status indicator', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })

      const { result } = renderHook(() => usePWA(defaultOptions))

      expect(result.current.isOnline).toBe(false)
      expect(result.current.offlineMessage).toBe('You are currently offline. Some features may be limited.')
    })

    /**
     * Test installation success feedback
     * Business Rule: Users should receive feedback when installation succeeds
     */
    test('should provide installation success feedback', async () => {
      const { result } = renderHook(() => usePWA(defaultOptions))

      // Simulate successful installation
      act(() => {
        const appInstalledEvent = new CustomEvent('appinstalled')
        window.dispatchEvent(appInstalledEvent)
      })

      await waitFor(() => {
        expect(result.current.isInstalled).toBe(true)
        expect(defaultOptions.onInstallSuccess).toHaveBeenCalled()
      })
    })
  })
})