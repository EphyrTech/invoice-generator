import { NextRequest } from 'next/server'

/**
 * Creates a mock NextRequest for testing API routes
 */
export function createMockRequest(
  method: string = 'GET',
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const url = 'http://localhost:3000/api/test'
  
  const mockRequest = {
    method,
    url,
    headers: new Headers(headers || {}),
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    formData: jest.fn(),
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
  } as unknown as NextRequest

  return mockRequest
}

/**
 * Mock database query results
 */
export const mockDbResults = {
  users: [
    {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      created_at: '2024-01-15T10:00:00Z',
    },
  ],
  businessProfiles: [
    {
      id: 'profile-1',
      user_id: 'user-1',
      name: 'Test Company',
      email: 'company@test.com',
      phone: '+1-555-0123',
      address: '123 Business St',
      city: 'Business City',
      state: 'BC',
      postal_code: '12345',
      country: 'USA',
      tax_id: 'TAX123456',
      created_at: '2024-01-15T10:00:00Z',
    },
  ],
  clients: [
    {
      id: 'client-1',
      user_id: 'user-1',
      name: 'Test Client',
      email: 'client@test.com',
      phone: '+1-555-0456',
      address: '456 Client Ave',
      city: 'Client City',
      state: 'CC',
      postal_code: '67890',
      country: 'USA',
      tax_id: 'CLIENT123',
      is_business_profile: false,
      business_profile_id: null,
      created_at: '2024-01-15T10:00:00Z',
    },
  ],
  invoices: [
    {
      id: 'invoice-1',
      user_id: 'user-1',
      business_profile_id: 'profile-1',
      client_id: 'client-1',
      invoice_number: 'INV-001',
      issue_date: '2024-01-15',
      due_date: '2024-02-15',
      status: 'draft',
      subtotal: 1000,
      tax_rate: 10,
      tax_amount: 100,
      discount_rate: 0,
      discount_amount: 0,
      total: 1100,
      notes: 'Test invoice',
      terms: 'Payment due in 30 days',
      currency: 'USD',
      created_at: '2024-01-15T10:00:00Z',
    },
  ],
  invoiceItems: [
    {
      id: 'item-1',
      invoice_id: 'invoice-1',
      description: 'Consulting Services',
      quantity: 10,
      unit_price: 100,
      amount: 1000,
      tax_rate: 10,
      tax_amount: 100,
      created_at: '2024-01-15T10:00:00Z',
    },
  ],
  templates: [
    {
      id: 'template-1',
      user_id: 'user-1',
      name: 'Monthly Consulting',
      business_profile_id: 'profile-1',
      client_id: 'client-1',
      invoice_number: 'INV-{YEAR}{MONTH}-{NUMBER}',
      tax_rate: 10,
      discount_rate: 0,
      notes: 'Thank you for your business!',
      terms: 'Payment due within 30 days.',
      currency: 'USD',
      created_at: '2024-01-15T10:00:00Z',
    },
  ],
  templateItems: [
    {
      id: 'template-item-1',
      template_id: 'template-1',
      description: 'Consulting Services',
      quantity: 10,
      unit_price: 100,
      tax_rate: 10,
      created_at: '2024-01-15T10:00:00Z',
    },
  ],
}

/**
 * Mock invoice data for PDF generation tests
 */
export const mockInvoiceData = {
  invoiceNumber: 'INV-2024-001',
  issueDate: '2024-01-15',
  dueDate: '2024-02-15',
  businessProfile: {
    name: 'Test Company',
    email: 'test@company.com',
    phone: '+1-555-0123',
    address: '123 Business St',
    city: 'Business City',
    state: 'BC',
    postalCode: '12345',
    country: 'USA',
    taxId: 'TAX123456',
    logoUrl: 'https://example.com/logo.png',
  },
  client: {
    name: 'Client Company',
    email: 'client@company.com',
    phone: '+1-555-0456',
    address: '456 Client Ave',
    city: 'Client City',
    state: 'CC',
    postalCode: '67890',
    country: 'USA',
    taxId: 'CLIENT123',
  },
  items: [
    {
      description: 'Consulting Services',
      quantity: 10,
      unitPrice: 100,
      amount: 1000,
      taxRate: 10,
      taxAmount: 100,
    },
  ],
  subtotal: 1000,
  taxRate: 10,
  taxAmount: 100,
  discountRate: 0,
  discountAmount: 0,
  total: 1100,
  currency: 'USD',
  notes: 'Thank you for your business!',
  terms: 'Payment due within 30 days.',
}

/**
 * Utility to wait for async operations in tests
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Mock console methods for testing
 */
export function mockConsole() {
  const originalConsole = { ...console }
  
  const mocks = {
    log: jest.spyOn(console, 'log').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    info: jest.spyOn(console, 'info').mockImplementation(),
  }

  const restore = () => {
    Object.keys(mocks).forEach(key => {
      mocks[key as keyof typeof mocks].mockRestore()
    })
  }

  return { mocks, restore }
}

/**
 * Utility to test error handling in async functions
 */
export async function expectAsyncError(
  asyncFn: () => Promise<any>,
  expectedError?: string | RegExp
) {
  try {
    await asyncFn()
    throw new Error('Expected function to throw an error')
  } catch (error: any) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(error.message).toBe(expectedError)
      } else {
        expect(error.message).toMatch(expectedError)
      }
    }
    return error
  }
}

/**
 * Generate test data with overrides
 */
export function generateTestData<T>(base: T, overrides: Partial<T> = {}): T {
  return { ...base, ...overrides }
}
