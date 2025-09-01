# Doctor-Dictate Test Suite Guide

## Overview

The test suite covers the dual-mode medical dictation processing system with unit, integration, and end-to-end tests.

## Test Structure

```
src/__tests__/
├── dual-mode.test.js      # Core dual-mode system tests
├── e2e-workflow.test.js   # End-to-end workflow tests
└── (other test files)

test/
├── dual-mode.test.js       # Comprehensive dual-mode tests
└── medical-prompt.test.js  # Medical prompt formatting tests
```

## Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Using the Test Runner Script
```bash
# Run all tests with prerequisites check
./run-tests.sh

# Run specific test suites
./run-tests.sh unit        # Unit tests only
./run-tests.sh integration # Integration tests
./run-tests.sh e2e         # End-to-end tests
./run-tests.sh quick       # All except E2E (faster)
./run-tests.sh coverage    # With coverage report
```

## Test Categories

### 1. Unit Tests

**Processing Configuration Tests**
- Validates FAST and ACCURATE mode configurations
- Checks model selections (whisper + ollama)
- Verifies performance expectations

**WhisperCpp Tests**
- Model initialization
- Audio format conversion (m4a → wav)
- Executable detection
- Error handling

**Content Verifier Tests**
- Coverage calculation (80% threshold)
- Missing content detection
- Sentence extraction

**Medical Prompt Tests**
- Prompt generation
- Dictation command processing
- Medical term corrections
- Template compliance

### 2. Integration Tests

**Unified Processor Tests**
- FAST mode processing pipeline
- ACCURATE mode processing pipeline
- Mode fallback behavior
- Configuration switching

**Formatter Integration**
- Ollama connectivity
- Model switching
- Timeout handling
- Content verification integration

### 3. End-to-End Tests

**Complete Workflow**
- Audio → Transcript → Formatted Note
- Patient information preservation
- Medical terminology handling
- Section structure validation

**Performance Benchmarks**
- FAST mode: < 2 minutes for test audio
- ACCURATE mode: < 3 minutes for test audio
- Memory usage: < 2GB

## Test Data

Test audio file: `docs/sample-data/mock recording-samir.m4a`
- Duration: ~8.5 minutes
- Content: Mock medical dictation
- Patient: John Smith (test patient)

## Prerequisites

### Required Services
1. **Ollama** - Must be running
   ```bash
   ollama serve
   ```

2. **Whisper Models** - Must be downloaded
   ```bash
   ./download-whisper-models.sh
   ```

3. **Ollama Models** - Must be available
   ```bash
   ollama pull qwen2.5:0.5b    # For FAST mode
   ollama pull qwen2.5:1.5b    # For ACCURATE mode
   ```

### Optional (for full testing)
- FFmpeg - For audio conversion
- whisper-cli - For native transcription

## Coverage Goals

- **Branches**: 60%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Common Test Scenarios

### Testing Mode Selection
```javascript
const processor = ProcessorFactory.createFast();
// or
const processor = ProcessorFactory.createAccurate();
```

### Testing Content Verification
```javascript
const verifier = new ContentVerifier();
const result = verifier.verifyContent(input, output);
expect(result.coverage).toBeGreaterThan(0.8);
```

### Testing Medical Formatting
```javascript
const formatter = new OllamaFormatter({ model: 'qwen2.5:0.5b' });
const result = await formatter.formatMedicalDictation(transcript);
expect(result.formatted).toContain('### Identification');
```

## Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Run Specific Test File
```bash
npm test -- dual-mode.test.js
```

### Run Specific Test
```bash
npm test -- --testNamePattern="should process audio in FAST mode"
```

### Debug Mode
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

## CI/CD Considerations

For CI environments:
1. Mock external services (Ollama, Whisper)
2. Use smaller test files
3. Set shorter timeouts
4. Skip E2E tests for quick checks

## Troubleshooting

### "Ollama not available"
- Ensure Ollama is running: `ollama serve`
- Check port 11434 is not blocked

### "Whisper model not found"
- Run: `./download-whisper-models.sh`
- Check `~/.whisper-cpp/models/` directory

### "Audio conversion failed"
- Ensure FFmpeg is installed: `brew install ffmpeg`
- Check audio file permissions

### Test Timeouts
- Increase timeout in jest.config.js
- Use smaller test files
- Run tests individually

## Adding New Tests

1. Create test file in `src/__tests__/`
2. Follow naming convention: `*.test.js`
3. Use descriptive test names
4. Include both positive and negative cases
5. Add appropriate timeouts for long operations

Example:
```javascript
describe('New Feature', () => {
  test('should handle normal case', async () => {
    // Test implementation
  }, 30000); // 30 second timeout
  
  test('should handle error case', async () => {
    // Error case test
  });
});
```