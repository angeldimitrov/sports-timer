'use client';

import { getPublicPath } from '@/lib/get-base-path';

/**
 * Head links component that handles base path for GitHub Pages deployment
 */
export function HeadLinks() {
  return (
    <>
      {/* Icons */}
      <link rel="icon" href={getPublicPath('/icons/favicon.svg')} type="image/svg+xml" />
      <link rel="icon" href={getPublicPath('/icons/icon-32x32.svg')} sizes="32x32" type="image/svg+xml" />
      
      {/* Preload critical resources with proper 'as' attributes */}
      <link rel="preload" href={getPublicPath('/sounds/round-starts.mp3')} as="audio" type="audio/mpeg" />
      <link rel="preload" href={getPublicPath('/sounds/end-of-the-round.mp3')} as="audio" type="audio/mpeg" />
      <link rel="preload" href={getPublicPath('/sounds/get-ready.mp3')} as="audio" type="audio/mpeg" />
      <link rel="preload" href={getPublicPath('/workers/timer-worker.js')} as="script" type="application/javascript" />
    </>
  );
}