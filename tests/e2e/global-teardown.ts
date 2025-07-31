/**
 * Playwright Global Teardown for Boxing Timer E2E Tests
 * 
 * Global teardown configuration for end-to-end testing:
 * - Development server cleanup and graceful shutdown
 * - Test result aggregation and reporting
 * - Performance metrics analysis and comparison
 * - Test artifact cleanup and archiving
 * - Browser resource cleanup
 * - Final test summary and failure analysis
 */

import { FullConfig } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'
import { spawn } from 'child_process'

interface TeardownMetrics {
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  totalDuration: number
  performanceIssues: string[]
  accessibilityIssues: string[]
  crossBrowserIssues: string[]
}

/**
 * Stop development server gracefully
 * Business Rule: Server should be stopped cleanly to prevent port conflicts
 */
async function stopDevServer(): Promise<void> {
  console.log('🛑 Stopping development server...')

  try {
    // Find and kill the development server process
    const killCommand = process.platform === 'win32' 
      ? `taskkill /f /im node.exe` 
      : `pkill -f "next dev"`

    await new Promise<void>((resolve, reject) => {
      const killProcess = spawn(killCommand, { shell: true })
      
      killProcess.on('close', (code) => {
        if (code === 0 || code === 1) { // 1 is acceptable (no process found)
          console.log('✅ Development server stopped')
          resolve()
        } else {
          console.warn(`⚠️  Kill command exited with code ${code}`)
          resolve() // Don't fail teardown for this
        }
      })

      killProcess.on('error', (error) => {
        console.warn('⚠️  Error stopping development server:', error.message)
        resolve() // Don't fail teardown for this
      })

      // Timeout after 10 seconds
      setTimeout(() => {
        killProcess.kill()
        console.warn('⚠️  Server stop timeout, forcing cleanup')
        resolve()
      }, 10000)
    })
  } catch (error) {
    console.warn('⚠️  Failed to stop development server:', error)
  }
}

/**
 * Analyze performance metrics from test runs
 * Business Rule: Performance degradation should be identified and reported
 */
async function analyzePerformanceMetrics(): Promise<string[]> {
  console.log('📊 Analyzing performance metrics...')
  
  const issues: string[] = []

  try {
    const baselineMetricsPath = path.join(__dirname, '../test-results/baseline-metrics.json')
    const testResultsDir = path.join(__dirname, '../test-results')

    // Load baseline metrics
    let baselineMetrics: any = null
    try {
      const baselineData = await fs.readFile(baselineMetricsPath, 'utf-8')
      baselineMetrics = JSON.parse(baselineData)
    } catch (error) {
      console.warn('⚠️  Baseline metrics not found, skipping performance analysis')
      return issues
    }

    // Analyze test performance results
    const resultFiles = await fs.readdir(testResultsDir)
    const performanceFiles = resultFiles.filter(file => file.includes('performance') && file.endsWith('.json'))

    for (const file of performanceFiles) {
      try {
        const filePath = path.join(testResultsDir, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const metrics = JSON.parse(data)

        // Compare against baseline
        if (metrics.loadTime > baselineMetrics.loadTime * 1.2) {
          issues.push(`Load time regression in ${file}: ${metrics.loadTime}ms vs baseline ${baselineMetrics.loadTime}ms`)
        }

        if (metrics.firstContentfulPaint > baselineMetrics.firstContentfulPaint * 1.3) {
          issues.push(`FCP regression in ${file}: ${metrics.firstContentfulPaint}ms vs baseline ${baselineMetrics.firstContentfulPaint}ms`)
        }

        if (metrics.largestContentfulPaint > baselineMetrics.largestContentfulPaint * 1.3) {
          issues.push(`LCP regression in ${file}: ${metrics.largestContentfulPaint}ms vs baseline ${baselineMetrics.largestContentfulPaint}ms`)
        }

        if (metrics.cumulativeLayoutShift > 0.1) {
          issues.push(`High CLS detected in ${file}: ${metrics.cumulativeLayoutShift}`)
        }
      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${file}:`, error)
      }
    }

    if (issues.length === 0) {
      console.log('✅ No performance regressions detected')
    } else {
      console.warn(`⚠️  ${issues.length} performance issues detected`)
    }
  } catch (error) {
    console.warn('⚠️  Performance analysis failed:', error)
  }

  return issues
}

/**
 * Analyze accessibility test results
 * Business Rule: Accessibility violations should be identified and categorized
 */
async function analyzeAccessibilityResults(): Promise<string[]> {
  console.log('♿ Analyzing accessibility results...')
  
  const issues: string[] = []

  try {
    const testResultsDir = path.join(__dirname, '../test-results')
    const resultFiles = await fs.readdir(testResultsDir)
    const a11yFiles = resultFiles.filter(file => file.includes('accessibility') && file.endsWith('.json'))

    for (const file of a11yFiles) {
      try {
        const filePath = path.join(testResultsDir, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const results = JSON.parse(data)

        if (results.violations && results.violations.length > 0) {
          results.violations.forEach((violation: any) => {
            issues.push(`${violation.impact} accessibility issue in ${file}: ${violation.description}`)
          })
        }
      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${file}:`, error)
      }
    }

    if (issues.length === 0) {
      console.log('✅ No accessibility violations detected')
    } else {
      console.warn(`⚠️  ${issues.length} accessibility issues detected`)
    }
  } catch (error) {
    console.warn('⚠️  Accessibility analysis failed:', error)
  }

  return issues
}

