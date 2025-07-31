# Contributing to Boxing Timer MVP 🥊

Thank you for your interest in contributing to the Boxing Timer MVP! This document provides guidelines and information for contributors.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Release Process](#release-process)

## Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive experience for everyone, regardless of gender, gender identity and expression, age, sexual orientation, disability, physical appearance, body size, race, ethnicity, religion (or lack thereof), or technology choices.

### Expected Behavior
- **Be respectful** and considerate in all interactions
- **Be collaborative** and help others learn and grow
- **Be inclusive** and welcome newcomers to the community
- **Focus on constructive feedback** and solutions
- **Respect different viewpoints** and experiences

### Unacceptable Behavior
- Harassment, discrimination, or offensive language
- Personal attacks or trolling
- Publishing private information without permission
- Any conduct that would be inappropriate in a professional setting

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## Getting Started

### Prerequisites
Before contributing, ensure you have:
- Node.js 18+ installed
- Git configured with your GitHub account
- A modern code editor (VS Code recommended)
- Basic knowledge of React, TypeScript, and Next.js

### Finding Ways to Contribute

#### 🐛 Bug Reports
- Check existing issues to avoid duplicates
- Use the bug report template
- Include steps to reproduce, expected behavior, and screenshots

#### ✨ Feature Requests  
- Check if the feature aligns with project goals
- Use the feature request template
- Discuss large changes in GitHub Discussions first

#### 📚 Documentation
- Improve existing documentation
- Add examples and use cases
- Fix typos and formatting issues

#### 🧪 Testing
- Add test coverage for untested features
- Improve existing test scenarios
- Add performance and accessibility tests

#### 🎨 Design & UX
- Improve user interface and experience
- Enhance accessibility features
- Optimize for mobile devices

## Development Setup

### 1. Fork and Clone
```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/sports-timer.git
cd sports-timer

# Add upstream remote
git remote add upstream https://github.com/angeldimitrov/sports-timer.git
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
# Copy environment variables template (if it exists)
cp .env.example .env.local

# Or create your own environment file
touch .env.local
```

### 4. Start Development Server
```bash
npm run dev
```

Your local development server will be available at `http://localhost:3000`.

### 5. Verify Setup
```bash
# Run tests to ensure everything works
npm run test
npm run type-check
npm run lint
```

## Contributing Guidelines

### Branch Strategy
We use a simplified Git flow:

- **`main`**: Production-ready code, automatically deployed
- **Feature branches**: `feat/feature-name` for new features  
- **Bug fixes**: `fix/bug-description` for bug fixes
- **Documentation**: `docs/improvement-description` for documentation
- **Chores**: `chore/task-description` for maintenance tasks

### Creating a Branch
```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feat/amazing-new-feature
```

### Making Changes

#### 1. Code Quality
- Follow TypeScript strict mode requirements
- Use existing patterns and conventions
- Add proper error handling and edge case coverage
- Include comprehensive JSDoc comments for public APIs

#### 2. Testing
- Write unit tests for new functionality
- Add integration tests for component interactions
- Include E2E tests for critical user flows
- Ensure all tests pass before submitting

#### 3. Documentation
- Update relevant documentation
- Add inline code comments for complex logic
- Update API documentation for new features
- Include examples in docstrings

#### 4. Accessibility
- Follow WCAG 2.1 AA guidelines
- Test with keyboard navigation
- Include proper ARIA labels and descriptions
- Test with screen readers when possible

### Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Format: <type>[optional scope]: <description>
git commit -m "feat: add custom timer settings dialog"
git commit -m "fix(audio): resolve volume control bug on mobile"
git commit -m "docs: update API documentation for timer hooks"
git commit -m "test: add E2E tests for PWA installation"
git commit -m "chore: update dependencies to latest versions"
```

#### Commit Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring without functional changes
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates
- **perf**: Performance improvements
- **ci**: CI/CD changes

## Pull Request Process

### Before Submitting
1. **Sync your fork** with the latest upstream changes
2. **Run the full test suite** and ensure all tests pass
3. **Update documentation** for any new features or changes
4. **Test thoroughly** on different devices and browsers
5. **Self-review** your code for quality and completeness

### PR Checklist
- [ ] **Branch name** follows naming convention
- [ ] **Commits** follow conventional commit format
- [ ] **Tests** added/updated and all passing
- [ ] **Documentation** updated (README, API docs, inline comments)
- [ ] **Type checking** passes (`npm run type-check`)
- [ ] **Linting** passes (`npm run lint`)
- [ ] **Self-review** completed
- [ ] **Related issue** linked (if applicable)

### PR Template
```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added and passing
- [ ] No breaking changes (or clearly documented)
```

### Review Process
1. **Automated checks** must pass (CI/CD pipeline)
2. **Code review** by at least one maintainer
3. **Testing** on different environments if needed
4. **Approval** and merge by maintainer

## Coding Standards

### TypeScript
```typescript
// ✅ Good: Comprehensive interface with JSDoc
/**
 * Configuration for the boxing timer
 */
interface TimerConfig {
  /** Work period duration in seconds (60-600) */
  workDuration: number;
  /** Rest period duration in seconds (15-300) */
  restDuration: number;
  /** Total number of rounds (1-20) */
  totalRounds: number;
}

// ✅ Good: Proper error handling
try {
  await audioManager.initialize();
} catch (error) {
  console.error('Audio initialization failed:', error);
  // Graceful fallback
  initializeFallbackAudio();
}

// ❌ Bad: Any types
function processTimer(data: any): any {
  return data.whatever;
}
```

### React Components
```typescript
// ✅ Good: Proper component structure
interface TimerDisplayProps {
  timeRemaining: number;
  phase: TimerPhase;
  className?: string;
}

export function TimerDisplay({ 
  timeRemaining, 
  phase, 
  className 
}: TimerDisplayProps) {
  const formattedTime = formatTime(timeRemaining);
  
  return (
    <div className={cn("timer-display", className)}>
      <span aria-live="polite">{formattedTime}</span>
    </div>
  );
}

// ✅ Good: Custom hook with cleanup
export function useTimer(config: TimerConfig) {
  const [state, setState] = useState<TimerState>(initialState);
  
  useEffect(() => {
    const timer = new TimerEngine(config);
    
    return () => {
      timer.destroy(); // Cleanup
    };
  }, [config]);
  
  return { state, start, pause, stop };
}
```

### CSS/Styling
```css
/* ✅ Good: Semantic class names with Tailwind */
.timer-display {
  @apply text-6xl font-mono font-bold text-center;
}

.timer-controls {
  @apply flex gap-4 justify-center items-center;
}

/* ✅ Good: Mobile-first responsive design */
.workout-layout {
  @apply flex flex-col;
  
  @screen md {
    @apply flex-row gap-8;
  }
}
```

### File Organization
```
src/
├── components/
│   ├── timer/
│   │   ├── __tests__/              # Co-located tests
│   │   ├── timer-display.tsx       # Main component
│   │   ├── timer-controls.tsx      # Related component
│   │   └── index.ts               # Barrel export
│   └── ui/
│       ├── button.tsx             # Reusable components
│       └── dialog.tsx
├── hooks/
│   ├── __tests__/
│   ├── use-timer.ts               # Custom hooks
│   └── use-audio.ts
├── lib/
│   ├── __tests__/
│   ├── timer-engine.ts            # Core logic
│   └── audio-manager.ts
└── types/
    ├── timer.d.ts                 # Type definitions
    └── audio.d.ts
```

## Testing Requirements

### Unit Tests (Jest)
```typescript
// ✅ Good: Comprehensive test coverage
describe('TimerEngine', () => {
  let timer: TimerEngine;
  
  beforeEach(() => {
    timer = new TimerEngine({
      workDuration: 180,
      restDuration: 60,
      totalRounds: 3
    });
  });
  
  afterEach(() => {
    timer.destroy();
  });
  
  it('should start timer and emit preparationStart event', async () => {
    const eventHandler = jest.fn();
    timer.addEventListener(eventHandler);
    
    timer.start();
    
    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'preparationStart'
      })
    );
  });
  
  it('should maintain precision within ±100ms', async () => {
    const precision = await measureTimerPrecision(timer, 1000);
    expect(Math.abs(precision)).toBeLessThan(100);
  });
});
```

### Integration Tests
```typescript
// ✅ Good: Component integration testing
describe('Timer Integration', () => {
  it('should synchronize audio with timer events', async () => {
    const { result } = renderHook(() => ({
      timer: useTimer({ preset: 'beginner' }),
      audio: useAudio()
    }));
    
    await act(async () => {
      await result.current.audio.initialize();
      result.current.timer.start();
    });
    
    // Verify audio plays on timer events
    expect(mockAudioPlay).toHaveBeenCalledWith('getReady');
  });
});
```

### E2E Tests (Playwright)
```typescript
// ✅ Good: Complete user workflow testing
test('complete boxing workout flow', async ({ page }) => {
  await page.goto('/');
  
  await page.getByTestId('preset-intermediate').click();
  await page.getByRole('button', { name: 'Start' }).click();
  
  await expect(page.getByText('GET READY')).toBeVisible();
  await expect(page.getByText('00:10')).toBeVisible();
  
  // Wait for work period
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 15000 });
  
  // Test pause/resume
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
});
```

### Performance Tests
```typescript
// ✅ Good: Performance validation
test('timer precision under load', async ({ page }) => {
  const precisionResults = await page.evaluate(async () => {
    const timer = new TimerEngine({ workDuration: 10, restDuration: 5, totalRounds: 1 });
    return await measurePrecisionUnderLoad(timer, 100); // 100 iterations
  });
  
  expect(precisionResults.averageError).toBeLessThan(50); // ±50ms average
  expect(precisionResults.maxError).toBeLessThan(100);    // ±100ms max
});
```

### Accessibility Tests
```typescript
// ✅ Good: A11y testing
test('keyboard navigation', async ({ page }) => {
  await page.goto('/');
  
  // Tab through all interactive elements
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Start' })).toBeFocused();
  
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Reset' })).toBeFocused();
  
  // Test keyboard controls
  await page.keyboard.press('Space'); // Should start timer
  await expect(page.getByText('GET READY')).toBeVisible();
});
```

## Release Process

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes (2.0.0)
- **MINOR**: New features, backward compatible (1.1.0)
- **PATCH**: Bug fixes, backward compatible (1.0.1)

### Release Checklist
1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with release notes
3. **Run full test suite** and ensure all tests pass
4. **Update documentation** as needed
5. **Create release branch** if needed
6. **Tag release** with version number
7. **Deploy to production** (automatic via GitHub Actions)
8. **Announce release** in GitHub Discussions

### Changelog Format
```markdown
## [1.2.0] - 2024-01-15

### Added
- Custom timer settings dialog
- Voice announcements for workout phases
- PWA installation prompt

### Changed
- Improved mobile touch responsiveness
- Enhanced audio fallback system

### Fixed
- Timer precision issues on low-end devices
- Volume control bug on iOS Safari

### Security
- Updated dependencies to latest versions
```

## Getting Help

### Documentation
- [API Documentation](docs/API.md)
- [Development Setup](docs/DEVELOPMENT.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

### Community
- [GitHub Discussions](https://github.com/angeldimitrov/sports-timer/discussions) - Questions and ideas
- [GitHub Issues](https://github.com/angeldimitrov/sports-timer/issues) - Bug reports and feature requests

### Contact
- **Project Maintainer**: [Angel Dimitrov](https://github.com/angeldimitrov)
- **Email**: [support@example.com](mailto:support@example.com)

---

## Thank You! 🙏

Your contributions help make the Boxing Timer MVP better for everyone in the boxing community. Whether you're fixing bugs, adding features, improving documentation, or helping other users, every contribution is valuable and appreciated.

Happy coding! 🥊⏱️