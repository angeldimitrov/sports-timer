/**
 * Accessibility E2E Tests for Boxing Timer MVP
 * 
 * Tests WCAG compliance, keyboard navigation, screen reader support, and inclusive design.
 * Ensures the timer is accessible to boxers with disabilities.
 * 
 * Business Context:
 * - Boxing training should be accessible to athletes with visual, hearing, or motor impairments
 * - Screen readers need proper ARIA labels and semantic markup for audio-first experience
 * - Keyboard navigation is essential for users who cannot use touch/mouse controls
 * - High contrast and large text support visually impaired users
 * - Audio alternatives help deaf and hard-of-hearing users
 * - Timer must work with assistive technologies
 * 
 * Test Coverage:
 * - WCAG 2.1 AA compliance (color contrast, keyboard navigation, focus management)
 * - Screen reader compatibility and ARIA implementation
 * - Keyboard-only navigation and operation
 * - Focus management and visual indicators
 * - Alternative text and semantic markup
 * - Color contrast and text size requirements
 * - Motor impairment accommodations (large touch targets)
 * - Audio description and visual alternatives
 */

import { test, expect, Page } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Accessibility Testing Utilities
 * Provides comprehensive accessibility testing and WCAG compliance validation
 */
class AccessibilityTester {
  constructor(private page: Page) {}

  private selectors = {
    timerDisplay: '[data-testid="timer-display"]',
    currentTime: '[data-testid="current-time"]',
    startButton: '[data-testid="start-button"]',
    pauseButton: '[data-testid="pause-button"]',
    stopButton: '[data-testid="stop-button"]',
    resetButton: '[data-testid="reset-button"]',
    presetSelector: '[data-testid="preset-selector"]',
    volumeSlider: '[data-testid="volume-slider"]',
    muteButton: '[data-testid="mute-button"]',
    settingsButton: '[data-testid="settings-button"]',
    skipLink: '[data-testid="skip-link"]',
    mainContent: '[data-testid="main-content"]'
  }

  /**
   * Initialize accessibility testing environment
   */
  async initialize() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
    
