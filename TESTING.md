# Testing Guide

This document provides comprehensive information about testing in the Invoice PDF Generator project.

## 🧪 Testing Framework

### Technology Stack
- **Jest** - Testing framework
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers
- **@testing-library/user-event** - User interaction simulation
- **MSW (Mock Service Worker)** - API mocking
- **Supertest** - HTTP assertion library

### Test Configuration
- **Jest Config**: `jest.config.js`
- **Setup File**: `jest.setup.js`
- **Coverage Threshold**: 80% for all metrics

## 📁 Test Structure

```
__tests__/
├── app/
│   └── api/                    # API route tests
│       ├── health/
│       ├── clients/
│       ├── business-profiles/
│       ├── invoices/
│       ├── templates/
│       └── dashboard/
├── lib/
│   ├── db/                     # Database utility tests
│   └── pdf/                    # PDF generation tests
└── utils/
    └── test-helpers.ts         # Test utilities
```

## 🚀 Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI (no watch, with coverage)
npm run test:ci

# Run specific test file
npm test -- health.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should return"
```

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## 📊 Test Coverage

### Current Coverage Targets
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Coverage Areas
- ✅ API Routes (GET, POST, PUT, DELETE)
- ✅ Database operations
- ✅ PDF generation
- ✅ Error handling
- ✅ Validation logic
- ✅ Business logic calculations

## 🔧 Test Categories

### 1. Unit Tests
Test individual functions and components in isolation.

**Examples:**
- Database client functions
- PDF generation utilities
- Calculation functions
- Validation helpers

### 2. Integration Tests
Test API routes and database interactions.

**Examples:**
- API endpoint functionality
- Database CRUD operations
- Request/response handling
- Error scenarios

### 3. Component Tests
Test React components (when applicable).

**Examples:**
- PDF download components
- Form validation
- User interactions

## 📝 Writing Tests

### Test File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- Component tests: `*.component.test.tsx`

### Test Structure
```typescript
describe('Component/Function Name', () => {
  beforeEach(() => {
    // Setup before each test
    jest.clearAllMocks()
  })

  describe('method/functionality', () => {
    it('should do something specific', async () => {
      // Arrange
      const mockData = { /* test data */ }
      
      // Act
      const result = await functionUnderTest(mockData)
      
      // Assert
      expect(result).toEqual(expectedResult)
    })

    it('should handle error cases', async () => {
      // Test error scenarios
    })
  })
})
```

### Best Practices

#### 1. Test Naming
- Use descriptive test names
- Follow "should [expected behavior] when [condition]" pattern
- Group related tests with `describe` blocks

#### 2. Mocking
```typescript
// Mock external dependencies
jest.mock('@/lib/db/db-client')
jest.mock('next/server')

// Use type-safe mocks
const mockQuery = query as jest.MockedFunction<typeof query>
```

#### 3. Test Data
```typescript
// Use test helpers for consistent data
import { mockDbResults, createMockRequest } from '@/__tests__/utils/test-helpers'

// Create focused test data
const validUserData = {
  name: 'Test User',
  email: 'test@example.com',
}
```

#### 4. Async Testing
```typescript
// Test async functions properly
it('should handle async operations', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})

// Test error handling
it('should handle async errors', async () => {
  mockFunction.mockRejectedValue(new Error('Test error'))
  
  await expect(asyncFunction()).rejects.toThrow('Test error')
})
```

## 🛠️ Test Utilities

### Test Helpers (`__tests__/utils/test-helpers.ts`)

#### `createMockRequest(method, body, headers)`
Creates mock NextRequest objects for API testing.

#### `mockDbResults`
Predefined database result objects for consistent testing.

#### `mockInvoiceData`
Complete invoice data for PDF generation tests.

#### `mockConsole()`
Utilities for testing console output.

#### `expectAsyncError(asyncFn, expectedError)`
Helper for testing async error scenarios.

### Custom Matchers
```typescript
// Available through jest-dom
expect(element).toBeInTheDocument()
expect(element).toHaveAttribute('data-testid', 'value')
expect(element).toHaveTextContent('Expected text')
```

## 🔍 Debugging Tests

### Common Issues

#### 1. Mock Not Working
```typescript
// Ensure mocks are properly typed
const mockFunction = jest.fn() as jest.MockedFunction<typeof originalFunction>

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks()
})
```

#### 2. Async Test Failures
```typescript
// Always await async operations
await expect(asyncFunction()).resolves.toBe(expected)

// Use proper error testing
await expect(asyncFunction()).rejects.toThrow()
```

#### 3. Environment Variables
```typescript
// Set test environment variables in jest.setup.js
process.env.DATABASE_URL = 'test-url'
```

### Debug Commands
```bash
# Run tests with verbose output
npm test -- --verbose

# Run single test file with debugging
npm test -- --testNamePattern="specific test" --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 🚦 Continuous Integration

### GitHub Actions
Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

### CI Pipeline
1. **Lint** - Code style and TypeScript checks
2. **Test** - Unit and integration tests
3. **Coverage** - Coverage report generation
4. **Build** - Application build verification
5. **Security** - Dependency vulnerability scan

### Coverage Reporting
- Coverage reports are generated in CI
- Results are commented on pull requests
- Coverage trends are tracked over time

## 📈 Test Metrics

### Coverage Goals
- Maintain 80%+ coverage across all metrics
- Focus on critical business logic
- Ensure error paths are tested

### Quality Metrics
- All tests should be deterministic
- Tests should run in under 30 seconds
- No flaky tests allowed

## 🔄 Test Maintenance

### Regular Tasks
- Update test data when schemas change
- Refactor tests when code changes
- Remove obsolete tests
- Add tests for new features

### Test Review Checklist
- [ ] Tests cover happy path
- [ ] Tests cover error scenarios
- [ ] Tests are properly isolated
- [ ] Mocks are appropriate
- [ ] Test names are descriptive
- [ ] Coverage meets requirements

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Docs](https://testing-library.com/docs/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
