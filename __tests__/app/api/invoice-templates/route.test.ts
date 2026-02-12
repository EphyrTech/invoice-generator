import { GET, POST } from '@/app/api/invoice-templates/route'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/db-client'
import { createMockRequest } from '@/__tests__/utils/test-helpers'

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

describe('/api/invoice-templates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return all invoice templates successfully', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Monthly Service Template',
          business_profile_id: 'profile-1',
          client_id: 'client-1',
          invoice_number: 'INV-{YYYY}-{####}',
          tax_rate: 10,
          discount_rate: 0,
          currency: 'USD',
          notes: 'Monthly service',
          terms: 'Net 30',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'template-2',
          name: 'Project Template',
          business_profile_id: 'profile-1',
          client_id: 'client-2',
          invoice_number: 'PROJ-{YYYY}-{####}',
          tax_rate: 8.5,
          discount_rate: 5,
          currency: 'USD',
          notes: 'Project work',
          terms: 'Net 15',
          created_at: '2024-01-14T10:00:00Z',
        },
      ]

      mockQuery.mockResolvedValue(mockTemplates)
      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET()

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'))
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN business_profiles'))
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN clients'))
      expect(NextResponse.json).toHaveBeenCalledWith(mockTemplates)
      expect(response).toBe(mockResponse)
    })

    it('should return empty array when no templates exist', async () => {
      mockQuery.mockResolvedValue([])
      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET()

      expect(NextResponse.json).toHaveBeenCalledWith([])
      expect(response).toBe(mockResponse)
    })

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'))
      const mockResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET()

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch invoice templates' },
        { status: 500 }
      )
      expect(response).toBe(mockResponse)
    })
  })

  describe('POST', () => {
    const validTemplateData = {
      name: 'New Template',
      businessProfileId: 'profile-1',
      clientId: 'client-1',
      invoiceNumber: 'INV-{YYYY}-{####}',
      taxRate: 10,
      discountRate: 0,
      currency: 'USD',
      notes: 'Template notes',
      terms: 'Net 30',
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

    it('should create a new invoice template successfully', async () => {
      const mockRequest = createMockRequest('POST', validTemplateData)

      const mockCreatedTemplate = { id: 'test-template-uuid', ...validTemplateData }
      mockQuery
        .mockResolvedValueOnce([mockCreatedTemplate]) // Template insert
        .mockResolvedValueOnce([]) // Items insert (first item)
        .mockResolvedValueOnce([]) // Items insert (second item)

      const mockResponse = { status: 201 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoice_templates'),
        expect.arrayContaining([
          'test-template-uuid',
          'user-1',
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

      // Check that items were inserted
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoice_template_items'),
        expect.arrayContaining([
          'test-template-uuid',
          'test-template-uuid',
          'Consulting Services',
          10,
          100,
          10,
          expect.any(Date),
          expect.any(Date),
        ])
      )

      expect(NextResponse.json).toHaveBeenCalledWith(
        mockCreatedTemplate,
        { status: 201 }
      )
      expect(response).toBe(mockResponse)
    })

    it('should create template with minimal required fields', async () => {
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

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Template without required fields',
        // Missing businessProfileId and clientId
      }

      const mockRequest = createMockRequest('POST', invalidData)

      const mockResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Business profile is required' },
        { status: 400 }
      )
      expect(response).toBe(mockResponse)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should validate name field', async () => {
      const invalidData = {
        businessProfileId: 'profile-1',
        clientId: 'client-1',
        // Missing name
      }

      const mockRequest = createMockRequest('POST', invalidData)

      const mockResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Template name is required' },
        { status: 400 }
      )
      expect(response).toBe(mockResponse)
    })

    it('should validate business profile field', async () => {
      const invalidData = {
        name: 'Template Name',
        clientId: 'client-1',
        // Missing businessProfileId
      }

      const mockRequest = createMockRequest('POST', invalidData)

      const mockResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Business profile is required' },
        { status: 400 }
      )
      expect(response).toBe(mockResponse)
    })

    it('should validate client field', async () => {
      const invalidData = {
        name: 'Template Name',
        businessProfileId: 'profile-1',
        // Missing clientId
      }

      const mockRequest = createMockRequest('POST', invalidData)

      const mockResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Client is required' },
        { status: 400 }
      )
      expect(response).toBe(mockResponse)
    })

    it('should handle database errors during template creation', async () => {
      const mockRequest = createMockRequest('POST', validTemplateData)

      mockQuery.mockRejectedValue(new Error('Database connection failed'))

      const mockResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to create invoice template' },
        { status: 500 }
      )
      expect(response).toBe(mockResponse)
    })

    it('should handle invalid JSON in request', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest

      const mockResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to create invoice template' },
        { status: 500 }
      )
      expect(response).toBe(mockResponse)
    })
  })
})