/**
 * Analyze cross-browser compatibility results
 * Business Rule: Cross-browser inconsistencies should be identified
 */
async function analyzeCrossBrowserResults(): Promise<string[]> {
  console.log('🌐 Analyzing cross-browser compatibility...')
  
  const issues: string[] = []

  try {
    const testResultsDir = path.join(__dirname, '../test-results')
    const resultFiles = await fs.readdir(testResultsDir)
    
    // Group results by browser
    const browserResults: Record<string, any[]> = {
      chromium: [],
      firefox: [],
      webkit: []
    }

    for (const file of resultFiles) {
      if (file.endsWith('.json') && file.includes('browser-')) {
        const browser = file.includes('chromium') ? 'chromium' :
                      file.includes('firefox') ? 'firefox' :
                      file.includes('webkit') ? 'webkit' : null

        if (browser) {
          try {
            const filePath = path.join(testResultsDir, file)
            const data = await fs.readFile(filePath, 'utf-8')
            const results = JSON.parse(data)
            browserResults[browser].push({ file, results })
          } catch (error) {
            console.warn(`⚠️  Failed to analyze ${file}:`, error)
          }
        }
      }
    }

    // Compare results across browsers
    const browsers = Object.keys(browserResults)
    for (let i = 0; i < browsers.length; i++) {
      for (let j = i + 1; j < browsers.length; j++) {
        const browser1 = browsers[i]
        const browser2 = browsers[j]
        
        // Compare test outcomes
        const browser1Results = browserResults[browser1]
        const browser2Results = browserResults[browser2]

        if (browser1Results.length !== browser2Results.length) {
          issues.push(`Test count mismatch between ${browser1} (${browser1Results.length}) and ${browser2} (${browser2Results.length})`)
        }

        // Check for browser-specific failures
        browser1Results.forEach(result1 => {
          const matching = browser2Results.find(result2 => 
            result1.file.replace(browser1, '') === result2.file.replace(browser2, '')
          )
          
          if (matching) {
            if (result1.results.status !== matching.results.status) {
              issues.push(`Status mismatch for test ${result1.file}: ${browser1}=${result1.results.status}, ${browser2}=${matching.results.status}`)
            }
          }
        })
      }
    }

    if (issues.length === 0) {
      console.log('✅ No cross-browser compatibility issues detected')
    } else {
      console.warn(`⚠️  ${issues.length} cross-browser issues detected`)
    }
  } catch (error) {
    console.warn('⚠️  Cross-browser analysis failed:', error)
  }

  return issues
}

/**
 * Generate comprehensive test summary report
 * Business Rule: Test results should be summarized in a readable format
 */
async function generateTestSummaryReport(metrics: TeardownMetrics): Promise<void> {
  console.log('📋 Generating test summary report...')

  try {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: metrics.totalTests,
        passed: metrics.passedTests,
        failed: metrics.failedTests,
        skipped: metrics.skippedTests,
        successRate: metrics.totalTests > 0 ? (metrics.passedTests / metrics.totalTests * 100).toFixed(2) + '%' : '0%',
        totalDuration: `${(metrics.totalDuration / 1000).toFixed(2)}s`
      },
      issues: {
        performance: metrics.performanceIssues,
        accessibility: metrics.accessibilityIssues,
        crossBrowser: metrics.crossBrowserIssues
      },
      recommendations: []
    }

    // Add recommendations based on issues
    if (metrics.performanceIssues.length > 0) {
      report.recommendations.push('Consider optimizing loading performance and reducing bundle size')
    }
    if (metrics.accessibilityIssues.length > 0) {
      report.recommendations.push('Review and fix accessibility violations to improve compliance')
    }
    if (metrics.crossBrowserIssues.length > 0) {
      report.recommendations.push('Investigate cross-browser inconsistencies and update compatibility matrix')
    }
    if (metrics.failedTests > 0) {
      report.recommendations.push('Review and fix failing tests to improve reliability')
    }

    const reportPath = path.join(__dirname, '../test-results/test-summary-report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

    // Also create a markdown version
    const markdownReport = generateMarkdownReport(report)
    const mdReportPath = path.join(__dirname, '../test-results/test-summary-report.md')
    await fs.writeFile(mdReportPath, markdownReport)

    console.log('✅ Test summary report generated')
    console.log(`📊 Results: ${report.summary.passed}/${report.summary.totalTests} passed (${report.summary.successRate})`)
  } catch (error) {
    console.warn('⚠️  Failed to generate test summary report:', error)
  }
}

/**
 * Generate markdown version of test report
 */
