#!/bin/bash

echo "🧪 Doctor-Dictate Test Suite"
echo "============================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check if Ollama is running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama is running${NC}"
else
    echo -e "${YELLOW}⚠️ Ollama is not running. Some tests may fail.${NC}"
    echo "   Start with: ollama serve"
fi

# Check if whisper-cli is installed
if command -v whisper-cli &> /dev/null; then
    echo -e "${GREEN}✅ Whisper-cli is installed${NC}"
else
    echo -e "${YELLOW}⚠️ Whisper-cli not found. Transcription tests may fail.${NC}"
    echo "   Install with: brew install whisper-cpp"
fi

# Check if models are downloaded
if [ -f "$HOME/.whisper-cpp/models/ggml-tiny.en.bin" ]; then
    echo -e "${GREEN}✅ Whisper models are downloaded${NC}"
else
    echo -e "${YELLOW}⚠️ Whisper models not found. Run: ./download-whisper-models.sh${NC}"
fi

echo ""
echo "🏃 Running tests..."
echo ""

# Run tests based on argument
case "${1:-all}" in
    unit)
        echo "Running unit tests only..."
        pnpm test -- --testPathPattern="(processing-config|content-verifier|medical-prompt)" --verbose
        ;;
    integration)
        echo "Running integration tests..."
        pnpm test -- --testPathPattern="dual-mode" --verbose
        ;;
    e2e)
        echo "Running E2E tests..."
        pnpm test -- --testPathPattern="e2e-workflow" --verbose
        ;;
    coverage)
        echo "Running tests with coverage..."
        pnpm run test:coverage
        ;;
    watch)
        echo "Starting test watcher..."
        pnpm run test:watch
        ;;
    quick)
        echo "Running quick tests (no E2E)..."
        pnpm test -- --testPathIgnorePattern="e2e" --verbose
        ;;
    *)
        echo "Running all tests..."
        pnpm test -- --verbose
        ;;
esac

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Check the output above.${NC}"
    exit 1
fi

# Show usage if help requested
if [ "$1" == "help" ] || [ "$1" == "--help" ]; then
    echo ""
    echo "Usage: ./run-tests.sh [option]"
    echo ""
    echo "Options:"
    echo "  unit       - Run unit tests only"
    echo "  integration - Run integration tests"
    echo "  e2e        - Run end-to-end tests"
    echo "  coverage   - Run tests with coverage report"
    echo "  watch      - Start test watcher"
    echo "  quick      - Run all tests except E2E"
    echo "  all        - Run all tests (default)"
    echo "  help       - Show this help message"
fi
