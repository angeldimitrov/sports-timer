/**
 * Dynamic PWA Manifest API Route
 * 
 * Serves the PWA manifest with environment-aware paths for proper GitHub Pages support.
 * This ensures all icon and URL references work correctly regardless of deployment environment.
 * 
 * Business Context:
 * - GitHub Pages deploys to /sports-timer/ subdirectory requiring absolute paths
 * - Development environment uses root paths for local testing
 * - PWA installation requires correctly referenced icons and start URLs
 * - Service worker scope must match the deployment path structure
 */

import { NextResponse } from 'next/server';
import { getBasePath } from '@/lib/get-base-path';

/**
 * Generate PWA manifest with environment-aware paths
 * 
 * The manifest contains all PWA metadata including:
 * - App name, description, and display preferences
 * - Icon references with correct base paths
 * - Start URL and scope with proper deployment paths
 * - Shortcuts with working URLs for quick actions
 * - Screenshots for app store presentation
 * 
 * @returns Response containing the dynamic manifest JSON
 */
export async function GET() {
  // Get the base path for the current environment
  const basePath = getBasePath();
  
  /**
   * Helper function to create absolute URLs with base path
   * Ensures all manifest URLs work correctly in GitHub Pages subdirectory
   */
  const getAbsoluteUrl = (path: string): string => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${basePath}${normalizedPath}`;
  };

  /**
   * PWA Manifest with Dynamic Paths
   * 
   * All paths are dynamically generated based on deployment environment:
   * - Production (GitHub Pages): /sports-timer/icons/...
   * - Development: /icons/...
   */
  const manifest = {
    name: "Boxing Timer MVP",
    short_name: "BoxingTimer",
    description: "A reliable, easy-to-use web application for precise boxing workout timing",
    start_url: getAbsoluteUrl("/"),
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#dc2626",
    orientation: "portrait-primary" as const,
    scope: getAbsoluteUrl("/"),
    lang: "en-US",
    categories: ["sports", "fitness", "health"],
    
    /**
     * Icon definitions with dynamic base paths
     * All icon references are resolved to work with GitHub Pages deployment
     */
    icons: [
      {
        src: getAbsoluteUrl("icons/icon-72x72.svg"),
        sizes: "72x72",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: getAbsoluteUrl("icons/icon-96x96.svg"),
        sizes: "96x96",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: getAbsoluteUrl("icons/icon-128x128.svg"),
        sizes: "128x128",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: getAbsoluteUrl("icons/icon-144x144.svg"),
        sizes: "144x144",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: getAbsoluteUrl("icons/icon-152x152.svg"),
        sizes: "152x152",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: getAbsoluteUrl("icons/icon-192x192.svg"),
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: getAbsoluteUrl("icons/icon-384x384.svg"),
        sizes: "384x384",
        type: "image/svg+xml",
        purpose: "maskable any"
      },
      {
        src: getAbsoluteUrl("icons/icon-512x512.svg"),
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable any"
      }
    ],
    
    /**
     * App shortcuts with working URLs
     * These provide quick access to preset workouts from the home screen
     * All URLs are dynamically generated to work with deployment path
     */
    shortcuts: [
      {
        name: "Quick Start Beginner",
        short_name: "Beginner",
        description: "Start a beginner boxing workout (3 rounds, 2 min work, 1 min rest)",
        url: getAbsoluteUrl("/?preset=beginner"),
        icons: [
          {
            src: getAbsoluteUrl("icons/icon-96x96.svg"),
            sizes: "96x96"
          }
        ]
      },
      {
        name: "Quick Start Intermediate",
        short_name: "Intermediate", 
        description: "Start an intermediate boxing workout (5 rounds, 3 min work, 1 min rest)",
        url: getAbsoluteUrl("/?preset=intermediate"),
        icons: [
          {
            src: getAbsoluteUrl("icons/icon-96x96.svg"),
            sizes: "96x96"
          }
        ]
      },
      {
        name: "Quick Start Advanced",
        short_name: "Advanced",
        description: "Start an advanced boxing workout (12 rounds, 3 min work, 1 min rest)",
        url: getAbsoluteUrl("/?preset=advanced"),
        icons: [
          {
            src: getAbsoluteUrl("icons/icon-96x96.svg"),
            sizes: "96x96"
          }
        ]
      }
    ],
    
    /**
     * Screenshots for app store presentation
     * Used by browsers and app stores to show the app in action
     */
    screenshots: [
      {
        src: getAbsoluteUrl("screenshots/timer-work.svg"),
        sizes: "540x720",
        type: "image/svg+xml",
        form_factor: "narrow" as const,
        label: "Boxing Timer during work period"
      },
      {
        src: getAbsoluteUrl("screenshots/timer-rest.svg"), 
        sizes: "540x720",
        type: "image/svg+xml",
        form_factor: "narrow" as const,
        label: "Boxing Timer during rest period"
      },
      {
        src: getAbsoluteUrl("screenshots/timer-desktop.svg"),
        sizes: "1280x720",
        type: "image/svg+xml", 
        form_factor: "wide" as const,
        label: "Boxing Timer on desktop"
      }
    ],
    
    // PWA store preferences
    prefer_related_applications: false,
    related_applications: [],
    
    // Microsoft Edge sidebar configuration
    edge_side_panel: {
      preferred_width: 320
    }
  };

  // Return the manifest with proper headers for PWA functionality
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}