# Development Guidelines for Claude - Condensed Version

## Core Philosophy

**TEST-DRIVEN DEVELOPMENT IS MANDATORY.** Write tests first, always. No production code without a failing test.

**LOCAL-FIRST FOR MEDICAL DATA.** Process sensitive data entirely on-device using Whisper and Ollama. No external APIs.

## Quick Reference

### Key Principles
- TDD: Red → Green → Refactor
- TypeScript strict mode (no `any`, no type assertions)
- Immutable data only
- Test behavior, not implementation
- 100% coverage through business behavior tests

### Tech Stack
- **Language**: TypeScript (strict)
- **Testing**: Jest/Vitest + React Testing Library
- **Desktop**: Electron
- **Transcription**: Whisper.cpp (local)
- **Formatting**: Ollama (local)

## Core Principles Snapshot

- **SOLID**: Focus responsibilities; extend via additions; honor contracts; keep interfaces lean; depend on abstractions.
- **DRY**: Keep each rule in one place; refactor duplicates quickly.
- **KISS**: Prefer the simplest workable shape; cut needless abstractions.
- **YAGNI**: Skip future bets until the need is proven.
- **Convention over Configuration**: Follow shared defaults before introducing knobs.
- **Composition over Inheritance**: Assemble behavior from collaborators, not deep trees.
- **Law of Demeter**: Talk to direct collaborators only—no long chains.

## Testing

### TDD Process
1. **Red**: Write failing test for desired behavior
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve if needed, keep tests green

### Test Organization
- Test through public APIs only
- No 1:1 mapping between test and implementation files
- Use factory functions for test data with real schemas

```typescript
// Import real schemas - never redefine in tests
import { ProjectSchema, type Project } from "@your-org/schemas";

const getMockProject = (overrides?: Partial<Project>): Project => {
  return ProjectSchema.parse({
    id: "proj_123",
    name: "Test Project",
    ...overrides,
  });
};
```

## TypeScript Requirements

### Strict Mode Always
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Schema-First with Zod
```typescript
// Define schema first
const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().positive(),
});

// Derive type from schema
type User = z.infer<typeof UserSchema>;

// Use for runtime validation
const parseUser = (data: unknown): User => UserSchema.parse(data);
```

## Code Style

### Functional Programming
- No mutation - use immutable updates
- Pure functions wherever possible
- Early returns over nested conditionals
- Prefer options objects for function parameters

```typescript
// Good: Options object
type CreatePaymentOptions = {
  amount: number;
  currency: string;
  cardId: string;
};

const createPayment = (options: CreatePaymentOptions): Payment => {
  const { amount, currency, cardId } = options;
  // implementation
};

// Good: Immutable update
const addItem = (items: Item[], newItem: Item): Item[] => {
  return [...items, newItem];
};
```

### No Comments
Code must be self-documenting through clear naming and structure.

## Refactoring Principles

### When to Refactor
- After getting tests green (not optional - assess every time)
- Only refactor if it improves the code
- Commit before and after refactoring

### DRY = Don't Repeat Knowledge
Not about eliminating similar code, but about single sources of truth for business rules.

```typescript
// NOT a DRY violation - different business rules
const validateAge = (age: number): boolean => age >= 18 && age <= 100;
const validateRating = (rating: number): boolean => rating >= 1 && rating <= 5;

// IS a DRY violation - same knowledge repeated
const FREE_SHIPPING = 50; // Single source of truth
const calculateShipping = (total: number): number => 
  total > FREE_SHIPPING ? 0 : 5.99;
```

### Only Abstract Semantic Similarity
Create abstractions when code shares meaning, not just structure.

## Medical Project Specifics

### Data Integrity
- **Never lose content**: 100% preservation from dictation
- **Preserve exact wording**: Keep medical terminology as dictated
- **Verify coverage**: 80% threshold checks
- **Template-driven**: Use `templates/format/*.json`

### Local Service Pattern
```typescript
const processWithFallback = async (audio: AudioBuffer): Promise<Result> => {
  if (!await checkWhisperService()) {
    return { error: 'Whisper unavailable' };
  }
  
  const transcript = await transcribe(audio);
  
  if (!await checkOllamaService()) {
    return { text: transcript, formatted: false };
  }
  
  return { text: await format(transcript), formatted: true };
};
```

### Audio Pipeline
```
Audio → Whisper (local) → Ollama (local) → Verification → Output
```

## Working with Claude

### Expectations
1. **Always follow TDD** - no exceptions
2. **Think deeply** before edits
3. **Ask questions** when ambiguous
4. **Assess refactoring** after every green
5. **Explore root causes** consider 4-7 reasons why a bug might be caused and order by probability
6. **Update docs** - Add discoveries to this file

### Anti-Patterns to Avoid
```typescript
// Never
items.push(newItem);                    // Mutation
if (user) { if (active) { ... }}       // Nested conditionals
const api = await cloudAPI(data);       // External APIs for medical data
text = text.substring(0, 1000);        // Truncating medical content
```

## Updates Log
Add discoveries that would have been helpful to know:
- Whisper requires WAV format (convert m4a/mp3 first)
- Ollama needs 60-second timeout for long medical notes
- FFmpeg required for audio conversion
- Models must be in `~/.whisper-cpp/models/`

## Summary
Write clean, tested, functional code through small increments. Every change driven by a test. Patient data never leaves device. 100% content preservation is mandatory.
