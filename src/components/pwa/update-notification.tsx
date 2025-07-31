/**
 * PWA Update Notification Component
 * 
 * Displays a mobile-friendly notification when a new version of the Boxing Timer is available.
 * Handles service worker updates with user-friendly messaging and smooth transitions.
 * 
 * Features:
 * - Non-intrusive update notifications
 * - One-click update installation
 * - Automatic reload after update
 * - Dismissible notifications
 * - Update changelog display (optional)
 */

'use client';

import { useEffect, useState } from 'react';
import { usePWA } from '@/hooks/use-pwa';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Download, CheckCircle } from 'lucide-react';
import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('UpdateNotification');

export interface UpdateNotificationProps {
  /** Show changelog in notification */
  showChangelog?: boolean;
  /** Auto-dismiss after update (ms) */
  autoDismissDelay?: number;
  /** Position of notification */
  position?: 'top' | 'bottom';
}

/**
 * PWA Update Notification
 * 
 * Displays a notification when a new version of the app is available.
 * Provides a seamless update experience for users.
 */
export function UpdateNotification({
  showChangelog = false,
  autoDismissDelay = 3000,
  position = 'top'
}: UpdateNotificationProps) {
  const { state, installUpdate } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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
   * Handle update installation
   */
  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      await installUpdate();
      setUpdateSuccess(true);
      
      // Auto-dismiss after success
      if (autoDismissDelay > 0) {
        setTimeout(() => {
          setIsVisible(false);
        }, autoDismissDelay);
      }
    } catch (error) {
      log.error('Update failed:', error);
      setIsUpdating(false);
    }
  };

  /**
   * Handle dismiss
   */
  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isMounted || !isVisible) return null;

  const positionClasses = position === 'top' 
    ? 'top-4 animate-in slide-in-from-top'
    : 'bottom-4 animate-in slide-in-from-bottom';

  return (
    <div className={`fixed left-4 right-4 ${positionClasses} duration-300 z-50 md:left-auto md:right-8 md:max-w-md`}>
      <Card className="bg-slate-900/95 backdrop-blur-lg border-slate-800 shadow-2xl">
        <CardContent className="p-4">
          {/* Dismiss button */}
          {!isUpdating && !updateSuccess && (
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-800 transition-colors"
              aria-label="Dismiss update notification"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`p-3 rounded-lg ${
              updateSuccess 
                ? 'bg-green-600/20' 
                : 'bg-blue-600/20'
            }`}>
              {updateSuccess ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Download className="w-6 h-6 text-blue-500" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                {updateSuccess 
                  ? 'Update Installed!' 
                  : 'Update Available'
                }
              </h3>
              
              <p className="text-sm text-slate-300 mb-4">
                {updateSuccess 
                  ? 'Boxing Timer has been updated. The page will reload shortly.'
                  : 'A new version of Boxing Timer is ready to install.'
                }
              </p>

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

              {/* Actions */}
              {!updateSuccess && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Update Now
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                  >
                    Later
                  </Button>
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