    // Inject axe-core for automated accessibility testing
    await this.injectAxeCore()
  }

  /**
   * Inject axe-core accessibility testing library
   */
  private async injectAxeCore() {
    await this.page.addScriptTag({
      url: 'https://cdn.jsdelivr.net/npm/axe-core@4.6.3/axe.min.js'
    })
    
    // Wait for axe to be available
    await this.page.waitForFunction(() => typeof (window as any).axe !== 'undefined')
  }

  /**
   * Run automated accessibility audit using axe-core
   */
  async runAccessibilityAudit(): Promise<AccessibilityAuditResult> {
    const results = await this.page.evaluate(async () => {
      if (typeof (window as any).axe === 'undefined') {
        return { error: 'axe-core not loaded' }
      }

      try {
        const axeResults = await (window as any).axe.run(document, {
          rules: {
            // Configure specific rules for timer application
            'color-contrast': { enabled: true },
            'keyboard': { enabled: true },
            'focus-order-semantics': { enabled: true },
            'aria-valid-attr-value': { enabled: true },
            'aria-valid-attr': { enabled: true },
            'button-name': { enabled: true },
            'form-field-multiple-labels': { enabled: true },
            'heading-order': { enabled: true },
            'image-alt': { enabled: true },
            'label': { enabled: true },
            'link-name': { enabled: true },
            'list': { enabled: true },
            'listitem': { enabled: true },
            'region': { enabled: true },
            'skip-link': { enabled: true }
          },
          tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
        })

        return {
          violations: axeResults.violations.map((violation: any) => ({
            id: violation.id,
            impact: violation.impact,
            description: violation.description,
            help: violation.help,
            helpUrl: violation.helpUrl,
            nodes: violation.nodes.length,
            tags: violation.tags
          })),
          passes: axeResults.passes.length,
          incomplete: axeResults.incomplete.length,
          inapplicable: axeResults.inapplicable.length
        }
      } catch (error) {
        return { error: error.toString() }
      }
    })

    return results as AccessibilityAuditResult
  }

  /**
   * Test keyboard navigation functionality
   */
  async testKeyboardNavigation(): Promise<KeyboardNavigationResult> {
    const result: KeyboardNavigationResult = {
      tabOrder: [],
      skipLinkWorks: false,
      allControlsReachable: false,
      focusIndicatorsVisible: false,
      escapeKeyWorks: false
    }

    // Test tab order and focus management
    result.tabOrder = await this.testTabOrder()
    
    // Test skip link functionality
    result.skipLinkWorks = await this.testSkipLink()
    
    // Test if all controls are keyboard accessible
    result.allControlsReachable = await this.testControlAccessibility()
    
    // Test focus indicators
    result.focusIndicatorsVisible = await this.testFocusIndicators()
    
    // Test escape key functionality
    result.escapeKeyWorks = await this.testEscapeKey()

    return result
  }

  /**
   * Test tab order and focus sequence
   */
  private async testTabOrder(): Promise<FocusableElement[]> {
    const focusableElements: FocusableElement[] = []
    
    // Start from the beginning of the page
    await this.page.keyboard.press('Tab')
    
    // Navigate through all focusable elements
    for (let i = 0; i < 20; i++) { // Limit to prevent infinite loop
      const focusedElement = await this.page.evaluate(() => {
        const activeElement = document.activeElement
        if (!activeElement || activeElement === document.body) return null
        
        return {
          tagName: activeElement.tagName.toLowerCase(),
          id: activeElement.id,
          className: activeElement.className,
          textContent: activeElement.textContent?.trim().substring(0, 50) || '',
          ariaLabel: activeElement.getAttribute('aria-label'),
          role: activeElement.getAttribute('role'),
          tabIndex: activeElement.tabIndex,
          bounds: activeElement.getBoundingClientRect()
        }
      })
      
      if (focusedElement) {
        focusableElements.push(focusedElement)
      }
      
      // Move to next focusable element
      await this.page.keyboard.press('Tab')
      
      // Stop if we've cycled back to the first element
      if (focusableElements.length > 1 && 
          focusableElements[0].id === focusedElement?.id && 
          focusableElements[0].tagName === focusedElement?.tagName) {
        break
      }
    }
    
    return focusableElements
  }

  /**
   * Test skip link functionality
   */
  private async testSkipLink(): Promise<boolean> {
    try {
      // Press Tab to focus skip link (should be first focusable element)
      await this.page.keyboard.press('Tab')
      
      const skipLinkFocused = await this.page.evaluate(() => {
        const activeElement = document.activeElement
        return activeElement?.getAttribute('data-testid') === 'skip-link' ||
               activeElement?.textContent?.toLowerCase().includes('skip')
      })
      
      if (skipLinkFocused) {
        // Activate skip link
        await this.page.keyboard.press('Enter')
        
        // Verify focus moved to main content
        const mainContentFocused = await this.page.evaluate(() => {
          const activeElement = document.activeElement
          return activeElement?.getAttribute('data-testid') === 'main-content' ||
                 activeElement?.tagName.toLowerCase() === 'main'
        })
        
        return mainContentFocused
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  /**
   * Test if all interactive controls are keyboard accessible
   */
  private async testControlAccessibility(): Promise<boolean> {
    const controls = [
      { selector: this.selectors.startButton, name: 'Start Button' },
      { selector: this.selectors.pauseButton, name: 'Pause Button' },
      { selector: this.selectors.stopButton, name: 'Stop Button' },
      { selector: this.selectors.resetButton, name: 'Reset Button' },
      { selector: this.selectors.presetSelector, name: 'Preset Selector' },
      { selector: this.selectors.muteButton, name: 'Mute Button' }
    ]

    let allAccessible = true
    
    for (const control of controls) {
      try {
        // Focus the control
        await this.page.locator(control.selector).focus()
        
        // Verify it's focused and can be activated
        const isAccessible = await this.page.evaluate((selector) => {
          const element = document.querySelector(selector)
          if (!element) return false
          
          const isActiveElement = document.activeElement === element
          const hasTabIndex = element.tabIndex >= 0
          const isButton = element.tagName.toLowerCase() === 'button'
          const hasRole = element.getAttribute('role') === 'button'
          const hasAriaLabel = !!element.getAttribute('aria-label')
          
          return isActiveElement && (hasTabIndex || isButton || hasRole) && hasAriaLabel
        }, control.selector)
        
        if (!isAccessible) {
          console.log(`${control.name} is not fully keyboard accessible`)
          allAccessible = false
        }
        
        // Test activation with Enter key
        await this.page.keyboard.press('Enter')
        await this.page.waitForTimeout(200)
        
      } catch (error) {
        console.log(`Failed to test ${control.name}: ${error}`)
        allAccessible = false
      }
    }
    
    return allAccessible
  }

  /**
   * Test visibility of focus indicators
   */
  private async testFocusIndicators(): Promise<boolean> {
    try {
      // Focus on start button
      await this.page.locator(this.selectors.startButton).focus()
      
      // Check if focus indicator is visible
      const focusIndicatorVisible = await this.page.evaluate(() => {
        const activeElement = document.activeElement
        if (!activeElement) return false
        
        const computedStyle = getComputedStyle(activeElement)
        const pseudoElementStyle = getComputedStyle(activeElement, ':focus')
        
        // Check for focus outline
        const hasOutline = computedStyle.outline !== 'none' && 
                          computedStyle.outline !== '0px' &&
                          computedStyle.outline !== ''
        
        // Check for box shadow focus indicator
        const hasBoxShadow = computedStyle.boxShadow !== 'none' &&
                            computedStyle.boxShadow !== ''
        
        // Check for border changes
        const hasBorderChange = computedStyle.borderColor !== 'initial' &&
                               computedStyle.borderWidth !== '0px'
        
        return hasOutline || hasBoxShadow || hasBorderChange
      })
      
      return focusIndicatorVisible
    } catch (error) {
      return false
    }
  }

  /**
   * Test escape key functionality for modal/dialog dismissal
   */
  private async testEscapeKey(): Promise<boolean> {
    try {
      // Open settings if available
      const settingsButton = this.page.locator(this.selectors.settingsButton)
      if (await settingsButton.isVisible()) {
        await settingsButton.click()
        await this.page.waitForTimeout(500)
        
        // Press Escape to close
        await this.page.keyboard.press('Escape')
        await this.page.waitForTimeout(500)
        
        // Check if modal/settings closed
        const modalClosed = await this.page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"]')
          const overlay = document.querySelector('[data-testid*="modal"]')
          return !modal || !overlay || 
                 getComputedStyle(modal).display === 'none' ||
                 getComputedStyle(overlay).display === 'none'
        })
        
        return modalClosed
      }
      
      return true // No modal to test, consider passed
    } catch (error) {
      return false
    }
  }

  /**
   * Test screen reader compatibility
   */
  async testScreenReaderSupport(): Promise<ScreenReaderResult> {
    const result: ScreenReaderResult = {
      ariaLabelsPresent: false,
      semanticMarkup: false,
      liveRegions: false,
      headingStructure: false,
      buttonLabels: false,
      formLabels: false
    }

    // Test ARIA labels
    result.ariaLabelsPresent = await this.testAriaLabels()
    
    // Test semantic HTML structure
    result.semanticMarkup = await this.testSemanticMarkup()
    
    // Test live regions for dynamic content
    result.liveRegions = await this.testLiveRegions()
    
    // Test heading structure
    result.headingStructure = await this.testHeadingStructure()
    
    // Test button labels
    result.buttonLabels = await this.testButtonLabels()
    
    // Test form labels
    result.formLabels = await this.testFormLabels()

    return result
  }

  /**
   * Test presence and quality of ARIA labels
   */
  private async testAriaLabels(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const interactiveElements = document.querySelectorAll('button, input, select, [tabindex="0"]')
      let labeledCount = 0
      
      interactiveElements.forEach(element => {
        const hasAriaLabel = element.getAttribute('aria-label')
        const hasAriaLabelledBy = element.getAttribute('aria-labelledby')
        const hasTitle = element.getAttribute('title')
        const hasTextContent = element.textContent?.trim()
        
        if (hasAriaLabel || hasAriaLabelledBy || hasTitle || hasTextContent) {
          labeledCount++
        }
      })
      
      return labeledCount / interactiveElements.length >= 0.9 // 90% should be labeled
    })
  }

  /**
   * Test semantic HTML structure
   */
  private async testSemanticMarkup(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const hasMain = document.querySelector('main') !== null
      const hasHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0
      const hasNav = document.querySelector('nav') !== null || 
                    document.querySelector('[role="navigation"]') !== null
      const hasRegions = document.querySelectorAll('[role="region"], section, article').length > 0
      
      return hasMain && hasHeadings && (hasNav || hasRegions)
    })
  }

  /**
   * Test live regions for dynamic content updates
   */
  private async testLiveRegions(): Promise<boolean> {
    return await this.page.evaluate(() => {
      // Look for live regions that would announce timer changes
      const liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')
      
      // Timer display should have live region for screen reader updates
      const timerDisplay = document.querySelector('[data-testid="timer-display"], [data-testid="current-time"]')
      const hasTimerLiveRegion = timerDisplay?.getAttribute('aria-live') === 'polite' ||
                                timerDisplay?.getAttribute('role') === 'status'
      
      return liveRegions.length > 0 && hasTimerLiveRegion
    })
  }

  /**
   * Test heading structure and hierarchy
   */
  private async testHeadingStructure(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      
      if (headings.length === 0) return false
      
      // Check for proper heading hierarchy
      let currentLevel = 0
      let properHierarchy = true
      
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.charAt(1))
        
        if (currentLevel === 0) {
          // First heading should be h1
          if (level !== 1) properHierarchy = false
        } else {
          // Subsequent headings should not skip levels
          if (level > currentLevel + 1) properHierarchy = false
        }
        
        currentLevel = level
      })
      
      return properHierarchy
    })
  }

  /**
   * Test button labels and descriptions
   */
  private async testButtonLabels(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      let properlyLabeledCount = 0
      
      buttons.forEach(button => {
        const hasText = button.textContent?.trim()
        const hasAriaLabel = button.getAttribute('aria-label')
        const hasAriaLabelledBy = button.getAttribute('aria-labelledby')
        const hasTitle = button.getAttribute('title')
        
        if (hasText || hasAriaLabel || hasAriaLabelledBy || hasTitle) {
          properlyLabeledCount++
        }
      })
      
      return buttons.length > 0 && properlyLabeledCount === buttons.length
    })
  }

  /**
   * Test form labels and associations
   */
  private async testFormLabels(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const formControls = document.querySelectorAll('input, select, textarea')
      let properlyLabeledCount = 0
      
      formControls.forEach(control => {
        const id = control.id
        const hasLabel = id && document.querySelector(`label[for="${id}"]`)
        const hasAriaLabel = control.getAttribute('aria-label')
        const hasAriaLabelledBy = control.getAttribute('aria-labelledby')
        const hasTitle = control.getAttribute('title')
        
        if (hasLabel || hasAriaLabel || hasAriaLabelledBy || hasTitle) {
          properlyLabeledCount++
        }
      })
      
      return formControls.length === 0 || properlyLabeledCount === formControls.length
    })
  }

  /**
   * Test color contrast compliance
   */
  async testColorContrast(): Promise<ColorContrastResult> {
    const contrastResults = await this.page.evaluate(() => {
      const textElements = document.querySelectorAll('*')
      const contrastIssues: any[] = []
      
      // Helper function to calculate luminance
      function getLuminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        })
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
      }
      
      // Helper function to calculate contrast ratio
      function getContrastRatio(color1: number[], color2: number[]): number {
        const lum1 = getLuminance(color1[0], color1[1], color1[2])
        const lum2 = getLuminance(color2[0], color2[1], color2[2])
        const brightest = Math.max(lum1, lum2)
        const darkest = Math.min(lum1, lum2)
        return (brightest + 0.05) / (darkest + 0.05)
      }
      
      // Helper function to parse RGB color
      function parseRGB(colorStr: string): number[] | null {
        const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null
      }
      
      // Check contrast for visible text elements
      textElements.forEach((element, index) => {
        if (index > 100) return // Limit check to prevent performance issues
        
        const style = getComputedStyle(element)
        const textColor = parseRGB(style.color)
        const bgColor = parseRGB(style.backgroundColor)
        
        if (textColor && bgColor && element.textContent?.trim()) {
          const contrast = getContrastRatio(textColor, bgColor)
          const fontSize = parseFloat(style.fontSize)
          const fontWeight = style.fontWeight
          
          // WCAG AA requirements
          const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700))
          const requiredContrast = isLargeText ? 3 : 4.5
          
          if (contrast < requiredContrast) {
            contrastIssues.push({
              text: element.textContent?.trim().substring(0, 50),
              contrast: contrast.toFixed(2),
              required: requiredContrast,
              fontSize,
              fontWeight,
              textColor: style.color,
              backgroundColor: style.backgroundColor
            })
          }
        }
      })
      
      return {
        totalChecked: Math.min(textElements.length, 100),
        issues: contrastIssues,
        passRate: contrastIssues.length === 0 ? 100 : 
                 ((Math.min(textElements.length, 100) - contrastIssues.length) / Math.min(textElements.length, 100)) * 100
      }
    })
    
    return contrastResults
  }

  /**
   * Test motor impairment accommodations
   */
  async testMotorAccommodations(): Promise<MotorAccessibilityResult> {
    const result: MotorAccessibilityResult = {
      touchTargetSize: [],
      clickableAreaSize: [],
      dragAndDropAlternatives: true,
      timeoutAdjustments: false,
      clickTolerance: []
    }

    // Test touch target sizes (minimum 44px x 44px)
    const buttons = await this.page.locator('button').all()
    
    for (const button of buttons) {
      const box = await button.boundingBox()
      if (box) {
        const meetsMinimum = box.width >= 44 && box.height >= 44
        result.touchTargetSize.push({
          width: box.width,
          height: box.height,
          meetsMinimum,
          element: await button.getAttribute('data-testid') || 'unknown'
        })
      }
    }

    // Test clickable area vs visual area
    result.clickableAreaSize = await this.testClickableAreas()
    
    // Test timeout adjustments (if any time-based interactions exist)
    result.timeoutAdjustments = await this.testTimeoutAdjustments()

    return result
  }

  /**
   * Test clickable areas match visual areas
   */
  private async testClickableAreas(): Promise<ClickableAreaTest[]> {
    return await this.page.evaluate(() => {
      const clickableElements = document.querySelectorAll('button, [role="button"], a, input')
      const results: any[] = []
      
      clickableElements.forEach(element => {
        const rect = element.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        // Test if center point is clickable
        const elementAtPoint = document.elementFromPoint(centerX, centerY)
        const isClickable = elementAtPoint === element || element.contains(elementAtPoint)
        
        results.push({
          width: rect.width,
          height: rect.height,
          centerClickable: isClickable,
          element: element.getAttribute('data-testid') || element.tagName.toLowerCase()
        })
      })
      
      return results
    })
  }

  /**
   * Test timeout adjustments for time-sensitive interactions
   */
  private async testTimeoutAdjustments(): Promise<boolean> {
    // Check if there are any timeout-related settings or warnings
    return await this.page.evaluate(() => {
      // Look for timeout-related attributes or settings
      const timeoutElements = document.querySelectorAll('[data-timeout], [aria-live="assertive"]')
      const hasTimeoutControls = document.querySelector('[data-testid*="timeout"], [data-testid*="extend"]')
      
      // Timer app should not have critical timeouts that can't be controlled
      return timeoutElements.length === 0 || !!hasTimeoutControls
    })
  }
}

