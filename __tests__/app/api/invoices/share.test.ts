import { POST, DELETE } from '@/app/api/invoices/[id]/share/route'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/db-client'

jest.mock('@/lib/db/db-client')
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
  },
}))
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-token-12'),
}))

const mockQuery = query as jest.MockedFunction<typeof query>

describe('/api/invoices/[id]/share', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST - generate share token', () => {
    it('should generate a public token for an invoice', async () => {
      mockQuery
        .mockResolvedValueOnce([{ id: 'inv-1', public_token: null }])
        .mockResolvedValueOnce([{ id: 'inv-1', public_token: 'test-token-12' }])

      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(
        {} as NextRequest,
        { params: { id: 'inv-1' } }
      )

      expect(mockQuery).toHaveBeenCalledTimes(2)
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT')
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE')
      expect(mockQuery.mock.calls[1][1]).toContain('test-token-12')
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ publicToken: 'test-token-12' })
      )
    })

    it('should return existing token if already shared', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 'inv-1', public_token: 'existing-tok' }])

      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      await POST({} as NextRequest, { params: { id: 'inv-1' } })

      expect(mockQuery).toHaveBeenCalledTimes(1)
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ publicToken: 'existing-tok' })
      )
    })

    it('should return 404 if invoice not found', async () => {
      mockQuery.mockResolvedValueOnce([])

      const mockResponse = { status: 404 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      await POST({} as NextRequest, { params: { id: 'nonexistent' } })

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    })
  })

  describe('DELETE - revoke share token', () => {
    it('should revoke the public token', async () => {
      mockQuery
        .mockResolvedValueOnce([{ id: 'inv-1', public_token: 'some-token' }])
        .mockResolvedValueOnce([{ id: 'inv-1', public_token: null }])

      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      await DELETE({} as NextRequest, { params: { id: 'inv-1' } })

      expect(mockQuery).toHaveBeenCalledTimes(2)
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE')
    })

    it('should return 404 if invoice not found', async () => {
      mockQuery.mockResolvedValueOnce([])

      const mockResponse = { status: 404 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      await DELETE({} as NextRequest, { params: { id: 'nonexistent' } })

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    })
  })
})
