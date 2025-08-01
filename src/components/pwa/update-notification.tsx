/**
 * Premium PWA Update Notification Component
 * 
 * Sophisticated update notification with premium animations and user experience.
 * Provides seamless app updates with professional visual feedback.
 * 
 * Premium Features:
 * - Elegant slide-in animations with smooth transitions
 * - Professional loading states during update process
 * - Smart positioning that doesn't interfere with app usage
 * - Haptic feedback for user interactions
 * - Accessibility-first design with proper ARIA support
 * - Auto-retry mechanisms for failed updates
 * - Professional error handling with user-friendly messages
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePWA } from '@/hooks/use-pwa';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Download, CheckCircle, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('UpdateNotification');

export interface UpdateNotificationProps {
  /** Show changelog in notification */
  showChangelog?: boolean;
  /** Auto-dismiss after update (ms) */
  autoDismissDelay?: number;
  /** Position of notification */
  position?: 'top' | 'bottom';
  /** Enable premium animations */
  enableAnimations?: boolean;
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Maximum retry attempts for failed updates */
  maxRetryAttempts?: number;
  /** Show premium visual effects */
  showPremiumEffects?: boolean;
}

/**
 * Premium PWA Update Notification
 * 
 * Displays a sophisticated notification when a new version of the app is available.
 * Features premium animations, error handling, and accessibility support.
 */
