import { GET, POST } from '@/app/api/invoices/route'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/db-client'

// Mock dependencies
jest.mock('@/lib/db/db-client')
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
  },
}))
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-invoice-uuid'),
}))

const mockQuery = query as jest.MockedFunction<typeof query>

describe('/api/invoices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return all invoices successfully', async () => {
      const mockInvoices = [
        {
          id: 'invoice-1',
          invoice_number: 'INV-001',
          status: 'paid',
          total: 1000,
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'invoice-2',
          invoice_number: 'INV-002',
          status: 'pending',
          total: 2000,
          created_at: '2024-01-14T10:00:00Z',
        },
      ]

      mockQuery.mockResolvedValue(mockInvoices)
      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET()

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM invoices ORDER BY created_at DESC'
      )
      expect(NextResponse.json).toHaveBeenCalledWith(mockInvoices)
      expect(response).toBe(mockResponse)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed')
      mockQuery.mockRejectedValue(dbError)

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await GET()

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching invoices:', dbError)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })
  })

  describe('POST', () => {
    const validInvoiceData = {
      businessProfileId: 'profile-1',
      clientId: 'client-1',
      invoiceNumber: 'INV-003',
      issueDate: '2024-01-15',
      dueDate: '2024-02-15',
      currency: 'USD',
      taxRate: 10,
      discountRate: 5,
      notes: 'Test invoice',
      terms: 'Payment due in 30 days',
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
      saveAsTemplate: false,
      action: 'final',
    }

    it('should create a new invoice successfully', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validInvoiceData),
      } as unknown as NextRequest

      // Mock successful invoice creation
      const mockCreatedInvoice = { id: 'test-invoice-uuid', ...validInvoiceData }
      mockQuery
        .mockResolvedValueOnce([{ default_show_logo: false, default_show_status: false, default_pdf_theme: 'clean' }]) // Profile defaults
        .mockResolvedValueOnce([mockCreatedInvoice]) // Invoice insert
        .mockResolvedValueOnce([]) // Item 1 insert
        .mockResolvedValueOnce([]) // Item 2 insert

      const mockResponse = { status: 201 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(mockRequest.json).toHaveBeenCalled()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoices'),
        expect.arrayContaining([
          'test-invoice-uuid',
          'user-1', // Default user ID
          validInvoiceData.businessProfileId,
          validInvoiceData.clientId,
          validInvoiceData.invoiceNumber,
          validInvoiceData.issueDate,
          validInvoiceData.dueDate,
          'issued', // action: 'final' maps to 'issued'
          expect.any(Number), // subtotal
          validInvoiceData.taxRate,
          expect.any(Number), // taxAmount
          validInvoiceData.discountRate,
          expect.any(Number), // discountAmount
          expect.any(Number), // total
          validInvoiceData.notes,
          validInvoiceData.terms,
          validInvoiceData.currency,
          expect.any(Date),
          expect.any(Date),
          false, // show_logo_public
          false, // show_status_public
          'clean', // pdf_theme
        ])
      )
      expect(NextResponse.json).toHaveBeenCalledWith(mockCreatedInvoice, { status: 201 })
      expect(response).toBe(mockResponse)
    })

    it('should return 400 when required fields are missing', async () => {
      const invalidData = { ...validInvoiceData }as any
      delete invalidData.businessProfileId

      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidData),
      } as unknown as NextRequest

      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Business profile is required' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should validate client ID is required', async () => {
      const invalidData = { ...validInvoiceData }as any
      delete invalidData.clientId

      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidData),
      } as unknown as NextRequest

      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Client is required' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
    })

    it('should validate invoice number is required', async () => {
      const invalidData = { ...validInvoiceData }as any
      delete invalidData.invoiceNumber

      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidData),
      } as unknown as NextRequest

      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invoice number is required' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
    })

    it('should validate issue date is required', async () => {
      const invalidData = { ...validInvoiceData }as any
      delete invalidData.issueDate

      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidData),
      } as unknown as NextRequest

      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Issue date is required' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
    })

    it('should handle database errors during creation', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validInvoiceData),
      } as unknown as NextRequest

      const dbError = new Error('Database insert failed')
      mockQuery.mockRejectedValue(dbError)

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await POST(mockRequest)

      expect(consoleSpy).toHaveBeenCalledWith('Error creating invoice:', dbError)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to create invoice' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })

    it('should calculate totals correctly', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validInvoiceData),
      } as unknown as NextRequest

      const mockCreatedInvoice = { id: 'test-invoice-uuid' }
      mockQuery.mockResolvedValue([mockCreatedInvoice])

      await POST(mockRequest)

      // Verify calculations in the insert call (calls[0] is profile defaults SELECT, calls[1] is INSERT)
      const insertCall = mockQuery.mock.calls[1]
      const insertParams = insertCall[1] as unknown[]

      // Expected calculations:
      // Item 1: 10 * 100 = 1000
      // Item 2: 5 * 150 = 750
      // Subtotal: 1750, Discount (5%): 87.5, Taxable: 1662.5, Tax (10%): 166.25, Total: 1828.75

      const subtotal = insertParams[8] // subtotal position
      const taxAmount = insertParams[10] // taxAmount position
      const discountAmount = insertParams[12] // discountAmount position
      const total = insertParams[13] // total position

      expect(subtotal).toBe(1750)
      expect(taxAmount).toBe(166.25)
      expect(discountAmount).toBe(87.5)
      expect(total).toBe(1828.75)
    })

    it('should handle empty items array', async () => {
      const dataWithNoItems = {
        ...validInvoiceData,
        items: [],
      }

      const mockRequest = {
        json: jest.fn().mockResolvedValue(dataWithNoItems),
      } as unknown as NextRequest

      const mockCreatedInvoice = { id: 'test-invoice-uuid' }
      mockQuery.mockResolvedValue([mockCreatedInvoice])

      const response = await POST(mockRequest)

      // Should still create invoice with zero totals (calls[0] is profile defaults SELECT, calls[1] is INSERT)
      const insertCall = mockQuery.mock.calls[1]
      const insertParams = insertCall[1] as unknown[]

      expect(insertParams[8]).toBe(0) // subtotal
      expect(insertParams[10]).toBe(0) // taxAmount
      expect(insertParams[13]).toBe(0) // total
    })
  })
})