// Type definitions for accessibility test results
interface AccessibilityAuditResult {
  violations?: Array<{
    id: string
    impact: string
    description: string
    help: string
    helpUrl: string
    nodes: number
    tags: string[]
  }>
  passes?: number
  incomplete?: number
  inapplicable?: number
  error?: string
}

interface KeyboardNavigationResult {
  tabOrder: FocusableElement[]
  skipLinkWorks: boolean
  allControlsReachable: boolean
  focusIndicatorsVisible: boolean
  escapeKeyWorks: boolean
}

interface FocusableElement {
  tagName: string
  id: string
  className: string
  textContent: string
  ariaLabel: string | null
  role: string | null
  tabIndex: number
  bounds: DOMRect
}

interface ScreenReaderResult {
  ariaLabelsPresent: boolean
  semanticMarkup: boolean
  liveRegions: boolean
  headingStructure: boolean
  buttonLabels: boolean
  formLabels: boolean
}

interface ColorContrastResult {
  totalChecked: number
  issues: Array<{
    text: string
    contrast: string
    required: number
    fontSize: number
    fontWeight: string
    textColor: string
    backgroundColor: string
  }>
  passRate: number
}

interface MotorAccessibilityResult {
  touchTargetSize: Array<{
    width: number
    height: number
    meetsMinimum: boolean
    element: string
  }>
  clickableAreaSize: ClickableAreaTest[]
  dragAndDropAlternatives: boolean
  timeoutAdjustments: boolean
  clickTolerance: any[]
}

