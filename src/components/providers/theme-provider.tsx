/**
 * Theme Provider Component
 *
 * Wraps the application with next-themes ThemeProvider for consistent theme management.
 * Provides theme context to all child components with system preference detection,
 * theme persistence, and smooth transitions between light/dark modes.
 *
 * Features:
 * - System theme preference detection with CSS media queries
 * - localStorage persistence for manual theme selections
 * - Smooth transitions without layout shifts
 * - PWA-compatible theme management
 * - Dynamic theme-color meta tag updates
 */

'use client';

import React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

interface CustomThemeProviderProps {
  children: React.ReactNode;
  /** Optional additional props to pass to next-themes ThemeProvider */
  themeProps?: Omit<ThemeProviderProps, 'children'>;
}

/**
 * Enhanced theme provider with PWA and mobile optimizations
 *
 * Configuration:
 * - Uses 'class' strategy for Tailwind CSS compatibility
 * - Detects system preference with 'prefers-color-scheme' media query
 * - Persists theme selection in localStorage
 * - Updates theme-color meta tag dynamically for PWA status bar
 * - Prevents hydration mismatches with suppressHydrationWarning
 */
export function ThemeProvider({
  children,
  themeProps = {}
}: CustomThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      storageKey="boxing-timer-theme"
      themes={['light', 'dark', 'system']}
      disableTransitionOnChange={false}
      {...themeProps}
    >
      <ThemeColorManager />
      {children}
    </NextThemesProvider>
  );
}

/**
 * Dynamic theme-color meta tag manager for PWA integration
 *
 * Updates the theme-color meta tag when theme changes to ensure
 * proper PWA status bar colors on mobile devices.
 */
function ThemeColorManager() {
  React.useEffect(() => {
    const updateThemeColor = () => {
      // Get current theme from document class
      const isDark = document.documentElement.classList.contains('dark');

      // Define theme colors for PWA status bar
      const colors = {
        light: '#dc2626', // Red-600 for light theme
        dark: '#1f2937',  // Gray-800 for dark theme
      };

      const themeColor = isDark ? colors.dark : colors.light;

      // Update existing theme-color meta tag
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColor);
      } else {
        // Create meta tag if it doesn't exist
        metaThemeColor = document.createElement('meta');
        (metaThemeColor as HTMLMetaElement).name = 'theme-color';
        (metaThemeColor as HTMLMetaElement).content = themeColor;
        document.head.appendChild(metaThemeColor);
      }

      // Also update Apple-specific meta tags for iOS PWA
      const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (appleStatusBar) {
        appleStatusBar.setAttribute('content', isDark ? 'black-translucent' : 'default');
      }
    };

    // Update immediately
    updateThemeColor();

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          updateThemeColor();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      // Only update if using system theme
      const storedTheme = localStorage.getItem('boxing-timer-theme');
      if (!storedTheme || storedTheme === 'system') {
        updateThemeColor();
      }
    };

    mediaQuery.addListener(handleSystemThemeChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeListener(handleSystemThemeChange);
    };
  }, []);

  return null;
}