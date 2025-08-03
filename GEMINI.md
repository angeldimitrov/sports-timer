
# Gemini Project Context: Boxing Timer

This document provides context for the Boxing Timer project, a professional Progressive Web Application (PWA) for boxing workout timing.

## Project Overview

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app). It is a mobile-optimized, installable PWA with offline capabilities.

The application provides a high-precision timer for boxing workouts, with customizable rounds, work/rest periods, and audio cues. It is built with TypeScript, Tailwind CSS, and shadcn/ui for components.

The core of the application is a `TimerEngine` that uses a Web Worker for precise timing, accurate to ±100ms. This ensures that the timer remains accurate even when the browser tab is in the background.

The application also features a robust `AudioManager` that uses the Web Audio API for precise audio scheduling, with fallbacks to HTML5 Audio and synthetic tones.

## Building and Running

### Prerequisites

*   Node.js 18+
*   npm

### Key Commands

The following commands are available in `package.json`:

*   **`npm run dev`**: Starts the development server at `http://localhost:3000`.
*   **`npm run build`**: Builds the application for production.
*   **`npm run start`**: Starts a production server.
*   **`npm run lint`**: Lints the code using ESLint.
*   **`npm run type-check`**: Runs the TypeScript compiler to check for type errors.
*   **`npm run test`**: Runs unit tests using Jest.
*   **`npm run test:e2e`**: Runs end-to-end tests using Playwright.
*   **`npm run test:all`**: Runs all tests (unit and E2E).

## Development Conventions

### Code Style

*   The project uses [TypeScript](https://www.typescriptlang.org/) with a strict configuration.
*   Code is formatted with [Prettier](https://prettier.io/).
*   Linting is enforced by [ESLint](https://eslint.org/) with the Airbnb configuration.

### Testing

*   **Unit Tests**: Written with [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/). Test files are co-located with the code they test (e.g., `src/lib/__tests__/timer-engine.test.ts`).
*   **End-to-End Tests**: Written with [Playwright](https://playwright.dev/). Test files are located in the `tests/e2e` directory.
*   **Test Coverage**: The project aims for high test coverage, especially for critical components like the `TimerEngine` and `AudioManager`.

### Commits

The project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Branching

The project uses a simplified Git flow:

*   `main`: Production-ready code.
*   Feature branches: `feat/feature-name`
*   Bug fixes: `fix/bug-description`

### PWA and Mobile

The application is a Progressive Web App (PWA) with a focus on mobile experience. This includes:

*   A service worker for offline functionality.
*   A web app manifest for "Add to Home Screen" functionality.
*   Wake Lock API to keep the screen on during workouts.
*   Touch-friendly controls and gestures.

## Key Files

*   `README.md`: The main README file with a detailed overview of the project.
*   `package.json`: Defines project scripts and dependencies.
*   `next.config.mjs`: Next.js configuration file.
*   `jest.config.js`: Jest configuration file.
*   `playwright.config.ts`: Playwright configuration file.
*   `src/lib/timer-engine.ts`: The core timer logic, using a Web Worker for precision.
*   `public/workers/timer-worker.js`: The Web Worker script for the timer.
*   `src/lib/audio-manager.ts`: The audio system, with Web Audio API and fallbacks.
*   `src/hooks/use-timer.ts`: React hook for interacting with the timer engine.
*   `src/app/page.tsx`: The main application page.
*   `CONTRIBUTING.md`: Guidelines for contributing to the project.
*   `PWA_README.md`: Detailed information about the PWA features.
*   `TIMER_ENGINE_README.md`: Detailed information about the timer engine.
*   `AUDIO_SYSTEM.md`: Detailed information about the audio system.
