import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { HeadLinks } from '@/components/layout/head-links'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Boxing Timer MVP",
  description: "A reliable, easy-to-use web application for boxing workout timing",
  applicationName: "Boxing Timer",
  keywords: ["boxing", "timer", "workout", "fitness", "training", "rounds", "boxing timer"],
  authors: [{ name: "Boxing Timer Team" }],
  creator: "Boxing Timer MVP",
  publisher: "Boxing Timer MVP",
  formatDetection: {
    telephone: false,
  },
  manifest: process.env.NODE_ENV === 'production' ? "/sports-timer/manifest.json" : "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Boxing Timer",
    startupImage: [
      {
        url: "/icons/icon-512x512.svg",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
      }
    ]
  },
  openGraph: {
    type: "website",
    siteName: "Boxing Timer MVP",
    title: "Boxing Timer MVP",
    description: "A reliable, easy-to-use web application for boxing workout timing",
    images: [
      {
        url: "/icons/icon-512x512.svg",
        width: 512,
        height: 512,
        alt: "Boxing Timer Logo"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: "Boxing Timer MVP",
    description: "A reliable, easy-to-use web application for boxing workout timing",
    images: ["/icons/icon-512x512.png"]
  },
  icons: {
    icon: [
      { url: "/icons/icon-32x32.svg", sizes: "32x32", type: "image/svg+xml" },
      { url: "/icons/icon-96x96.svg", sizes: "96x96", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-152x152.svg", sizes: "152x152", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    shortcut: "/icons/icon-96x96.svg"
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#dc2626" },
    { media: "(prefers-color-scheme: dark)", color: "#dc2626" }
  ],
  colorScheme: "dark light"
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <HeadLinks />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  const basePath = '${process.env.NODE_ENV === 'production' ? '/sports-timer' : ''}';
                  navigator.serviceWorker.register(basePath + '/sw.js')
                    .then(function(registration) {
                      console.log('[PWA] Service Worker registered successfully:', registration.scope);
                      
                      // Check for updates
                      if (registration.waiting) {
                        console.log('[PWA] New service worker waiting, will update on next reload');
                      }
                      
                      registration.addEventListener('updatefound', function() {
                        console.log('[PWA] New service worker found, installing...');
                      });
                    })
                    .catch(function(error) {
                      console.log('[PWA] Service Worker registration failed:', error);
                    });
                });
              }
            `
          }}
        />
        
        {/* Wake Lock API feature detection */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.BOXING_TIMER_FEATURES = {
                hasWakeLock: 'wakeLock' in navigator,
                hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                hasVibration: 'vibrate' in navigator,
                hasWebAudio: !!(window.AudioContext || window.webkitAudioContext),
                isStandalone: window.matchMedia && window.matchMedia('(display-mode: standalone)').matches,
                isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
              };
            `
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
        
        {/* PWA Install Prompt (will be enhanced by components) */}
        <div id="pwa-install-prompt" style={{ display: 'none' }}></div>
      </body>
    </html>
  )
}