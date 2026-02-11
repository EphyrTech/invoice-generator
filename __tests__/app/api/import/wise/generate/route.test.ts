import { POST } from '@/app/api/import/wise/generate/route'
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
  v4: jest.fn(() => 'test-uuid'),
}))

const mockQuery = query as jest.MockedFunction<typeof query>

describe('/api/import/wise/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    const validBody = {
      transactions: [
        {
          description: 'Payment from Client A',
          date: '2025-11-15',
          amount: 1000,
          currency: 'EUR',
          reference: 'TX-123',
          businessProfileId: 'bp-1',
          clientId: 'client-1',
        },
        {
          description: 'Payment from Client B',
          date: '2025-11-20',
          amount: 2500,
          currency: 'EUR',
          reference: 'TX-456',
          businessProfileId: 'bp-1',
          clientId: 'client-2',
        },
      ],
    }

    it('should create invoices for valid transactions', async () => {
      // Mock: get last invoice number
      mockQuery
        .mockResolvedValueOnce([{ invoice_number: 'INV-0005' }]) // existing invoice number lookup
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce([]) // INSERT invoice 1
        .mockResolvedValueOnce([]) // INSERT invoice_item 1
        .mockResolvedValueOnce([]) // INSERT invoice 2
        .mockResolvedValueOnce([]) // INSERT invoice_item 2
        .mockResolvedValueOnce([]) // COMMIT

      const mockResponse = { status: 201 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      // Verify BEGIN was called
      expect(mockQuery).toHaveBeenCalledWith('BEGIN')

      // Verify first invoice insert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoices'),
        expect.arrayContaining([
          'test-uuid',
          'user-1',
          'bp-1',
          'client-1',
          'INV-0006',
          '2025-11-15',
          'draft',
          1000,
          0,
          0,
          1000,
          'Wise ref: TX-123',
          'EUR',
        ])
      )

      // Verify first invoice item insert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoice_items'),
        expect.arrayContaining([
          'test-uuid',
          'test-uuid',
          'Payment from Client A',
          1,
          1000,
          1000,
        ])
      )

      // Verify second invoice insert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoices'),
        expect.arrayContaining([
          'test-uuid',
          'user-1',
          'bp-1',
          'client-2',
          'INV-0007',
          '2025-11-20',
          'draft',
          2500,
          0,
          0,
          2500,
          'Wise ref: TX-456',
          'EUR',
        ])
      )

      // Verify COMMIT was called
      expect(mockQuery).toHaveBeenCalledWith('COMMIT')

      // Verify response
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          created: [
            { id: 'test-uuid', invoiceNumber: 'INV-0006' },
            { id: 'test-uuid', invoiceNumber: 'INV-0007' },
          ],
        },
        { status: 201 }
      )
      expect(response).toBe(mockResponse)
    })

    it('should start at INV-0001 when no existing invoices', async () => {
      // Mock: no existing invoices
      mockQuery
        .mockResolvedValueOnce([]) // no existing invoices
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce([]) // INSERT invoice
        .mockResolvedValueOnce([]) // INSERT invoice_item
        .mockResolvedValueOnce([]) // COMMIT

      const mockResponse = { status: 201 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const singleTxBody = {
        transactions: [validBody.transactions[0]],
      }

      const mockRequest = {
        json: jest.fn().mockResolvedValue(singleTxBody),
      } as unknown as NextRequest

      await POST(mockRequest)

      // Verify invoice number starts at INV-0001
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoices'),
        expect.arrayContaining(['INV-0001'])
      )

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          created: [{ id: 'test-uuid', invoiceNumber: 'INV-0001' }],
        },
        { status: 201 }
      )
    })

    it('should return 400 for empty transactions array', async () => {
      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ transactions: [] }),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Invalid request') }),
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should return 400 for missing required fields', async () => {
      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const invalidBody = {
        transactions: [
          {
            description: 'Payment',
            // missing date, amount, currency, reference, businessProfileId, clientId
          },
        ],
      }

      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Invalid request') }),
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should rollback on database error', async () => {
      const dbError = new Error('Database insert failed')

      mockQuery
        .mockResolvedValueOnce([{ invoice_number: 'INV-0001' }]) // existing invoice lookup
        .mockResolvedValueOnce([]) // BEGIN
        .mockRejectedValueOnce(dbError) // INSERT invoice fails

      // ROLLBACK should succeed
      mockQuery.mockResolvedValueOnce([])

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          transactions: [validBody.transactions[0]],
        }),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      // Verify ROLLBACK was called
      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK')

      // Verify error response
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to generate invoices' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })
  })
})
