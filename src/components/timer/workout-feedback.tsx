/**
 * Workout Feedback Component
 * 
 * Post-training feedback dialog that appears after workout completion.
 * Collects user rating (1-5 stars) to track workout quality.
 * 
 * Business Context:
 * - Appears 4 seconds after workout completion for non-intrusive experience
 * - Simple star rating without data persistence (for MVP)
 * - Mobile-optimized with bottom sheet pattern and touch gestures
 * - Premium design matching existing glassmorphism theme
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface WorkoutFeedbackProps {
  /** Whether to show the feedback dialog */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Workout configuration for context */
  workoutInfo?: {
    rounds: number;
    workDuration: number;
    restDuration: number;
    preset?: string;
  };
}

/**
 * Star Rating Component
 * 
 * Interactive star rating with hover and filled states.
 * Touch-friendly with 48x48px targets for mobile accessibility.
 */
function StarRating({ 
  rating, 
  onRatingChange,
  disabled = false 
}: { 
  rating: number;
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
}) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // Keyboard navigation for stars
  const handleKeyDown = useCallback((e: React.KeyboardEvent, starIndex: number) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (starIndex > 0) {
          starRefs.current[starIndex - 1]?.focus();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (starIndex < 4) {
          starRefs.current[starIndex + 1]?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onRatingChange(starIndex + 1);
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        e.preventDefault();
        const num = parseInt(e.key);
        onRatingChange(num);
        starRefs.current[num - 1]?.focus();
        break;
    }
  }, [onRatingChange]);

  return (
    <div className="flex justify-center gap-2" role="radiogroup" aria-label="Rate your workout">
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= (hoveredStar || rating);
        const isFilled = star <= rating;
        
        return (
          <button
            key={star}
            ref={(el) => { starRefs.current[star - 1] = el; }}
            type="button"
            role="radio"
            aria-checked={isFilled}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            disabled={disabled}
            className={cn(
              "relative w-12 h-12 transition-all duration-200",
              "hover:scale-110 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isActive && !disabled && "transform-gpu"
            )}
            onClick={() => !disabled && onRatingChange(star)}
            onMouseEnter={() => !disabled && setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onKeyDown={(e) => handleKeyDown(e, star - 1)}
          >
            <Star
              className={cn(
                "w-full h-full transition-all duration-200",
                isFilled ? "fill-current" : "fill-none",
                // Color progression based on rating
                star <= 1 && isActive && "text-red-500",
                star === 2 && isActive && "text-orange-500",
                star === 3 && isActive && "text-blue-500",
                star === 4 && isActive && "text-green-500",
                star === 5 && isActive && "text-yellow-500",
                !isActive && "text-slate-600 hover:text-slate-500"
              )}
              strokeWidth={2}
            />
            {/* Cascade animation on selection */}
            {isFilled && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  animation: `starPulse 400ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
                  animationDelay: `${(star - 1) * 80}ms`
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Workout Feedback Dialog Component
 * 
 * Premium feedback interface with bottom sheet pattern for mobile.
 * Features star rating system with visual feedback and smooth animations.
 */
export function WorkoutFeedback({ 
  isOpen, 
  onClose,
  workoutInfo 
}: WorkoutFeedbackProps) {
  const [rating, setRating] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHasSubmitted(false);
    }
  }, [isOpen]);
  
  // Focus management - focus first star when dialog opens
  useEffect(() => {
    if (isOpen && !hasSubmitted) {
      // Small delay to ensure dialog is rendered
      const focusTimeout = setTimeout(() => {
        const firstStar = document.querySelector('[role="radiogroup"] button') as HTMLElement;
        firstStar?.focus();
      }, 100);
      
      return () => clearTimeout(focusTimeout);
    }
  }, [isOpen, hasSubmitted]);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (isOpen && !hasSubmitted) {
      const timer = setTimeout(() => {
        onClose();
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hasSubmitted, onClose]);
  
  const handleSubmit = useCallback(() => {
    if (rating > 0) {
      setHasSubmitted(true);
      // Show confirmation briefly then close
      submitTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [rating, onClose]);
  
  // Cleanup submit timeout on unmount
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  // Get motivational message based on rating
  const getMessage = () => {
    if (!hasSubmitted) return null;
    
    switch(rating) {
      case 5:
        return "Absolutely crushing it! 🔥";
      case 4:
        return "Outstanding work! ⭐";
      case 3:
        return "Good session! 💪";
      case 2:
        return "Nice effort! 👍";
      case 1:
        return "Thanks for sharing! 🙏";
      default:
        return "Feedback recorded!";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={cn(
          "sm:max-w-md",
          // Premium glassmorphism design
          "bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95",
          "backdrop-blur-xl border-slate-700/50",
          "shadow-2xl",
          // Bottom sheet pattern for mobile
          "sm:rounded-xl rounded-t-xl rounded-b-none",
          "fixed bottom-0 left-0 right-0 sm:bottom-auto sm:left-[50%] sm:translate-x-[-50%]",
          // Entrance animation
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0",
          "duration-500"
        )}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-slate-900 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader className="space-y-4 pb-4">
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
            {hasSubmitted ? "Thank You!" : "How was your workout?"}
          </DialogTitle>
          
          {!hasSubmitted && (
            <DialogDescription className="text-center text-slate-400">
              Rate your training session
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {!hasSubmitted ? (
            <>
              {/* Star Rating */}
              <StarRating 
                rating={rating} 
                onRatingChange={setRating}
                disabled={hasSubmitted}
              />

              {/* Rating Display */}
              {rating > 0 && (
                <div className="text-center text-lg font-semibold text-slate-300 animate-in fade-in duration-300">
                  {rating}/5
                </div>
              )}

              {/* Workout Summary */}
              {workoutInfo && (
                <div className="flex justify-center gap-6 text-sm text-slate-500">
                  <span>{workoutInfo.rounds} rounds</span>
                  <span>•</span>
                  <span>{Math.floor(workoutInfo.workDuration / 60)}:{(workoutInfo.workDuration % 60).toString().padStart(2, '0')} work</span>
                  <span>•</span>
                  <span>{Math.floor(workoutInfo.restDuration / 60)}:{(workoutInfo.restDuration % 60).toString().padStart(2, '0')} rest</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="flex-1 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={rating === 0}
                  className={cn(
                    "flex-1 font-semibold transition-all duration-300",
                    rating > 0 
                      ? "bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 text-white shadow-lg"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  )}
                >
                  Submit
                </Button>
              </div>
            </>
          ) : (
            // Success State
            <div className="space-y-4 py-4 animate-in fade-in duration-500">
              <div 
                className="text-center" 
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  {getMessage()}
                </div>
                <div className="text-lg text-slate-400 mt-2">
                  Rated: {rating}/5
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}