/**
 * Get the base path for the application
 * 
 * This utility function returns the correct base path for assets
 * based on the deployment environment. When deployed to GitHub Pages
 * with a subdirectory, it returns the configured basePath.
 */

export function getBasePath(): string {
  // Check if we're running in production with a basePath
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_PATH) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }
  
  // In development or without a basePath, return empty string
  return '';
}

/**
 * Get the full URL for a public asset
 * 
 * @param path - The path relative to the public directory (e.g., '/sounds/bell.mp3')
 * @returns The full path including the base path if needed
 */
export function getPublicPath(path: string): string {
  const basePath = getBasePath();
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${basePath}${normalizedPath}`;
}