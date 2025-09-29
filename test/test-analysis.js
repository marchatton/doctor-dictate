const { execSync } = require('child_process');

// Run tests and capture output
const output = execSync('pnpm test 2>&1', { encoding: 'utf-8' }).toString();

// Parse failures
const failurePatterns = {
  importErrors: [],
  mediaRecorderErrors: [],
  fetchErrors: [],
  moduleNotFound: [],
  timeoutErrors: [],
  assertionErrors: [],
  otherErrors: []
};

// Extract failure information
const lines = output.split('\n');
let currentTest = '';
let currentSuite = '';

lines.forEach((line, i) => {
  // Track current test suite
  if (line.includes('FAIL src/')) {
    currentSuite = line.replace('FAIL ', '').trim();
  }
  
  // Track current test
  if (line.includes('● ')) {
    currentTest = line.replace('● ', '').trim();
  }
  
  // Categorize errors
  if (line.includes('Cannot find module')) {
    const match = line.match(/Cannot find module '([^']+)'/);
    if (match) {
      failurePatterns.moduleNotFound.push({
        suite: currentSuite,
        test: currentTest,
        module: match[1],
        line: line.trim()
      });
    }
  }
  
  if (line.includes('MediaRecorder')) {
    failurePatterns.mediaRecorderErrors.push({
      suite: currentSuite,
      test: currentTest,
      error: line.trim()
    });
  }
  
  if (line.includes('fetch is not defined')) {
    failurePatterns.fetchErrors.push({
      suite: currentSuite,
      test: currentTest,
      error: line.trim()
    });
  }
  
  if (line.includes('Exceeded timeout')) {
    failurePatterns.timeoutErrors.push({
      suite: currentSuite,
      test: currentTest,
      error: line.trim()
    });
  }
  
  if (line.includes('expect(') && line.includes('toBe')) {
    failurePatterns.assertionErrors.push({
      suite: currentSuite,
      test: currentTest,
      assertion: line.trim()
    });
  }
});

// Generate report
console.log('# Test Failure Analysis\n');
console.log(`Total Suites: ${output.match(/Test Suites: (\d+) failed/)?.[1]} failed\n`);

console.log('## Module Not Found Errors:', failurePatterns.moduleNotFound.length);
failurePatterns.moduleNotFound.forEach(err => {
  console.log(`  - ${err.suite}: Missing "${err.module}"`);
});

console.log('\n## MediaRecorder Errors:', failurePatterns.mediaRecorderErrors.length);
const uniqueMediaErrors = [...new Set(failurePatterns.mediaRecorderErrors.map(e => e.suite))];
uniqueMediaErrors.forEach(suite => {
  console.log(`  - ${suite}`);
});

console.log('\n## Fetch/Ollama Errors:', failurePatterns.fetchErrors.length);
const uniqueFetchSuites = [...new Set(failurePatterns.fetchErrors.map(e => e.suite))];
uniqueFetchSuites.forEach(suite => {
  console.log(`  - ${suite}`);
});

console.log('\n## Timeout Errors:', failurePatterns.timeoutErrors.length);
failurePatterns.timeoutErrors.forEach(err => {
  console.log(`  - ${err.suite}: ${err.test}`);
});

console.log('\n## Assertion Failures:', failurePatterns.assertionErrors.length);
const uniqueAssertionSuites = [...new Set(failurePatterns.assertionErrors.map(e => e.suite))];
uniqueAssertionSuites.forEach(suite => {
  console.log(`  - ${suite}`);
});
