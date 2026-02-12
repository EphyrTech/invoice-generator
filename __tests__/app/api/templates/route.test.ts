import { GET, POST } from '@/app/api/templates/route'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/db-client'
import { createMockRequest, mockDbResults } from '@/__tests__/utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/db/db-client')
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
  },
}))
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-template-uuid'),
}))

const mockQuery = query as jest.MockedFunction<typeof query>

describe('/api/templates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return all templates successfully', async () => {
      mockQuery.mockResolvedValue(mockDbResults.templates)
      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET()

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM invoice_templates ORDER BY created_at DESC'
      )
      expect(NextResponse.json).toHaveBeenCalledWith(mockDbResults.templates)
      expect(response).toBe(mockResponse)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed')
      mockQuery.mockRejectedValue(dbError)

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await GET()

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching invoice templates:', dbError)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch invoice templates' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })

    it('should return empty array when no templates exist', async () => {
      mockQuery.mockResolvedValue([])
      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET()

      expect(NextResponse.json).toHaveBeenCalledWith([])
      expect(response).toBe(mockResponse)
    })
  })

  describe('POST', () => {
    const validTemplateData = {
      name: 'New Template',
      businessProfileId: 'profile-1',
      clientId: 'client-1',
      invoiceNumber: 'INV-{YEAR}{MONTH}-{NUMBER}',
      taxRate: 10,
      discountRate: 5,
      notes: 'Template notes',
      terms: 'Template terms',
      currency: 'USD',
      items: [
        {
          description: 'Consulting Services',
          quantity: 10,
          unitPrice: 100,
          taxRate: 10,
        },
        {
          description: 'Development Work',
          quantity: 5,
          unitPrice: 150,
          taxRate: 10,
        },
      ],
    }

    it('should create a new template successfully', async () => {
      const mockRequest = createMockRequest('POST', validTemplateData)

      const mockCreatedTemplate = { id: 'test-template-uuid', ...validTemplateData }
      mockQuery
        .mockResolvedValueOnce([mockCreatedTemplate]) // Template insert
        .mockResolvedValueOnce([]) // Items insert

      const mockResponse = { status: 201 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(mockRequest.json).toHaveBeenCalled()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoice_templates'),
        expect.arrayContaining([
          'test-template-uuid',
          'user-1', // Default user ID
          validTemplateData.name,
          validTemplateData.businessProfileId,
          validTemplateData.clientId,
          validTemplateData.invoiceNumber,
          validTemplateData.taxRate,
          validTemplateData.discountRate,
          validTemplateData.notes,
          validTemplateData.terms,
          validTemplateData.currency,
          expect.any(Date),
          expect.any(Date),
        ])
      )
      expect(NextResponse.json).toHaveBeenCalledWith(mockCreatedTemplate, { status: 201 })
      expect(response).toBe(mockResponse)
    })

    it('should return 400 when name is missing', async () => {
      const invalidData = { ...validTemplateData }as any
      delete invalidData.name

      const mockRequest = createMockRequest('POST', invalidData)

      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Template name is required' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should return 400 when business profile is missing', async () => {
      const invalidData = { ...validTemplateData }as any
      delete invalidData.businessProfileId

      const mockRequest = createMockRequest('POST', invalidData)

      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Business profile is required' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
    })

    it('should return 400 when client is missing', async () => {
      const invalidData = { ...validTemplateData }as any
      delete invalidData.clientId

      const mockRequest = createMockRequest('POST', invalidData)

      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Client is required' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
    })

    it('should handle database errors during creation', async () => {
      const mockRequest = createMockRequest('POST', validTemplateData)

      const dbError = new Error('Database insert failed')
      mockQuery.mockRejectedValue(dbError)

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await POST(mockRequest)

      expect(consoleSpy).toHaveBeenCalledWith('Error creating invoice template:', dbError)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to create invoice template' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })

    it('should create template with minimal required data', async () => {
      const minimalData = {
        name: 'Minimal Template',
        businessProfileId: 'profile-1',
        clientId: 'client-1',
      }

      const mockRequest = createMockRequest('POST', minimalData)

      const mockCreatedTemplate = { id: 'test-template-uuid', ...minimalData }
      mockQuery.mockResolvedValue([mockCreatedTemplate])

      const mockResponse = { status: 201 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoice_templates'),
        expect.arrayContaining([
          'test-template-uuid',
          'user-1',
          minimalData.name,
          minimalData.businessProfileId,
          minimalData.clientId,
          null, // invoiceNumber
          0, // taxRate
          0, // discountRate
          null, // notes
          null, // terms
          'USD', // currency default
          expect.any(Date),
          expect.any(Date),
        ])
      )
      expect(response).toBe(mockResponse)
    })

    it('should create template items when provided', async () => {
      const mockRequest = createMockRequest('POST', validTemplateData)

      const mockCreatedTemplate = { id: 'test-template-uuid' }
      mockQuery
        .mockResolvedValueOnce([mockCreatedTemplate])
        .mockResolvedValueOnce([]) // First item insert
        .mockResolvedValueOnce([]) // Second item insert

      await POST(mockRequest)

      // Verify template items are created
      expect(mockQuery).toHaveBeenCalledTimes(3) // 1 template + 2 items
      
      // Check first item insert
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO invoice_template_items'),
        expect.arrayContaining([
          expect.any(String), // UUID
          'test-template-uuid',
          'Consulting Services',
          10,
          100,
          10,
          expect.any(Date),
          expect.any(Date),
        ])
      )

      // Check second item insert
      expect(mockQuery).toHaveBeenNthCalledWith(3,
        expect.stringContaining('INSERT INTO invoice_template_items'),
        expect.arrayContaining([
          expect.any(String), // UUID
          'test-template-uuid',
          'Development Work',
          5,
          150,
          10,
          expect.any(Date),
          expect.any(Date),
        ])
      )
    })

    it('should handle empty items array', async () => {
      const dataWithNoItems = {
        ...validTemplateData,
        items: [],
      }

      const mockRequest = createMockRequest('POST', dataWithNoItems)

      const mockCreatedTemplate = { id: 'test-template-uuid' }
      mockQuery.mockResolvedValue([mockCreatedTemplate])

      await POST(mockRequest)

      // Should only create template, no items
      expect(mockQuery).toHaveBeenCalledTimes(1)
    })

    it('should handle invalid JSON in request', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await POST(mockRequest)

      expect(consoleSpy).toHaveBeenCalledWith('Error creating invoice template:', expect.any(Error))
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to create invoice template' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })
  })
})
