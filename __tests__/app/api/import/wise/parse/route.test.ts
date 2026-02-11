import { POST } from '@/app/api/import/wise/parse/route'
import { NextRequest, NextResponse } from 'next/server'
import { parseWiseText } from '@/lib/import/wise-parser'

// Mock dependencies
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
  },
}))

jest.mock('pdf-parse', () => {
  return jest.fn()
})

jest.mock('@/lib/import/wise-parser', () => ({
  parseWiseText: jest.fn(),
}))

// Get reference to mocked pdf-parse
// @ts-ignore
import pdfParse from 'pdf-parse'
const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>
const mockParseWiseText = parseWiseText as jest.MockedFunction<typeof parseWiseText>

/**
 * Creates a mock file object that behaves like a Blob with arrayBuffer support.
 */
function createMockFile(content: Buffer, type: string, sizeOverride?: number) {
  const arrayBuffer = content.buffer.slice(
    content.byteOffset,
    content.byteOffset + content.byteLength
  )
  const file = new Blob([content], { type })

  // Attach a working arrayBuffer method (jsdom Blob may not have it)
  const mockFile = Object.create(file, {
    arrayBuffer: {
      value: () => Promise.resolve(arrayBuffer),
    },
    type: {
      value: type,
    },
    size: {
      value: sizeOverride !== undefined ? sizeOverride : content.length,
    },
  })

  return mockFile
}

/**
 * Helper to create a mock NextRequest with FormData containing a file.
 */
function createMockRequest(file?: { content: Buffer; type?: string; name?: string; size?: number }) {
  const formDataEntries = new Map<string, unknown>()

  if (file) {
    formDataEntries.set(
      'file',
      createMockFile(file.content, file.type || 'application/pdf', file.size)
    )
  }

  const mockFormData = {
    get: jest.fn((key: string) => formDataEntries.get(key) || null),
  }

  return {
    formData: jest.fn().mockResolvedValue(mockFormData),
  } as unknown as NextRequest
}

describe('/api/import/wise/parse', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should parse a valid Wise PDF and return transactions', async () => {
      const sampleText = 'EUR statement\n1 November 2025 [GMT] - 30 November 2025 [GMT]\n...'
      const mockResult = {
        currency: 'EUR',
        dateRange: { from: '2025-11-01', to: '2025-11-30' },
        transactions: [
          {
            description: 'Payment from Client',
            date: '2025-11-15',
            incoming: 1000,
            outgoing: null,
            amount: 1000,
            reference: 'TX-123',
            currency: 'EUR',
          },
        ],
      }

      mockPdfParse.mockResolvedValue({ text: sampleText, numpages: 1, numrender: 1, info: {}, metadata: null, version: '' })
      mockParseWiseText.mockReturnValue(mockResult)

      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const request = createMockRequest({
        content: Buffer.from('fake-pdf-content'),
        type: 'application/pdf',
      })

      const response = await POST(request)

      expect(mockPdfParse).toHaveBeenCalledWith(expect.any(Buffer))
      expect(mockParseWiseText).toHaveBeenCalledWith(sampleText)
      expect(NextResponse.json).toHaveBeenCalledWith(mockResult)
      expect(response).toBe(mockResponse)
    })

    it('should return 400 when no file is provided', async () => {
      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const request = createMockRequest() // no file

      const response = await POST(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'No PDF file provided' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
      expect(mockPdfParse).not.toHaveBeenCalled()
      expect(mockParseWiseText).not.toHaveBeenCalled()
    })

    it('should return 422 when parseWiseText throws (non-Wise PDF)', async () => {
      mockPdfParse.mockResolvedValue({ text: 'Not a Wise statement', numpages: 1, numrender: 1, info: {}, metadata: null, version: '' })
      mockParseWiseText.mockImplementation(() => {
        throw new Error('Not a valid Wise statement: could not find currency line (e.g. "EUR statement")')
      })

      const mockErrorResponse = { status: 422 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = createMockRequest({
        content: Buffer.from('fake-pdf-content'),
        type: 'application/pdf',
      })

      const response = await POST(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Not a valid Wise statement: could not find currency line (e.g. "EUR statement")' },
        { status: 422 }
      )
      expect(response).toBe(mockErrorResponse)

      consoleSpy.mockRestore()
    })

    it('should return 400 when file is not a PDF', async () => {
      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const request = createMockRequest({
        content: Buffer.from('not-a-pdf'),
        type: 'text/plain',
      })

      const response = await POST(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
      expect(mockPdfParse).not.toHaveBeenCalled()
    })

    it('should return 400 when file exceeds 5MB', async () => {
      const mockErrorResponse = { status: 400 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockErrorResponse)

      const request = createMockRequest({
        content: Buffer.from('small'),
        type: 'application/pdf',
        size: 6 * 1024 * 1024, // 6MB
      })

      const response = await POST(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
      expect(response).toBe(mockErrorResponse)
      expect(mockPdfParse).not.toHaveBeenCalled()
    })
  })
})
