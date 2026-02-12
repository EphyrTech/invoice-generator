import { GET } from '@/app/api/dashboard/stats/route'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// Mock dependencies
jest.mock('@/lib/db')
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn(),
  },
}))

const mockDb = db as jest.Mocked<typeof db>

describe('/api/dashboard/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return dashboard statistics successfully', async () => {
    // Mock database queries
    const mockSelect = jest.fn()
    const mockFrom = jest.fn().mockReturnThis()
    const mockWhere = jest.fn().mockReturnThis()
    const mockOrderBy = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockReturnThis()

    mockDb.select = mockSelect.mockReturnValue({
      from: mockFrom,
    })

    // Mock query results
    mockSelect
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 25 }]), // totalInvoices
      })
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 10 }]), // activeClients
      })
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 5 }]), // templates
      })
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 3 }]), // businessProfiles
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 15000 }]), // monthlyRevenue
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 8 }]), // pendingInvoices
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 17 }]), // paidInvoices
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: 'inv-1',
                invoiceNumber: 'INV-001',
                status: 'paid',
                totalAmount: 1000,
                createdAt: '2024-01-15T10:00:00Z',
              },
              {
                id: 'inv-2',
                invoiceNumber: 'INV-002',
                status: 'pending',
                totalAmount: 2000,
                createdAt: '2024-01-14T10:00:00Z',
              },
            ]), // recentInvoices
          }),
        }),
      })

    const expectedStats = {
      totalInvoices: 25,
      activeClients: 10,
      templates: 5,
      businessProfiles: 3,
      monthlyRevenue: 15000,
      pendingInvoices: 8,
      paidInvoices: 17,
      recentInvoices: [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          status: 'paid',
          totalAmount: 1000,
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'inv-2',
          invoiceNumber: 'INV-002',
          status: 'pending',
          totalAmount: 2000,
          createdAt: '2024-01-14T10:00:00Z',
        },
      ],
    }

    const mockResponse = { status: 200 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    const response = await GET()

    expect(NextResponse.json).toHaveBeenCalledWith(expectedStats)
    expect(response).toBe(mockResponse)
  })

  it('should handle database errors', async () => {
    const dbError = new Error('Database connection failed')
    mockDb.select = jest.fn().mockReturnValue({
      from: jest.fn().mockRejectedValue(dbError),
    })

    const mockErrorResponse = { status: 500 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const response = await GET()

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching dashboard stats:', dbError)
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
    expect(response).toBe(mockErrorResponse)

    consoleSpy.mockRestore()
  })

  it('should return zero values when no data exists', async () => {
    // Mock empty results
    const mockSelect = jest.fn()
    mockDb.select = mockSelect.mockReturnValue({
      from: jest.fn().mockResolvedValue([]),
    })

    // Mock all queries to return empty or zero results
    mockSelect
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 0 }]),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 0 }]),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 0 }]),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 0 }]),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: null }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      })

    const expectedStats = {
      totalInvoices: 0,
      activeClients: 0,
      templates: 0,
      businessProfiles: 0,
      monthlyRevenue: 0,
      pendingInvoices: 0,
      paidInvoices: 0,
      recentInvoices: [],
    }

    const mockResponse = { status: 200 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    const response = await GET()

    expect(NextResponse.json).toHaveBeenCalledWith(expectedStats)
    expect(response).toBe(mockResponse)
  })

  it('should handle null monthly revenue', async () => {
    const mockSelect = jest.fn()
    mockDb.select = mockSelect

    // Mock queries with null revenue
    mockSelect
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 5 }]),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 3 }]),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 2 }]),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ count: 1 }]),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: null }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 2 }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 3 }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      })

    const response = await GET()

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        monthlyRevenue: 0, // Should default to 0 when null
      })
    )
  })
})
