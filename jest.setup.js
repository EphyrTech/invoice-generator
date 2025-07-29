import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.NODE_ENV = 'test'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock React PDF
jest.mock('@react-pdf/renderer', () => ({
  Document: ({ children }) => children,
  Page: ({ children }) => children,
  Text: ({ children }) => children,
  View: ({ children }) => children,
  StyleSheet: {
    create: (styles) => styles,
  },
  PDFDownloadLink: ({ children, document, fileName }) => (
    <div data-testid="pdf-download-link" data-filename={fileName}>
      {children}
    </div>
  ),
  Font: {
    register: jest.fn(),
  },
  Image: ({ src, style }) => <img src={src} style={style} alt="test" />,
}))

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}))

// Global test utilities
global.fetch = jest.fn()

// Suppress console errors in tests unless explicitly testing them
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
