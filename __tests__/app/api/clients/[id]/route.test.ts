import { GET, PUT, DELETE } from '@/app/api/clients/[id]/route'
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

const mockQuery = query as jest.MockedFunction<typeof query>

describe('/api/clients/[id]', () => {
  const mockParams = { params: { id: 'test-client-id' } }
  const mockRequest = {} as NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return client when found', async () => {
      const mockClient = {
        id: 'test-client-id',
        name: 'Test Client',
        email: 'test@client.com',
        phone: '+1-555-0123',
      }

      mockQuery.mockResolvedValue([mockClient])
      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET(mockRequest, mockParams)

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM clients WHERE id = $1',
        ['test-client-id']
      )
      expect(NextResponse.json).toHaveBeenCalledWith(mockClient)
      expect(response).toBe(mockResponse)
    })

    it('should return 404 when client not found', async () => {
      mockQuery.mockResolvedValue([])
      const mockErrorResponse = { status: 404 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await GET(mockRequest, mockParams)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Client not found' },
        { status: 404 }
      )
      expect(response).toBe(mockErrorResponse)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database error')
      mockQuery.mockRejectedValue(dbError)

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await GET(mockRequest, mockParams)

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching client:', dbError)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch client' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })
  })

  describe('PUT', () => {
    const validUpdateData = {
      name: 'Updated Client',
      email: 'updated@client.com',
      phone: '+1-555-9999',
    }

    it('should update client successfully', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validUpdateData),
      } as unknown as NextRequest

      // Mock existing client check
      mockQuery
        .mockResolvedValueOnce([{ id: 'test-client-id', name: 'Old Name' }])
        .mockResolvedValueOnce([{ id: 'test-client-id', ...validUpdateData }])

      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await PUT(mockRequest, mockParams)

      expect(mockQuery).toHaveBeenCalledTimes(2)
      expect(mockQuery).toHaveBeenNthCalledWith(1, 
        'SELECT * FROM clients WHERE id = $1',
        ['test-client-id']
      )
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE clients SET'),
        expect.arrayContaining([
          validUpdateData.name,
          validUpdateData.email,
          validUpdateData.phone,
          expect.any(Date),
          'test-client-id',
        ])
      )
      expect(response).toBe(mockResponse)
    })

    it('should return 400 when name is missing', async () => {
      const invalidData = { email: 'test@test.com' }
      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidData),
      } as unknown as NextRequest

      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await PUT(mockRequest, mockParams)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Client name is required' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
    })

    it('should return 404 when client does not exist', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validUpdateData),
      } as unknown as NextRequest

      mockQuery.mockResolvedValue([])
      const mockErrorResponse = { status: 404 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await PUT(mockRequest, mockParams)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Client not found' },
        { status: 404 }
      )
      expect(response).toBe(mockErrorResponse)
    })
  })

  describe('DELETE', () => {
    it('should delete client successfully', async () => {
      // Mock existing client check
      mockQuery
        .mockResolvedValueOnce([{ id: 'test-client-id', name: 'Test Client' }])
        .mockResolvedValueOnce([])

      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await DELETE(mockRequest, mockParams)

      expect(mockQuery).toHaveBeenCalledTimes(2)
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        'SELECT * FROM clients WHERE id = $1',
        ['test-client-id']
      )
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        'DELETE FROM clients WHERE id = $1',
        ['test-client-id']
      )
      expect(NextResponse.json).toHaveBeenCalledWith(
        { message: 'Client deleted successfully' }
      )
      expect(response).toBe(mockResponse)
    })

    it('should return 404 when client does not exist', async () => {
      mockQuery.mockResolvedValue([])
      const mockErrorResponse = { status: 404 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await DELETE(mockRequest, mockParams)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Client not found' },
        { status: 404 }
      )
      expect(response).toBe(mockErrorResponse)
    })

    it('should handle database errors during deletion', async () => {
      const dbError = new Error('Foreign key constraint')
      mockQuery
        .mockResolvedValueOnce([{ id: 'test-client-id' }])
        .mockRejectedValueOnce(dbError)

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await DELETE(mockRequest, mockParams)

      expect(consoleSpy).toHaveBeenCalledWith('Error deleting client:', dbError)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to delete client' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })
  })
})
