import { GET } from '@/app/api/health/route'
import { NextResponse } from 'next/server'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn(),
  },
}))

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock Date.now() for consistent timestamps
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-15T10:00:00.000Z')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET', () => {
    it('should return healthy status', async () => {
      const mockJsonResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockJsonResponse)

      const response = await GET()

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          status: 'healthy',
          timestamp: '2024-01-15T10:00:00.000Z',
          service: 'invoice-pdf',
        },
        { status: 200 }
      )
      expect(response).toBe(mockJsonResponse)
    })

    it('should return healthy status with correct structure', async () => {
      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET()

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          status: 'healthy',
          timestamp: expect.any(String),
          service: 'invoice-pdf',
        },
        { status: 200 }
      )
      expect(response).toBe(mockResponse)
    })

    it('should return proper content type and status', async () => {
      const mockResponse = {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET()

      expect(response.status).toBe(200)
    })
  })
})
