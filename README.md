# Boxing Timer MVP ⏱️🥊

[![Deployment Status](https://github.com/angeldimitrov/sports-timer/actions/workflows/deploy.yml/badge.svg)](https://github.com/angeldimitrov/sports-timer/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)

A professional, reliable, and easy-to-use Progressive Web Application (PWA) designed for precise boxing workout timing. Built with modern web technologies and optimized for mobile devices.

## 🚀 [Live Demo](https://angeldimitrov.github.io/sports-timer/)

## ✨ Features

### Core Timer Functionality
- **⏱️ Precision Timing**: ±100ms accuracy using Web Workers
- **🔔 Audio Cues**: Bell sounds for rounds, warning beeps, voice announcements
- **📱 Mobile Optimized**: Touch-friendly controls, PWA capabilities
- **🌙 Wake Lock**: Keeps screen on during workouts
- **🎯 Round Management**: 1-20 rounds with customizable work/rest periods

### Workout Presets
- **🟢 Beginner**: 3 rounds × 2min work / 1min rest (9 minutes total)
- **🔵 Intermediate**: 5 rounds × 3min work / 1min rest (20 minutes total)  
- **🔴 Advanced**: 12 rounds × 3min work / 1min rest (48 minutes total)

### Progressive Web App
- **📲 Installable**: Add to home screen on mobile devices
- **🔄 Offline Ready**: Service worker for offline functionality
- **⚡ Fast Loading**: Optimized bundle splitting and caching
- **🎨 Native Feel**: App-like experience with custom splash screens

### Technical Excellence
- **🔧 TypeScript**: Full type safety and excellent developer experience
- **🧪 Comprehensive Testing**: Unit, integration, and E2E tests
- **♿ Accessible**: ARIA labels, keyboard navigation, screen reader support
- **🌐 Cross-Browser**: Chrome, Firefox, Safari, Edge compatible

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14+ with App Router
- **Language**: TypeScript with strict configuration
- **Styling**: Tailwind CSS + shadcn/ui components
- **Audio**: Web Audio API with HTML5 Audio fallback
- **Workers**: Web Workers for precise timing
- **PWA**: Service Worker with caching strategies
- **Testing**: Jest + Playwright for comprehensive coverage
- **Deployment**: GitHub Pages with GitHub Actions CI/CD

### Key Components
```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── timer/             # Timer-specific components
│   ├── pwa/              # PWA functionality
│   └── ui/               # Reusable UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
├── lib/                   # Core business logic
├── types/                 # TypeScript definitions
└── public/
    ├── sounds/           # Audio files
    ├── icons/            # PWA icons
    └── workers/          # Web Worker scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern browser with Web Audio API support
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/angeldimitrov/sports-timer.git
   cd sports-timer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Quality Assurance  
npm run type-check      # Run TypeScript compiler
npm run lint            # Run ESLint
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# End-to-End Testing
npm run test:e2e        # Run Playwright E2E tests
npm run test:e2e:ui     # Run E2E tests with UI
npm run test:e2e:headed # Run E2E tests in headed mode

# Performance Testing
npm run test:performance # Run timer precision tests
npm run test:all        # Run all tests (unit + E2E)
```

## 📱 Usage

### Basic Operation
1. **Select Preset**: Choose Beginner, Intermediate, or Advanced
2. **Start Timer**: Click the Start button to begin workout
3. **Follow Audio Cues**: Listen for round start/end bells and warnings
4. **Control Playback**: Use Pause, Resume, Stop, or Reset as needed

### Custom Settings
- **Work Duration**: 1-10 minutes per round
- **Rest Duration**: 15 seconds to 5 minutes
- **Number of Rounds**: 1-20 rounds
- **Audio Volume**: Adjustable volume control
- **Warning Sounds**: 10-second countdown before round ends

### Mobile Features
- **Install as App**: Use browser's "Add to Home Screen" option
- **Screen Wake Lock**: Prevents screen from sleeping during workouts
- **Touch Gestures**: Swipe and tap controls optimized for mobile
- **Offline Mode**: Works without internet connection after first load

## 🔧 Configuration

### Environment Variables
```bash
# Production deployment (auto-set by GitHub Actions)
NEXT_PUBLIC_BASE_PATH=/sports-timer
NODE_ENV=production

# Development (default)
NEXT_PUBLIC_BASE_PATH=
NODE_ENV=development
```

### Audio Configuration
The app includes multiple audio fallback layers:
1. **Web Audio API**: High-performance audio with precise timing
2. **HTML5 Audio**: Fallback for browsers without Web Audio support
3. **Synthetic Audio**: Generated tones when audio files fail to load

Audio files are located in `/public/sounds/`:
- `bell.mp3` - Round start/end bell
- `warning-beep.mp3` - 10-second warning
- Voice announcements for workout phases

## 🧪 Testing

### Test Coverage
The project maintains comprehensive test coverage across multiple layers:

```bash
# Unit Tests (Jest)
npm run test                    # Run all unit tests
npm run test:coverage          # Generate coverage report
npm run test:watch             # Watch mode for development

# Integration Tests  
npm run test:performance       # Timer precision validation
npm run test:audio            # Audio system testing

# End-to-End Tests (Playwright)
npm run test:e2e              # Full user workflow testing
npm run test:e2e:mobile       # Mobile-specific scenarios
npm run test:e2e:pwa          # PWA functionality testing
```

### Testing Strategy
- **Unit Tests**: Individual component and utility testing
- **Integration Tests**: Cross-component interaction testing
- **E2E Tests**: Complete user workflows and edge cases
- **Performance Tests**: Timer accuracy validation (±100ms requirement)
- **Cross-Browser Tests**: Chrome, Firefox, Safari, Edge compatibility
- **Mobile Testing**: iOS Safari, Android Chrome, tablet scenarios

## 🚀 Deployment

### GitHub Pages (Automatic)
The app automatically deploys to GitHub Pages on every push to the `main` branch:

1. **Build Process**: Next.js static export generates optimized files
2. **Asset Optimization**: Images, audio, and scripts are optimized for CDN delivery
3. **PWA Generation**: Service worker and manifest files are generated
4. **Path Resolution**: All assets are correctly routed for subdirectory deployment

### Manual Deployment
```bash
# Build static export
npm run build

# Deploy the 'out' directory to your hosting provider
# Files are located in: ./out/
```

### Environment-Specific Configuration
- **Development**: Full Next.js features, hot reloading, debugging tools
- **Production**: Static export, optimized bundles, service worker caching

## 🏗️ Architecture Deep Dive

### Timer Engine (`src/lib/timer-engine.ts`)
High-precision timing implementation using Web Workers:

```typescript
export class TimerEngine {
  // Achieves ±100ms precision using Web Worker isolation
  // Handles browser tab visibility and background execution
  // Event-driven architecture for React integration
}
```

### Audio Manager (`src/lib/audio-manager.ts`)  
Multi-layered audio system with graceful degradation:

```typescript
export class AudioManager {
  // Web Audio API → HTML5 Audio → Synthetic Audio fallbacks
  // Preloading and caching for immediate playback
  // Volume control and mute functionality
}
```

### Custom Hooks
- **`useTimer`**: Timer state management and controls
- **`useAudio`**: Audio playback and volume control  
- **`useWakeLock`**: Screen wake lock for mobile devices
- **`usePWA`**: Progressive Web App functionality
- **`useMobileGestures`**: Touch gesture handling

### PWA Implementation
- **Service Worker**: Caches app shell, audio files, and static assets
- **App Manifest**: Defines app metadata, icons, and shortcuts
- **Install Prompt**: Custom installation experience
- **Offline Support**: Core functionality available without network

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm run test:all`
5. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
6. Push to your fork: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled, comprehensive type coverage
- **ESLint**: Airbnb configuration with React hooks plugin
- **Prettier**: Consistent code formatting
- **Jest**: Unit test coverage > 90%
- **Playwright**: E2E test coverage for critical user paths

## 📋 Browser Support

### Minimum Requirements
- **Chrome**: 90+ (recommended for best experience)
- **Firefox**: 88+
- **Safari**: 14+ (iOS 14+)
- **Edge**: 90+

### Feature Support
- **Web Audio API**: Enhanced audio experience
- **Web Workers**: High-precision timing
- **Wake Lock API**: Screen management (Chrome, Edge)
- **Service Workers**: Offline functionality
- **Push API**: Future notification support

## 🐛 Troubleshooting

### Common Issues

**Audio not playing**
- Ensure browser allows autoplay (interact with page first)
- Check volume settings and device audio
- Try refreshing the page to reload audio files

**Timer not starting**
- Check browser console for Web Worker errors
- Ensure JavaScript is enabled
- Try in an incognito/private browsing window

**PWA not installing**
- Use HTTPS or localhost for testing
- Ensure service worker is registered successfully
- Check browser's PWA installation requirements

**Performance issues**
- Close other tabs to free up memory
- Check if battery saver mode is affecting performance
- Try clearing browser cache

### Debug Mode
Enable debug logging by opening browser console - the app provides detailed logging for:
- Timer state changes and precision metrics
- Audio system initialization and playback
- Wake lock acquisition and release
- PWA installation events

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **shadcn/ui**: Beautiful, accessible UI components
- **Lucide React**: Consistent icon library  
- **Tailwind CSS**: Utility-first CSS framework
- **Next.js Team**: Excellent React framework
- **Playwright Team**: Reliable E2E testing framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/angeldimitrov/sports-timer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/angeldimitrov/sports-timer/discussions)
- **Email**: [support@example.com](mailto:support@example.com)

---

<div align="center">

**Built with ❤️ for the boxing community**

[🥊 Try it now](https://angeldimitrov.github.io/sports-timer/) • [⭐ Star on GitHub](https://github.com/angeldimitrov/sports-timer) • [🐛 Report Bug](https://github.com/angeldimitrov/sports-timer/issues)

</div>