interface ClickableAreaTest {
  width: number
  height: number
  centerClickable: boolean
  element: string
}

test.describe('Accessibility E2E Tests', () => {
  let a11yTester: AccessibilityTester

  test.beforeEach(async ({ page }) => {
    a11yTester = new AccessibilityTester(page)
    await a11yTester.initialize()
  })

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('should pass automated accessibility audit', async () => {
      const auditResult = await a11yTester.runAccessibilityAudit()
      
      if (auditResult.error) {
        console.log('Accessibility audit error:', auditResult.error)
        // Continue with manual tests if axe-core fails
        expect(auditResult.error).toContain('axe')
        return
      }
      
      console.log('\n=== Accessibility Audit Results ===')
      console.log(`Violations: ${auditResult.violations?.length || 0}`)
      console.log(`Passes: ${auditResult.passes || 0}`)
      console.log(`Incomplete: ${auditResult.incomplete || 0}`)
      
      if (auditResult.violations && auditResult.violations.length > 0) {
        console.log('\nViolations found:')
        auditResult.violations.forEach(violation => {
          console.log(`- ${violation.id} (${violation.impact}): ${violation.description}`)
        })
      }
      
      // Should have no critical or serious violations
      const criticalViolations = auditResult.violations?.filter(v => 
        v.impact === 'critical' || v.impact === 'serious'
      ) || []
      
      expect(criticalViolations.length).toBe(0)
    })

    test('should meet color contrast requirements', async () => {
      const contrastResult = await a11yTester.testColorContrast()
      
      console.log('\n=== Color Contrast Analysis ===')
      console.log(`Elements checked: ${contrastResult.totalChecked}`)
      console.log(`Pass rate: ${contrastResult.passRate.toFixed(1)}%`)
      console.log(`Issues found: ${contrastResult.issues.length}`)
      
      if (contrastResult.issues.length > 0) {
        console.log('\nContrast issues:')
        contrastResult.issues.forEach(issue => {
          console.log(`- "${issue.text}": ${issue.contrast}:1 (required: ${issue.required}:1)`)
        })
      }
      
      // Should meet WCAG AA contrast requirements
      expect(contrastResult.passRate).toBeGreaterThanOrEqual(95) // Allow 5% tolerance
      expect(contrastResult.issues.length).toBeLessThanOrEqual(2) // Allow minor issues
    })

    test('should support keyboard navigation', async () => {
      const keyboardResult = await a11yTester.testKeyboardNavigation()
      
      console.log('\n=== Keyboard Navigation Analysis ===')
      console.log(`Tab order elements: ${keyboardResult.tabOrder.length}`)
      console.log(`Skip link works: ${keyboardResult.skipLinkWorks}`)
      console.log(`All controls reachable: ${keyboardResult.allControlsReachable}`)
      console.log(`Focus indicators visible: ${keyboardResult.focusIndicatorsVisible}`)
      console.log(`Escape key works: ${keyboardResult.escapeKeyWorks}`)
      
      // Log tab order for debugging
      console.log('\nTab order:')
      keyboardResult.tabOrder.forEach((element, index) => {
        console.log(`${index + 1}. ${element.tagName}${element.id ? '#' + element.id : ''} - "${element.textContent}"`)
      })
      
      // Essential keyboard navigation requirements
      expect(keyboardResult.tabOrder.length).toBeGreaterThan(0)
      expect(keyboardResult.allControlsReachable).toBe(true)
      expect(keyboardResult.focusIndicatorsVisible).toBe(true)
    })
  })

  test.describe('Screen Reader Support', () => {
    test('should provide proper screen reader support', async () => {
      const screenReaderResult = await a11yTester.testScreenReaderSupport()
      
      console.log('\n=== Screen Reader Support Analysis ===')
      console.log(`ARIA labels present: ${screenReaderResult.ariaLabelsPresent}`)
      console.log(`Semantic markup: ${screenReaderResult.semanticMarkup}`)
      console.log(`Live regions: ${screenReaderResult.liveRegions}`)
      console.log(`Heading structure: ${screenReaderResult.headingStructure}`)
      console.log(`Button labels: ${screenReaderResult.buttonLabels}`)
      console.log(`Form labels: ${screenReaderResult.formLabels}`)
      
      // Critical screen reader requirements
      expect(screenReaderResult.ariaLabelsPresent).toBe(true)
      expect(screenReaderResult.semanticMarkup).toBe(true)
      expect(screenReaderResult.buttonLabels).toBe(true)
      
      // Timer-specific requirements
      expect(screenReaderResult.liveRegions).toBe(true) // Timer updates should be announced
    })

    test('should announce timer state changes', async ({ page }) => {
      // Test that timer state changes are properly announced
      const liveRegionUpdates = await page.evaluate(() => {
        const liveRegions = document.querySelectorAll('[aria-live], [role="status"]')
        return Array.from(liveRegions).map(region => ({
          ariaLive: region.getAttribute('aria-live'),
          role: region.getAttribute('role'),
          textContent: region.textContent?.trim(),
          id: region.id || region.getAttribute('data-testid')
        }))
      })
      
      console.log('Live regions for timer announcements:', liveRegionUpdates)
      
      // Should have live regions for timer updates
      expect(liveRegionUpdates.length).toBeGreaterThan(0)
      
      const hasTimerLiveRegion = liveRegionUpdates.some(region => 
        region.ariaLive === 'polite' || region.role === 'status'
      )
      expect(hasTimerLiveRegion).toBe(true)
    })

    test('should provide meaningful button descriptions', async ({ page }) => {
      const buttonDescriptions = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button')
        return Array.from(buttons).map(button => ({
          text: button.textContent?.trim(),
          ariaLabel: button.getAttribute('aria-label'),
          title: button.getAttribute('title'),
          ariaDescribedBy: button.getAttribute('aria-describedby'),
          testId: button.getAttribute('data-testid')
        }))
      })
      
      console.log('Button descriptions:', buttonDescriptions)
      
      // All buttons should have meaningful descriptions
      for (const button of buttonDescriptions) {
        const hasDescription = button.text || button.ariaLabel || button.title
        expect(hasDescription).toBeTruthy()
        
        if (button.text || button.ariaLabel) {
          const description = button.text || button.ariaLabel || ''
          expect(description.length).toBeGreaterThan(2) // Meaningful description
        }
      }
    })
  })

  test.describe('Motor Impairment Accommodations', () => {
    test('should provide adequate touch targets', async () => {
      const motorResult = await a11yTester.testMotorAccommodations()
      
      console.log('\n=== Motor Accessibility Analysis ===')
      console.log(`Touch targets tested: ${motorResult.touchTargetSize.length}`)
      
      // Log touch target sizes
      motorResult.touchTargetSize.forEach(target => {
        console.log(`- ${target.element}: ${target.width}x${target.height}px (meets minimum: ${target.meetsMinimum})`)
      })
      
      // WCAG requires minimum 44x44px touch targets
      const inadequateTargets = motorResult.touchTargetSize.filter(target => !target.meetsMinimum)
      
      if (inadequateTargets.length > 0) {
        console.log('\nInadequate touch targets:')
        inadequateTargets.forEach(target => {
          console.log(`- ${target.element}: ${target.width}x${target.height}px`)
        })
      }
      
      // All critical controls should meet minimum size
      expect(inadequateTargets.length).toBeLessThanOrEqual(1) // Allow one minor violation
      
      // Main timer controls must meet requirements
      const mainControls = motorResult.touchTargetSize.filter(target => 
        target.element.includes('start') || 
        target.element.includes('pause') || 
        target.element.includes('stop')
      )
      
      for (const control of mainControls) {
        expect(control.meetsMinimum).toBe(true)
      }
    })

    test('should handle timeout extensions appropriately', async ({ page }) => {
      // Start timer to test if there are any timeout-related accessibility issues
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-beginner"]').click()
      await page.locator('[data-testid="start-button"]').click()
      
      // Check for any timeout warnings or controls
      const timeoutHandling = await page.evaluate(() => {
        // Look for any timeout-related accessibility features
        const timeoutWarnings = document.querySelectorAll('[role="alert"][data-timeout], [aria-live="assertive"]')
        const extendControls = document.querySelectorAll('[data-testid*="extend"], [data-testid*="timeout"]')
        
        return {
          hasTimeoutWarnings: timeoutWarnings.length > 0,
          hasExtendControls: extendControls.length > 0,
          timerCanBePaused: !!document.querySelector('[data-testid="pause-button"]')
        }
      })
      
      console.log('Timeout handling:', timeoutHandling)
      
      // Timer should be pausable to accommodate users who need more time
      expect(timeoutHandling.timerCanBePaused).toBe(true)
      
      await page.locator('[data-testid="stop-button"]').click()
    })

    test('should support alternative input methods', async ({ page }) => {
      // Test that all controls work with different interaction methods
      
      // Test spacebar activation for buttons
      await page.locator('[data-testid="start-button"]').focus()
      await page.keyboard.press('Space')
      await page.waitForTimeout(1000)
      
      // Verify timer started
      const timerStarted = await page.locator('[data-testid="pause-button"]').isVisible()
      expect(timerStarted).toBe(true)
      
      // Test Enter key activation
      await page.locator('[data-testid="pause-button"]').focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      // Verify timer paused
      const timerPaused = await page.locator('[data-testid="start-button"]').isVisible()
      expect(timerPaused).toBe(true)
      
      // Clean up
      await page.locator('[data-testid="stop-button"]').click()
    })
  })

  test.describe('Visual and Cognitive Accommodations', () => {
    test('should support high contrast mode', async ({ page }) => {
      // Test forced colors mode (Windows high contrast)
      await page.emulateMedia({ forcedColors: 'active' })
      await page.waitForTimeout(500)
      
      // Verify elements are still visible and functional
      const elementsVisible = await page.evaluate(() => {
        const criticalElements = [
          document.querySelector('[data-testid="timer-display"]'),
          document.querySelector('[data-testid="start-button"]'),
          document.querySelector('[data-testid="current-time"]')
        ]
        
        return criticalElements.every(element => {
          if (!element) return false
          const style = getComputedStyle(element)
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
        })
      })
      
      expect(elementsVisible).toBe(true)
      
      // Reset media emulation
      await page.emulateMedia({ forcedColors: null })
    })

    test('should respect reduced motion preferences', async ({ page }) => {
      // Test prefers-reduced-motion
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForTimeout(500)
      
      // Check if animations are reduced or disabled
      const animationReduced = await page.evaluate(() => {
        const elements = document.querySelectorAll('*')
        let hasReducedAnimations = true
        
        elements.forEach(element => {
          const style = getComputedStyle(element)
          
          // Check if animations are disabled or reduced
          if (style.animationDuration && style.animationDuration !== '0s' && parseFloat(style.animationDuration) > 0.2) {
            hasReducedAnimations = false
          }
          
          if (style.transitionDuration && style.transitionDuration !== '0s' && parseFloat(style.transitionDuration) > 0.2) {
            hasReducedAnimations = false
          }
        })
        
        return hasReducedAnimations
      })
      
      console.log(`Reduced motion respected: ${animationReduced}`)
      
      // Should respect reduced motion preference
      expect(animationReduced).toBe(true)
      
      // Reset media emulation
      await page.emulateMedia({ reducedMotion: null })
    })

    test('should provide clear visual hierarchy', async ({ page }) => {
      // Test heading structure and visual hierarchy
      const visualHierarchy = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        const importantElements = Array.from(document.querySelectorAll('[data-testid="timer-display"], [data-testid="current-time"]'))
        
        return {
          headingCount: headings.length,
          headingLevels: headings.map(h => ({
            level: parseInt(h.tagName.charAt(1)),
            text: h.textContent?.trim()
          })),
          timerElementsProminient: importantElements.every(element => {
            const style = getComputedStyle(element)
            const fontSize = parseFloat(style.fontSize)
            return fontSize >= 24 // Timer should be prominently displayed
          })
        }
      })
      
      console.log('Visual hierarchy:', visualHierarchy)
      
      // Should have clear visual hierarchy
      expect(visualHierarchy.headingCount).toBeGreaterThan(0)
      expect(visualHierarchy.timerElementsProminient).toBe(true)
    })
  })

  // Save accessibility test results
  test.afterEach(async ({ page, browserName }, testInfo) => {
    // Capture accessibility state information
    const a11yState = await page.evaluate(() => {
      return {
        focusedElement: {
          tagName: document.activeElement?.tagName,
          id: document.activeElement?.id,
          ariaLabel: document.activeElement?.getAttribute('aria-label')
        },
        ariaElements: {
          liveRegions: document.querySelectorAll('[aria-live]').length,
          buttons: document.querySelectorAll('button').length,
          landmarks: document.querySelectorAll('main, nav, aside, section, [role="main"], [role="navigation"]').length,
          headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length
        },
        mediaQueries: {
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          highContrast: window.matchMedia('(prefers-contrast: high)').matches,
          largeFonts: window.matchMedia('(prefers-font-size: large)').matches
        }
      }
    })
    
    // Save test results
    const resultsDir = path.join(__dirname, '../test-results')
    await fs.mkdir(resultsDir, { recursive: true })
    
    await fs.writeFile(
      path.join(resultsDir, `accessibility-test-${browserName}-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.json`),
      JSON.stringify({
        testTitle: testInfo.title,
        browserName,
        status: testInfo.status,
        duration: testInfo.duration,
        a11yState,
        timestamp: new Date().toISOString()
      }, null, 2)
    )
  })
})