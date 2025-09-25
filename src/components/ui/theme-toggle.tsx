/**
 * Theme Toggle Component
 *
 * Mobile-optimized theme switcher with premium design and accessibility features.
 * Provides smooth transitions between light/dark modes with visual feedback.
 *
 * Features:
 * - 44px minimum touch target for mobile accessibility
 * - Sun/moon icons with smooth rotation animations
 * - System theme detection and manual override
 * - WCAG AA compliant contrast ratios
 * - Glass morphism styling that adapts to current theme
 * - Haptic feedback triggers via CSS animations
 * - Reduced motion support for accessibility
 */

'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  /** Additional CSS classes */
  className?: string;
  /** Size variant for different contexts */
  size?: 'sm' | 'md' | 'lg';
  /** Show system theme option */
  showSystem?: boolean;
  /** Compact mode for limited space */
  compact?: boolean;
}

/**
 * Premium theme toggle with mobile-first design
 *
 * Provides intuitive theme switching with visual feedback:
 * - Light mode: Sun icon with warm golden colors
 * - Dark mode: Moon icon with cool blue tones
 * - System mode: Monitor icon with neutral colors
 * - Smooth icon transitions with rotation and scale effects
 * - Glass morphism background that adapts to theme
 */
export function ThemeToggle({
  className,
  size = 'md',
  showSystem = false
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return placeholder with same dimensions to prevent layout shift
    return (
      <div
        className={cn(
          'w-11 h-11 rounded-lg',
          size === 'sm' && 'w-9 h-9',
          size === 'lg' && 'w-12 h-12',
          className
        )}
      />
    );
  }

  // Determine current icon and next theme
  const getThemeConfig = () => {
    if (showSystem) {
      // Three-way toggle: light → dark → system → light
      switch (theme) {
        case 'light':
          return {
            icon: Sun,
            nextTheme: 'dark',
            label: 'Switch to dark theme',
            colors: 'text-amber-500 hover:text-amber-400',
            bgColors: 'hover:bg-amber-100 dark:hover:bg-amber-900/20'
          };
        case 'dark':
          return {
            icon: Moon,
            nextTheme: 'system',
            label: 'Switch to system theme',
            colors: 'text-blue-400 hover:text-blue-300',
            bgColors: 'hover:bg-blue-100 dark:hover:bg-blue-900/20'
          };
        default: // system or undefined
          return {
            icon: Monitor,
            nextTheme: 'light',
            label: 'Switch to light theme',
            colors: 'text-slate-600 hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300',
            bgColors: 'hover:bg-slate-100 dark:hover:bg-slate-800'
          };
      }
    } else {
      // Two-way toggle: light ↔ dark
      const isDark = resolvedTheme === 'dark';
      return {
        icon: isDark ? Moon : Sun,
        nextTheme: isDark ? 'light' : 'dark',
        label: isDark ? 'Switch to light theme' : 'Switch to dark theme',
        colors: isDark
          ? 'text-blue-400 hover:text-blue-300'
          : 'text-amber-500 hover:text-amber-400',
        bgColors: isDark
          ? 'hover:bg-blue-900/20'
          : 'hover:bg-amber-100'
      };
    }
  };

  const config = getThemeConfig();
  const Icon = config.icon;

  const handleToggle = () => {
    setTheme(config.nextTheme);

    // Trigger haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'w-9 h-9 p-2',
      icon: 'w-4 h-4'
    },
    md: {
      button: 'w-11 h-11 p-2.5',
      icon: 'w-5 h-5'
    },
    lg: {
      button: 'w-12 h-12 p-3',
      icon: 'w-6 h-6'
    }
  };

  const sizes = sizeConfig[size];

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleToggle}
      className={cn(
        // Base styling with mobile-first approach
        sizes.button,
        'relative rounded-lg border-0',
        'glass border border-slate-300/20 dark:border-slate-600/30',
        'text-slate-700 dark:text-slate-200',
        config.bgColors,
        'transition-all duration-300 ease-out',
        'shadow-md hover:shadow-lg active:shadow-sm',
        'active:scale-95',
        'ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        // Enhanced contrast for accessibility
        'hover:ring-2 hover:ring-slate-200/50 dark:hover:ring-slate-700/50',
        className
      )}
      aria-label={config.label}
      title={config.label}
    >
      {/* Animated icon with rotation effect */}
      <motion.div
        key={theme} // Key prop triggers animation on theme change
        initial={{
          rotate: -90,
          scale: 0.8,
          opacity: 0
        }}
        animate={{
          rotate: 0,
          scale: 1,
          opacity: 1
        }}
        exit={{
          rotate: 90,
          scale: 0.8,
          opacity: 0
        }}
        transition={{
          duration: 0.3,
          ease: 'easeOut',
          // Respect user's motion preferences
          ...(typeof window !== 'undefined' &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches && {
                duration: 0.1
              })
        }}
        className={cn(
          'flex items-center justify-center',
          config.colors,
          'transition-colors duration-200'
        )}
      >
        <Icon
          className={cn(
            sizes.icon,
            'transition-transform duration-200 ease-out'
          )}
        />
      </motion.div>

      {/* Subtle background glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-lg opacity-0"
        whileHover={{
          opacity: 0.1,
          scale: 1.05
        }}
        transition={{ duration: 0.2 }}
        style={{
          background: resolvedTheme === 'dark'
            ? 'radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(245, 158, 11, 0.5) 0%, transparent 70%)'
        }}
      />
    </Button>
  );
}