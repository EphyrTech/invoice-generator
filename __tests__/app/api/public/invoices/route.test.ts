import { GET } from '@/app/api/public/invoices/[token]/route'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/db-client'

jest.mock('@/lib/db/db-client')
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
  },
}))

const mockQuery = query as jest.MockedFunction<typeof query>

describe('/api/public/invoices/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return invoice data for a valid public token', async () => {
    const mockInvoice = {
      id: 'inv-1',
      user_id: 'user-1',
      invoice_number: 'INV-001',
      public_token: 'abc123token',
      business_profile_id: 'bp-1',
      client_id: 'cl-1',
      show_logo_public: true,
      show_status_public: false,
      pdf_theme: 'clean',
      status: 'issued',
      total: 1000,
    }
    const mockItems = [{ id: 'item-1', description: 'Service', amount: 1000 }]
    const mockProfile = { id: 'bp-1', name: 'My Business', logo_url: 'https://example.com/logo.png' }
    const mockClient = { id: 'cl-1', name: 'Client Corp' }

    mockQuery
      .mockResolvedValueOnce([mockInvoice])
      .mockResolvedValueOnce(mockItems)
      .mockResolvedValueOnce([mockProfile])
      .mockResolvedValueOnce([mockClient])

    const mockResponse = { status: 200 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    await GET({} as NextRequest, { params: { token: 'abc123token' } })

    expect(mockQuery.mock.calls[0][1]).toContain('abc123token')
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_number: 'INV-001',
        items: mockItems,
        businessProfile: expect.objectContaining({ name: 'My Business' }),
        client: expect.objectContaining({ name: 'Client Corp' }),
      })
    )
  })

  it('should return 404 for invalid token', async () => {
    mockQuery.mockResolvedValueOnce([])

    const mockResponse = { status: 404 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    await GET({} as NextRequest, { params: { token: 'bad-token' } })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Invoice not found' },
      { status: 404 }
    )
  })

  it('should strip user_id from response', async () => {
    const mockInvoice = {
      id: 'inv-1',
      user_id: 'user-1',
      invoice_number: 'INV-001',
      public_token: 'abc123token',
      business_profile_id: 'bp-1',
      client_id: 'cl-1',
      show_logo_public: false,
      show_status_public: false,
      pdf_theme: 'clean',
      status: 'issued',
      total: 1000,
    }

    mockQuery
      .mockResolvedValueOnce([mockInvoice])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'bp-1', name: 'Biz' }])
      .mockResolvedValueOnce([{ id: 'cl-1', name: 'Client' }])

    const mockResponse = { status: 200 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    await GET({} as NextRequest, { params: { token: 'abc123token' } })

    const responseData = (NextResponse.json as jest.Mock).mock.calls[0][0]
    expect(responseData.user_id).toBeUndefined()
  })
})