function generateMarkdownReport(report: any): string {
  return `# Boxing Timer E2E Test Report

## Test Summary
- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passed}
- **Failed:** ${report.summary.failed}
- **Skipped:** ${report.summary.skipped}
- **Success Rate:** ${report.summary.successRate}
- **Total Duration:** ${report.summary.totalDuration}
- **Generated:** ${report.timestamp}

## Issues Detected

### Performance Issues (${report.issues.performance.length})
${report.issues.performance.length > 0 
  ? report.issues.performance.map((issue: string) => `- ${issue}`).join('\n')
  : '- No performance issues detected ✅'
}

### Accessibility Issues (${report.issues.accessibility.length})
${report.issues.accessibility.length > 0
  ? report.issues.accessibility.map((issue: string) => `- ${issue}`).join('\n')
  : '- No accessibility issues detected ✅'
}

### Cross-Browser Issues (${report.issues.crossBrowser.length})
${report.issues.crossBrowser.length > 0
  ? report.issues.crossBrowser.map((issue: string) => `- ${issue}`).join('\n')
  : '- No cross-browser issues detected ✅'
}

## Recommendations
${report.recommendations.length > 0
  ? report.recommendations.map((rec: string) => `- ${rec}`).join('\n')
  : '- No specific recommendations at this time ✅'
}

---
*Generated by Boxing Timer E2E Test Suite*
`
}

/**
 * Clean up test artifacts
 * Business Rule: Temporary files should be cleaned up, important artifacts should be preserved
 */
async function cleanupTestArtifacts(): Promise<void> {
  console.log('🧹 Cleaning up test artifacts...')

  try {
    const testResultsDir = path.join(__dirname, '../test-results')
    const screenshotsDir = path.join(__dirname, '../screenshots')
    const videosDir = path.join(__dirname, '../videos')

    // Keep final reports and summaries, clean up temporary files
    const tempFilePatterns = [
      /^temp-/,
      /^debug-/,
      /\.tmp$/,
      /\.log$/
    ]

    for (const dir of [testResultsDir, screenshotsDir, videosDir]) {
      try {
        const files = await fs.readdir(dir)
        
        for (const file of files) {
          const shouldDelete = tempFilePatterns.some(pattern => pattern.test(file))
          
          if (shouldDelete) {
            const filePath = path.join(dir, file)
            await fs.unlink(filePath)
            console.log(`🗑️  Deleted temporary file: ${file}`)
          }
        }
      } catch (error) {
        // Directory might not exist, continue
      }
    }

    console.log('✅ Test artifact cleanup completed')
  } catch (error) {
    console.warn('⚠️  Test artifact cleanup failed:', error)
  }
}

/**
 * Archive important test results
 * Business Rule: Important test results should be archived with timestamps
 */
async function archiveTestResults(): Promise<void> {
  console.log('📦 Archiving test results...')

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const archiveDir = path.join(__dirname, `../archives/run-${timestamp}`)
    
    await fs.mkdir(archiveDir, { recursive: true })

    // Archive important files
    const filesToArchive = [
      'test-summary-report.json',
      'test-summary-report.md',
      'baseline-metrics.json'
    ]

    const testResultsDir = path.join(__dirname, '../test-results')
    
    for (const file of filesToArchive) {
      try {
        const sourcePath = path.join(testResultsDir, file)
        const destPath = path.join(archiveDir, file)
        await fs.copyFile(sourcePath, destPath)
      } catch (error) {
        // File might not exist, continue
      }
    }

    console.log(`✅ Test results archived to: ${archiveDir}`)
  } catch (error) {
    console.warn('⚠️  Test result archiving failed:', error)
  }
}

/**
 * Main global teardown function
 */
async function globalTeardown(config: FullConfig): Promise<void> {
  console.log('🎬 Starting Boxing Timer E2E Test Global Teardown...')

  const startTime = Date.now()

  try {
    // Analyze test results
    const performanceIssues = await analyzePerformanceMetrics()
    const accessibilityIssues = await analyzeAccessibilityResults()
    const crossBrowserIssues = await analyzeCrossBrowserResults()

    // Create metrics summary (these would normally come from test runner)
    const metrics: TeardownMetrics = {
      totalTests: 0, // Would be populated by test runner
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: Date.now() - startTime,
      performanceIssues,
      accessibilityIssues,
      crossBrowserIssues
    }

    // Generate comprehensive report
    await generateTestSummaryReport(metrics)

    // Cleanup and archiving
    await archiveTestResults()
    await cleanupTestArtifacts()

    // Stop development server
    await stopDevServer()

    console.log('🎉 Global teardown completed successfully!')
    
    // Print final summary
    const totalIssues = performanceIssues.length + accessibilityIssues.length + crossBrowserIssues.length
    if (totalIssues > 0) {
      console.log(`⚠️  ${totalIssues} issues detected across all categories`)
      console.log('📋 Check test-summary-report.md for detailed analysis')
    } else {
      console.log('✅ No issues detected - all tests passed quality checks!')
    }

  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    
    // Ensure server cleanup even on failure
    try {
      await stopDevServer()
    } catch (cleanupError) {
      console.error('❌ Failed to cleanup server during error handling:', cleanupError)
    }
    
    throw error
  }
}

export default globalTeardown