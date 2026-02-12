import { GET, POST } from '@/app/api/clients/route'
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
  v4: jest.fn(() => 'test-client-uuid'),
}))

const mockQuery = query as jest.MockedFunction<typeof query>

describe('/api/clients', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return all clients successfully', async () => {
      const mockClients = [
        {
          id: 'client-1',
          name: 'Test Client 1',
          email: 'client1@test.com',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'client-2',
          name: 'Test Client 2',
          email: 'client2@test.com',
          created_at: '2024-01-14T10:00:00Z',
        },
      ]

      mockQuery.mockResolvedValue(mockClients)
      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET()

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM clients ORDER BY created_at DESC'
      )
      expect(NextResponse.json).toHaveBeenCalledWith(mockClients)
      expect(response).toBe(mockResponse)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed')
      mockQuery.mockRejectedValue(dbError)

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await GET()

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching clients:', dbError)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })

    it('should return empty array when no clients exist', async () => {
      mockQuery.mockResolvedValue([])
      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET()

      expect(NextResponse.json).toHaveBeenCalledWith([])
      expect(response).toBe(mockResponse)
    })
  })

  describe('POST', () => {
    const validClientData = {
      name: 'New Client',
      email: 'newclient@test.com',
      phone: '+1-555-0123',
      address: '123 Client St',
      city: 'Client City',
      state: 'CC',
      postalCode: '12345',
      country: 'USA',
      taxId: 'TAX123',
      notes: 'Test notes',
    }

    it('should create a new client successfully', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validClientData),
      } as unknown as NextRequest

      const mockCreatedClient = { id: 'test-client-uuid', ...validClientData }
      mockQuery.mockResolvedValue([mockCreatedClient])

      const mockResponse = { status: 201 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(mockRequest.json).toHaveBeenCalled()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO clients'),
        expect.arrayContaining([
          'test-client-uuid',
          'user-1', // Default user ID
          validClientData.name,
          validClientData.email,
          validClientData.phone,
          validClientData.address,
          validClientData.city,
          validClientData.state,
          validClientData.postalCode,
          validClientData.country,
          validClientData.taxId,
          validClientData.notes,
          false, // isBusinessProfile default
          null, // businessProfileId default
          expect.any(Date),
          expect.any(Date),
        ])
      )
      expect(NextResponse.json).toHaveBeenCalledWith(mockCreatedClient, { status: 201 })
      expect(response).toBe(mockResponse)
    })

    it('should return 400 when name is missing', async () => {
      const invalidData = { ...validClientData } as any
      delete invalidData.name

      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidData),
      } as unknown as NextRequest

      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Client name is required' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should handle database errors during creation', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validClientData),
      } as unknown as NextRequest

      const dbError = new Error('Database insert failed')
      mockQuery.mockRejectedValue(dbError)

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await POST(mockRequest)

      expect(consoleSpy).toHaveBeenCalledWith('Error creating client:', dbError)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to create client' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })

    it('should handle invalid JSON in request', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await POST(mockRequest)

      expect(consoleSpy).toHaveBeenCalledWith('Error creating client:', expect.any(Error))
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to create client' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })

    it('should create client with minimal required data', async () => {
      const minimalData = { name: 'Minimal Client' }
      const mockRequest = {
        json: jest.fn().mockResolvedValue(minimalData),
      } as unknown as NextRequest

      const mockCreatedClient = { id: 'test-client-uuid', ...minimalData }
      mockQuery.mockResolvedValue([mockCreatedClient])

      const mockResponse = { status: 201 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO clients'),
        expect.arrayContaining([
          'test-client-uuid',
          'user-1',
          minimalData.name,
          null, // email
          null, // phone
          null, // address
          null, // city
          null, // state
          null, // postalCode
          null, // country
          null, // taxId
          null, // notes
          false,
          null,
          expect.any(Date),
          expect.any(Date),
        ])
      )
      expect(response).toBe(mockResponse)
    })
  })
})
