# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Boxing Timer MVP - A reliable, easy-to-use web application that provides precise timing for boxing workouts with essential features only. See PRD.md for complete product requirements.

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui component library
- **Audio**: Web Audio API for precise timing and bell sounds
- **Storage**: LocalStorage for user preferences
- **State Management**: React hooks (useState, useReducer) and custom hooks

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## Documentation and MCP Usage

### Context7 MCP Server
**ALWAYS use the context7 MCP server for library documentation and API references:**

- **For any library questions**: Use `mcp__context7__resolve-library-id` followed by `mcp__context7__get-library-docs`
- **Next.js documentation**: Resolve "next.js" or "nextjs" to get official Next.js docs
- **React documentation**: Resolve "react" to get official React docs  
- **Tailwind CSS**: Resolve "tailwindcss" to get official Tailwind docs
- **shadcn/ui**: Resolve "shadcn/ui" or "shadcn" to get component documentation
- **TypeScript**: Resolve "typescript" to get official TypeScript docs
- **Web Audio API**: Resolve "web-audio-api" or search for Web Audio documentation

**Example workflow:**
```
1. mcp__context7__resolve-library-id with libraryName: "next.js"
2. mcp__context7__get-library-docs with the resolved library ID
3. Use the documentation to implement features correctly
```

**When to use context7:**
- Before implementing any new library features
- When encountering API questions or errors
- For best practices and recommended patterns
- To get the most up-to-date API references

## Specialized Agent Usage

This project has access to specialized agents that should be used for specific development tasks:

### mobile-web-specialist
**Use when:**
- Implementing mobile responsiveness and touch interactions
- Adding PWA features (service workers, app manifest, offline functionality)
- Optimizing timer for mobile devices (wake lock API, screen orientation)
- Creating touch-friendly controls and gesture interactions
- Handling mobile browser limitations (background execution, audio)

**Example usage:**
```
Task: "Implement PWA features and mobile optimizations for the boxing timer"
Task: "Add touch gestures for timer control and mobile-specific UI enhancements"
```

### premium-ui-designer
**Use when:**
- Designing polished visual interface and user experience
- Creating smooth animations for timer state transitions
- Implementing professional styling of shadcn/ui components
- Designing visual feedback systems (color states, progress indicators)
- Creating cohesive design system and branding

**Example usage:**
```
Task: "Design premium visual interface for timer display with smooth animations"
Task: "Create professional styling and visual state system for work/rest periods"
```

### test-suite-architect
**Use when:**
- Implementing comprehensive testing strategy
- Creating unit tests for timer engine accuracy (±100ms requirement)
- Building integration tests for audio system reliability
- Developing E2E tests for complete workout flows
- Performance testing for timer precision requirements

**Example usage:**
```
Task: "Create comprehensive test suite for timer engine with accuracy requirements"
Task: "Implement E2E tests for complete boxing workout scenarios"
```

### product-owner
**Use when:**
- Clarifying feature requirements and acceptance criteria
- Making product decisions about scope and prioritization
- Refining user stories and business requirements
- Planning feature roadmap and release strategy

**Example usage:**
```
Task: "Clarify requirements for custom timer settings and user preferences"
Task: "Define acceptance criteria for audio system reliability"
```

## Agent Workflow Recommendations

### Phase 1: Project Setup & Core Timer
1. Use **mobile-web-specialist** for PWA setup and mobile considerations
2. Use **premium-ui-designer** for initial UI/UX design and component styling
3. Use **test-suite-architect** for core timer testing strategy

### Phase 2: Audio & Advanced Features  
1. Use **test-suite-architect** for audio system testing
2. Use **premium-ui-designer** for audio control interface design
3. Use **mobile-web-specialist** for mobile audio optimization

### Phase 3: Polish & Testing
1. Use **premium-ui-designer** for final UI polish and animations
2. Use **test-suite-architect** for comprehensive test coverage
3. Use **mobile-web-specialist** for final mobile optimization

### Multi-Agent Collaboration
- **premium-ui-designer** + **mobile-web-specialist**: For responsive design that looks great on all devices
- **test-suite-architect** + **mobile-web-specialist**: For mobile-specific testing scenarios
- **product-owner** + any agent: For requirements clarification before implementation

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Main timer page
│   └── globals.css         # Global styles with Tailwind
├── components/
│   ├── ui/                 # shadcn/ui components (Button, Card, etc.)
│   └── timer/              # Custom timer components
│       ├── timer-display.tsx    # Large countdown display
│       ├── timer-controls.tsx   # Start/pause/stop/reset buttons
│       ├── preset-selector.tsx  # Workout preset options
│       └── settings-dialog.tsx  # Custom timer settings
├── lib/
│   ├── timer-engine.ts     # Core timer logic with Web Workers
│   ├── audio-manager.ts    # Audio system for bells and beeps
│   └── utils.ts           # Utility functions
├── hooks/
│   ├── use-timer.ts       # Timer state management hook
│   ├── use-audio.ts       # Audio control hook
│   └── use-local-storage.ts # Settings persistence hook
└── public/
    └── sounds/            # Audio files (bell.mp3, beep.mp3)
```

## MVP Features

### Core Timer Functionality
- Round timer (1-10 minutes) with rest periods (15 seconds - 5 minutes)
- Start/pause/stop/reset controls
- Round counter (1-20 rounds)
- Large, readable countdown display

### Audio System
- Bell sounds for round start/end
- 10-second warning beeps
- Volume control and mute toggle
- Web Audio API for precise timing

### Presets
- **Beginner**: 3 rounds, 2min work, 1min rest
- **Intermediate**: 5 rounds, 3min work, 1min rest  
- **Advanced**: 12 rounds, 3min work, 1min rest

### User Interface
- Mobile-responsive design with shadcn/ui components
- Clear visual states for work vs rest periods
- Touch-friendly controls for mobile devices

## Performance Requirements

- **Timer Accuracy**: ±100ms precision using Web Workers
- **Load Time**: <2 seconds initial load
- **Compatibility**: Chrome 90+, Firefox 88+, Safari 14+
- **Responsive**: Works on mobile and desktop screens

## Development Guidelines

### Timer Implementation
- Use Web Workers for precise timing to avoid main thread blocking
- Implement proper cleanup for timers and audio contexts
- Handle browser tab visibility changes and background execution

### Audio System
- Preload audio files for immediate playback
- Use Web Audio API for precise timing and volume control
- Provide fallback for browsers without Web Audio API support

### State Management
- Use custom hooks for timer logic encapsulation
- Implement proper cleanup in useEffect hooks
- Persist user settings with LocalStorage

### UI/UX Considerations
- Large timer display readable from distance (minimum 48px font)
- Clear visual feedback for different timer states
- Accessible design with proper ARIA labels
- Keyboard shortcuts for common actions

## Setup Instructions

1. Initialize Next.js project with TypeScript and Tailwind
2. Install and configure shadcn/ui components
3. Set up project structure as outlined above
4. Implement core timer engine with Web Workers
5. Create audio manager with Web Audio API
6. Build UI components using shadcn/ui
7. Add responsive design and mobile optimization
8. Test timer accuracy and audio reliability

## Testing Recommendations

- **Always use playwright MCP for testing changes**

## Memories

- User github CLI