export function UpdateNotification({
  showChangelog = false,
  autoDismissDelay = 3000,
  position = 'top',
  enableAnimations = true,
  enableHaptics = true,
  maxRetryAttempts = 3,
  showPremiumEffects = true
}: UpdateNotificationProps) {
  const { state, installUpdate } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Show notification when update is available
   */
  useEffect(() => {
    if (isMounted && state.hasUpdate && !updateSuccess) {
      setIsVisible(true);
    }
  }, [isMounted, state.hasUpdate, updateSuccess]);

  /**
   * Trigger haptic feedback if supported and enabled
   */
  const triggerHaptic = useCallback((type: 'success' | 'error' | 'light' = 'light') => {
    if (!enableHaptics || !navigator.vibrate) return;
    
    const patterns = {
      success: [100, 50, 100],
      error: [200, 100, 200],
      light: [50]
    };
    
    navigator.vibrate(patterns[type]);
  }, [enableHaptics]);

  /**
   * Handle update installation with enhanced error handling
   */
  const handleUpdate = async () => {
    setIsUpdating(true);
    setUpdateError('');
    triggerHaptic('light');
    
    try {
      await installUpdate();
      setUpdateSuccess(true);
      triggerHaptic('success');
      
      // Show success animation
      if (enableAnimations) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);
      }
      
      // Auto-dismiss after success
      if (autoDismissDelay > 0) {
        setTimeout(() => {
          setIsVisible(false);
        }, autoDismissDelay);
      }
    } catch (error) {
      log.error('Update failed:', error);
      setIsUpdating(false);
      setUpdateError(error instanceof Error ? error.message : 'Update failed');
      triggerHaptic('error');
      
      // Auto-retry if under limit
      if (retryCount < maxRetryAttempts) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          handleUpdate();
        }, 2000);
      }
    }
  };

  /**
   * Handle manual retry
   */
  const handleRetry = () => {
    if (retryCount >= maxRetryAttempts) {
      setUpdateError('Maximum retry attempts reached. Please refresh the page.');
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setUpdateError('');
    handleUpdate();
  };

  /**
   * Handle dismiss with animation
   */
  const handleDismiss = () => {
    triggerHaptic('light');
    
    if (enableAnimations) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 200);
    } else {
      setIsVisible(false);
    }
  };

  if (!isMounted || !isVisible) return null;

  const positionClasses = position === 'top' 
    ? `top-4 ${enableAnimations ? (isAnimating ? 'animate-slide-out-smooth' : 'animate-slide-in-smooth') : ''}`
    : `bottom-4 ${enableAnimations ? (isAnimating ? 'animate-slide-out-smooth' : 'animate-slide-in-smooth') : ''}`;

  return (
    <div className={`fixed left-4 right-4 ${positionClasses} duration-500 z-50 md:left-auto md:right-8 md:max-w-md`}>
      <Card className={`glass-premium border-slate-800 shadow-3xl hover:shadow-4xl transition-all duration-300 ${
        updateError ? 'border-red-500/30' : updateSuccess ? 'border-green-500/30' : 'border-blue-500/30'
      }`}>
        <CardContent className="p-4 relative overflow-hidden">
          {/* Premium shimmer effect */}
          {showPremiumEffects && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
          )}
          
          {/* Dismiss button */}
          {!isUpdating && (
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-2 rounded-full hover:bg-slate-800/50 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-slate-500/50 z-10"
              aria-label="Dismiss update notification"
              disabled={isUpdating}
            >
              <X className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
            </button>
          )}

          <div className="flex items-start gap-4">
            {/* Enhanced icon with premium effects */}
            <div className={`p-3 rounded-lg transition-all duration-300 relative overflow-hidden ${
              updateError ? 'bg-red-600/20 border border-red-500/30' :
              updateSuccess ? 'bg-green-600/20 border border-green-500/30' : 
              'bg-blue-600/20 border border-blue-500/30'
            }`}>
              {updateError ? (
                <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
              ) : updateSuccess ? (
                <CheckCircle className={`w-6 h-6 text-green-500 ${
                  enableAnimations ? 'animate-premium-bounce' : ''
                }`} />
              ) : isUpdating ? (
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              ) : (
                <div className="relative">
                  <Download className="w-6 h-6 text-blue-500" />
                  {showPremiumEffects && (
                    <Sparkles className="w-3 h-3 text-blue-400 absolute -top-1 -right-1 animate-pulse" />
                  )}
                </div>
              )}
              
              {/* Icon shimmer effect */}
              {showPremiumEffects && !updateError && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer rounded-lg" />
              )}
            </div>

            {/* Enhanced content */}
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold mb-1 transition-colors duration-300 ${
                updateError ? 'text-red-400' :
                updateSuccess ? 'text-green-400' : 
                'text-white'
              }`}>
                {updateError ? 'Update Failed' :
                 updateSuccess ? 'Update Installed!' : 
                 'Update Available'}
              </h3>
              
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                {updateError ? (updateError || 'Something went wrong. Please try again.') :
                 updateSuccess ? 'Boxing Timer has been updated. The page will reload shortly.' :
                 'A new version of Boxing Timer is ready to install with improvements and bug fixes.'}
              </p>
              
              {/* Retry count indicator */}
              {retryCount > 0 && !updateSuccess && (
                <div className="text-xs text-slate-400 mb-3">
                  Attempt {retryCount + 1} of {maxRetryAttempts + 1}
                </div>
              )}

              {/* Changelog (optional) */}
              {showChangelog && !updateSuccess && (
                <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase">
                    What&apos;s New
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-1">
                    <li>• Improved timer accuracy</li>
                    <li>• Better mobile performance</li>
                    <li>• Bug fixes and optimizations</li>
                  </ul>
                </div>
              )}

              {/* Enhanced action buttons */}
              {!updateSuccess && (
                <div className="flex gap-2">
                  {updateError && retryCount < maxRetryAttempts ? (
                    <Button
                      onClick={handleRetry}
                      className="bg-orange-600 hover:bg-orange-700 text-white transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-orange-500/50"
                      size="sm"
                      disabled={isUpdating}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry ({maxRetryAttempts - retryCount} left)
                    </Button>
                  ) : !updateError ? (
                    <Button
                      onClick={handleUpdate}
                      disabled={isUpdating}
                      className={`transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-blue-500/50 ${
                        isUpdating 
                          ? 'bg-blue-600/50 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                      } text-white`}
                      size="sm"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Update Now
                        </>
                      )}
                    </Button>
                  ) : null}
                  
                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 focus:ring-2 focus:ring-slate-500/50"
                    disabled={isUpdating}
                  >
                    {updateError && retryCount >= maxRetryAttempts ? 'Close' : 'Later'}
                  </Button>
                  
                  {/* Details toggle for changelog */}
                  {showChangelog && !updateError && (
                    <Button
                      onClick={() => setShowDetails(!showDetails)}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white transition-colors duration-200"
                      disabled={isUpdating}
                    >
                      {showDetails ? 'Hide' : 'Details'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Minimal update badge
 */
export function UpdateBadge() {
  const { state, installUpdate } = usePWA();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!state.hasUpdate || isUpdating) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    await installUpdate();
  };

  return (
    <button
      onClick={handleUpdate}
      className="fixed top-4 left-4 z-40 p-2 bg-blue-600 rounded-full shadow-lg animate-pulse hover:bg-blue-700 hover:animate-none transition-all"
      aria-label="Update Boxing Timer"
    >
      <RefreshCw className="w-4 h-4 text-white" />
    </button>
  );
}