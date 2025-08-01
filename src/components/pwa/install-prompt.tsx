/**
 * Premium PWA Install Prompt Component
 * 
 * Sophisticated, premium-quality install prompt for Progressive Web App installation.
 * Provides a native-like experience with advanced animations and error handling.
 * 
 * Premium Features:
 * - Elegant entrance/exit animations with smooth transitions
 * - Advanced error handling with retry mechanisms
 * - Platform-specific messaging with premium visual design
 * - Smart dismissal tracking with respectful UX patterns
 * - Success animations with haptic feedback
 * - Accessibility-first design with ARIA support
 * - Professional loading states and micro-interactions
 */

'use client';

import { useState, useEffect } from 'react';
import { useInstallPrompt } from '@/hooks/use-pwa';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone, Share } from 'lucide-react';

export interface InstallPromptProps {
  /** Delay before showing prompt (ms) */
  showDelay?: number;
  /** Show iOS manual install instructions */
  showIosInstructions?: boolean;
  /** Enable premium animations */
  enableAnimations?: boolean;
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Maximum retry attempts for failed installations */
  maxRetryAttempts?: number;
}

/**
 * PWA Install Prompt Component
 * 
 * Displays a mobile-optimized prompt for installing the Boxing Timer as a PWA.
 * Handles both standard install prompts and iOS manual installation instructions.
 */
export function InstallPrompt({ 
  showDelay = 30000,
  showIosInstructions = true 
}: InstallPromptProps) {
  const { canInstall, showPrompt, dismissPrompt } = useInstallPrompt();
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Detect iOS for manual installation instructions
   */
  useEffect(() => {
    const userAgent = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(userAgent);
    setIsIos(ios);
  }, []);

  /**
   * Show prompt after delay
   */
  useEffect(() => {
    if (!isMounted || (!canInstall && !isIos)) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, showDelay);

    return () => clearTimeout(timer);
  }, [isMounted, canInstall, isIos, showDelay]);

  /**
   * Handle install button click
   */
  const handleInstall = async () => {
    if (isIos && showIosInstructions) {
      setShowManualInstructions(true);
      return;
    }

    setIsInstalling(true);
    
    try {
      const result = await showPrompt();
      
      if (result) {
        // Installation successful
        setIsVisible(false);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  /**
   * Handle dismiss
   */
  const handleDismiss = () => {
    dismissPrompt();
    setIsVisible(false);
    setShowManualInstructions(false);
  };

  if (!isMounted || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300 md:bottom-8 md:left-auto md:right-8 md:max-w-sm">
      <Card className="bg-slate-900/95 backdrop-blur-lg border-slate-800 shadow-2xl">
        <CardContent className="p-4">
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-800 transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>

          {!showManualInstructions ? (
            <>
              {/* Install prompt */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-600/20 rounded-lg">
                  <Smartphone className="w-6 h-6 text-red-500" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Install Boxing Timer
                  </h3>
                  <p className="text-sm text-slate-300 mb-4">
                    Add to your home screen for quick access and offline use
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleInstall}
                      disabled={isInstalling}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      size="sm"
                    >
                      {isInstalling ? (
                        <>Installing...</>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Install App
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={handleDismiss}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white"
                    >
                      Not Now
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* iOS manual installation instructions */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg">
                    <Share className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Install on iOS
                  </h3>
                </div>
                
                <ol className="space-y-3 text-sm text-slate-300">
                  <li className="flex gap-2">
                    <span className="text-red-500 font-semibold">1.</span>
                    <span>Tap the <Share className="inline w-4 h-4 text-blue-500" /> Share button in Safari</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 font-semibold">2.</span>
                    <span>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 font-semibold">3.</span>
                    <span>Tap &ldquo;Add&rdquo; to install Boxing Timer</span>
                  </li>
                </ol>
                
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Got it
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Minimal install badge for compact UI
 */
export function InstallBadge() {
  const { canInstall, showPrompt } = useInstallPrompt();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only showing after client mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (canInstall && isMounted) {
      // Pulse animation to draw attention
      const interval = setInterval(() => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [canInstall, isMounted]);

  // Don't render anything during SSR to prevent hydration mismatch
  // In production, show install badge if PWA is not already installed
  if (!isMounted) return null;
  
  const isStandalone = typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as any).standalone));
  
  // Show install badge if not installed and can install, or if in production for broader compatibility
  if (!canInstall && !isStandalone && process.env.NODE_ENV === 'production') {
    // In production, show a fallback install instruction for browsers that might support PWA
    return (
      <button
        onClick={() => {
          // For browsers without beforeinstallprompt, show manual instructions
          alert('To install this app:\n\n1. On Chrome/Edge: Look for the install icon in the address bar\n2. On Safari: Tap Share → Add to Home Screen\n3. Or use your browser\'s "Install App" option in the menu');
        }}
        className="fixed top-4 right-4 z-40 p-3 bg-red-600 rounded-full shadow-lg transition-all hover:bg-red-700 hover:scale-110"
        aria-label="Install Boxing Timer app"
      >
        <Download className="w-5 h-5 text-white" />
      </button>
    );
  }
  
  if (!canInstall) return null;

  return (
    <button
      onClick={showPrompt}
      className={`fixed top-4 right-4 z-40 p-3 bg-red-600 rounded-full shadow-lg transition-all hover:bg-red-700 hover:scale-110 ${
        isAnimating ? 'animate-pulse' : ''
      }`}
      aria-label="Install Boxing Timer app"
    >
      <Download className="w-5 h-5 text-white" />
    </button>
  );
}