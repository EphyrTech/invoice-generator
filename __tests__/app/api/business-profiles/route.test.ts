import { GET, POST } from '@/app/api/business-profiles/route'
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
  v4: jest.fn(() => 'test-profile-uuid'),
}))

const mockQuery = query as jest.MockedFunction<typeof query>

describe('/api/business-profiles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return all business profiles successfully', async () => {
      const mockProfiles = [
        {
          id: 'profile-1',
          name: 'Test Company 1',
          email: 'company1@test.com',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'profile-2',
          name: 'Test Company 2',
          email: 'company2@test.com',
          created_at: '2024-01-14T10:00:00Z',
        },
      ]

      mockQuery.mockResolvedValue(mockProfiles)
      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await GET()

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM business_profiles ORDER BY created_at DESC'
      )
      expect(NextResponse.json).toHaveBeenCalledWith(mockProfiles)
      expect(response).toBe(mockResponse)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed')
      mockQuery.mockRejectedValue(dbError)

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await GET()

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching business profiles:', dbError)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch business profiles' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })
  })

  describe('POST', () => {
    const validProfileData = {
      name: 'New Company',
      email: 'newcompany@test.com',
      phone: '+1-555-0123',
      address: '123 Business St',
      city: 'Business City',
      state: 'BC',
      postalCode: '12345',
      country: 'USA',
      taxId: 'TAX123456',
      logoUrl: 'https://example.com/logo.png',
    }

    it('should create a new business profile successfully', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validProfileData),
      } as unknown as NextRequest

      const mockCreatedProfile = { id: 'test-profile-uuid', ...validProfileData }
      mockQuery.mockResolvedValue([mockCreatedProfile])

      const mockResponse = { status: 201 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(mockRequest.json).toHaveBeenCalled()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO business_profiles'),
        expect.arrayContaining([
          'test-profile-uuid',
          'user-1', // Default user ID
          validProfileData.name,
          validProfileData.email,
          validProfileData.phone,
          validProfileData.address,
          validProfileData.city,
          validProfileData.state,
          validProfileData.postalCode,
          validProfileData.country,
          validProfileData.taxId,
          validProfileData.logoUrl,
          expect.any(Date),
          expect.any(Date),
        ])
      )
      expect(NextResponse.json).toHaveBeenCalledWith(mockCreatedProfile, { status: 201 })
      expect(response).toBe(mockResponse)
    })

    it('should return 400 when name is missing', async () => {
      const invalidData = { ...validProfileData }as any
      delete invalidData.name

      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidData),
      } as unknown as NextRequest

      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const response = await POST(mockRequest)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Business name is required' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should handle database errors during creation', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validProfileData),
      } as unknown as NextRequest

      const dbError = new Error('Database insert failed')
      mockQuery.mockRejectedValue(dbError)

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await POST(mockRequest)

      expect(consoleSpy).toHaveBeenCalledWith('Error creating business profile:', dbError)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to create business profile' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })

    it('should create profile with minimal required data', async () => {
      const minimalData = { name: 'Minimal Company' }
      const mockRequest = {
        json: jest.fn().mockResolvedValue(minimalData),
      } as unknown as NextRequest

      const mockCreatedProfile = { id: 'test-profile-uuid', ...minimalData }
      mockQuery.mockResolvedValue([mockCreatedProfile])

      const mockResponse = { status: 201 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(mockRequest)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO business_profiles'),
        expect.arrayContaining([
          'test-profile-uuid',
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
          null, // logoUrl
          expect.any(Date),
          expect.any(Date),
        ])
      )
      expect(response).toBe(mockResponse)
    })

    it('should handle invalid JSON in request', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest

      const mockErrorResponse = { status: 500 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await POST(mockRequest)

      expect(consoleSpy).toHaveBeenCalledWith('Error creating business profile:', expect.any(Error))
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to create business profile' },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })
  })
})
