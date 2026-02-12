/**
 * Integration tests for API endpoints
 * These tests verify the complete request/response cycle
 */

import { NextRequest } from 'next/server'
import { createMockRequest } from '@/__tests__/utils/test-helpers'

// Import API handlers
import { GET as healthGet } from '@/app/api/health/route'
import { GET as clientsGet, POST as clientsPost } from '@/app/api/clients/route'
import { GET as profilesGet, POST as profilesPost } from '@/app/api/business-profiles/route'
import { GET as invoicesGet, POST as invoicesPost } from '@/app/api/invoices/route'
import { GET as templatesGet, POST as templatesPost } from '@/app/api/templates/route'

// Mock database
jest.mock('@/lib/db/db-client', () => ({
  query: jest.fn(),
  getDbPool: jest.fn(),
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      data,
    })),
  },
}))

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Health Check Flow', () => {
    it('should provide system health status', async () => {
      const response = await healthGet()
      
      expect(response).toBeDefined()
      expect(response.status).toBe(200)
    })
  })

  describe('Client Management Flow', () => {
    it('should handle complete client CRUD operations', async () => {
      const { query } = require('@/lib/db/db-client')
      
      // Mock successful operations
      query
        .mockResolvedValueOnce([]) // GET - empty list
        .mockResolvedValueOnce([{ id: 'client-1', name: 'Test Client' }]) // POST - created client

      // Test GET clients
      const getResponse = await clientsGet()
      expect(getResponse.status).toBe(200)

      // Test POST client
      const clientData = {
        name: 'Test Client',
        email: 'test@client.com',
        phone: '+1-555-0123',
      }
      
      const postRequest = createMockRequest('POST', clientData)
      const postResponse = await clientsPost(postRequest)
      
      expect(postResponse.status).toBe(201)
      expect(query).toHaveBeenCalledTimes(2)
    })

    it('should handle validation errors in client creation', async () => {
      const invalidData = { email: 'test@client.com' } // Missing required name
      
      const request = createMockRequest('POST', invalidData)
      const response = await clientsPost(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Business Profile Management Flow', () => {
    it('should handle business profile operations', async () => {
      const { query } = require('@/lib/db/db-client')
      
      query
        .mockResolvedValueOnce([]) // GET - empty list
        .mockResolvedValueOnce([{ id: 'profile-1', name: 'Test Company' }]) // POST - created profile

      // Test GET profiles
      const getResponse = await profilesGet()
      expect(getResponse.status).toBe(200)

      // Test POST profile
      const profileData = {
        name: 'Test Company',
        email: 'company@test.com',
        address: '123 Business St',
      }
      
      const postRequest = createMockRequest('POST', profileData)
      const postResponse = await profilesPost(postRequest)
      
      expect(postResponse.status).toBe(201)
    })
  })

  describe('Invoice Management Flow', () => {
    it('should handle invoice creation with items', async () => {
      const { query } = require('@/lib/db/db-client')
      
      const invoiceData = {
        businessProfileId: 'profile-1',
        clientId: 'client-1',
        invoiceNumber: 'INV-001',
        issueDate: '2024-01-15',
        dueDate: '2024-02-15',
        currency: 'USD',
        taxRate: 10,
        discountRate: 0,
        items: [
          {
            description: 'Consulting',
            quantity: 10,
            unitPrice: 100,
            taxRate: 10,
          },
        ],
        notes: 'Test invoice',
        terms: 'Net 30',
        action: 'final',
      }

      query
        .mockResolvedValueOnce([]) // GET - empty list
        .mockResolvedValueOnce([{ id: 'invoice-1', ...invoiceData }]) // POST - created invoice
        .mockResolvedValueOnce([]) // Items insert

      // Test GET invoices
      const getResponse = await invoicesGet()
      expect(getResponse.status).toBe(200)

      // Test POST invoice
      const postRequest = createMockRequest('POST', invoiceData)
      const postResponse = await invoicesPost(postRequest)
      
      expect(postResponse.status).toBe(201)
      expect(query).toHaveBeenCalledTimes(3) // GET + invoice insert + items insert
    })

    it('should validate required invoice fields', async () => {
      const invalidInvoiceData = {
        // Missing required fields
        notes: 'Invalid invoice',
      }
      
      const request = createMockRequest('POST', invalidInvoiceData)
      const response = await invoicesPost(request)
      
      expect(response.status).toBe(400)
    })

    it('should calculate invoice totals correctly', async () => {
      const { query } = require('@/lib/db/db-client')
      
      const invoiceData = {
        businessProfileId: 'profile-1',
        clientId: 'client-1',
        invoiceNumber: 'INV-002',
        issueDate: '2024-01-15',
        currency: 'USD',
        taxRate: 10,
        discountRate: 5,
        items: [
          {
            description: 'Service 1',
            quantity: 2,
            unitPrice: 100,
            taxRate: 10,
          },
          {
            description: 'Service 2',
            quantity: 1,
            unitPrice: 200,
            taxRate: 10,
          },
        ],
        action: 'final',
      }

      query.mockResolvedValue([{ id: 'invoice-2' }])

      const request = createMockRequest('POST', invoiceData)
      await invoicesPost(request)

      // Verify calculation in the database insert call
      const insertCall = query.mock.calls.find(call => 
        call[0].includes('INSERT INTO invoices')
      )
      
      expect(insertCall).toBeDefined()
      
      const params = insertCall[1]
      const subtotal = params[7] // subtotal position
      const taxAmount = params[9] // taxAmount position
      const discountAmount = params[11] // discountAmount position
      const total = params[12] // total position

      // Expected: subtotal = 400, tax = 40, discount = 20, total = 420
      expect(subtotal).toBe(400)
      expect(taxAmount).toBe(40)
      expect(discountAmount).toBe(20)
      expect(total).toBe(420)
    })
  })

  describe('Template Management Flow', () => {
    it('should handle template creation and usage', async () => {
      const { query } = require('@/lib/db/db-client')
      
      const templateData = {
        name: 'Monthly Service Template',
        businessProfileId: 'profile-1',
        clientId: 'client-1',
        invoiceNumber: 'INV-{YEAR}{MONTH}-{NUMBER}',
        taxRate: 10,
        discountRate: 0,
        currency: 'USD',
        items: [
          {
            description: 'Monthly Consulting',
            quantity: 1,
            unitPrice: 1000,
            taxRate: 10,
          },
        ],
        notes: 'Monthly service',
        terms: 'Net 30',
      }

      query
        .mockResolvedValueOnce([]) // GET - empty list
        .mockResolvedValueOnce([{ id: 'template-1', ...templateData }]) // POST - created template
        .mockResolvedValueOnce([]) // Items insert

      // Test GET templates
      const getResponse = await templatesGet()
      expect(getResponse.status).toBe(200)

      // Test POST template
      const postRequest = createMockRequest('POST', templateData)
      const postResponse = await templatesPost(postRequest)
      
      expect(postResponse.status).toBe(201)
      expect(query).toHaveBeenCalledTimes(3) // GET + template insert + items insert
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle database connection failures gracefully', async () => {
      const { query } = require('@/lib/db/db-client')
      
      // Mock database connection failure
      query.mockRejectedValue(new Error('Connection failed'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Test various endpoints
      const healthResponse = await healthGet()
      const clientsResponse = await clientsGet()
      const profilesResponse = await profilesGet()
      const invoicesResponse = await invoicesGet()
      const templatesResponse = await templatesGet()

      // Health should still work (no DB dependency)
      expect(healthResponse.status).toBe(200)

      // Others should return 500
      expect(clientsResponse.status).toBe(500)
      expect(profilesResponse.status).toBe(500)
      expect(invoicesResponse.status).toBe(500)
      expect(templatesResponse.status).toBe(500)

      consoleSpy.mockRestore()
    })

    it('should handle malformed request data', async () => {
      const malformedRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await clientsPost(malformedRequest)
      expect(response.status).toBe(500)

      consoleSpy.mockRestore()
    })
  })

  describe('Data Consistency', () => {
    it('should maintain referential integrity in related operations', async () => {
      const { query } = require('@/lib/db/db-client')
      
      // Test creating invoice with non-existent business profile
      const invalidInvoiceData = {
        businessProfileId: 'non-existent-profile',
        clientId: 'client-1',
        invoiceNumber: 'INV-003',
        issueDate: '2024-01-15',
        action: 'final',
      }

      // Mock foreign key constraint error
      query.mockRejectedValue(new Error('Foreign key constraint violation'))

      const request = createMockRequest('POST', invalidInvoiceData)
      const response = await invoicesPost(request)
      
      expect(response.status).toBe(500)
    })
  })
})
