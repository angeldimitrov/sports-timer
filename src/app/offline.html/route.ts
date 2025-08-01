import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

/**
 * Dynamic Offline Page Generation Route
 * 
 * Generates the offline fallback page with correct base paths for GitHub Pages deployment.
 * This page is shown when the user is offline and the requested page is not cached.
 * 
 * The offline page includes:
 * - Proper styling and branding
 * - Base path-aware asset links
 * - User-friendly offline messaging
 * - Option to retry loading
 */

export async function GET() {
  // Get the base path from environment variable
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  // Helper function to create full URLs with base path
  const createUrl = (path: string) => `${basePath}${path}`;
  
  // Generate the offline HTML page
  const offlineHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Boxing Timer - Offline</title>
  <link rel="icon" href="${createUrl('/icons/favicon.svg')}" type="image/svg+xml">
  <meta name="theme-color" content="#dc2626">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
    }
    
    .container {
      max-width: 400px;
      width: 100%;
    }
    
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 2rem;
      background: #dc2626;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }
    
    h1 {
      color: #dc2626;
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    
    p {
      color: #cbd5e1;
      font-size: 1.1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    
    .buttons {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    button {
      background: #dc2626;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    button:hover {
      background: #b91c1c;
    }
    
    .secondary {
      background: transparent;
      border: 2px solid #475569;
      color: #cbd5e1;
    }
    
    .secondary:hover {
      background: #475569;
      color: white;
    }
    
    .status {
      margin-top: 2rem;
      padding: 1rem;
      border-radius: 0.5rem;
      background: #1e293b;
      border-left: 4px solid #dc2626;
    }
    
    .offline-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #ef4444;
      border-radius: 50%;
      margin-right: 0.5rem;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    @media (max-width: 480px) {
      h1 { font-size: 1.5rem; }
      p { font-size: 1rem; }
      .icon { width: 60px; height: 60px; font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🥊</div>
    
    <h1>Boxing Timer</h1>
    
    <p>You're currently offline. Check your internet connection and try again.</p>
    
    <div class="buttons">
      <button onclick="location.reload()">Try Again</button>
      <button class="secondary" onclick="goHome()">Go to Timer</button>
    </div>
    
    <div class="status">
      <span class="offline-indicator"></span>
      <span id="connection-status">No internet connection</span>
    </div>
  </div>

  <script>
    // Function to navigate to home page
    function goHome() {
      window.location.href = '${createUrl('/')}';
    }
    
    // Monitor connection status
    function updateConnectionStatus() {
      const status = document.getElementById('connection-status');
      const indicator = document.querySelector('.offline-indicator');
      
      if (navigator.onLine) {
        status.textContent = 'Connection restored! Click "Try Again" to reload.';
        indicator.style.background = '#10b981';
        indicator.style.animation = 'none';
      } else {
        status.textContent = 'No internet connection';
        indicator.style.background = '#ef4444';
        indicator.style.animation = 'pulse 2s infinite';
      }
    }
    
    // Listen for connection changes
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    // Check initial connection status
    updateConnectionStatus();
    
    // Auto-reload when connection is restored
    window.addEventListener('online', () => {
      setTimeout(() => {
        if (navigator.onLine) {
          location.reload();
        }
      }, 1000);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        location.reload();
      } else if (e.key === 'Escape') {
        goHome();
      }
    });
  </script>
</body>
</html>`;

  // Return the offline HTML with appropriate headers
  return new NextResponse(offlineHtml, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
    },
  });
}